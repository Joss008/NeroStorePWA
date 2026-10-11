import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "380px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        scene: {
          950: "#050505",
          900: "#0a0a0a",
          800: "#111111",
          700: "#1a0a0a",
          600: "#2a0d0d",
          500: "#3d1212",
        },
        accent: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          dark: "#dc2626",
          glow: "#fb7185",
        },
        mythic: "#ef4444",
        legendary: "#f59e0b",
        rare: "#a855f7",
        uncommon: "#22d3ee",
        common: "#9ca3af",
      },
      fontFamily: {
        editorial: ["var(--font-cormorant)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(239, 68, 68, 0.5)" },
          "50%": { boxShadow: "0 0 40px rgba(239, 68, 68, 0.8)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        glow: "glow 3s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        pulse: "pulse 2s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;