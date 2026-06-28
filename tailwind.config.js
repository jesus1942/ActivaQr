/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens semánticos. Cada uno mapea a una CSS var que cambia en
        // light/dark (definidas en index.css). Permiten clases tipo
        // bg-surface, text-content, border-line, etc.
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',       // fondo principal
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)',       // fondo secundario
        surface: 'rgb(var(--c-surface) / <alpha-value>)',     // tarjetas
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',           // bordes/divisores
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',
        content: 'rgb(var(--c-content) / <alpha-value>)',     // texto principal
        muted: 'rgb(var(--c-muted) / <alpha-value>)',         // texto secundario
        faint: 'rgb(var(--c-faint) / <alpha-value>)',         // texto terciario

        // Marca
        brand: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },

        // Estados semánticos (se mantienen estables en ambos temas)
        ok: { DEFAULT: '#10B981', soft: '#ECFDF5', strong: '#047857' },
        warn: { DEFAULT: '#F59E0B', soft: '#FFFBEB', strong: '#B45309' },
        danger: { DEFAULT: '#EF4444', soft: '#FEF2F2', strong: '#B91C1C' },
        info: { DEFAULT: '#2563EB', soft: '#EFF6FF', strong: '#1D4ED8' },
      },
      fontFamily: {
        // Inter para UI, Manrope para títulos/display, mono para códigos
        sans: ['Inter', 'SF Pro Text', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        sketch: ['Manrope', 'Inter', 'system-ui', 'sans-serif'], // alias legacy
        body: ['Inter', 'system-ui', 'sans-serif'],              // alias legacy
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        sm: '12px',
        DEFAULT: '14px',
        md: '18px',
        lg: '24px',
        xl: '32px',
        '2xl': '40px',
      },
      boxShadow: {
        // Sombras muy sutiles, capas de elevación premium
        xs: '0 1px 2px rgba(0,0,0,0.04)',
        soft: '0 4px 12px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)',
        lift: '0 8px 20px rgba(0,0,0,0.06), 0 20px 48px rgba(0,0,0,0.08)',
        ring: '0 0 0 4px rgba(37,99,235,0.12)',
        none: 'none',
      },
      spacing: {
        // Sistema de 8 puntos (los valores nativos de tailwind ya cubren
        // 2=8px, 4=16px, 6=24px, 8=32px, 12=48px; agregamos alias semánticos)
        '1.5': '0.375rem',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'fade-up': 'fade-up 320ms cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scale-in 200ms cubic-bezier(0.22,1,0.36,1) both',
        'slide-up': 'slide-up 280ms cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-right': 'slide-in-right 280ms cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'toast-in': 'toast-in 240ms cubic-bezier(0.22,1,0.36,1) both',
      },
    }
  },
  plugins: [],
}
