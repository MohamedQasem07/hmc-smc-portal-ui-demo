/** @type {import('tailwindcss').Config} */
// Design tokens for HMC / SMC unified product visual language.
// Documented in DESIGN_DECISIONS.md — change once, reflected across Portal and any future Manager UX sprint.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: '#F6F8FB',          // app background — soft cool white
        surface: '#FFFFFF',         // cards, dialogs
        subtle: '#F1F5F9',          // hover surfaces, inactive chips
        border: '#E2E8F0',          // hairlines
        'border-strong': '#CBD5E1', // emphasized hairlines

        // Brand — navy / soft blue
        navy: {
          50:  '#F0F4FA',
          100: '#DCE5F1',
          200: '#B9CCE4',
          300: '#8EAACE',
          400: '#5E83B5',
          500: '#3D649D',
          600: '#2B4D83',
          700: '#223D69',
          800: '#192D4F',
          900: '#11203B',
          950: '#0B1628',
        },
        sky: {
          50:  '#EFF8FF',
          100: '#DDF0FF',
          200: '#B3DDFF',
          300: '#7AC2FF',
          400: '#3DA5FF',
          500: '#1488F0',
          600: '#076CD0',
          700: '#0656A6',
          800: '#09487F',
          900: '#0C3D6A',
        },

        // Accents — clinical green
        emerald: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
        },

        // Status palette (named so JSX reads cleanly)
        status: {
          'pending-bg': '#FEF3C7',  // amber-100
          'pending-fg': '#92400E',  // amber-800
          'cash-bg':    '#D1FAE5',  // emerald-100
          'cash-fg':    '#065F46',  // emerald-800
          'ins-bg':     '#DBEAFE',  // blue-100
          'ins-fg':     '#1E40AF',  // blue-800
          'xfer-bg':    '#EDE9FE',  // violet-100
          'xfer-fg':    '#5B21B6',  // violet-800
          'mix-bg':     '#FFEDD5',  // orange-100
          'mix-fg':     '#9A3412',  // orange-800
          'final-bg':   '#D1FAE5',  // emerald-100
          'final-fg':   '#064E3B',  // emerald-900
          'review-bg':  '#FEE2E2',  // red-100
          'review-fg':  '#991B1B',  // red-800
          'legacy-bg':  '#E0E7FF',  // indigo-100
          'legacy-fg':  '#3730A3',  // indigo-800
          'portal-bg':  '#CFFAFE',  // cyan-100
          'portal-fg':  '#155E75',  // cyan-800
        },

        // Text scales
        ink: {
          900: '#0B1628',
          800: '#11203B',
          700: '#1F2937',
          600: '#334155',
          500: '#475569',
          400: '#64748B',
          300: '#94A3B8',
          200: '#CBD5E1',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans Arabic',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        // Soft, medical-clean shadow language.
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        'card-hover': '0 4px 12px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)',
        popover: '0 12px 28px rgba(15,23,42,0.12), 0 4px 10px rgba(15,23,42,0.06)',
        'inner-soft': 'inset 0 1px 2px rgba(15,23,42,0.04)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      transitionTimingFunction: {
        'soft': 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 180ms ease-out both',
        'slide-up': 'slideUp 220ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
