/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pokemon-blue': '#3B82F6',
        'pokemon-yellow': '#FCD34D',
        'pokemon-red': '#EF4444',
      },
      fontFamily: {
        'pokemon': ['Pokemon', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
