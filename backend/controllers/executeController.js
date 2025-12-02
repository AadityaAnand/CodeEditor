const { File } = require('../models');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

// Resolve a Python 3 interpreter on the host
async function resolvePython3() {
  const envCmd = process.env.PYTHON_CMD && String(process.env.PYTHON_CMD).trim();
  if (envCmd) {
    try {
      const { stdout } = await execAsync(`${envCmd} --version`);
      if (/Python\s+3\./i.test(stdout)) return envCmd;
    } catch (_) {}
  }
  try {
    await execAsync('python3 --version');
    return 'python3';
  } catch (_) {}
  try {
    const { stdout } = await execAsync('python --version');
    if (/Python\s+3\./i.test(stdout)) return 'python';
  } catch (_) {}
  try {
    const { stdout } = await execAsync('py -3 --version');
    if (/Python\s+3\./i.test(stdout)) return 'py -3';
  } catch (_) {}
  return null;
}

async function executeCode(req, res) {
  try {
    const { fileId, language, code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }

    // Verify file access
    if (fileId) {
      const file = await File.findById(fileId);
      if (!file) return res.status(404).json({ error: 'File not found' });
    }

    // Create temp file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeeditor-'));
    let tempFile;
    let command;

    try {
      // use the top-level resolver

      switch (language) {
        case 'javascript':
          tempFile = path.join(tempDir, 'temp.js');
          await fs.writeFile(tempFile, code);
          command = `node "${tempFile}"`;
          break;
        
        case 'python':
          tempFile = path.join(tempDir, 'temp.py');
          await fs.writeFile(tempFile, code);
          {
            const pyCmd = await resolvePython3();
            if (!pyCmd) {
              return res.status(400).json({
                error: 'Python 3 interpreter not found. Please install Python 3 (python3) or ensure it is available on PATH.'
              });
            }
            command = `${pyCmd} "${tempFile}"`;
          }
          break;
        
        case 'typescript':
          tempFile = path.join(tempDir, 'temp.ts');
          await fs.writeFile(tempFile, code);
          // Check if ts-node is available
          try {
            await execAsync('which ts-node');
            command = `ts-node "${tempFile}"`;
          } catch {
            return res.status(400).json({ error: 'TypeScript execution requires ts-node to be installed' });
          }
          break;
        
        default:
          return res.status(400).json({ error: `Language ${language} not supported for execution` });
      }

      // Execute with timeout
      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000, // 10 second timeout
        maxBuffer: 1024 * 1024 // 1MB max output
      });

      res.json({
        output: stdout || stderr || 'Execution completed with no output',
        exitCode: 0
      });

    } finally {
      // Cleanup temp files
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to cleanup temp dir:', e.message);
      }
    }

  } catch (err) {
    if (err.killed) {
      return res.status(408).json({ error: 'Execution timed out (10s limit)' });
    }
    
    res.status(500).json({
      error: err.stderr || err.message || 'Execution failed',
      exitCode: err.code || 1
    });
  }
}

// Health endpoint to verify Python availability in production
async function pythonHealth(req, res) {
  try {
    const cmd = await resolvePython3();
    if (!cmd) return res.status(400).json({ ok: false, error: 'Python 3 not found', PYTHON_CMD: process.env.PYTHON_CMD || null });
    const { stdout } = await execAsync(`${cmd} --version`);
    return res.json({ ok: true, cmd, version: stdout.trim() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = { executeCode, pythonHealth, resolvePython3 };
