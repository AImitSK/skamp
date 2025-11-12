// tailwind.config.ts
import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

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
        '104': '26rem',
        '144': '36rem',
        '180': '45rem',
        '271.25': '67.8125rem',
        '304': '76rem',
        'xl': '36rem',
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
  plugins: [
    plugin(function ({ addVariant }) {
      // Headless UI data-* variants
      addVariant('data-dark', '&[data-dark="true"]')
      addVariant('data-hover', '&[data-hover]')
      addVariant('data-active', '&[data-active]')
      addVariant('data-disabled', '&[data-disabled]')
      addVariant('data-focus', '&[data-focus]')
      addVariant('data-checked', '&[data-checked]')
      addVariant('data-selected', '&[data-selected]')

      // Group variants
      addVariant('group-data-dark', ':merge(.group)[data-dark="true"] &')
      addVariant('group-data-hover', ':merge(.group)[data-hover] &')
      addVariant('group-data-active', ':merge(.group)[data-active] &')
      addVariant('group-data-disabled', ':merge(.group)[data-disabled] &')
      addVariant('group-data-focus', ':merge(.group)[data-focus] &')
    }),
  ],
}
export default config