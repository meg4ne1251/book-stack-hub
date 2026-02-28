import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#92400e",
          dark: "#78350f",
          light: "#fef3c7",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#166534",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#b91c1c",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#b45309",
          foreground: "#FFFFFF",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "#faf7f2",
          dark: "#1c1917",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        md: "0 2px 8px rgba(0,0,0,0.06)",
        lg: "0 4px 16px rgba(0,0,0,0.08)",
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', "system-ui", "sans-serif"],
        serif: ['"Noto Serif JP"', "Georgia", "serif"],
        mono: ['"Source Code Pro"', "monospace"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
