/** @type {import('tailwindcss').Config} */
import { getIconCollections, iconsPlugin } from '@egoist/tailwindcss-icons';

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}', 'node_modules/preline/dist/*.js', './.vitepress/**/*.{vue,md,ts,js}', './docs/**/*.md'],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f8ff',
          100: '#e0f1fe',
          200: '#bae3fd',
          300: '#7ccdfd',
          400: '#37b3f9',
          500: '#0c93df',
          600: '#017ac8',
          700: '#0261a2',
          800: '#065386',
          900: '#0b456f',
          950: '#082c49',
        },
        secondary: {
          50: '#fdf5f3',
          100: '#fce8e4',
          200: '#fbd5cd',
          300: '#f6b8ab',
          400: '#ef8f7a',
          500: '#e1583a',
          600: '#d04e32',
          700: '#af3f26',
          800: '#913723',
          900: '#793223',
          950: '#41170e',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    iconsPlugin({
      collections: getIconCollections(['solar', 'tabler']),
    }),
  ],
};
