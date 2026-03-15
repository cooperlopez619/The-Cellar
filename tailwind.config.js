/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cellar: {
          bg:      '#0C1519',  // Chinese Black
          surface: '#162127',  // Dark Jungle Green
          card:    '#3A3534',  // Jet
          border:  '#2A3A42',  // between surface & card
          amber:   '#CF9D7B',  // Antique Brass
          'amber-light': '#CF9D7B',  // Antique Brass
          cream:   '#CF9D7B',  // Antique Brass — headings
          muted:   '#7A8E94',  // desaturated teal-grey
          green:   '#4CAF7D',
          red:     '#D4563A',
        },
      },
      fontFamily: {
        display: ['Battlesbridge', 'Georgia', 'serif'],
        serif:   ['var(--font-playfair)', 'Georgia', 'serif'],
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
