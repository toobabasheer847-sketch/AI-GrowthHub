/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effcfb",
          100: "#c8f4ef",
          200: "#96e7de",
          300: "#5fd5cc",
          400: "#2db7b0",
          500: "#18958f",
          600: "#137874",
          700: "#135f5c",
          800: "#144c4a",
          900: "#153f3d",
        },
      },
      boxShadow: {
        soft: "0 20px 45px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};
