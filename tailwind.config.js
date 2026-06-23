/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Themeable tokens — driven by CSS variables so themes can swap at runtime.
        void: 'rgb(var(--c-void) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        panel2: 'rgb(var(--c-panel2) / <alpha-value>)',
        hairline: 'rgb(var(--c-hairline) / 0.08)',
        crush: 'rgb(var(--c-crush) / <alpha-value>)', // primary accent
        crush2: 'rgb(var(--c-crush2) / <alpha-value>)',
        cyan: 'rgb(var(--c-cyan) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        violet: 'rgb(var(--c-violet) / <alpha-value>)',
        // Foreground: text/surfaces/borders all key off this so light themes invert cleanly.
        white: 'rgb(var(--c-fg) / <alpha-value>)',
        // Text that sits on a colored accent fill — stays light in every theme.
        onaccent: 'rgb(var(--c-on-accent) / <alpha-value>)',
        // Per-game accent colors stay fixed (they're game identities, not themes)
        op: '#e23b4e',
        lorcana: '#c9a44a',
        swu: '#3a93ff',
        mtg: '#d8821f',
        pokemon: '#ffcb05',
        weiss: '#7c5cff',
        topps: '#e0524d',
      },
      boxShadow: {
        glass: '0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
        glow: '0 0 0 1px rgb(var(--c-crush) / 0.18), 0 6px 22px rgb(var(--c-crush) / 0.10)',
        goldglow: '0 0 0 1px rgb(var(--c-gold) / 0.3), 0 6px 24px rgb(var(--c-gold) / 0.14)',
        card: '0 18px 40px -12px rgba(0,0,0,0.7)',
      },
      backgroundImage: {
        'mesh': 'radial-gradient(60% 50% at 15% 0%, rgb(var(--c-crush) / 0.07), transparent 60%), radial-gradient(50% 50% at 95% 10%, rgb(var(--c-cyan) / 0.05), transparent 55%)',
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E\")",
      },
      borderRadius: {
        xl2: '1.4rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'pop': 'pop 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer': 'shimmer 2.2s linear infinite',
        'float': 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
