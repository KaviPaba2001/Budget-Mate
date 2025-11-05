import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import CustomButton from './CustomButton';

export default function EmptyState({ icon, title, message, onAction, actionText }) {
    return (
        <View style={styles.container}>
            <Ionicons name={icon} size={80} color={theme.colors.surface} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {onAction && actionText && (
                <CustomButton
                    title={actionText}
                    onPress={onAction}
                    variant="primary"
                    style={{ marginTop: theme.spacing.lg }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
    },
    title: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginTop: theme.spacing.md,
        textAlign: 'center',
    },
    message: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        textAlign: 'center',
        marginTop: theme.spacing.sm,
    },
});
