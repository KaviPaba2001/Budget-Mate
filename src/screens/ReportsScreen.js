import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withDelay } from 'react-native-reanimated';

// Animated component for staggered entry
const AnimatedView = ({ children, index }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    React.useEffect(() => {
        opacity.value = withDelay(index * 150, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
        translateY.value = withDelay(index * 150, withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }));
    }, []);

    return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

export default function ReportsScreen() {
    // Mock data for demonstration
    const transactions = [
        { type: 'expense', category: 'Food', amount: 5500 },
        { type: 'expense', category: 'Transport', amount: 2500 },
        { type: 'expense', category: 'Shopping', amount: 8000 },
        { type: 'expense', category: 'Utilities', amount: 3200 },
        { type: 'expense', category: 'Health', amount: 1500 },
        { type: 'income', category: 'Salary', amount: 60000 },
        { type: 'income', category: 'Freelance', amount: 10000 },
    ];

    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

    // Data for Pie Chart (Spending by Category)
    const pieData = transactions
        .filter(t => t.type === 'expense')
        .map((item, index) => ({
            value: item.amount,
            label: item.category,
            color: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'][index % 5],
            focused: false,
        }));

    // Data for Bar Chart (Income vs Expense)
    const barData = [
        { value: totalIncome, label: 'Income', frontColor: theme.colors.success },
        { value: totalExpense, label: 'Expense', frontColor: theme.colors.danger },
    ];

    return (
        <ScrollView style={styles.container}>
            <AnimatedView index={0}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Financial Report</Text>
                    <Text style={styles.headerSubtitle}>June 2025</Text>
                </View>
            </AnimatedView>

            {/* Summary Cards */}
            <AnimatedView index={1}>
                <View style={styles.summaryContainer}>
                    <View style={[styles.summaryCard, { borderLeftColor: theme.colors.success }]}>
                        <Ionicons name="arrow-up-circle" size={24} color={theme.colors.success} />
                        <Text style={styles.summaryLabel}>Total Income</Text>
                        <Text style={styles.summaryAmount}>Rs. {totalIncome.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderLeftColor: theme.colors.danger }]}>
                        <Ionicons name="arrow-down-circle" size={24} color={theme.colors.danger} />
                        <Text style={styles.summaryLabel}>Total Expense</Text>
                        <Text style={styles.summaryAmount}>Rs. {totalExpense.toLocaleString()}</Text>
                    </View>
                </View>
            </AnimatedView>

            {/* Spending by Category Pie Chart */}
            <AnimatedView index={2}>
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Spending by Category</Text>
                    <View style={styles.pieChartWrapper}>
                        <PieChart
                            data={pieData}
                            donut
                            showText
                            textColor={theme.colors.text_primary}
                            radius={120}
                            innerRadius={70}
                            textSize={14}
                            focusOnPress
                            centerLabelComponent={() => (
                                <View style={{justifyContent: 'center', alignItems: 'center'}}>
                                    <Text style={{ fontSize: 22, color: theme.colors.text_primary, fontWeight: 'bold' }}>
                                        {totalExpense.toLocaleString()}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: theme.colors.text_secondary }}>Total Spent</Text>
                                </View>
                            )}
                        />
                    </View>
                    <View style={styles.legendContainer}>
                        {pieData.map(item => (
                            <View key={item.label} style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                <Text style={styles.legendText}>{item.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </AnimatedView>
            
            {/* Income vs Expense Bar Chart */}
            <AnimatedView index={3}>
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Monthly Overview</Text>
                    <BarChart
                        data={barData}
                        barWidth={60}
                        initialSpacing={50}
                        spacing={80}
                        barBorderRadius={8}
                        yAxisTextStyle={{ color: theme.colors.text_secondary }}
                        xAxisLabelTextStyle={{ color: theme.colors.text_secondary }}
                        yAxisThickness={0}
                        xAxisThickness={0}
                        isAnimated
                    />
                </View>
            </AnimatedView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
    },
    header: {
        marginBottom: theme.spacing.lg,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    headerSubtitle: {
        fontSize: 16,
        color: theme.colors.text_secondary,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
        gap: theme.spacing.md,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderLeftWidth: 4,
    },
    summaryLabel: {
        fontSize: 14,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.sm,
    },
    summaryAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    chartContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.lg,
    },
    pieChartWrapper: {
        alignItems: 'center',
        marginVertical: theme.spacing.md,
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: theme.spacing.lg,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: theme.spacing.sm,
    },
    legendText: {
        color: theme.colors.text_secondary,
        fontSize: 14,
    },
});