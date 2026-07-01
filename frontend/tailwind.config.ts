import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#090b10',
        surface: '#10141b',
        'surface-elevated': '#171d26',
        'surface-soft': '#202734',
        'accent-yellow': '#d9ad45',
        'blue-primary': '#5b8def',
        'blue-glow': '#80a8ff',
        'purple-secondary': '#8f7ad8',
        'border-muted': '#252d3a',
        'border-subtle': '#1a202b',
        'price-green': '#38d996',
        'price-red': '#ff5f7a',
        'text-primary': '#f3f6fb',
        'text-secondary': '#a8b0bd',
        'text-muted': '#747e8d',
      },
      fontFamily: {
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
      },
      opacity: {
        '92': '0.92',
      },
      fontSize: {
        'data': ['0.7rem', { lineHeight: '0.95rem' }],
        'data-lg': ['0.8rem', { lineHeight: '1.15rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'flash-green': 'flashGreen 0.6s ease-out',
        'flash-red': 'flashRed 0.6s ease-out',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(56, 217, 150, 0)' },
          '50%': { boxShadow: '0 0 16px rgba(56, 217, 150, 0.28)' },
        },
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(91, 141, 239, 0)' },
          '50%': { boxShadow: '0 0 16px rgba(91, 141, 239, 0.24)' },
        },
        flashGreen: {
          '0%': { backgroundColor: 'rgba(56, 217, 150, 0.14)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(255, 95, 122, 0.14)' },
          '100%': { backgroundColor: 'transparent' },
        },
        skeleton: {
          '0%': { opacity: '0.3' },
          '50%': { opacity: '0.7' },
          '100%': { opacity: '0.3' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-5px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
