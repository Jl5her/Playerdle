/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Background colors
        bg: {
          primary: "#151826",
          secondary: "#1e2233",
        },
        // Text colors
        text: {
          primary: "#f2eedc",
          secondary: "#a8a5a0",
          muted: "#8c90a3",
        },
        // Border colors
        border: {
          DEFAULT: "#2c3248",
          strong: "#3a3f56",
        },
        // Accent colors
        accent: {
          primary: "#d6c27a",
          secondary: "#8fa3bf",
        },
        // State colors
        state: {
          success: "#7fae8e",
          "success-muted": "#4a6b5c",
          error: "#b26a6a",
          "error-muted": "#6b4f4f",
          warning: "#c9a96a",
        },
        // Tile colors
        tile: {
          empty: "#1e2233",
          border: "#272b3d",
          "border-strong": "#3a3f56",
          text: "#e5e2d0",
        },
      },
    },
  },
  plugins: [],
}
