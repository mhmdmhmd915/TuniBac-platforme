/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0F172A",
          light: "#F8FAFC"
        },
        secondary: {
          DEFAULT: "#1E293B",
          light: "#E2E8F0"
        },
        accent: "#38BDF8",
        success: "#10B981",
        background: {
          DEFAULT: "#020617",
          light: "#FFFFFF"
        },
        text: {
          DEFAULT: "#F8FAFC",
          light: "#0F172A",
          muted: {
            DEFAULT: "#94A3B8",
            light: "#64748B"
          }
        }
      },
    },
  },
  plugins: [],
}
