/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: 'oklch(97% 0.014 75)',
        card: 'oklch(99% 0.006 75)',
        border: 'oklch(88% 0.01 70)',
        rowborder: 'oklch(93% 0.008 70)',
        body: 'oklch(24% 0.01 60)',
        muted: 'oklch(45% 0.01 60)',
        subtle: 'oklch(50% 0.01 60)',
        accent: 'oklch(58% 0.1 40)',
        'accent-hover': 'oklch(52% 0.1 40)',
        positive: 'oklch(56% 0.09 145)',
        'positive-text': 'oklch(46% 0.1 145)',
        negative: 'oklch(50% 0.16 25)',
        tile: 'oklch(97% 0.008 75)',
        'tile-text': 'oklch(35% 0.01 60)',
        inputborder: 'oklch(85% 0.01 70)',
        sidebar: 'oklch(24% 0.02 50)',
        'sidebar-active': 'oklch(32% 0.03 45)',
        'sidebar-text': 'oklch(78% 0.012 75)',
        'sidebar-text-active': 'oklch(97% 0.01 75)',
        'sidebar-border': 'oklch(34% 0.02 50)',
        'sidebar-input-bg': 'oklch(30% 0.02 50)',
        'sidebar-input-border': 'oklch(40% 0.02 50)',
        'sidebar-muted': 'oklch(60% 0.015 70)',
        'sidebar-title': 'oklch(94% 0.012 75)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Helvetica Neue'", 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', "'SF Mono'", 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
