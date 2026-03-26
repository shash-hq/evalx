/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#07090f',
        surface: '#0d1117',
        border: '#1c2333',
        accent: '#f0a500',
        'accent-dim': '#f0a50020',
        muted: '#4b5563',
        'text-primary': '#e6edf3',
        'text-secondary': '#8b949e',
        success: '#3fb950',
        error: '#f85149',
        warning: '#d29922',
        info: '#58a6ff',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
