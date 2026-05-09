/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        quantum: {
          50:  '#f0f4ff',
          100: '#dde6ff',
          200: '#c3d2ff',
          300: '#9db4ff',
          400: '#738bfe',
          500: '#4f5ef9',
          600: '#3a3dee',
          700: '#2f2fd3',
          800: '#2929ab',
          900: '#282787',
          950: '#1a1850',
        },
        plasma: {
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
        },
        void: {
          900: '#05060f',
          800: '#090b1a',
          700: '#0d1025',
          600: '#131630',
        },
        grid: 'rgba(99,102,241,0.08)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99,102,241,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(99,102,241,0.8), 0 0 40px rgba(99,102,241,0.4)' },
        },
      },
      backdropBlur: { xs: '2px' },
      backgroundImage: {
        'quantum-grid': `linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)`,
        'void-gradient': 'radial-gradient(ellipse at center, #0d1025 0%, #05060f 100%)',
        'plasma-gradient': 'linear-gradient(135deg, #4f5ef9 0%, #d946ef 50%, #06b6d4 100%)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
