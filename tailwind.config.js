/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'] },
      colors: {
        primary: { DEFAULT: '#2563eb', foreground: '#ffffff' },
        secondary: { DEFAULT: '#6366f1', foreground: '#ffffff' }
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem' }
    }
  },
  plugins: []
}
