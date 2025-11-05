import React, { useMemo } from 'react'; // Import useMemo
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';

export default function CustomButton({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    style,
    textStyle,
}) {
    // By creating the styles inside the component with useMemo,
    // we ensure the 'theme' object is always available and break any import cycles.
    const styles = useMemo(() => StyleSheet.create({
        button: {
            borderRadius: theme.borderRadius.lg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        // Sizes
        small: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
        },
        medium: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
        },
        large: {
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.lg,
        },
        // Variants
        primary: {
            backgroundColor: theme.colors.primary,
        },
        secondary: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.primary,
        },
        danger: {
            backgroundColor: theme.colors.danger,
        },
        // Disabled
        disabled: {
            backgroundColor: theme.colors.gray[700],
        },
        // Text styles
        text: {
            fontWeight: '600',
        },
        smallText: {
            fontSize: theme.fontSize.sm,
        },
        mediumText: {
            fontSize: theme.fontSize.base,
        },
        largeText: {
            fontSize: theme.fontSize.lg,
        },
        // Text colors
        primaryText: {
            color: theme.colors.white,
        },
        secondaryText: {
            color: theme.colors.primary,
        },
        dangerText: {
            color: theme.colors.white,
        },
        disabledText: {
            color: theme.colors.text_secondary,
        },
    }), []);

    const getButtonStyle = () => {
        const baseStyle = [styles.button, styles[size]];
        if (variant === 'primary') baseStyle.push(styles.primary);
        else if (variant === 'secondary') baseStyle.push(styles.secondary);
        else if (variant === 'danger') baseStyle.push(styles.danger);
        if (disabled || loading) baseStyle.push(styles.disabled);
        return baseStyle;
    };

    const getTextStyle = () => {
        const baseStyle = [styles.text, styles[`${size}Text`]];
        if (variant === 'primary') baseStyle.push(styles.primaryText);
        else if (variant === 'secondary') baseStyle.push(styles.secondaryText);
        else if (variant === 'danger') baseStyle.push(styles.dangerText);
        if (disabled || loading) baseStyle.push(styles.disabledText);
        return baseStyle;
    };

    return (
        <TouchableOpacity
            style={[...getButtonStyle(), style]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
                <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}
