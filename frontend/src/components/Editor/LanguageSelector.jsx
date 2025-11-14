function LanguageSelector({ language, onLanguageChange }) {
    return(
        <div style={{padding: '1rem 2rem', background: '#2d2d2d', borderBottom: '1px solid #444' }}>
            <label style={{ color: '#fff', marginRight: '1rem', fontSize: '14px' }}>
                Language:
            </label>
            <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                style={{
                    padding: '0.3rem',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid #555',
                    background: '#1e1e1e',
                    color: '#fff',
                    cursor: 'pointer'
                }}
            >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="typescript">TypeScript</option>

            </select>
            
        </div>
    );
}

export default LanguageSelector;
