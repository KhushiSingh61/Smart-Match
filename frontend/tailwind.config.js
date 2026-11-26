/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#07181E',
          900: '#0D242C',
          800: '#13323D',
          700: '#1B4352',
        },
        teal: {
          600: '#0D9488',
          700: '#0F766E',
          500: '#14B8A6',
          50: '#F0FDFA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
