/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Colores temáticos para Mana Forge
        mana: {
          white: "#f8f6d8",
          blue: "#c1d7e9",
          black: "#bab1ab",
          red: "#e49977",
          green: "#a3c095",
        },
      },
    },
  },
  plugins: [],
};
