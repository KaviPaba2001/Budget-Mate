import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

export default function TransactionCard({ transaction, onPress }) {
    const isIncome = transaction.amount > 0;

    const categoryIcons = {
        food: 'restaurant',
        transport: 'car',
        shopping: 'bag',
        utilities: 'flash',
        entertainment: 'game-controller',
        health: 'medical',
        education: 'school',
        salary: 'briefcase',
        freelance: 'laptop',
        business: 'storefront',
        investment: 'trending-up',
        gift: 'gift',
        other: 'ellipsis-horizontal',
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.iconContainer}>
                <Ionicons
                    name={categoryIcons[transaction.category] || 'ellipsis-horizontal'}
                    size={24}
                    color={theme.colors.primary}
                />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{transaction.title}</Text>
                <Text style={styles.category}>{transaction.category}</Text>
                <Text style={styles.date}>{transaction.date}</Text>
            </View>
            <View style={styles.amountContainer}>
                <Text style={[styles.amount, { color: isIncome ? theme.colors.success : theme.colors.danger }]}>
                    {isIncome ? '+' : '-'}Rs. {Math.abs(transaction.amount).toLocaleString()}
                </Text>
                <Ionicons
                    name={isIncome ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={isIncome ? theme.colors.success : theme.colors.danger}
                />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.sm,
        ...theme.shadow.sm,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.gray[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: theme.fontSize.base,
        fontWeight: '600',
        color: theme.colors.dark,
        marginBottom: 2,
    },
    category: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.gray[500],
        marginBottom: 2,
        textTransform: 'capitalize',
    },
    date: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.gray[400],
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    amount: {
        fontSize: theme.fontSize.base,
        fontWeight: 'bold',
    },
});