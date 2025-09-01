// apps/web/tailwind.config.js

/** @type {import('tailwindcss').Config} */
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  darkMode: ["class"],
  // Configure files to scan for Tailwind classes
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Define the custom color palette for the CRT theme
      colors: {
        'crt-bg': '#0A0A0C', 
        'crt-panel': '#0D1316',
        'crt-text': '#B3E0B3',
        'crt-orange': '#FF9F40',
        'crt-green': '#33FF33',
        'crt-model-green': '#A0FFA0',
        'crt-border-green': '#50C878',
        'crt-green-dim': '#228B22',
        'crt-light-green': 'rgba(179, 224, 179, 0.7)',
        'crt-border': '#2A3B2A',
        'crt-glow-orange': 'rgba(255, 159, 64, 0.25)',
        'crt-glow-green': 'rgba(51, 255, 51, 0.25)',
        'crt-glow-neon-green': 'rgba(179, 224, 179, 0.3)',
      },
      // Define the custom font family
      fontFamily: {
        terminal: ["VT323", ...fontFamily.mono],
      },
      // Define custom keyframe animations
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'stars-move': {
          'from': { 
            backgroundPosition: '0 0, 0 0, 0 0, 0 0'
          },
          'to': { 
            backgroundPosition: '-10000px 5000px, -5000px 2500px, -20000px 10000px, -2000px 1000px'
          },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '10.5%': { opacity: '0.95' },
          '20.2%': { opacity: '1' },
          '30.8%': { opacity: '0.88', transform: 'translateY(0.15px)' },
          '40.1%': { opacity: '1' },
          '50.7%': { opacity: '0.92' },
          '60.3%': { opacity: '1' },
          '70.9%': { opacity: '0.9', transform: 'translateY(-0.15px)' },
          '80.4%': { opacity: '1' },
          '90.6%': { opacity: '0.97' },
        }
      },
      // Make animations available as utility classes (e.g., animate-blink)
      animation: {
        blink: 'blink 1s step-end infinite',
        'stars-move': 'stars-move 500s linear infinite',
        flicker: 'flicker 0.15s infinite',
      },
      boxShadow: {
        'crt-glow': '0 0 15px 5px var(--tw-shadow-color)',
        'crt-glow-border': '0 0 10px 2px rgba(0, 255, 0, 0.3)',
      }
    },
  },
  plugins: [],
}