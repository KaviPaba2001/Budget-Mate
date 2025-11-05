// The "Emerald Night" Theme
export const theme = {
    colors: {
        primary: '#10b981', // A vibrant green for accents and buttons
        secondary: '#f59e0b', // Kept for warnings or other highlights
        success: '#10b981', //
        danger: '#ef4444', //
        
        // Dark Theme Palette
        background: '#111827', // Near-black background (was gray.900)
        surface: '#1f2937',    // Dark gray for cards/surfaces (was gray.800)

        // Text Palette
        text_primary: '#f9fafb',   // Off-white for primary text (was gray.50)
        text_secondary: '#9ca3af', // Light gray for subtitles (was gray.400)

        // The original color names are kept for compatibility, but repurposed for the dark theme.
        light: '#f8fafc', //
        dark: '#1e293b',  //

        gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937', // New: card surface color
            900: '#111827', // New: background color
        },
        white: '#ffffff', //
        black: '#000000',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    fontSize: {
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
    },
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        full: 999,
    },
    // Shadows are less effective on dark backgrounds. We will rely more on borders.
    shadow: {
        sm: {
            elevation: 1,
        },
        md: {
            elevation: 2,
        },
        lg: {
            elevation: 4,
        },
    },
};