/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        industrial: {
          orange: '#F97316',
          navy: '#1E293B',
          steel: '#64748B'
        }
      },
      fontFamily: {
        sketch: ['Space Grotesk', 'sans-serif'],
        body: ['Space Grotesk', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
