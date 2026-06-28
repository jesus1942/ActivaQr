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

        // Marca — turquesa/cian (estilo del mockup)
        brand: {
          DEFAULT: '#14B8A6',
          50: '#ECFEFB',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0FB5A6',
          700: '#0D9488',
          800: '#115E59',
          900: '#134E4A',
        },

        // Estados semánticos (se mantienen estables en ambos temas)
        ok: { DEFAULT: '#10B981', soft: '#ECFDF5', strong: '#047857' },
        warn: { DEFAULT: '#F59E0B', soft: '#FFFBEB', strong: '#B45309' },
        danger: { DEFAULT: '#EF4444', soft: '#FEF2F2', strong: '#B91C1C' },
        info: { DEFAULT: '#2563EB', soft: '#EFF6FF', strong: '#1D4ED8' },

        // Legacy (estilo viejo) — se mantiene para que las pantallas aún no
        // migradas no pierdan color durante la transición visual.
        industrial: {
          orange: '#F97316',
          navy: '#1E293B',
          steel: '#64748B',
        },
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
        soft: '0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10)',
        lift: '0 8px 20px rgba(0,0,0,0.10), 0 20px 48px rgba(0,0,0,0.16)',
        ring: '0 0 0 4px rgba(20,184,166,0.18)',
        // Halo turquesa (estilo del mockup)
        glow: '0 0 18px rgba(45,212,191,0.35), 0 4px 14px rgba(13,148,136,0.25)',
        'glow-lg': '0 0 28px rgba(45,212,191,0.5), 0 8px 24px rgba(13,148,136,0.35)',
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
        liquid: 'cubic-bezier(0.65, 0, 0.35, 1)',
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
        // Flotado lento del fondo aurora (líneas onduladas)
        'aurora-1': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%,-3%,0) scale(1.05)' },
        },
        'aurora-2': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(-3%,2%,0) scale(1.08)' },
        },
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
        'aurora-1': 'aurora-1 18s ease-in-out infinite',
        'aurora-2': 'aurora-2 24s ease-in-out infinite',
        'page-in': 'page-in 420ms cubic-bezier(0.65,0,0.35,1) both',
      },
    }
  },
  plugins: [],
}
