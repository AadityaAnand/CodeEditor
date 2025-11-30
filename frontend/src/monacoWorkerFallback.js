// Fallback Monaco worker configuration for environments where default loader fails.
// This creates inline blob workers to avoid network path resolution issues (ERR_FILE_NOT_FOUND).

self.MonacoEnvironment = {
  getWorker: function (moduleId, label) {
    let script = '';
    switch (label) {
      case 'json': script = 'importScripts("https://unpkg.com/monaco-editor@0.44.0/esm/vs/language/json/json.worker.js");'; break;
      case 'css': script = 'importScripts("https://unpkg.com/monaco-editor@0.44.0/esm/vs/language/css/css.worker.js");'; break;
      case 'html': script = 'importScripts("https://unpkg.com/monaco-editor@0.44.0/esm/vs/language/html/html.worker.js");'; break;
      case 'typescript':
      case 'javascript': script = 'importScripts("https://unpkg.com/monaco-editor@0.44.0/esm/vs/language/typescript/ts.worker.js");'; break;
      default: script = 'importScripts("https://unpkg.com/monaco-editor@0.44.0/esm/vs/editor/editor.worker.js");';
    }
    const blob = new Blob([script], { type: 'text/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }
};
