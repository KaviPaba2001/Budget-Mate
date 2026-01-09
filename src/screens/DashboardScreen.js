import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AnimatedPressable from '../components/AnimatedPressable';
import AnimatedView from '../components/AnimatedView';
import BudgetCard from '../components/BudgetCard';
import { useUser } from '../context/UserContext';
import { getBudgets, getTransactions, seedDefaultBudgets } from '../services/firebaseService';
import { theme } from '../styles/theme';
import { formatDateForDisplay } from '../utils/dateHelpers';

export default function DashboardScreen({ navigation }) {
    const { userName, profileImage } = useUser();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [monthlySpending, setMonthlySpending] = useState(0);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [monthlyBudget, setMonthlyBudget] = useState(0);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            // 1. Get Transactions
            const data = await getTransactions();
            setTransactions(data);
            calculateFinancials(data);

            // 2. Get Budgets
            let budgetsData = await getBudgets();
            if (Object.keys(budgetsData).length === 0) {
                budgetsData = await seedDefaultBudgets();
            }
            const totalBudget = Object.values(budgetsData).reduce((sum, amount) => sum + amount, 0);
            setMonthlyBudget(totalBudget);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData(true);
    }, []);

    const calculateFinancials = (data) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalBalance = 0;
        let monthlyExp = 0;
        let monthlyInc = 0;

        data.forEach(transaction => {
            const amount = transaction.amount || 0;
            totalBalance += amount; // Income is positive, Expense is negative

            // Parse Date
            let tDate = new Date();
            if (transaction.date) {
                tDate = new Date(transaction.date);
            } else if (transaction.createdAt?.toDate) {
                tDate = transaction.createdAt.toDate();
            }

            // Calculate Monthly Stats
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                if (amount < 0) {
                    monthlyExp += Math.abs(amount);
                } else {
                    monthlyInc += amount;
                }
            }
        });

        setCurrentBalance(totalBalance);
        setMonthlySpending(monthlyExp);
        setMonthlyIncome(monthlyInc);
    };

    // Sort by date (newest first) and take top 5
    const recentTransactions = transactions
        .sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        })
        .slice(0, 5);

    const quickActions = [
        { 
            icon: 'add-circle', 
            title: 'Add', 
            action: () => navigation.navigate('Transactions', { screen: 'AddTransaction' }) 
        },
        { 
            icon: 'camera', 
            title: 'Scan', 
            action: () => navigation.navigate('Transactions', { screen: 'ScanReceipt' }) 
        },
        // THIS IS THE NEW SMS PART
        { 
            icon: 'chatbubbles', 
            title: 'SMS Sync', 
            action: () => navigation.navigate('Transactions', { screen: 'SMSTransactions' }) 
        },
        { 
            icon: 'analytics', 
            title: 'Reports', 
            action: () => navigation.navigate('Reports') 
        },
    ];

    const handleQuickActionPress = (action) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        action();
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
        >
            <StatusBar barStyle="light-content" />
            
            {/* Header Section */}
            <AnimatedView index={0}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerWelcome}>Welcome Back,</Text>
                        <Text style={styles.headerUser}>{userName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <Image
                            source={profileImage ? { uri: profileImage } : { uri: 'https://placehold.co/100x100/1f2937/f9fafb?text=U' }}
                            style={styles.avatar}
                        />
                    </TouchableOpacity>
                </View>
            </AnimatedView>

            {/* Balance Card */}
            <AnimatedView index={1}>
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={[
                        styles.balanceAmount, 
                        { color: currentBalance >= 0 ? theme.colors.white : theme.colors.danger }
                    ]}>
                        Rs. {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    
                    <View style={styles.balanceDetails}>
                        <View style={styles.balanceDetailItem}>
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                                <Ionicons name="arrow-down" size={16} color={theme.colors.success} />
                            </View>
                            <View>
                                <Text style={styles.balanceDetailLabel}>Income</Text>
                                <Text style={styles.incomeText}>+Rs. {monthlyIncome.toLocaleString()}</Text>
                            </View>
                        </View>
                        <View style={styles.balanceDetailItem}>
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                <Ionicons name="arrow-up" size={16} color={theme.colors.danger} />
                            </View>
                            <View>
                                <Text style={styles.balanceDetailLabel}>Expenses</Text>
                                <Text style={styles.expenseText}>-Rs. {monthlySpending.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </AnimatedView>

            {/* Quick Actions */}
            <AnimatedView index={2}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContainer}>
                        {quickActions.map((action, index) => (
                            <AnimatedPressable
                                key={index}
                                style={styles.quickActionItem}
                                onPress={() => handleQuickActionPress(action.action)}
                            >
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name={action.icon} size={24} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.quickActionText}>{action.title}</Text>
                            </AnimatedPressable>
                        ))}
                    </ScrollView>
                </View>
            </AnimatedView>

            {/* Monthly Budget Progress */}
            <AnimatedView index={3}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Monthly Overview</Text>
                    <BudgetCard spent={monthlySpending} budget={monthlyBudget} />
                </View>
            </AnimatedView>

            {/* Recent Transactions */}
            <AnimatedView index={4}>
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {recentTransactions.length > 0 ? (
                        recentTransactions.map((item) => (
                            <View key={item.id} style={styles.transactionItem}>
                                <View style={styles.transactionLeft}>
                                    <View style={[
                                        styles.transactionIcon, 
                                        { backgroundColor: item.amount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                                    ]}>
                                        <Ionicons 
                                            name={item.amount > 0 ? 'arrow-down' : 'arrow-up'} 
                                            size={20} 
                                            color={item.amount > 0 ? theme.colors.success : theme.colors.danger} 
                                        />
                                    </View>
                                    <View>
                                        <Text style={styles.transactionTitle}>{item.title}</Text>
                                        <Text style={styles.transactionCategory}>{item.category}</Text>
                                    </View>
                                </View>
                                <View style={styles.transactionRight}>
                                    <Text style={[
                                        styles.transactionAmount,
                                        { color: item.amount > 0 ? theme.colors.success : theme.colors.danger }
                                    ]}>
                                        {item.amount > 0 ? '+' : ''}Rs. {Math.abs(item.amount).toLocaleString()}
                                    </Text>
                                    <Text style={styles.transactionDate}>
                                        {formatDateForDisplay(item.date)}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={48} color={theme.colors.text_secondary} />
                            <Text style={styles.emptyText}>No transactions yet</Text>
                        </View>
                    )}
                </View>
            </AnimatedView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centerContent: { justifyContent: 'center', alignItems: 'center' },
    
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
    },
    headerWelcome: { fontSize: theme.fontSize.sm, color: theme.colors.text_secondary },
    headerUser: { fontSize: theme.fontSize['2xl'], fontWeight: 'bold', color: theme.colors.text_primary },
    avatar: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: theme.colors.primary },

    balanceCard: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        margin: theme.spacing.md,
        ...theme.shadow.md,
    },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: theme.fontSize.sm, marginBottom: 4 },
    balanceAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: theme.spacing.lg },
    balanceDetails: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: theme.spacing.md },
    balanceDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconContainer: { padding: 6, borderRadius: 20 },
    balanceDetailLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    incomeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    expenseText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

    section: { marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.md },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
    sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.text_primary, marginBottom: theme.spacing.sm },
    seeAllText: { color: theme.colors.primary, fontWeight: '600' },

    quickActionsContainer: { paddingVertical: 10, gap: 20 },
    quickActionItem: { alignItems: 'center', gap: 8 },
    quickActionIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: theme.colors.border,
        ...theme.shadow.sm
    },
    quickActionText: { color: theme.colors.text_secondary, fontSize: 12, fontWeight: '500' },

    transactionItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 16, borderRadius: 16, marginBottom: 12,
        borderWidth: 1, borderColor: theme.colors.border
    },
    transactionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    transactionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    transactionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text_primary },
    transactionCategory: { fontSize: 12, color: theme.colors.text_secondary, textTransform: 'capitalize' },
    transactionRight: { alignItems: 'flex-end' },
    transactionAmount: { fontSize: 16, fontWeight: 'bold' },
    transactionDate: { fontSize: 11, color: theme.colors.text_secondary, marginTop: 2 },

    emptyContainer: { alignItems: 'center', padding: 40, opacity: 0.5 },
    emptyText: { color: theme.colors.text_secondary, marginTop: 10 }
});