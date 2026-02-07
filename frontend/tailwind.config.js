/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand accent — Book Cloth / Kraft / Manilla
        primary: {
          DEFAULT: '#CC785C',
          light: '#D4A27F',
          dark: '#B5694F',
          manilla: '#EBDBBC',
        },
        // Slate — dark tones
        slate: {
          DEFAULT: '#191919',
          dark: '#191919',
          medium: '#262625',
          light: '#40403E',
        },
        // Cloud — mid grays
        cloud: {
          DEFAULT: '#91918D',
          dark: '#666663',
          medium: '#91918D',
          light: '#BFBFBA',
        },
        // Ivory — light warm tones
        ivory: {
          DEFAULT: '#F0F0EB',
          dark: '#E5E4DF',
          medium: '#F0F0EB',
          light: '#FAFAF7',
        },
        // Utility
        accent: '#000000',
        surface: '#FAFAF7',
        focus: '#61AAF2',
        error: '#BF4D43',
        'message-sent': '#F0F0EB',
        'message-received': '#FFFFFF',
      },
      animation: {
        bounce: 'bounce 1s infinite',
      },
      animationDelay: {
        0: '0ms',
        100: '100ms',
        200: '200ms',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.delay-0': {
          'animation-delay': '0ms',
        },
        '.delay-100': {
          'animation-delay': '100ms',
        },
        '.delay-200': {
          'animation-delay': '200ms',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
