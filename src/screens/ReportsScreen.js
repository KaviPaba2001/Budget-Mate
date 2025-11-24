// ReportsScreen.js - Enhanced Version with Weekly & Monthly Reports
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

// Cache keys
const WEEKLY_REPORT_CACHE_KEY = 'weekly_report_cache';
const MONTHLY_REPORT_CACHE_KEY = 'monthly_report_cache';

// Category configuration
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
 * Get ISO week boundaries (Monday to Sunday)
 */
const getISOWeekBounds = (weekOffset = 0) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    let diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    diffToMonday += (weekOffset * 7);
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
};

/**
 * Get month boundaries (1st to last day)
 */
const getMonthBounds = (monthOffset = 0) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    
    const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    firstDay.setHours(0, 0, 0, 0);
    
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    lastDay.setHours(23, 59, 59, 999);
    
    return { start: firstDay, end: lastDay };
};

// Format date range for display
const formatWeekRange = (start, end) => {
    const formatDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}`;
    };
    return `${formatDate(start)} – ${formatDate(end)}, ${start.getFullYear()}`;
};

const formatMonthRange = (start) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[start.getMonth()]} ${start.getFullYear()}`;
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

export default function ReportsScreen({ navigation }) {
    const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
    const [timeOffset, setTimeOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    
    // Load transactions when view mode or offset changes
    useEffect(() => {
        loadData();
    }, [timeOffset, viewMode]);

    const loadData = async () => {
        setLoading(true);
        try {
            const bounds = viewMode === 'weekly' 
                ? getISOWeekBounds(timeOffset) 
                : getMonthBounds(timeOffset);
            
            const { start, end } = bounds;
            
            // Try cache first for current period
            const cacheKey = `${viewMode === 'weekly' ? WEEKLY_REPORT_CACHE_KEY : MONTHLY_REPORT_CACHE_KEY}_${start.getTime()}`;
            const cachedData = await AsyncStorage.getItem(cacheKey);
            
            if (cachedData && timeOffset === 0) {
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
                    date: data.createdAt?.toDate?.() || new Date(data.date),
                });
            });
            
            setTransactions(txnData);
            
            // Cache current period data
            if (timeOffset === 0) {
                await AsyncStorage.setItem(cacheKey, JSON.stringify(txnData));
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load report data');
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
        
        return {
            income,
            expenses,
            balance,
            incomeChange: 0, // Simplified for now
            expenseChange: 0,
            balanceChange: 0,
            budget: 40000,
        };
    }, [transactions]);

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

    const topCategories = categoryData.slice(0, 3);

    // Daily/Weekly spending data for bar chart
    const chartData = useMemo(() => {
        if (viewMode === 'weekly') {
            const { start } = getISOWeekBounds(timeOffset);
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
                                txnDate.getFullYear() === dayDate.getFullYear();
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
        } else {
            // Monthly view - show weeks
            const { start, end } = getMonthBounds(timeOffset);
            const weeks = [];
            const weekLabels = ['W1', 'W2', 'W3', 'W4', 'W5'];
            
            let currentWeekStart = new Date(start);
            let weekIndex = 0;
            
            while (currentWeekStart <= end && weekIndex < 5) {
                const weekEnd = new Date(currentWeekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                const weekTotal = transactions
                    .filter(t => {
                        const txnDate = new Date(t.date);
                        return t.type === 'expense' &&
                                txnDate >= currentWeekStart &&
                                txnDate <= weekEnd;
                    })
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                
                weeks.push({
                    value: weekTotal,
                    label: weekLabels[weekIndex],
                    frontColor: weekTotal === 0 ? '#374151' : weekTotal > (metrics.budget / 4) ? '#ef4444' : '#10b981',
                    spacing: 4,
                    topLabelComponent: () => (
                        weekTotal > 0 ? (
                            <Text style={styles.barTopLabel}>
                                {weekTotal >= 1000 ? `${(weekTotal / 1000).toFixed(1)}k` : weekTotal.toFixed(0)}
                            </Text>
                        ) : null
                    ),
                });
                
                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
                weekIndex++;
            }
            
            return weeks;
        }
    }, [transactions, timeOffset, viewMode, metrics.budget]);

    // Generate insights
    const insights = useMemo(() => {
        const tips = [];
        
        if (viewMode === 'weekly') {
            const daysUnderBudget = chartData.filter(d => d.value <= (metrics.budget / 7)).length;
            if (daysUnderBudget >= 5) {
                tips.push({
                    icon: 'checkmark-circle',
                    color: '#10b981',
                    text: `Great job! You stayed within budget for ${daysUnderBudget} days this week.`,
                });
            }
        } else {
            const weeksUnderBudget = chartData.filter(w => w.value <= (metrics.budget / 4)).length;
            if (weeksUnderBudget >= 3) {
                tips.push({
                    icon: 'checkmark-circle',
                    color: '#10b981',
                    text: `Excellent! You stayed within budget for ${weeksUnderBudget} weeks this month.`,
                });
            }
        }
        
        const savingsRate = metrics.income > 0 ? ((metrics.balance / metrics.income) * 100) : 0;
        if (savingsRate > 15) {
            tips.push({
                icon: 'trophy',
                color: '#10b981',
                text: `You saved ${savingsRate.toFixed(0)}% of your income this ${viewMode === 'weekly' ? 'week' : 'month'}!`,
            });
        }
        
        if (topCategories.length > 0) {
            const top = topCategories[0];
            tips.push({
                icon: 'trending-up',
                color: '#f59e0b',
                text: `${top.name} was your highest expense at Rs. ${top.amount.toLocaleString()}.`,
            });
        }
        
        return tips.slice(0, 3);
    }, [metrics, topCategories, chartData, viewMode]);

    // Export report
    const handleExport = async (format) => {
        try {
            const bounds = viewMode === 'weekly' 
                ? getISOWeekBounds(timeOffset) 
                : getMonthBounds(timeOffset);
            const dateRange = viewMode === 'weekly' 
                ? formatWeekRange(bounds.start, bounds.end)
                : formatMonthRange(bounds.start);
            
            const reportText = `
${viewMode.toUpperCase()} FINANCIAL REPORT
${dateRange}

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

${viewMode === 'weekly' ? 'DAILY' : 'WEEKLY'} BREAKDOWN
---------------
${chartData.map(d => 
    `${d.label}: Rs. ${d.value.toLocaleString()}`
).join('\n')}

INSIGHTS
--------
${insights.map((insight, i) => `${i + 1}. ${insight.text}`).join('\n')}
            `;
            
            if (format === 'share') {
                await Share.share({
                    message: reportText,
                    title: `${viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Financial Report`,
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
                <Text style={styles.loadingText}>Loading {viewMode} report...</Text>
            </View>
        );
    }

    const bounds = viewMode === 'weekly' 
        ? getISOWeekBounds(timeOffset) 
        : getMonthBounds(timeOffset);
    const dateRange = viewMode === 'weekly' 
        ? formatWeekRange(bounds.start, bounds.end)
        : formatMonthRange(bounds.start);
    const budgetUsagePercent = (metrics.expenses / metrics.budget) * 100;
    
    const savingsGoalPercent = 0.20;
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
                {/* Header with View Toggle */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>
                            {viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Report
                        </Text>
                        <Text style={styles.headerSubtitle}>{dateRange}</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.exportButton}
                        onPress={() => handleExport('share')}
                    >
                        <Ionicons name="share-outline" size={20} color="#10b981" />
                    </TouchableOpacity>
                </View>

                {/* View Mode Toggle */}
                <View style={styles.viewModeToggle}>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'weekly' && styles.activeToggleButton]}
                        onPress={() => {
                            setViewMode('weekly');
                            setTimeOffset(0);
                        }}
                    >
                        <Ionicons 
                            name="calendar" 
                            size={18} 
                            color={viewMode === 'weekly' ? '#ffffff' : '#9ca3af'} 
                        />
                        <Text style={[styles.toggleButtonText, viewMode === 'weekly' && styles.activeToggleButtonText]}>
                            Weekly
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'monthly' && styles.activeToggleButton]}
                        onPress={() => {
                            setViewMode('monthly');
                            setTimeOffset(0);
                        }}
                    >
                        <Ionicons 
                            name="calendar-outline" 
                            size={18} 
                            color={viewMode === 'monthly' ? '#ffffff' : '#9ca3af'} 
                        />
                        <Text style={[styles.toggleButtonText, viewMode === 'monthly' && styles.activeToggleButtonText]}>
                            Monthly
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Period Navigator */}
                <View style={styles.periodNavigator}>
                    <TouchableOpacity 
                        style={styles.navButton}
                        onPress={() => setTimeOffset(prev => prev - 1)}
                    >
                        <Ionicons name="chevron-back" size={24} color="#10b981" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => setTimeOffset(0)}
                        disabled={timeOffset === 0}
                    >
                        <Text style={[styles.navText, timeOffset === 0 && styles.currentNavText]}>
                            {timeOffset === 0 
                                ? `This ${viewMode === 'weekly' ? 'Week' : 'Month'}` 
                                : `${Math.abs(timeOffset)} ${viewMode === 'weekly' ? 'week' : 'month'}${Math.abs(timeOffset) > 1 ? 's' : ''} ago`
                            }
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.navButton, timeOffset === 0 && styles.navButtonDisabled]}
                        onPress={() => setTimeOffset(prev => Math.min(prev + 1, 0))}
                        disabled={timeOffset === 0}
                    >
                        <Ionicons 
                            name="chevron-forward" 
                            size={24} 
                            color={timeOffset === 0 ? '#4b5563' : '#10b981'} 
                        />
                    </TouchableOpacity>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    <AnimatedCard delay={100} style={styles.summaryCard}>
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            style={styles.summaryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.summaryHeader}>
                                <Ionicons name="arrow-up-circle" size={28} color="#ffffff" />
                            </View>
                            <Text style={styles.summaryLabel}>Total Income</Text>
                            <Text style={styles.summaryValue}>
                                Rs. {metrics.income.toLocaleString()}
                            </Text>
                        </LinearGradient>
                    </AnimatedCard>

                    <AnimatedCard delay={200} style={styles.summaryCard}>
                        <LinearGradient
                            colors={['#ef4444', '#dc2626']}
                            style={styles.summaryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.summaryHeader}>
                                <Ionicons name="arrow-down-circle" size={28} color="#ffffff" />
                            </View>
                            <Text style={styles.summaryLabel}>Total Expenses</Text>
                            <Text style={styles.summaryValue}>
                                Rs. {metrics.expenses.toLocaleString()}
                            </Text>
                        </LinearGradient>
                    </AnimatedCard>

                    <AnimatedCard delay={300} style={styles.summaryCardWide}>
                        <LinearGradient
                            colors={metrics.balance >= 0 ? ['#3b82f6', '#2563eb'] : ['#ef4444', '#dc2626']}
                            style={styles.summaryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.summaryHeader}>
                                <Ionicons name="wallet" size={28} color="#ffffff" />
                            </View>
                            <Text style={styles.summaryLabel}>Net Balance</Text>
                            <Text style={styles.summaryValue}>
                                Rs. {Math.abs(metrics.balance).toLocaleString()}
                            </Text>
                            
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

                {/* Expense Breakdown Pie Chart */}
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
                                radius={125}
                                innerRadius={65}
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

                {/* Top Categories */}
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

                {/* Spending Pattern Chart */}
                <AnimatedCard delay={700}>
                    <View style={styles.trendHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>
                                {viewMode === 'weekly' ? 'Daily' : 'Weekly'} Spending Pattern
                            </Text>
                            <Text style={styles.sectionSubtitle}>
                                Average: Rs. {(metrics.expenses / (viewMode === 'weekly' ? 7 : 4)).toLocaleString('en-US', { maximumFractionDigits: 0 })} per {viewMode === 'weekly' ? 'day' : 'week'}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.enhancedBarChartContainer}>
                        <BarChart
                            data={chartData}
                            width={320}
                            height={220}
                            barWidth={viewMode === 'weekly' ? 32 : 48}
                            spacing={viewMode === 'weekly' ? 18 : 12}
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
                            **Tip:** To hit your 20% goal, consider reducing spending in your top categories by Rs. {(Math.abs(surplusOrDeficit) / (viewMode === 'weekly' ? 7 : 30)).toLocaleString('en-US', { maximumFractionDigits: 0 })} per day.
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
    viewModeToggle: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: '#1f2937',
        borderRadius: 12,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    activeToggleButton: {
        backgroundColor: '#10b981',
    },
    toggleButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9ca3af',
    },
    activeToggleButtonText: {
        color: '#ffffff',
    },
    periodNavigator: {
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
    navButton: {
        padding: 8,
    },
    navButtonDisabled: {
        opacity: 0.3,
    },
    navText: {
        fontSize: 16,
        color: '#9ca3af',
        fontWeight: '600',
    },
    currentNavText: {
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
    trendHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
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