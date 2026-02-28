/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      colors: {
        royal: '#4169e1',
        beige: '#f6f0e5',
        line: '#e5edf8',
      },
      boxShadow: {
        soft: '0 12px 28px rgba(31, 41, 55, 0.12)',
      },
    },
  },
  plugins: [],
}
