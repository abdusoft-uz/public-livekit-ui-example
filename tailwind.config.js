/** @type {import('tailwindcss').Config} */

const colors = require('tailwindcss/colors')
const customColors = {
  cyan: colors.cyan,
  green: colors.green,
  amber: colors.amber,
  violet: colors.violet,
  blue: colors.blue,
  rose: colors.rose,
  pink: colors.pink,
  teal: colors.teal,
  red: colors.red,
};

let customShadows = {};
let textShadows = {};

for (const [name, color] of Object.entries(customColors)) {
  customShadows[`${name}`] = `0px 0px 10px ${color["500"]}`;
  customShadows[`lg-${name}`] = `0px 0px 20px ${color["600"]}`;
  textShadows[`${name}`] = `0px 0px 4px ${color["700"]}`;
}

module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: colors.neutral,
      ...customColors
    },
    extend: {
      dropShadow: {
       ...textShadows,
      },
      boxShadow: {
        ...customShadows,
      }
    }
  },
  plugins: [],
};