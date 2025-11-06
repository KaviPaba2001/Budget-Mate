import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { getTransactions } from '../services/firebaseService';
import { theme } from '../styles/theme';

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
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('month'); // 'week', 'month', 'year'
    
    // Load transactions when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadTransactions();
        }, [])
    );

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const data = await getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter transactions based on selected period
    const getFilteredTransactions = () => {
        const now = new Date();
        return transactions.filter(transaction => {
            let transactionDate;
            if (transaction.date) {
                transactionDate = new Date(transaction.date);
            } else if (transaction.createdAt?.toDate) {
                transactionDate = transaction.createdAt.toDate();
            } else {
                transactionDate = new Date();
            }

            if (selectedPeriod === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return transactionDate >= weekAgo;
            } else if (selectedPeriod === 'month') {
                return transactionDate.getMonth() === now.getMonth() && 
                       transactionDate.getFullYear() === now.getFullYear();
            } else if (selectedPeriod === 'year') {
                return transactionDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    };

    const filteredTransactions = getFilteredTransactions();

    // Calculate totals
    const totalExpense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Group expenses by category
    const expensesByCategory = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, transaction) => {
            const category = transaction.category || 'other';
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category] += Math.abs(transaction.amount);
            return acc;
        }, {});

    // Colors for pie chart
    const categoryColors = {
        food: '#10b981',
        transport: '#f59e0b',
        shopping: '#ef4444',
        utilities: '#3b82f6',
        entertainment: '#8b5cf6',
        health: '#ec4899',
        education: '#14b8a6',
        other: '#6b7280',
    };

    // Data for Pie Chart (Spending by Category)
    const pieData = Object.entries(expensesByCategory)
        .map(([category, amount]) => ({
            value: amount,
            label: category.charAt(0).toUpperCase() + category.slice(1),
            color: categoryColors[category] || '#6b7280',
        }))
        .sort((a, b) => b.value - a.value);

    // Data for Bar Chart (Income vs Expense)
    const barData = [
        { 
            value: totalIncome, 
            label: 'Income', 
            frontColor: theme.colors.success,
            spacing: 10,
        },
        { 
            value: totalExpense, 
            label: 'Expense', 
            frontColor: theme.colors.danger,
        },
    ];

    // Calculate savings
    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

    // Get period label
    const getPeriodLabel = () => {
        if (selectedPeriod === 'week') return 'This Week';
        if (selectedPeriod === 'month') return 'This Month';
        if (selectedPeriod === 'year') return 'This Year';
        return '';
    };

    // Top spending categories
    const topCategories = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading reports...</Text>
            </View>
        );
    }

    if (filteredTransactions.length === 0) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Ionicons name="analytics-outline" size={80} color={theme.colors.text_secondary} />
                <Text style={styles.emptyTitle}>No Data Available</Text>
                <Text style={styles.emptyText}>
                    Add some transactions to see your financial reports
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <AnimatedView index={0}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Financial Report</Text>
                    <Text style={styles.headerSubtitle}>{getPeriodLabel()}</Text>
                </View>
            </AnimatedView>

            {/* Period Selector */}
            <AnimatedView index={1}>
                <View style={styles.periodSelector}>
                    {['week', 'month', 'year'].map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[
                                styles.periodButton,
                                selectedPeriod === period && styles.activePeriodButton
                            ]}
                            onPress={() => setSelectedPeriod(period)}
                        >
                            <Text style={[
                                styles.periodButtonText,
                                selectedPeriod === period && styles.activePeriodButtonText
                            ]}>
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </AnimatedView>

            {/* Summary Cards */}
            <AnimatedView index={2}>
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

            {/* Savings Card */}
            <AnimatedView index={3}>
                <View style={[styles.savingsCard, { backgroundColor: savings >= 0 ? '#064e3b' : '#7f1d1d' }]}>
                    <View style={styles.savingsHeader}>
                        <View>
                            <Text style={styles.savingsLabel}>Net Savings</Text>
                            <Text style={styles.savingsAmount}>
                                Rs. {Math.abs(savings).toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.savingsRateContainer}>
                            <Text style={styles.savingsRateLabel}>Rate</Text>
                            <Text style={styles.savingsRate}>{savingsRate}%</Text>
                        </View>
                    </View>
                    <View style={styles.savingsBar}>
                        <View 
                            style={[
                                styles.savingsBarFill, 
                                { 
                                    width: `${Math.min(Math.abs(parseFloat(savingsRate)), 100)}%`,
                                    backgroundColor: savings >= 0 ? '#10b981' : '#ef4444'
                                }
                            ]} 
                        />
                    </View>
                </View>
            </AnimatedView>

            {/* Spending by Category Pie Chart */}
            {pieData.length > 0 && (
                <AnimatedView index={4}>
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Spending by Category</Text>
                        <View style={styles.pieChartWrapper}>
                            <PieChart
                                data={pieData}
                                donut
                                showText
                                textColor={theme.colors.text_primary}
                                radius={100}
                                innerRadius={60}
                                textSize={12}
                                focusOnPress
                                centerLabelComponent={() => (
                                    <View style={{justifyContent: 'center', alignItems: 'center'}}>
                                        <Text style={{ fontSize: 18, color: theme.colors.text_primary, fontWeight: 'bold' }}>
                                            {totalExpense.toLocaleString()}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: theme.colors.text_secondary }}>Total</Text>
                                    </View>
                                )}
                            />
                        </View>
                        <View style={styles.legendContainer}>
                            {pieData.map(item => (
                                <View key={item.label} style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                    <Text style={styles.legendText}>{item.label}</Text>
                                    <Text style={styles.legendAmount}>Rs. {item.value.toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </AnimatedView>
            )}
            
            {/* Income vs Expense Bar Chart */}
            <AnimatedView index={5}>
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Income vs Expenses</Text>
                    <View style={styles.barChartWrapper}>
                        <BarChart
                            data={barData}
                            barWidth={80}
                            initialSpacing={40}
                            spacing={60}
                            barBorderRadius={8}
                            yAxisTextStyle={{ color: theme.colors.text_secondary, fontSize: 12 }}
                            xAxisLabelTextStyle={{ color: theme.colors.text_secondary, fontSize: 14 }}
                            yAxisThickness={0}
                            xAxisThickness={0}
                            isAnimated
                            noOfSections={4}
                            maxValue={Math.max(totalIncome, totalExpense) * 1.2}
                        />
                    </View>
                </View>
            </AnimatedView>

            {/* Top Spending Categories */}
            {topCategories.length > 0 && (
                <AnimatedView index={6}>
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Top Spending Categories</Text>
                        {topCategories.map(([category, amount], index) => {
                            const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
                            return (
                                <View key={category} style={styles.categoryRow}>
                                    <View style={styles.categoryInfo}>
                                        <View style={[
                                            styles.categoryDot, 
                                            { backgroundColor: categoryColors[category] || '#6b7280' }
                                        ]} />
                                        <Text style={styles.categoryName}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </Text>
                                    </View>
                                    <View style={styles.categoryStats}>
                                        <Text style={styles.categoryAmount}>Rs. {amount.toLocaleString()}</Text>
                                        <Text style={styles.categoryPercentage}>{percentage}%</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </AnimatedView>
            )}

            {/* Transaction Stats */}
            <AnimatedView index={7}>
                <View style={styles.statsContainer}>
                    <Text style={styles.chartTitle}>Statistics</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Ionicons name="receipt-outline" size={24} color={theme.colors.primary} />
                            <Text style={styles.statValue}>{filteredTransactions.length}</Text>
                            <Text style={styles.statLabel}>Transactions</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="trending-up-outline" size={24} color={theme.colors.success} />
                            <Text style={styles.statValue}>
                                {filteredTransactions.filter(t => t.type === 'income').length}
                            </Text>
                            <Text style={styles.statLabel}>Income</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="trending-down-outline" size={24} color={theme.colors.danger} />
                            <Text style={styles.statValue}>
                                {filteredTransactions.filter(t => t.type === 'expense').length}
                            </Text>
                            <Text style={styles.statLabel}>Expenses</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="analytics-outline" size={24} color={theme.colors.secondary} />
                            <Text style={styles.statValue}>
                                Rs. {totalExpense > 0 ? (totalExpense / filteredTransactions.filter(t => t.type === 'expense').length).toFixed(0) : 0}
                            </Text>
                            <Text style={styles.statLabel}>Avg Expense</Text>
                        </View>
                    </View>
                </View>
            </AnimatedView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
    },
    header: {
        padding: theme.spacing.md,
        paddingTop: theme.spacing.lg,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    headerSubtitle: {
        fontSize: 16,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.xs,
    },
    periodSelector: {
        flexDirection: 'row',
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: 4,
    },
    periodButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
    },
    activePeriodButton: {
        backgroundColor: theme.colors.primary,
    },
    periodButtonText: {
        color: theme.colors.text_secondary,
        fontWeight: '600',
        fontSize: theme.fontSize.sm,
    },
    activePeriodButtonText: {
        color: theme.colors.white,
    },
    summaryContainer: {
        flexDirection: 'row',
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.lg,
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
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginTop: theme.spacing.xs,
    },
    savingsCard: {
        marginHorizontal: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.lg,
    },
    savingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    savingsLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    savingsAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.white,
        marginTop: theme.spacing.xs,
    },
    savingsRateContainer: {
        alignItems: 'flex-end',
    },
    savingsRateLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    savingsRate: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    savingsBar: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
    },
    savingsBarFill: {
        height: '100%',
        borderRadius: theme.borderRadius.full,
    },
    chartContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.lg,
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
    barChartWrapper: {
        alignItems: 'center',
        marginVertical: theme.spacing.sm,
    },
    legendContainer: {
        marginTop: theme.spacing.lg,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: theme.spacing.sm,
    },
    legendText: {
        flex: 1,
        color: theme.colors.text_primary,
        fontSize: 14,
    },
    legendAmount: {
        color: theme.colors.text_secondary,
        fontSize: 14,
        fontWeight: '600',
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.background,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: theme.spacing.sm,
    },
    categoryName: {
        fontSize: 14,
        color: theme.colors.text_primary,
        fontWeight: '500',
    },
    categoryStats: {
        alignItems: 'flex-end',
    },
    categoryAmount: {
        fontSize: 14,
        color: theme.colors.text_primary,
        fontWeight: 'bold',
    },
    categoryPercentage: {
        fontSize: 12,
        color: theme.colors.text_secondary,
    },
    statsContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
    },
    statBox: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginTop: theme.spacing.xs,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.xs,
    },
    emptyTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginTop: theme.spacing.md,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        textAlign: 'center',
        marginTop: theme.spacing.sm,
    },
});