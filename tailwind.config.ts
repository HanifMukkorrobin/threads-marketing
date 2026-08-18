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
        canvas: '#D9C5A3',       // Warm Oatmeal Sand (from reference image)
        island: '#FAF6EE',       // Cream Paper Interior
        dock: '#181816',         // Deep Charcoal Espresso
        retro: {
          canvas: '#D9C5A3',     // Warm Oatmeal Sand Canvas
          paper: '#FAF6EE',      // Cream Paper
          denim: '#6B9AC4',      // Retro Denim / Steel Blue
          'denim-dark': '#5386B4',
          coral: '#C95D53',      // Vintage Dusty Coral / Terracotta Red
          'coral-dark': '#B74F45',
          sand: '#D8C49D',       // Vintage Sand / Ochre
          'sand-light': '#E8DBC0',
          ink: '#181816',        // Deep Espresso Outline & Text
          yellow: '#FFE600',     // Electric Accent
          mint: '#00E699',       // Mint Green
          cyan: '#53C2D0',       // Soft Cyan
          dark: '#181816',       // Espresso Charcoal
          surface: '#FAF6EE',
          border: '#181816',
        },
        surface: {
          DEFAULT: '#FAF6EE',
          hover: '#F2ECE0',
          border: '#181816',
          muted: '#E6DCCB',
        },
        lime: {
          DEFAULT: '#C95D53',    // Dusty Coral as default primary CTA accent
          hover: '#B74F45',
          light: '#F8D7D4',
          dark: '#963C33',
        },
        ink: {
          DEFAULT: '#181816',    // Deep Charcoal
          secondary: '#4A463F',  // Vintage Slate
          muted: '#7A7468',      // Muted Sand Caption
        },
        threads: {
          bg: '#D9C5A3',
          card: '#FAF6EE',
          surface: '#FAF6EE',
          elevated: '#F2ECE0',
          border: '#181816',
          'border-subtle': '#C8BCAC',
          'border-active': '#181816',
          text: '#181816',
          secondary: '#4A463F',
          muted: '#7A7468',
          accent: '#6B9AC4',
          success: '#00E699',
          warning: '#D8C49D',
          danger: '#C95D53',
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
      borderRadius: {
        'retro-xs': '3px',
        'retro-sm': '6px',
        retro: '10px',
        'retro-lg': '14px',
        'retro-xl': '18px',
        island: '16px',
        bento: '12px',
        capsule: '9999px',
        threads: '12px',
      },
      boxShadow: {
        'retro-xs': '1.5px 1.5px 0px 0px #181816',
        'retro-sm': '2.5px 2.5px 0px 0px #181816',
        retro: '4px 4px 0px 0px #181816',
        'retro-md': '5px 5px 0px 0px #181816',
        'retro-lg': '8px 8px 0px 0px #181816',
        'retro-xl': '12px 12px 0px 0px #181816',
        island: '10px 10px 0px 0px #181816',
        bento: '4px 4px 0px 0px #181816',
        dock: '5px 5px 0px 0px #181816',
        pill: '2.5px 2.5px 0px 0px #181816',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        pop: 'pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slideUpFade 0.25s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
