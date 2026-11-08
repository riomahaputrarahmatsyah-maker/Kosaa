/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./store/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#0F3D2E",
        "surface-light": "#1A1A1A",
        "surface-deep": "#071F17",
        primary: "#FFFFFF",
        secondary: "#A1A1AA",
        mint: "#10B981",
        "brand-mint": "#10B981",
        "mint-soft": "#34D399",
        "mint-dim": "#065F46",
        subtle: "#27272A",
        danger: "#F87171",
        warning: "#FBBF24",
        overlay: "rgba(0,0,0,0.65)",
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
