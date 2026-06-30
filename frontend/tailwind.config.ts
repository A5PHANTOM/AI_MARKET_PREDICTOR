import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d1117',
        surface: '#1a1a2e',
        'accent-yellow': '#ecad0a',
        'blue-primary': '#209dd7',
        'purple-secondary': '#753991',
        'border-muted': '#2d2d44',
        'price-green': '#00c853',
        'price-red': '#ff1744',
      },
      fontFamily: {
        mono: ['Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
          'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
          'Helvetica Neue', 'sans-serif',
        ],
      },
      fontSize: {
        'data': ['0.75rem', { lineHeight: '1rem' }],
        'data-lg': ['0.875rem', { lineHeight: '1.25rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
