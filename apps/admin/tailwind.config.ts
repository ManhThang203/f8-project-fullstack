import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Costy-style palette: off-white surface, near-black text, minimal accents.
 * Real shadcn/ui CSS variables live in app/globals.css; this config just wires
 * Tailwind utility classes to those variables.
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './modules/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '640px' } },
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        'auth-hero': {
          DEFAULT: 'hsl(var(--auth-hero))',
          soft: 'hsl(var(--auth-hero-soft))',
          illustration: 'hsl(var(--auth-illustration-bg))',
        },
        'auth-form': {
          title: 'hsl(var(--auth-form-title))',
          button: {
            DEFAULT: 'hsl(var(--auth-form-button-bg))',
            fg: 'hsl(var(--auth-form-button-fg))',
          },
          input: {
            DEFAULT: 'hsl(var(--auth-form-input-bg))',
            border: 'hsl(var(--auth-form-input-border))',
            icon: 'hsl(var(--auth-form-input-icon))',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'costy-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.25)', opacity: '0.25' },
        },
      },
      animation: {
        'costy-pulse': 'costy-pulse 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
