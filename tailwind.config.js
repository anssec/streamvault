/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)','serif'],
        body: ['var(--font-body)','sans-serif'],
      },
      colors: {
        sv: {
          bg: '#07090f',
          card: '#0f1319',
          border: '#1e2530',
          accent: '#3b82f6',
          'accent-hover': '#2563eb',
          muted: '#6b7280',
          red: '#ef4444',
          green: '#22c55e',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        shimmer: 'shimmer 1.6s infinite',
      },
      keyframes: {
        fadeUp: { from:{opacity:'0',transform:'translateY(16px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        shimmer: { '0%':{backgroundPosition:'-200% 0'},'100%':{backgroundPosition:'200% 0'} },
      }
    }
  },
  plugins: [],
}
