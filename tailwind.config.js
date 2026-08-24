/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          950: '#070710',
          900: '#0b0b15',
          800: '#11111d',
          700: '#181826',
          600: '#222234',
        },
        accent: {
          blue: '#5b8cff',
          violet: '#9b6cff',
          indigo: '#6d7bff',
          green: '#3ddc97',
        },
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(ellipse at top, rgba(91,140,255,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(155,108,255,0.14), transparent 50%)',
        'card-sheen':
          'linear-gradient(140deg, rgba(91,140,255,0.10), rgba(155,108,255,0.06) 60%, transparent 100%)',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(91,140,255,0.45)',
      },
    },
  },
  plugins: [],
};
