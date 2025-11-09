import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { getBudgets, getTransactions } from '../services/firebaseService';
import { theme } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Animated View Component
const AnimatedView = ({ children, index, delay = 100 }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(30);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    React.useEffect(() => {
        opacity.value = withDelay(
            index * delay, 
            withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
        );
        translateY.value = withDelay(
            index * delay, 
            withSpring(0, { damping: 15, stiffness: 100 })
        );
    }, []);

    return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

// Enhanced Category Colors (consistent across app)
const CATEGORY_COLORS = {
    food: '#10b981',
    transport: '#f59e0b',
    shopping: '#ef4444',
    utilities: '#3b82f6',
    entertainment: '#8b5cf6',
    health: '#ec4899',
    education: '#14b8a6',
    other: '#6b7280',
};

const CATEGORY_GRADIENTS = {
    food: ['#10b981', '#059669'],
    transport: ['#f59e0b', '#d97706'],
    shopping: ['#ef4444', '#dc2626'],
    utilities: ['#3b82f6', '#2563eb'],
    entertainment: ['#8b5cf6', '#7c3aed'],
    health: ['#ec4899', '#db2777'],
    education: ['#14b8a6', '#0d9488'],
    other: ['#6b7280', '#4b5563'],
};

export default function ReportsScreen() {
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [chartType, setChartType] = useState('pie'); // 'pie', 'bar'
    
    const scrollViewRef = useRef();

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const [transactionData, budgetData] = await Promise.all([
                getTransactions(),
                getBudgets()
            ]);
            setTransactions(transactionData);
            setBudgets(budgetData);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load financial data');
        } finally {
            setLoading(false);
        }
    };

    // Filter transactions by period
    const getFilteredTransactions = () => {
        const now = new Date();
        return transactions.filter(transaction => {
            let transactionDate = transaction.date 
                ? new Date(transaction.date) 
                : transaction.createdAt?.toDate?.() || new Date();

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

    // Calculate metrics
    const totalExpense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100) : 0;

    // Group expenses by category
    const expensesByCategory = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, transaction) => {
            const category = transaction.category || 'other';
            acc[category] = (acc[category] || 0) + Math.abs(transaction.amount);
            return acc;
        }, {});

    // Calculate budget usage
    const budgetUsage = Object.keys(budgets).map(category => {
        const spent = expensesByCategory[category] || 0;
        const budget = budgets[category];
        const percentage = budget > 0 ? (spent / budget) * 100 : 0;
        return {
            category,
            spent,
            budget,
            percentage,
            remaining: budget - spent,
        };
    }).sort((a, b) => b.percentage - a.percentage);

    // Top spending categories
    const topCategories = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Chart data
    const pieData = Object.entries(expensesByCategory)
        .map(([category, amount]) => {
            const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
            return {
                value: amount,
                label: category.charAt(0).toUpperCase() + category.slice(1),
                color: CATEGORY_COLORS[category] || '#6b7280',
                percentage,
                text: `${percentage}%`,
            };
        })
        .sort((a, b) => b.value - a.value);

    const barData = pieData.map((item, index) => ({
        value: item.value,
        label: item.label.substring(0, 3),
        frontColor: item.color,
        gradientColor: CATEGORY_GRADIENTS[item.label.toLowerCase()]?.[1] || item.color,
    }));

    // Generate insights
    const generateInsights = () => {
        const insights = [];
        
        if (savingsRate > 20) {
            insights.push({
                icon: 'checkmark-circle',
                color: theme.colors.success,
                text: `Great job! You're saving ${savingsRate.toFixed(0)}% of your income.`
            });
        } else if (savingsRate < 10 && savingsRate > 0) {
            insights.push({
                icon: 'alert-circle',
                color: theme.colors.secondary,
                text: `Your savings rate is ${savingsRate.toFixed(0)}%. Try to save at least 20%.`
            });
        } else if (savings < 0) {
            insights.push({
                icon: 'warning',
                color: theme.colors.danger,
                text: `You're spending Rs. ${Math.abs(savings).toLocaleString()} more than you earn!`
            });
        }

        const overBudget = budgetUsage.filter(b => b.percentage >= 100);
        if (overBudget.length > 0) {
            insights.push({
                icon: 'pie-chart',
                color: theme.colors.danger,
                text: `${overBudget.length} categor${overBudget.length === 1 ? 'y is' : 'ies are'} over budget.`
            });
        }

        const topSpender = topCategories[0];
        if (topSpender) {
            const [category, amount] = topSpender;
            const percent = ((amount / totalExpense) * 100).toFixed(0);
            insights.push({
                icon: 'trending-up',
                color: theme.colors.secondary,
                text: `${percent}% of spending is on ${category} (Rs. ${amount.toLocaleString()}).`
            });
        }

        return insights;
    };

    const insights = generateInsights();

    // Export functionality
    const handleExport = async () => {
        const reportText = `
Financial Report - ${selectedPeriod.toUpperCase()}
Generated: ${new Date().toLocaleDateString()}

SUMMARY
-------
Total Income: Rs. ${totalIncome.toLocaleString()}
Total Expenses: Rs. ${totalExpense.toLocaleString()}
Net Savings: Rs. ${savings.toLocaleString()}
Savings Rate: ${savingsRate.toFixed(1)}%

TOP SPENDING CATEGORIES
-----------------------
${topCategories.map(([cat, amt], i) => `${i + 1}. ${cat}: Rs. ${amt.toLocaleString()}`).join('\n')}

BUDGET STATUS
-------------
${budgetUsage.map(b => `${b.category}: ${b.percentage.toFixed(0)}% used (Rs. ${b.spent.toLocaleString()}/${b.budget.toLocaleString()})`).join('\n')}
        `;

        try {
            await Share.share({
                message: reportText,
                title: 'Financial Report',
            });
        } catch (error) {
            console.error('Error sharing report:', error);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading financial report...</Text>
            </View>
        );
    }

    if (filteredTransactions.length === 0) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Ionicons name="analytics-outline" size={80} color={theme.colors.text_secondary} />
                <Text style={styles.emptyTitle}>No Data Available</Text>
                <Text style={styles.emptyText}>Add transactions to see your financial report</Text>
            </View>
        );
    }

    return (
        <ScrollView 
            ref={scrollViewRef}
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            {/* Header */}
            <AnimatedView index={0} delay={50}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Financial Report</Text>
                        <Text style={styles.headerSubtitle}>
                            {selectedPeriod === 'week' ? 'Last 7 Days' : 
                             selectedPeriod === 'month' ? 'This Month' : 'This Year'}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.exportButton}
                        onPress={handleExport}
                    >
                        <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.exportButtonText}>Export</Text>
                    </TouchableOpacity>
                </View>
            </AnimatedView>

            {/* Period Selector */}
            <AnimatedView index={1} delay={75}>
                <View style={styles.periodSelector}>
                    {['week', 'month', 'year'].map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[
                                styles.periodButton,
                                selectedPeriod === period && styles.activePeriodButton
                            ]}
                            onPress={() => setSelectedPeriod(period)}
                            activeOpacity={0.7}
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

            {/* Key Metrics Cards */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.metricsScroll}
            >
                <AnimatedView index={2} delay={100}>
                    <LinearGradient
                        colors={['#10b981', '#059669']}
                        style={styles.metricCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="arrow-up-circle" size={32} color="white" />
                        <Text style={styles.metricLabel}>Income</Text>
                        <Text style={styles.metricValue}>Rs. {totalIncome.toLocaleString()}</Text>
                    </LinearGradient>
                </AnimatedView>

                <AnimatedView index={3} delay={125}>
                    <LinearGradient
                        colors={['#ef4444', '#dc2626']}
                        style={styles.metricCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="arrow-down-circle" size={32} color="white" />
                        <Text style={styles.metricLabel}>Expenses</Text>
                        <Text style={styles.metricValue}>Rs. {totalExpense.toLocaleString()}</Text>
                    </LinearGradient>
                </AnimatedView>

                <AnimatedView index={4} delay={150}>
                    <LinearGradient
                        colors={savings >= 0 ? ['#3b82f6', '#2563eb'] : ['#ef4444', '#dc2626']}
                        style={styles.metricCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="wallet" size={32} color="white" />
                        <Text style={styles.metricLabel}>Savings</Text>
                        <Text style={styles.metricValue}>Rs. {Math.abs(savings).toLocaleString()}</Text>
                        <Text style={styles.metricSubtext}>{savingsRate.toFixed(1)}% Rate</Text>
                    </LinearGradient>
                </AnimatedView>
            </ScrollView>

            {/* Insights Section */}
            {insights.length > 0 && (
                <AnimatedView index={5} delay={175}>
                    <View style={styles.insightsCard}>
                        <View style={styles.insightsHeader}>
                            <Ionicons name="bulb" size={20} color={theme.colors.secondary} />
                            <Text style={styles.insightsTitle}>Financial Insights</Text>
                        </View>
                        {insights.map((insight, index) => (
                            <View key={index} style={styles.insightItem}>
                                <Ionicons name={insight.icon} size={18} color={insight.color} />
                                <Text style={styles.insightText}>{insight.text}</Text>
                            </View>
                        ))}
                    </View>
                </AnimatedView>
            )}

            {/* Chart Section */}
            <AnimatedView index={6} delay={200}>
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>Spending Breakdown</Text>
                        <View style={styles.chartTypeSelector}>
                            <TouchableOpacity
                                style={[styles.chartTypeButton, chartType === 'pie' && styles.activeChartType]}
                                onPress={() => setChartType('pie')}
                            >
                                <Ionicons 
                                    name="pie-chart" 
                                    size={16} 
                                    color={chartType === 'pie' ? theme.colors.primary : theme.colors.text_secondary} 
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.chartTypeButton, chartType === 'bar' && styles.activeChartType]}
                                onPress={() => setChartType('bar')}
                            >
                                <Ionicons 
                                    name="bar-chart" 
                                    size={16} 
                                    color={chartType === 'bar' ? theme.colors.primary : theme.colors.text_secondary} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {chartType === 'pie' ? (
                        <View style={styles.pieChartWrapper}>
                            <PieChart
                                data={pieData}
                                donut
                                showText
                                textColor={theme.colors.white}
                                textSize={12}
                                radius={90}
                                innerRadius={55}
                                focusOnPress
                                centerLabelComponent={() => (
                                    <View style={styles.chartCenter}>
                                        <Text style={styles.chartCenterValue}>
                                            Rs. {(totalExpense / 1000).toFixed(1)}k
                                        </Text>
                                        <Text style={styles.chartCenterLabel}>Total</Text>
                                    </View>
                                )}
                            />
                        </View>
                    ) : (
                        <View style={styles.barChartWrapper}>
                            <BarChart
                                data={barData}
                                width={SCREEN_WIDTH - 80}
                                height={180}
                                barWidth={32}
                                spacing={20}
                                roundedTop
                                roundedBottom
                                noOfSections={4}
                                yAxisThickness={0}
                                xAxisThickness={1}
                                xAxisColor={theme.colors.gray[700]}
                                yAxisTextStyle={{ color: theme.colors.text_secondary, fontSize: 10 }}
                                xAxisLabelTextStyle={{ color: theme.colors.text_secondary, fontSize: 10 }}
                                isAnimated
                                animationDuration={800}
                            />
                        </View>
                    )}

                    {/* Legend */}
                    <View style={styles.legendContainer}>
                        {pieData.slice(0, 4).map((item, index) => (
                            <View key={index} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                <Text style={styles.legendLabel} numberOfLines={1}>
                                    {item.label}
                                </Text>
                                <Text style={styles.legendValue}>{item.percentage}%</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </AnimatedView>

            {/* Budget Progress */}
            {budgetUsage.length > 0 && (
                <AnimatedView index={7} delay={225}>
                    <View style={styles.budgetCard}>
                        <Text style={styles.sectionTitle}>Budget Progress</Text>
                        {budgetUsage.slice(0, 5).map((item, index) => (
                            <View key={index} style={styles.budgetItem}>
                                <View style={styles.budgetHeader}>
                                    <View style={styles.budgetInfo}>
                                        <View style={[
                                            styles.budgetDot, 
                                            { backgroundColor: CATEGORY_COLORS[item.category] || '#6b7280' }
                                        ]} />
                                        <Text style={styles.budgetCategory}>
                                            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                        </Text>
                                    </View>
                                    <Text style={[
                                        styles.budgetPercentage,
                                        item.percentage >= 100 && { color: theme.colors.danger }
                                    ]}>
                                        {item.percentage.toFixed(0)}%
                                    </Text>
                                </View>
                                <View style={styles.budgetBar}>
                                    <View 
                                        style={[
                                            styles.budgetBarFill, 
                                            { 
                                                width: `${Math.min(item.percentage, 100)}%`,
                                                backgroundColor: item.percentage >= 100 
                                                    ? theme.colors.danger 
                                                    : CATEGORY_COLORS[item.category] || theme.colors.primary
                                            }
                                        ]} 
                                    />
                                </View>
                                <View style={styles.budgetAmounts}>
                                    <Text style={styles.budgetSpent}>
                                        Rs. {item.spent.toLocaleString()}
                                    </Text>
                                    <Text style={styles.budgetTotal}>
                                        of Rs. {item.budget.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </AnimatedView>
            )}

            {/* Top Spending */}
            {topCategories.length > 0 && (
                <AnimatedView index={8} delay={250}>
                    <View style={styles.topSpendingCard}>
                        <Text style={styles.sectionTitle}>Top Spending</Text>
                        {topCategories.map(([category, amount], index) => {
                            const percentage = ((amount / totalExpense) * 100).toFixed(0);
                            return (
                                <View key={index} style={styles.topSpendingItem}>
                                    <View style={styles.topSpendingRank}>
                                        <Text style={styles.rankText}>{index + 1}</Text>
                                    </View>
                                    <View style={[
                                        styles.categoryIconSmall,
                                        { backgroundColor: `${CATEGORY_COLORS[category] || '#6b7280'}20` }
                                    ]}>
                                        <View style={[
                                            styles.categoryDotSmall,
                                            { backgroundColor: CATEGORY_COLORS[category] || '#6b7280' }
                                        ]} />
                                    </View>
                                    <View style={styles.topSpendingInfo}>
                                        <Text style={styles.topSpendingCategory}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </Text>
                                        <Text style={styles.topSpendingPercentage}>{percentage}% of total</Text>
                                    </View>
                                    <Text style={styles.topSpendingAmount}>
                                        Rs. {amount.toLocaleString()}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </AnimatedView>
            )}

            {/* Stats Grid */}
            <AnimatedView index={9} delay={275}>
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Ionicons name="receipt-outline" size={24} color={theme.colors.primary} />
                        <Text style={styles.statValue}>{filteredTransactions.length}</Text>
                        <Text style={styles.statLabel}>Transactions</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Ionicons name="calendar-outline" size={24} color={theme.colors.secondary} />
                        <Text style={styles.statValue}>
                            {filteredTransactions.filter(t => t.type === 'expense').length}
                        </Text>
                        <Text style={styles.statLabel}>Expenses</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Ionicons name="trending-up-outline" size={24} color={theme.colors.success} />
                        <Text style={styles.statValue}>
                            Rs. {filteredTransactions.filter(t => t.type === 'expense').length > 0 
                                ? (totalExpense / filteredTransactions.filter(t => t.type === 'expense').length).toFixed(0) 
                                : 0}
                        </Text>
                        <Text style={styles.statLabel}>Avg/Transaction</Text>
                    </View>
                </View>
            </AnimatedView>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingBottom: 20,
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
    emptyTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginTop: theme.spacing.md,
    },
    emptyText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
        paddingTop: theme.spacing.lg,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.colors.text_secondary,
        marginTop: 2,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.lg,
        gap: 6,
    },
    exportButtonText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    periodSelector: {
        flexDirection: 'row',
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: 4,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
    },
    activePeriodButton: {
        backgroundColor: theme.colors.primary,
    },
    periodButtonText: {
        color: theme.colors.text_secondary,
        fontWeight: '600',
        fontSize: 14,
    },
    activePeriodButtonText: {
        color: theme.colors.white,
    },
    metricsScroll: {
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        gap: 12,
    },
    metricCard: {
        width: 160,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        marginRight: 12,
    },
    metricLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 8,
        fontWeight: '500',
    },
    metricValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 4,
    },
    metricSubtext: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    insightsCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.secondary,
    },
    insightsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        gap: 8,
    },
    insightsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    insightItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 10,
        gap: 8,
    },
    insightText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text_secondary,
        lineHeight: 20,
    },
    chartCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    chartTypeSelector: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: 2,
        gap: 4,
    },
    chartTypeButton: {
        padding: 8,
        borderRadius: theme.borderRadius.sm,
    },
    activeChartType: {
        backgroundColor: theme.colors.surface,
    },
    pieChartWrapper: {
        alignItems: 'center',
        marginVertical: theme.spacing.md,
    },
    chartCenter: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 55,
        width: 110,
        height: 110,
    },
    chartCenterValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    chartCenterLabel: {
        fontSize: 12,
        color: theme.colors.text_secondary,
        marginTop: 2,
    },
    barChartWrapper: {
        alignItems: 'center',
        marginVertical: theme.spacing.md,
    },
    legendContainer: {
        marginTop: theme.spacing.lg,
        gap: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text_primary,
    },
    legendValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    budgetCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.md,
    },
    budgetItem: {
        marginBottom: theme.spacing.md,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    budgetInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    budgetDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    budgetCategory: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text_primary,
    },
    budgetPercentage: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    budgetBar: {
        height: 8,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
        marginBottom: 6,
    },
    budgetBarFill: {
        height: '100%',
        borderRadius: theme.borderRadius.full,
    },
    budgetAmounts: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    budgetSpent: {
        fontSize: 13,
        color: theme.colors.text_primary,
        fontWeight: '600',
    },
    budgetTotal: {
        fontSize: 13,
        color: theme.colors.text_secondary,
    },
    topSpendingCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    topSpendingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.background,
        gap: 12,
    },
    topSpendingRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    categoryIconSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryDotSmall: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    topSpendingInfo: {
        flex: 1,
    },
    topSpendingCategory: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text_primary,
    },
    topSpendingPercentage: {
        fontSize: 12,
        color: theme.colors.text_secondary,
        marginTop: 2,
    },
    topSpendingAmount: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: theme.spacing.md,
        marginTop: theme.spacing.sm,
    },
    statBox: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.text_secondary,
        textAlign: 'center',
    },
});