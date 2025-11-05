import React, { useMemo } from 'react'; // Import useMemo
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function BudgetCard({ spent, budget, title = "", showTitle = true, compact = false }) {
    const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const isOverBudget = spent > budget;

    // By creating the styles inside the component with useMemo,
    // we ensure the 'theme' object is always available.
    const styles = useMemo(() => StyleSheet.create({
        container: {
            backgroundColor: theme.colors.surface,
            padding: compact ? theme.spacing.sm : theme.spacing.md,
            borderRadius: theme.borderRadius.lg,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
        },
        title: {
            fontSize: theme.fontSize.base,
            fontWeight: '600',
            color: theme.colors.text_primary,
        },
        progressBar: {
            height: 8,
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.full,
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            borderRadius: theme.borderRadius.full,
        },
        percentage: {
            fontSize: theme.fontSize.sm,
            fontWeight: '600',
            color: theme.colors.text_secondary,
        },
        amountContainer: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: theme.spacing.xs,
            marginTop: theme.spacing.sm,
        },
        spentAmount: {
            fontSize: theme.fontSize.base,
            fontWeight: 'bold',
            color: theme.colors.text_primary,
        },
        budgetAmount: {
            fontSize: theme.fontSize.sm,
            color: theme.colors.text_secondary,
        },
    }), [compact]);


    return (
        <View style={styles.container}>
            {showTitle && (
                <View style={styles.header}>
                    <Text style={styles.title}>{title || 'Budget'}</Text>
                    <Text style={[styles.percentage, isOverBudget && { color: theme.colors.danger }]}>
                        {Math.round(percentage)}% Used
                    </Text>
                </View>
            )}
            <View style={styles.progressBar}>
                <LinearGradient
                    colors={isOverBudget ? ['#ef4444', '#b91c1c'] : [theme.colors.gradient_primary_start, theme.colors.gradient_primary_end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${percentage}%` }]}
                />
            </View>
            <View style={styles.amountContainer}>
                <Text style={[styles.spentAmount, isOverBudget && { color: theme.colors.danger }]}>
                    Rs. {spent.toLocaleString()}
                </Text>
                <Text style={styles.budgetAmount}>
                    of Rs. {budget.toLocaleString()}
                </Text>
            </View>
        </View>
    );
}
