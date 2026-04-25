/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'riverside-red': '#C8102E',
        'riverside-red-hover': '#A50D26',
      },
    },
  },
  plugins: [],
}
