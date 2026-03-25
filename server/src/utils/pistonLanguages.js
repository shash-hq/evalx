// Piston runtime names and versions
// GET https://emkc.org/api/v2/piston/runtimes to see all available

export const PISTON_LANGUAGES = {
  cpp: {
    language: 'c++',
    version: '10.2.0',
    fileName: 'main.cpp',
  },
  java: {
    language: 'java',
    version: '15.0.2',
    fileName: 'Main.java',
  },
  python: {
    language: 'python',
    version: '3.10.0',
    fileName: 'main.py',
  },
  javascript: {
    language: 'javascript',
    version: '18.15.0',
    fileName: 'main.js',
  },
};

export const isValidLanguage = (lang) => Object.keys(PISTON_LANGUAGES).includes(lang);
