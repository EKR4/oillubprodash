/** @type {import('tailwindcss').Config} */
export default {
    content: {
        files: ["./src/**/*.{html,ts,scss}"],
    },
    theme: {
        extend: {
            screens: {
                xs: '20rem'
            },
            colors: {
                primary: {
                    DEFAULT: '#FEBD17', // Yellow color from the example
                    50: '#FFF9E6',
                    100: '#FFF3CC',
                    200: '#FFEA99',
                    300: '#FEE166',
                    400: '#FED833',
                    500: '#FEBD17', // Primary yellow
                    600: '#E0A100',
                    700: '#AD7C00',
                    800: '#7A5700',
                    900: '#473300',
                },
                secondary: {
                    DEFAULT: '#1F2937', // Dark gray from the example
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF',
                    500: '#6B7280',
                    600: '#4B5563',
                    700: '#374151',
                    800: '#1F2937', // Secondary dark
                    900: '#111827',
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                'sans-tight': ['Inter Tight', 'sans-serif'],
            },
        },
    },
}