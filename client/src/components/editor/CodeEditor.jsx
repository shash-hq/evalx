import Editor from '@monaco-editor/react';

const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: "'IBM Plex Mono', monospace",
  fontLigatures: true,
  minimap: {enabled: false},
  scrollBeyondLastLine: false,
  lineNumbers: 'on',
  renderLineHighlight: 'line',
  theme: 'evalx-dark',
  padding: {top: 16, bottom: 16},
  suggestOnTriggerCharacters: true,
  tabSize: 2,
};

const LANGUAGE_MAP = {
  cpp: 'cpp',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
};

const beforeMount = monaco => {
  monaco.editor.defineTheme('evalx-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      {token: 'comment', foreground: '4b5563', fontStyle: 'italic'},
      {token: 'keyword', foreground: 'f0a500'},
      {token: 'string', foreground: '3fb950'},
      {token: 'number', foreground: '58a6ff'},
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#e6edf3',
      'editor.lineHighlightBackground': '#161b22',
      'editor.selectionBackground': '#f0a50025',
      'editorCursor.foreground': '#f0a500',
      'editorLineNumber.foreground': '#4b5563',
      'editorLineNumber.activeForeground': '#8b949e',
    },
  });
};

export default function CodeEditor({
  value,
  onChange,
  language = 'python',
  readOnly = false,
}) {
  return (
    <div className="h-full border border-border">
      <Editor
        height="100%"
        language={LANGUAGE_MAP[language] || 'python'}
        value={value}
        onChange={onChange}
        beforeMount={beforeMount}
        options={{...MONACO_OPTIONS, readOnly}}
      />
    </div>
  );
}
