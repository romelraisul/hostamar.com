/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // HYBRID BRAND — restored 20 Aug 2026: Green PRIMARY (BD trust), Blue secondary
        // Base #FFFFFF / #F8FAFC, Text #0F172A, Primary #0E7C3A, Secondary #2563EB, Accent #F59E0B
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#0E7C3A', // PRIMARY GREEN
          700: '#065f46',
          800: '#047857',
          900: '#064e3b',
          950: '#022c22',
        },
        primary: {
          DEFAULT: '#0E7C3A', // GREEN primary — bKash/BD trust
          hover: '#0c6a32',
          light: '#ecfdf5',
          blue: '#2563EB', // secondary
          blueHover: '#1D4ED8',
          blueLight: '#EFF6FF',
        },
        secondary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
        },
        accent: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          light: '#FFFBEB',
        },
        surface: {
          light: '#ffffff',
          DEFAULT: '#f8fafc',
          dark: '#0f172a',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        text: {
          DEFAULT: '#0F172A',
          muted: '#475569',
          faint: '#64748B',
        },
        hostamar: {
          primary: '#0E7C3A',
          primaryDark: '#0c6a32',
          secondary: '#2563EB',
          secondaryDark: '#1D4ED8',
          accent: '#F59E0B',
          base: '#FFFFFF',
          ink: '#0F172A',
        },
      },
      fontFamily: {
        bengali: ['var(--font-bengali)', 'Noto Sans Bengali', 'sans-serif'],
        hind: ['Hind Siliguri', 'Noto Sans Bengali', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(14,124,58,0.25)' },
          '50%': { boxShadow: '0 0 36px rgba(14,124,58,0.45)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
