/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#060a10',
        surface: '#0d1420',
        surface2: '#111c2e',
        border: '#1e2f45',
        accent: '#00e5ff',
        accent2: '#0055ff',
        green: '#00e676',
        amber: '#ffb300',
        danger: '#ff1744',
      },
      fontFamily: {
        mono: ['Space Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
