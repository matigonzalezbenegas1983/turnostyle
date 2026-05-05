/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:               '#070402',
        surface:          '#100B06',
        'surface-glass':  'rgba(14, 9, 4, 0.75)',
        border:           '#2C1E0F',
        'border-glow':    'rgba(249,115,22,0.18)',
        primary:          '#F97316',
        'primary-bright': '#FB923C',
        'primary-dim':    '#C2580E',
        muted:            '#7A6248',
        amber:            '#D97706',
        warning:          '#F59E0B',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(249,115,22,0.12)',
        'glow-md': '0 0 40px rgba(249,115,22,0.18)',
        'glow-lg': '0 0 80px rgba(249,115,22,0.22)',
        'card':    '0 8px 32px rgba(0,0,0,0.55), 0 1px 0 rgba(249,115,22,0.08) inset',
        'card-hover': '0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(249,115,22,0.20)',
      },
    },
  },
  plugins: [],
}
