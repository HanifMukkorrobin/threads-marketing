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
        threads: {
          bg: '#101010',
          card: '#181818',
          surface: '#1e1e1e',
          border: '#262626',
          text: '#F3F5F7',
          secondary: '#777777',
          muted: '#555555',
          accent: '#0095F6',
          success: '#00BA7C',
          warning: '#F45D22',
          danger: '#FF3040',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      letterSpacing: {
        tightest: '-0.03em',
        tighter: '-0.02em',
      },
      borderRadius: {
        threads: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
