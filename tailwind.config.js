/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg:            '#0E0F11',
          surface:       '#15171A',
          'surface-alt': '#1C1F23',
          'surface-hi':  '#24282D',
          line:          '#262A2F',
          'line-soft':   '#1E2125',
          ink:           '#E8E9EB',
          'ink-2':       '#A0A4AA',
          'ink-3':       '#6B7077',
          accent:        '#B8D06B',
          'accent-ink':  '#0E0F11',
          'accent-soft': '#3A4724',
          positive:      '#7CC08A',
          'pos-soft':    '#1F3325',
          negative:      '#E07B6B',
          'neg-soft':    '#3A201C',
          warn:          '#E0B86B',
          'warn-soft':   '#3A2F1C',
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
