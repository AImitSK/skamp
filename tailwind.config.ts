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
          hover: '#004a8c', // Eine dunklere Variante für den Hover-Effekt
          25: '#f0f7fd',   // Extra helles CI-Blau für sehr subtile Hintergründe
          50: '#ebf4fb',   // Heller als vorher - sehr helles CI-Blau für Hintergründe
          100: '#d6eaf7',  // Heller als vorher - helles CI-Blau für Akzente  
          200: '#add8f0',  // Heller als vorher - Light CI-Blau für Borders
          300: '#66b1e1',  // Medium-Light CI-Blau
          400: '#3397d7',  // Medium CI-Blau
          500: '#0080cd',  // Etwas heller als primary
          600: '#005fab',  // Primary CI-Blau
          700: '#004a8c',  // Primary hover
          800: '#003969',  // Dunkel
          900: '#002846',  // Sehr dunkel
        },
      },
    },
  },
  plugins: [], // Leer lassen für maximale Stabilität
}
export default config