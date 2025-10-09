// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"], // usando next-themes com attribute="class"
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // usa as CSS vars que definimos no globals.css
        sans: ["var(--viu-font-sans)", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["var(--viu-font-mono)", "ui-monospace", "SFMono-Regular"],
      },
      colors: {
        cy: {
          bg: "hsl(var(--cy-bg))",
          surface: "hsl(var(--cy-surface))",
          "surface-2": "hsl(var(--cy-surface-2))",
          border: "hsl(var(--cy-border))",
          accent: "hsl(var(--cy-accent))",
          muted: "hsl(var(--cy-muted))",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
