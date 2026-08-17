import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#E3E9E5', // Soft Sage outer background
        island: '#FFFFFF', // Main floating white island
        dock: '#121214',   // Pitch black sidebar dock
        surface: {
          DEFAULT: '#F4F6F5',
          hover: '#EAEFEA',
          border: '#E1E6E2',
          muted: '#ECEFEF',
        },
        lime: {
          DEFAULT: '#E2FD52', // Electric Lime accent
          hover: '#D4F63D',
          light: '#F4FED4',
          dark: '#8DAA0E',
        },
        ink: {
          DEFAULT: '#121214',   // Dark charcoal/black
          secondary: '#646A72', // Slate secondary
          muted: '#9DA3AE',     // Muted caption
        },
        // Backwards compatibility aliases
        threads: {
          bg: '#E3E9E5',
          card: '#F4F6F5',
          surface: '#FFFFFF',
          elevated: '#ECEFEF',
          border: '#E1E6E2',
          'border-subtle': '#EEF2EE',
          'border-active': '#121214',
          text: '#121214',
          secondary: '#646A72',
          muted: '#9DA3AE',
          accent: '#121214',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.025em',
        tight: '-0.015em',
        widest: '0.08em',
      },
      borderRadius: {
        island: '36px',
        bento: '26px',
        capsule: '9999px',
        threads: '16px',
      },
      boxShadow: {
        island: '0 20px 60px -15px rgba(0, 0, 0, 0.07), 0 0 1px 1px rgba(0, 0, 0, 0.04)',
        bento: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
        dock: '0 12px 40px -8px rgba(0, 0, 0, 0.35)',
        pill: '0 2px 8px -1px rgba(0, 0, 0, 0.06)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        pop: 'pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;

