// WeeklyReportScreen.js - Complete Enhanced Version
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import Animated, {
    FadeInDown,
    FadeInRight
} from 'react-native-reanimated';
import { auth, db } from '../../firebase';
import { theme } from '../styles/theme';

// Cache key for weekly report data
const WEEKLY_REPORT_CACHE_KEY = 'weekly_report_cache';

// Category configuration with colors and icons
const CATEGORY_CONFIG = {
    food: { name: 'Food & Dining', icon: 'restaurant', color: '#10b981' },
    transport: { name: 'Transportation', icon: 'car', color: '#f59e0b' },
    shopping: { name: 'Shopping', icon: 'bag', color: '#ef4444' },
    utilities: { name: 'Bills & Utilities', icon: 'flash', color: '#3b82f6' },
    entertainment: { name: 'Entertainment', icon: 'game-controller', color: '#8b5cf6' },
    health: { name: 'Healthcare', icon: 'medical', color: '#ec4899' },
    education: { name: 'Education', icon: 'school', color: '#14b8a6' },
    other: { name: 'Other', icon: 'ellipsis-horizontal', color: '#6b7280' },
};

/**
 * FIX: Enhanced function to get ISO week boundaries (Monday to Sunday)
 * Ensures accurate date boundary setting to avoid missing transactions.
 * @param {number} weekOffset - Offset from current week (0 for current, -1 for previous).
 * @returns {{start: Date, end: Date}} The start (Monday 00:00:00.000) and end (Sunday 23:59:59.999) dates.
 */
const getISOWeekBounds = (weekOffset = 0) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
    // Calculate difference to Monday (1)
    let diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    // Apply week offset
    diffToMonday += (weekOffset * 7);
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    // Set time to the very start of Monday
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    // Calculate 6 days forward
    sunday.setDate(monday.getDate() + 6);
    // Set time to the very end of Sunday (crucial for Firestore '<=' query)
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
};

// Format date range for display
const formatWeekRange = (start, end) => {
    const formatDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}`;
    };
    
    return `${formatDate(start)} – ${formatDate(end)}, ${start.getFullYear()}`;
};

// Animated Card Component
const AnimatedCard = ({ children, delay = 0, style }) => {
    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(600).springify()}
            style={[styles.card, style]}
        >
            {children}
        </Animated.View>
    );
};

export default function WeeklyReportScreen({ navigation }) {
    const [weekOffset, setWeekOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    
    // Load transactions for selected week
    useEffect(() => {
        loadWeeklyData();
    }, [weekOffset]);

    const loadWeeklyData = async () => {
        setLoading(true);
        try {
            const { start, end } = getISOWeekBounds(weekOffset);
            
            // Try to load from cache first
            const cacheKey = `${WEEKLY_REPORT_CACHE_KEY}_${start.getTime()}`;
            const cachedData = await AsyncStorage.getItem(cacheKey);
            
            if (cachedData && weekOffset === 0) {
                // Use cached data for current week
                setTransactions(JSON.parse(cachedData));
                setLoading(false);
                return;
            }
            
            // Fetch from Firestore
            const userId = auth.currentUser?.uid;
            if (!userId) throw new Error('User not authenticated');
            
            const transactionsRef = collection(db, 'users', userId, 'transactions');
            const q = query(
                transactionsRef,
                // Ensure field is 'createdAt' which is the Timestamp
                where('createdAt', '>=', Timestamp.fromDate(start)),
                where('createdAt', '<=', Timestamp.fromDate(end))
            );
            
            const querySnapshot = await getDocs(q);
            const txnData = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                txnData.push({
                    id: doc.id,
                    ...data,
                    // Convert Firestore Timestamp back to Date for local use
                    date: data.createdAt?.toDate?.() || new Date(data.date),
                });
            });
            
            setTransactions(txnData);
            
            // Cache current week data
            if (weekOffset === 0) {
                await AsyncStorage.setItem(cacheKey, JSON.stringify(txnData));
            }
            
        } catch (error) {
            console.error('Error loading weekly data:', error);
            Alert.alert('Error', 'Failed to load weekly report');
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        const balance = income - expenses;
        
        // Previous week comparison (Placeholders, as actual fetch is omitted here)
        const prevIncome = 0;
        const prevExpenses = 0;
        
        const incomeChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome * 100) : 0;
        const expenseChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses * 100) : 0;
        const balanceChange = 0; 
        
        return {
            income,
            expenses,
            balance,
            incomeChange,
            expenseChange,
            balanceChange,
            budget: 40000, // This should come from user settings
        };
    }, [transactions, weekOffset]);

    // Category breakdown
    const categoryData = useMemo(() => {
        const categoryTotals = {};
        
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const cat = t.category || 'other';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
            });
        
        return Object.entries(categoryTotals)
            .map(([category, amount]) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                const percentage = metrics.expenses > 0 ? (amount / metrics.expenses * 100) : 0;
                const txnCount = transactions.filter(t => 
                    t.type === 'expense' && t.category === category
                ).length;
                
                return {
                    category,
                    name: config.name,
                    icon: config.icon,
                    color: config.color,
                    amount,
                    percentage,
                    transactionCount: txnCount,
                    value: amount,
                    label: config.name,
                    text: `${percentage.toFixed(0)}%`,
                };
            })
            .sort((a, b) => b.amount - a.amount);
    }, [transactions, metrics.expenses]);

    // Top 3 categories
    const topCategories = categoryData.slice(0, 3);

    // Daily spending data for bar chart
    const dailySpending = useMemo(() => {
        const { start } = getISOWeekBounds(weekOffset);
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        return days.map((day, index) => {
            const dayDate = new Date(start);
            dayDate.setDate(start.getDate() + index);
            
            const dayTotal = transactions
                .filter(t => {
                    const txnDate = new Date(t.date);
                    return t.type === 'expense' &&
                            txnDate.getDate() === dayDate.getDate() &&
                            txnDate.getMonth() === dayDate.getMonth() &&
                            txnDate.getFullYear() === dayDate.getFullYear(); // Added Year check for robustness
                })
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            return {
                value: dayTotal,
                label: day,
                frontColor: dayTotal === 0 ? '#374151' : dayTotal > (metrics.budget / 7) ? '#ef4444' : '#10b981',
                spacing: 2,
                topLabelComponent: () => (
                    dayTotal > 0 ? (
                        <Text style={styles.barTopLabel}>
                            {dayTotal >= 1000 ? `${(dayTotal / 1000).toFixed(1)}k` : dayTotal.toFixed(0)}
                        </Text>
                    ) : null
                ),
            };
        });
    }, [transactions, weekOffset, metrics.budget]);

    // Generate smart insights
    const insights = useMemo(() => {
        const tips = [];
        
        // Budget adherence
        const daysUnderBudget = dailySpending.filter(d => 
            d.value <= (metrics.budget / 7)
        ).length;
        
        if (daysUnderBudget >= 5) {
            tips.push({
                icon: 'checkmark-circle',
                color: '#10b981',
                text: `Great job! You stayed within budget for ${daysUnderBudget} days this week.`,
            });
        }
        
        // Savings comparison
        const savingsRate = metrics.income > 
            0 ? ((metrics.balance / metrics.income) * 100) 
            : 0;
        
        if (savingsRate > 15) {
            tips.push({
                icon: 'trophy',
                color: '#10b981',
                text: `You saved ${savingsRate.toFixed(0)}% of your income this week!`,
            });
        }
        
        // Top spending category
        if (topCategories.length > 0) {
            const top = topCategories[0];
            tips.push({
                icon: 'trending-up',
                color: '#f59e0b',
                text: `${top.name} was your highest expense at Rs. ${top.amount.toLocaleString()}.`,
            });
        }
        
        // Expense trend
        if (metrics.expenseChange < -10) {
            tips.push({
                icon: 'trending-down',
                color: '#10b981',
                text: `Spending decreased by ${Math.abs(metrics.expenseChange).toFixed(0)}% from last week!`,
            });
        } else if (metrics.expenseChange > 10) {
            tips.push({
                icon: 'alert-circle',
                color: '#ef4444',
                text: `Spending increased by ${metrics.expenseChange.toFixed(0)}% compared to last week.`,
            });
        }
        
        return tips.slice(0, 3);
    }, [metrics, topCategories, dailySpending]);

    // Export report
    const handleExport = async (format) => {
        try {
            const { start, end } = getISOWeekBounds(weekOffset);
            const weekRange = formatWeekRange(start, end);
            
            const reportText = `
WEEKLY FINANCIAL REPORT
${weekRange}

SUMMARY
-------
Total Income: Rs. ${metrics.income.toLocaleString()}
Total Expenses: Rs. ${metrics.expenses.toLocaleString()}
Net Balance: Rs. ${metrics.balance.toLocaleString()}
Budget Usage: ${((metrics.expenses / metrics.budget) * 100).toFixed(1)}%

TOP CATEGORIES
--------------
${topCategories.map((cat, i) => 
    `${i + 1}. ${cat.name}: Rs. ${cat.amount.toLocaleString()} (${cat.percentage.toFixed(0)}%)`
).join('\n')}

DAILY BREAKDOWN
---------------
${dailySpending.map(d => 
    `${d.label}: Rs. ${d.value.toLocaleString()}`
).join('\n')}

INSIGHTS
--------
${insights.map((insight, i) => `${i + 1}. ${insight.text}`).join('\n')}
            `;
            
            if (format === 'share') {
                await Share.share({
                    message: reportText,
                    title: 'Weekly Financial Report',
                });
            }
            
            Alert.alert('Success', 'Report exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Error', 'Failed to export report');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading weekly report...</Text>
            </View>
        );
    }

    const { start, end } = getISOWeekBounds(weekOffset);
    const weekRange = formatWeekRange(start, end);
    const budgetUsagePercent = (metrics.expenses / metrics.budget) * 100;
    
    // Logic for Savings & Surplus Analysis
    const savingsGoalPercent = 0.20; // 20% savings goal
    const targetSavings = metrics.income * savingsGoalPercent;
    const surplusOrDeficit = metrics.balance - targetSavings;
    const isMeetingGoal = surplusOrDeficit >= 0;

    return (
        <LinearGradient
            colors={['#121212', '#1E1E1E']}
            style={styles.container}
        >
            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Weekly Report</Text>
                        <Text style={styles.headerSubtitle}>{weekRange}</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.exportButton}
                        onPress={() => handleExport('share')}
                    >
                        <Ionicons name="share-outline" size={20} color="#10b981" />
                    </TouchableOpacity>
                </View>

                {/* Week Navigator */}
                <View style={styles.weekNavigator}>
                    <TouchableOpacity 
                        style={styles.weekNavButton}
                        onPress={() => setWeekOffset(prev => prev - 1)}
                    >
                        <Ionicons name="chevron-back" size={24} color="#10b981" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => setWeekOffset(0)}
                        disabled={weekOffset === 0}
                    >
                        <Text style={[styles.weekNavText, weekOffset === 0 && styles.currentWeekText]}>
                            {weekOffset === 0 ? 'This Week' : `${Math.abs(weekOffset)} week${Math.abs(weekOffset) > 1 ? 's' : ''} ago`}
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.weekNavButton, weekOffset === 0 && styles.weekNavButtonDisabled]}
                        onPress={() => setWeekOffset(prev => Math.min(prev + 1, 0))}
                        disabled={weekOffset === 0}
                    >
                        <Ionicons 
                            name="chevron-forward" 
                            size={24} 
                            color={weekOffset === 0 ? '#4b5563' : '#10b981'} 
                        />
                    </TouchableOpacity>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    {/* Income Card */}
                    <AnimatedCard delay={100} style={styles.summaryCard}>
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            style={styles.summaryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.summaryHeader}>
                                <Ionicons name="arrow-up-circle" size={28} color="#ffffff" />
                                <View style={styles.changeIndicator}>
                                    <Ionicons 
                                        name={metrics.incomeChange >= 0 ? "trending-up" : "trending-down"} 
                                        size={12} 
                                        color="#ffffff" 
                                    />
                                    <Text style={styles.changeText}>
                                        {Math.abs(metrics.incomeChange).toFixed(1)}%
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.summaryLabel}>Total Income</Text>
                            <Text style={styles.summaryValue}>
                                Rs. {metrics.income.toLocaleString()}
                            </Text>
                        </LinearGradient>
                    </AnimatedCard>

                    {/* Expenses Card */}
                    <AnimatedCard delay={200} style={styles.summaryCard}>
                        <LinearGradient
                            colors={['#ef4444', '#dc2626']}
                            style={styles.summaryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.summaryHeader}>
                                <Ionicons name="arrow-down-circle" size={28} color="#ffffff" />
                                <View style={styles.changeIndicator}>
                                    <Ionicons 
                                        name={metrics.expenseChange <= 0 ? "trending-down" : "trending-up"} 
                                        size={12} 
                                        color="#ffffff" 
                                    />
                                    <Text style={styles.changeText}>
                                        {Math.abs(metrics.expenseChange).toFixed(1)}%
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.summaryLabel}>Total Expenses</Text>
                            <Text style={styles.summaryValue}>
                                Rs. {metrics.expenses.toLocaleString()}
                            </Text>
                        </LinearGradient>
                    </AnimatedCard>

                    {/* Balance Card */}
                    <AnimatedCard delay={300} style={styles.summaryCardWide}>
                        <LinearGradient
                            colors={metrics.balance >= 0 ? ['#3b82f6', '#2563eb'] : ['#ef4444', '#dc2626']}
                            style={styles.summaryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.summaryHeader}>
                                <Ionicons name="wallet" size={28} color="#ffffff" />
                                <View style={styles.changeIndicator}>
                                    <Ionicons 
                                        name={metrics.balanceChange >= 0 ? "trending-up" : "trending-down"} 
                                        size={12} 
                                        color="#ffffff" 
                                    />
                                    <Text style={styles.changeText}>
                                        {Math.abs(metrics.balanceChange).toFixed(1)}%
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.summaryLabel}>Net Balance</Text>
                            <Text style={styles.summaryValue}>
                                Rs. {Math.abs(metrics.balance).toLocaleString()}
                            </Text>
                            
                            {/* Budget Progress Bar */}
                            <View style={styles.budgetProgressContainer}>
                                <View style={styles.budgetProgressBar}>
                                    <View 
                                        style={[
                                            styles.budgetProgressFill,
                                            { 
                                                width: `${Math.min(budgetUsagePercent, 100)}%`,
                                                backgroundColor: budgetUsagePercent > 90 ? '#fbbf24' : '#ffffff'
                                            }
                                        ]} 
                                    />
                                </View>
                                <Text style={styles.budgetProgressText}>
                                    {budgetUsagePercent.toFixed(0)}% of budget used
                                </Text>
                            </View>
                        </LinearGradient>
                    </AnimatedCard>
                </View>

                {/* Smart Insights */}
                {insights.length > 0 && (
                    <AnimatedCard delay={400}>
                        <View style={styles.insightsHeader}>
                            <Ionicons name="bulb" size={22} color="#f59e0b" />
                            <Text style={styles.sectionTitle}>Smart Insights</Text>
                        </View>
                        {insights.map((insight, index) => (
                            <Animated.View
                                key={index}
                                entering={FadeInRight.delay(500 + index * 100).springify()}
                                style={styles.insightItem}
                            >
                                <View style={[styles.insightDot, { backgroundColor: insight.color }]} />
                                <Ionicons name={insight.icon} size={18} color={insight.color} />
                                <Text style={styles.insightText}>{insight.text}</Text>
                            </Animated.View>
                        ))}
                    </AnimatedCard>
                )}

                {/* Expense Breakdown Pie Chart - ADJUSTED SIZES */}
                {categoryData.length > 0 && (
                    <AnimatedCard delay={500}>
                        <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                        <View style={styles.pieChartContainer}>
                            <PieChart
                                data={categoryData}
                                donut
                                showText
                                textColor="#ffffff"
                                textSize={10}
                                radius={125} // Increased size
                                innerRadius={65} // Decreased size
                                innerCircleColor="#1E1E1E"
                                focusOnPress
                                onPress={(item) => setSelectedCategory(item)}
                                strokeColor="#1E1E1E"
                                strokeWidth={3}
                                centerLabelComponent={() => (
                                    selectedCategory ? (
                                        <View style={styles.pieCenterSelected}>
                                            <Ionicons 
                                                name={selectedCategory.icon} 
                                                size={28} 
                                                color={selectedCategory.color} 
                                            />
                                            <Text style={styles.pieCenterValue}>
                                                Rs. {(selectedCategory.amount / 1000).toFixed(1)}k
                                            </Text>
                                            <Text style={styles.pieCenterLabel}>
                                                {selectedCategory.transactionCount} transactions
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.pieCenter}>
                                            <Text style={styles.pieCenterValue}>
                                                Rs. {(metrics.expenses / 1000).toFixed(1)}k
                                            </Text>
                                            <Text style={styles.pieCenterLabel}>Total Spent</Text>
                                        </View>
                                    )
                                )}
                            />
                        </View>
                        
                        {selectedCategory && (
                            <TouchableOpacity 
                                style={styles.deselectButton}
                                onPress={() => setSelectedCategory(null)}
                            >
                                <Text style={styles.deselectText}>Tap to deselect</Text>
                            </TouchableOpacity>
                        )}
                    </AnimatedCard>
                )}

                {/* Top Categories List */}
                {topCategories.length > 0 && (
                    <AnimatedCard delay={600}>
                        <Text style={styles.sectionTitle}>Top Spending Categories</Text>
                        {topCategories.map((cat, index) => (
                            <Animated.View
                                key={cat.category}
                                entering={FadeInRight.delay(700 + index * 100).springify()}
                                style={styles.topCategoryItem}
                            >
                                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                                    <Ionicons name={cat.icon} size={22} color={cat.color} />
                                </View>
                                <View style={styles.topCategoryInfo}>
                                    <View style={styles.topCategoryHeader}>
                                        <Text style={styles.topCategoryName}>{cat.name}</Text>
                                        <Text style={styles.topCategoryAmount}>
                                            Rs. {cat.amount.toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={styles.topCategoryProgressBar}>
                                        <View 
                                            style={[
                                                styles.topCategoryProgressFill,
                                                { 
                                                    width: `${cat.percentage}%`,
                                                    backgroundColor: cat.color
                                                }
                                            ]} 
                                        />
                                    </View>
                                    <Text style={styles.topCategoryPercent}>
                                        {cat.percentage.toFixed(1)}% of total expenses
                                    </Text>
                                </View>
                            </Animated.View>
                        ))}
                    </AnimatedCard>
                )}

                {/* Enhanced Daily Spending Trend */}
                <AnimatedCard delay={700}>
                    <View style={styles.trendHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Daily Spending Pattern</Text>
                            <Text style={styles.sectionSubtitle}>
                                Average: Rs. {(metrics.expenses / 7).toLocaleString('en-US', { maximumFractionDigits: 0 })} per day
                            </Text>
                        </View>
                        <View style={styles.trendStats}>
                            <Text style={styles.trendStatValue}>
                                {dailySpending.filter(d => d.value > 0).length}/7
                            </Text>
                            <Text style={styles.trendStatLabel}>Days Active</Text>
                        </View>
                    </View>
                    
                    <View style={styles.enhancedBarChartContainer}>
                        <BarChart
                            data={dailySpending}
                            width={320}
                            height={220}
                            barWidth={32}
                            spacing={18}
                            roundedTop
                            roundedBottom
                            noOfSections={5}
                            yAxisThickness={0}
                            xAxisThickness={0}
                            hideRules
                            yAxisTextStyle={{ color: '#6b7280', fontSize: 10 }}
                            xAxisLabelTextStyle={{ 
                                color: '#9ca3af', 
                                fontSize: 12, 
                                fontWeight: '600',
                                marginTop: 8
                            }}
                            isAnimated
                            animationDuration={800}
                            showGradient
                            gradientColor="#10b98120"
                        />
                    </View>
                    
                    <View style={styles.trendInsights}>
                        <View style={styles.trendInsightItem}>
                            <View style={[styles.trendInsightDot, { backgroundColor: '#10b981' }]} />
                            <Text style={styles.trendInsightText}>Under Budget</Text>
                        </View>
                        <View style={styles.trendInsightItem}>
                            <View style={[styles.trendInsightDot, { backgroundColor: '#ef4444' }]} />
                            <Text style={styles.trendInsightText}>Over Budget</Text>
                        </View>
                        <View style={styles.trendInsightItem}>
                            <View style={[styles.trendInsightDot, { backgroundColor: '#6b7280' }]} />
                            <Text style={styles.trendInsightText}>No Spending</Text>
                        </View>
                    </View>
                </AnimatedCard>

                {/* Savings & Surplus Analysis */}
                <AnimatedCard delay={800}>
                    <View style={styles.analysisHeader}>
                        <Ionicons name="cash" size={24} color="#3b82f6" />
                        <Text style={styles.sectionTitle}>Savings & Surplus Analysis</Text>
                    </View>

                    <View style={styles.analysisMetrics}>
                        <View style={styles.analysisMetricItem}>
                            <Text style={styles.analysisMetricLabel}>Target Savings (20% Income)</Text>
                            <Text style={styles.analysisMetricValue}>
                                Rs. {targetSavings.toLocaleString()}
                            </Text>
                        </View>

                        <View style={styles.analysisMetricItem}>
                            <Text style={styles.analysisMetricLabel}>Actual Net Balance</Text>
                            <Text style={[
                                styles.analysisMetricValue,
                                { color: isMeetingGoal ? '#10b981' : '#ef4444' }
                            ]}>
                                Rs. {metrics.balance.toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.analysisSummary}>
                        <Ionicons 
                            name={isMeetingGoal ? "thumbs-up" : "warning"} 
                            size={20} 
                            color={isMeetingGoal ? '#10b981' : '#f59e0b'} 
                        />
                        <Text style={styles.analysisSummaryText}>
                            {isMeetingGoal 
                                ? `Goal Met! You have a surplus of Rs. ${surplusOrDeficit.toLocaleString('en-US', { maximumFractionDigits: 0 })}.`
                                : `Deficit of Rs. ${Math.abs(surplusOrDeficit).toLocaleString('en-US', { maximumFractionDigits: 0 })} needed to meet your 20% savings goal.`
                            }
                        </Text>
                    </View>
                    <View style={styles.analysisTip}>
                        <Text style={styles.analysisTipText}>
                            **Tip:** To hit your 20% goal, consider reducing spending in your top categories by Rs. {(Math.abs(surplusOrDeficit) / 7).toLocaleString('en-US', { maximumFractionDigits: 0 })} per day next week.
                        </Text>
                    </View>
                </AnimatedCard>

                <View style={{ height: 40 }} />
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#9ca3af',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f9fafb',
        fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 4,
    },
    exportButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1f2937',
        justifyContent: 'center',
        alignItems: 'center',
    },
    weekNavigator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 20,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#1f2937',
        borderRadius: 16,
    },
    weekNavButton: {
        padding: 8,
    },
    weekNavButtonDisabled: {
        opacity: 0.3,
    },
    weekNavText: {
        fontSize: 16,
        color: '#9ca3af',
        fontWeight: '600',
    },
    currentWeekText: {
        color: '#10b981',
    },
    summaryContainer: {
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 20,
    },
    card: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    summaryCard: {
        height: 140,
    },
    summaryCardWide: {
        height: 180,
    },
    summaryGradient: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        justifyContent: 'space-between',
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    changeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    changeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
    },
    summaryLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 8,
    },
    summaryValue: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 4,
    },
    budgetProgressContainer: {
        marginTop: 12,
    },
    budgetProgressBar: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    budgetProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    budgetProgressText: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 6,
        fontWeight: '600',
    },
    insightsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f9fafb',
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 4,
        marginBottom: 16,
    },
    insightItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 10,
    },
    insightDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 7,
    },
    insightText: {
        flex: 1,
        fontSize: 14,
        color: '#d1d5db',
        lineHeight: 20,
    },
    pieChartContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    pieCenter: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pieCenterSelected: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    pieCenterValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f9fafb',
    },
    pieCenterLabel: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
    },
    deselectButton: {
        alignSelf: 'center',
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#374151',
        borderRadius: 8,
    },
    deselectText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    topCategoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topCategoryInfo: {
        flex: 1,
    },
    topCategoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    topCategoryName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#f9fafb',
    },
    topCategoryAmount: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#10b981',
    },
    topCategoryProgressBar: {
        height: 6,
        backgroundColor: '#374151',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6,
    },
    topCategoryProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    topCategoryPercent: {
        fontSize: 12,
        color: '#9ca3af',
    },
    // Enhanced Daily Trend Styles
    trendHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    trendStats: {
        alignItems: 'flex-end',
    },
    trendStatValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10b981',
    },
    trendStatLabel: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 2,
    },
    enhancedBarChartContainer: {
        alignItems: 'center',
        marginVertical: 16,
        backgroundColor: '#111827',
        borderRadius: 12,
        padding: 16,
    },
    barTopLabel: {
        fontSize: 10,
        color: '#9ca3af',
        fontWeight: '600',
    },
    trendInsights: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#374151',
    },
    trendInsightItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    trendInsightDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    trendInsightText: {
        fontSize: 11,
        color: '#9ca3af',
        fontWeight: '600',
    },
    // NEW: Savings & Surplus Analysis Styles
    analysisHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
    },
    analysisMetrics: {
        gap: 16,
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    analysisMetricItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    analysisMetricLabel: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: '600',
    },
    analysisMetricValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f9fafb',
    },
    analysisSummary: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#111827',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#3b82f6',
        marginBottom: 10,
    },
    analysisSummaryText: {
        flex: 1,
        fontSize: 14,
        color: '#d1d5db',
        fontWeight: '600',
        lineHeight: 20,
    },
    analysisTip: {
        paddingHorizontal: 8,
    },
    analysisTipText: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
    }
});