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
        },
      },
    },
  },
  plugins: [], // Leer lassen für maximale Stabilität
}
export default config