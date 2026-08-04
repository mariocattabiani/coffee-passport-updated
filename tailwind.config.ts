import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        // Brand palette — straight from the Coffee Passport Design System doc.
        espresso: "#5B3A29",
        latte: "#C89F7A",
        crema: "#FAF8F4",
        sage: "#6F8F72",
        charcoal: "#2B2B2B",
        success: "#4F8A5B",
        error: "#B45353",

        // shadcn/ui-style aliases so every component (buttons, inputs, cards)
        // automatically follows the brand palette above without extra work.
        background: "#FAF8F4",
        foreground: "#2B2B2B",
        border: "#E7DFD3",
        input: "#E7DFD3",
        ring: "#5B3A29",
        primary: {
          DEFAULT: "#5B3A29",
          foreground: "#FAF8F4",
        },
        secondary: {
          DEFAULT: "#C89F7A",
          foreground: "#2B2B2B",
        },
        accent: {
          DEFAULT: "#6F8F72",
          foreground: "#FAF8F4",
        },
        destructive: {
          DEFAULT: "#B45353",
          foreground: "#FAF8F4",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#2B2B2B",
        },
        muted: {
          DEFAULT: "#F1ECE3",
          foreground: "#6B6157",
        },
        gold: "#C99A3B",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(43, 43, 43, 0.06)",
        card: "0 4px 20px rgba(91, 58, 41, 0.08)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(1.3) rotate(-8deg)" },
          "60%": { opacity: "1", transform: "scale(0.96) rotate(-8deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-8deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "stamp-in": "stamp-in 0.5s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
