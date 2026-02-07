// src/styles/theme.js
// Complete Enhanced Theme System for Finance Tracker App
// "Emerald Night" Dark Theme with Professional Polish

export const theme = {
    // ==================== COLORS ====================
    colors: {
        // Primary Brand Colors
        primary: '#10b981',      // Vibrant emerald green
        primary_light: '#34d399', // Lighter shade for highlights
        primary_dark: '#059669',  // Darker shade for depth
        
        // Secondary & Accent Colors
        secondary: '#f59e0b',     // Amber for warnings/highlights
        secondary_light: '#fbbf24',
        secondary_dark: '#d97706',
        
        // Semantic Colors
        success: '#10b981',       // Green for positive actions
        danger: '#ef4444',        // Red for negative/destructive
        warning: '#f59e0b',       // Amber for caution
        info: '#3b82f6',          // Blue for information
        
        // Background & Surface Colors (Dark Theme)
        background: '#111827',    // Near-black main background (gray-900)
        surface: '#1f2937',       // Dark gray for cards/surfaces (gray-800)
        surface_light: '#374151', // Lighter surface variant (gray-700)
        
        // Text Colors
        text_primary: '#f9fafb',   // Off-white for primary text (gray-50)
        text_secondary: '#9ca3af', // Light gray for secondary text (gray-400)
        text_tertiary: '#6b7280',  // Medium gray for tertiary text (gray-500)
        text_disabled: '#4b5563',  // Darker gray for disabled text (gray-600)
        
        // Legacy/Compatibility Colors
        light: '#f8fafc',
        dark: '#1e293b',
        white: '#ffffff',
        black: '#000000',
        
        // Gray Scale Palette
        gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
        },
        
        // Gradient Colors
        gradient_primary_start: '#34d399',
        gradient_primary_end: '#10b981',
        gradient_secondary_start: '#fbbf24',
        gradient_secondary_end: '#f59e0b',
        gradient_danger_start: '#ef4444',
        gradient_danger_end: '#dc2626',
        
        // Glass/Blur Effects
        glass_border: 'rgba(255, 255, 255, 0.1)',
        glass_background: 'rgba(31, 41, 55, 0.8)',
        
        // Overlay Colors
        overlay_light: 'rgba(0, 0, 0, 0.3)',
        overlay_medium: 'rgba(0, 0, 0, 0.5)',
        overlay_dark: 'rgba(0, 0, 0, 0.7)',
        overlay_heavy: 'rgba(0, 0, 0, 0.85)',
    },
    
    // ==================== GRADIENTS ====================
    gradients: {
        // Semantic Gradients
        success: ['#10b981', '#059669'],
        danger: ['#ef4444', '#dc2626'],
        warning: ['#f59e0b', '#d97706'],
        info: ['#3b82f6', '#2563eb'],
        premium: ['#8b5cf6', '#7c3aed'],
        
        // Directional Gradients
        primary_horizontal: {
            colors: ['#34d399', '#10b981'],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 0 },
        },
        primary_vertical: {
            colors: ['#34d399', '#10b981'],
            start: { x: 0, y: 0 },
            end: { x: 0, y: 1 },
        },
        primary_diagonal: {
            colors: ['#34d399', '#10b981'],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 1 },
        },
        
        // Special Effect Gradients
        shimmer: ['transparent', 'rgba(255,255,255,0.1)', 'transparent'],
        glow: ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0)', 'rgba(16, 185, 129, 0.3)'],
    },
    
    // ==================== CHART COLORS ====================
    chartColors: {
        // Primary palette for charts (vibrant, accessible)
        primary: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
        
        // Pastel palette for softer visualizations
        pastel: ['#86efac', '#fde047', '#fca5a5', '#93c5fd', '#c4b5fd', '#f9a8d4', '#5eead4', '#fdba74'],
        
        // Monochrome palette
        monochrome: ['#f9fafb', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937'],
        
        // Category-specific colors (aligned with app categories)
        categories: {
            food: '#10b981',
            transport: '#f59e0b',
            shopping: '#ef4444',
            utilities: '#3b82f6',
            entertainment: '#8b5cf6',
            health: '#ec4899',
            education: '#14b8a6',
            salary: '#10b981',
            freelance: '#3b82f6',
            business: '#8b5cf6',
            investment: '#14b8a6',
            gift: '#ec4899',
            other: '#6b7280',
        },
    },
    
    // ==================== SPACING ====================
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
        xxxl: 64,
        
        // Component-specific spacing
        card_padding: 16,
        screen_padding: 16,
        section_gap: 24,
        list_item_gap: 12,
    },
    
    // ==================== TYPOGRAPHY ====================
    fontSize: {
        xs: 10,
        sm: 12,
        base: 14,
        md: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
        '5xl': 48,
    },
    
    typography: {
        // Display styles
        display_large: {
            fontSize: 48,
            fontWeight: 'bold',
            lineHeight: 56,
            letterSpacing: -0.5,
        },
        display_medium: {
            fontSize: 36,
            fontWeight: 'bold',
            lineHeight: 44,
            letterSpacing: -0.25,
        },
        display_small: {
            fontSize: 30,
            fontWeight: 'bold',
            lineHeight: 38,
        },
        
        // Heading styles
        h1: {
            fontSize: 28,
            fontWeight: 'bold',
            lineHeight: 36,
        },
        h2: {
            fontSize: 24,
            fontWeight: 'bold',
            lineHeight: 32,
        },
        h3: {
            fontSize: 20,
            fontWeight: '600',
            lineHeight: 28,
        },
        h4: {
            fontSize: 18,
            fontWeight: '600',
            lineHeight: 26,
        },
        h5: {
            fontSize: 16,
            fontWeight: '600',
            lineHeight: 24,
        },
        h6: {
            fontSize: 14,
            fontWeight: '600',
            lineHeight: 20,
        },
        
        // Body text styles
        body_large: {
            fontSize: 16,
            fontWeight: '400',
            lineHeight: 24,
        },
        body: {
            fontSize: 14,
            fontWeight: '400',
            lineHeight: 20,
        },
        body_small: {
            fontSize: 12,
            fontWeight: '400',
            lineHeight: 18,
        },
        
        // Label/Caption styles
        label_large: {
            fontSize: 14,
            fontWeight: '600',
            lineHeight: 20,
        },
        label: {
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 16,
        },
        label_small: {
            fontSize: 10,
            fontWeight: '600',
            lineHeight: 14,
        },
        
        caption: {
            fontSize: 12,
            fontWeight: '400',
            lineHeight: 16,
        },
        overline: {
            fontSize: 10,
            fontWeight: '600',
            lineHeight: 14,
            letterSpacing: 1,
            textTransform: 'uppercase',
        },
    },
    
    // Font weights
    fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
    },
    
    // ==================== BORDER RADIUS ====================
    borderRadius: {
        none: 0,
        xs: 2,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        '2xl': 20,
        '3xl': 24,
        full: 999,
        
        // Component-specific radius
        button: 12,
        card: 16,
        input: 12,
        modal: 20,
        chip: 999,
    },
    
    // ==================== SHADOWS ====================
    shadow: {
        none: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        xs: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.18,
            shadowRadius: 1,
            elevation: 1,
        },
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 5,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 10,
        },
        '2xl': {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 15 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 15,
        },
        
        // Colored shadows
        primary: {
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
        },
        danger: {
            shadowColor: '#ef4444',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
        },
        
        // Component-specific shadows
        card: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        },
        button: {
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
        },
        floating: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 12,
        },
    },
    
    // ==================== OPACITY ====================
    opacity: {
        disabled: 0.4,
        hover: 0.8,
        active: 0.9,
        overlay: 0.5,
    },
    
    // ==================== ANIMATIONS ====================
    animation: {
        duration: {
            fastest: 100,
            fast: 200,
            normal: 300,
            slow: 500,
            slowest: 800,
        },
        easing: {
            linear: 'linear',
            ease: 'ease',
            easeIn: 'ease-in',
            easeOut: 'ease-out',
            easeInOut: 'ease-in-out',
        },
    },
    
    // ==================== Z-INDEX ====================
    zIndex: {
        base: 0,
        dropdown: 1000,
        sticky: 1100,
        fixed: 1200,
        modalBackdrop: 1300,
        modal: 1400,
        popover: 1500,
        tooltip: 1600,
        notification: 1700,
    },
    
    // ==================== COMPONENT PRESETS ====================
    components: {
        // Button presets
        button: {
            primary: {
                backgroundColor: '#10b981',
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 24,
            },
            secondary: {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#10b981',
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 24,
            },
            ghost: {
                backgroundColor: 'transparent',
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 24,
            },
        },
        
        // Card presets
        card: {
            default: {
                backgroundColor: '#1f2937',
                borderRadius: 16,
                padding: 16,
            },
            elevated: {
                backgroundColor: '#1f2937',
                borderRadius: 16,
                padding: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
            },
            outlined: {
                backgroundColor: 'transparent',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: '#374151',
            },
        },
        
        // Input presets
        input: {
            default: {
                backgroundColor: '#1f2937',
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                fontSize: 14,
                color: '#f9fafb',
                borderWidth: 1,
                borderColor: '#374151',
            },
            focused: {
                borderColor: '#10b981',
                borderWidth: 2,
            },
            error: {
                borderColor: '#ef4444',
                borderWidth: 2,
            },
        },
    },
    
    // ==================== UTILITY FUNCTIONS ====================
    utils: {
        // Add alpha to hex color
        addAlpha: (color, opacity) => {
            const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
            return `${color}${alpha}`;
        },
        
        // Get responsive size based on screen width
        getResponsiveSize: (baseSize, screenWidth) => {
            if (screenWidth < 375) return baseSize * 0.9;
            if (screenWidth >= 768) return baseSize * 1.2;
            return baseSize;
        },
    },
};

// Export individual parts for convenience
export const colors = theme.colors;
export const spacing = theme.spacing;
export const fontSize = theme.fontSize;
export const typography = theme.typography;
export const borderRadius = theme.borderRadius;
export const shadows = theme.shadow;
export const gradients = theme.gradients;
export const chartColors = theme.chartColors;

// Export default
export default theme;