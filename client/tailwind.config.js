/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0e1a',
          secondary: '#111827',
          card: '#1a2035',
          input: '#0f1525',
        },
        border: {
          DEFAULT: '#2a3555',
          light: '#384670'
        },
        text: {
          primary: '#e8ecf4',
          secondary: '#8b95b0',
          muted: '#5a6580',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
        }
      }
    },
  },
  plugins: [],
}
