/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1',
          foreground: '#ffffff',
        },
        surface: {
          DEFAULT: '#0F172A',
          subtle: '#1E293B',
        },
        difficulty: {
          easy: '#4ADE80',
          normal: '#60A5FA',
          hard: '#F97316',
          boss: '#EF4444',
        },
      },
      fontFamily: {
        display: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'quest-pop': {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      animation: {
        'quest-pop': 'quest-pop 0.2s ease-out',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}
