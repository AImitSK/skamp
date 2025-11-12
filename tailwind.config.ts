// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#005fab',
          hover: '#004a8c',
          25: '#f0f7fd',
          50: '#ebf4fb',
          100: '#d6eaf7',
          200: '#add8f0',
          300: '#66b1e1',
          400: '#3397d7',
          500: '#0080cd',
          600: '#005fab',
          700: '#004a8c',
          800: '#003969',
          900: '#002846',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Switzer', 'system-ui', 'sans-serif'], // Template Font
      },
      borderRadius: {
        '4xl': '2rem',
      },
      spacing: {
        '144': '36rem',
        '304': '76rem',
      },
      keyframes: {
        'move-x': {
          '0%': { transform: 'translateX(var(--move-x-from))' },
          '100%': { transform: 'translateX(var(--move-x-to))' },
        },
      },
      animation: {
        'move-x': 'move-x var(--move-x-duration, 1s) linear infinite',
      },
    },
  },
  plugins: [],
}
export default config