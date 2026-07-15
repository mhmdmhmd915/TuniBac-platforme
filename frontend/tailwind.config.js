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
          DEFAULT: "#071D49",
          light: "#F8FBFF"
        },
        secondary: {
          DEFAULT: "#0D2C66",
          light: "#EAF2FF"
        },
        accent: "#0B5ED7",
        brand: {
          blue: "#0B5ED7",
          "blue-dark": "#06295B",
          red: "#E70013",
          white: "#FFFFFF",
          mist: "#F5F8FF"
        },
        success: "#10B981",
        background: {
          DEFAULT: "#03132F",
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
