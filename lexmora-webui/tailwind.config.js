/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Google Sans"', 'Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          raised: '#161b22',
          border: '#30363d',
        },
        accent: {
          DEFAULT: '#58a6ff',
          muted: '#388bfd',
        },
      },
    },
  },
  plugins: [],
}
