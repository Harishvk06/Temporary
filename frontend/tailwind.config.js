/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          primary: "#c4c0ff",
          secondary: "#2fd9f4",
          accent: "#dee1f9",
          dark: "#0e1323",
          darker: "#080c18",
          card: "rgba(14, 19, 35, 0.75)",
          border: "rgba(248, 250, 252, 0.08)",
          text: "#c7c4d8",
          glow: "rgba(47, 217, 244, 0.3)"
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      boxShadow: {
        'aura-card': '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
        'aura-glow': '0 0 25px rgba(47, 217, 244, 0.3)',
        'aura-purple-glow': '0 0 30px rgba(196, 192, 255, 0.3)'
      },
      borderRadius: {
        'card': '16px',
        'button': '9999px'
      },
      backdropBlur: {
        'xs': '6px',
      }
    },
  },
  plugins: [],
}
