/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0066cc',
        'primary-focus': '#0071e3',
        'primary-dark': '#2997ff',
        ink: '#1d1d1f',
        'ink-muted': '#7a7a7a',
        'ink-strong': '#333333',
        parchment: '#f5f5f7',
        pearl: '#fafafc',
        hairline: '#e0e0e0',
        tile: '#272729',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'sans-serif'],
        display: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
        card: '18px',
        btn: '8px',
      },
    },
  },
  plugins: [],
};
