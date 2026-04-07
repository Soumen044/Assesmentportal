/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        fog: '#f8fafc',
        steel: '#475569',
        accent: '#0ea5e9'
      }
    }
  },
  plugins: []
};
