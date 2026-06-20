import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Midnight Venue palette (from Stitch dashboard design)
        background: '#0b1326',
        surface: {
          DEFAULT: '#0b1326',
          dim: '#0b1326',
          bright: '#31394d',
          variant: '#2d3449',
          container: {
            lowest: '#060e20',
            low: '#131b2e',
            DEFAULT: '#171f33',
            high: '#222a3d',
            highest: '#2d3449',
          },
        },
        'on-surface': {
          DEFAULT: '#dae2fd',
          variant: '#cbc3d7',
        },
        primary: {
          DEFAULT: '#ecb2ff',
          fixed: '#f8d8ff',
          'fixed-dim': '#ecb2ff',
          container: '#db4df5',
          'on-primary': '#520071',
          'on-primary-container': '#ffffff',
          'on-primary-fixed': '#320047',
          'on-primary-fixed-variant': '#74009f',
          'inverse-primary': '#9900cf',
        },
        secondary: {
          DEFAULT: '#ffb1c3',
          fixed: '#ffd9e0',
          'fixed-dim': '#ffb1c3',
          container: '#ff4b89',
          'on-secondary': '#66002c',
          'on-secondary-container': '#590026',
          'on-secondary-fixed': '#3f0019',
          'on-secondary-fixed-variant': '#8f0041',
        },
        tertiary: {
          DEFAULT: '#00dbe9',
          fixed: '#7df4ff',
          'fixed-dim': '#00dbe9',
          container: '#00838b',
          'on-tertiary': '#00363a',
          'on-tertiary-container': '#ffffff',
          'on-tertiary-fixed': '#002022',
          'on-tertiary-fixed-variant': '#004f54',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
          'on-error': '#690005',
          'on-error-container': '#ffdad6',
        },
        outline: {
          DEFAULT: '#9d8ba0',
          variant: '#514255',
        },
        'surface-tint': '#ecb2ff',
        'inverse-surface': '#e5e1e4',
        'inverse-on-surface': '#303032',
      },
      fontFamily: {
        display: ['Hanken Grotesk', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist', 'monospace'],
        label: ['Geist', 'monospace'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg': [
          '32px',
          { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '700' },
        ],
        'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'title-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
        'mono-data': ['14px', { lineHeight: '20px', fontWeight: '400' }],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      spacing: {
        base: '4px',
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '40px',
        xl: '64px',
        gutter: '24px',
        'margin-desktop': '48px',
        'margin-mobile': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
