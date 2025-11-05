import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
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
// Import the new budget functions
import { getBudgets, getTransactions, seedDefaultBudgets } from '../services/firebaseService';
import { theme } from '../styles/theme';

export default function DashboardScreen({ navigation }) {
    const { userName, profileImage } = useUser();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [monthlySpending, setMonthlySpending] = useState(0);
    const [monthlyIncome, setMonthlyIncome] = useState(0);

    // This is now loaded from Firebase
    const [monthlyBudget, setMonthlyBudget] = useState(0);

    // Load transactions when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Renamed from loadTransactions to loadData
    const loadData = async () => {
        setLoading(true);
        try {
            // Get transactions and calculate financials
            const data = await getTransactions();
            setTransactions(data);
            calculateFinancials(data);

            // Get budgets and calculate total
            let budgetsData = await getBudgets();
            if (Object.keys(budgetsData).length === 0) {
                // If no budgets exist, seed them
                budgetsData = await seedDefaultBudgets();
            }
            // Calculate total budget from all categories
            const total = Object.values(budgetsData).reduce((sum, amount) => sum + amount, 0);
            setMonthlyBudget(total);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateFinancials = (data) => {
        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalBalance = 0;
        let monthlyExp = 0;
        let monthlyInc = 0;

        data.forEach(transaction => {
            const amount = transaction.amount || 0;
            
            // Calculate total balance
            totalBalance += amount;

            // Get transaction date
            let transactionDate;
            if (transaction.date) {
                transactionDate = new Date(transaction.date);
            } else if (transaction.createdAt?.toDate) {
                transactionDate = transaction.createdAt.toDate();
            } else {
                transactionDate = new Date();
            }

            // Check if transaction is in current month
            if (transactionDate.getMonth() === currentMonth && 
                transactionDate.getFullYear() === currentYear) {
                
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

    const formatDate = (date) => {
        if (!date) return 'Unknown date';
        const d = typeof date === 'string' ? new Date(date) : date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Get recent transactions (last 4)
    const recentTransactions = transactions
        .sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0));
            const dateB = b.date ? new Date(b.date) : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0));
            return dateB - dateA;
        })
        .slice(0, 4)
        .map(transaction => ({
            id: transaction.id,
            title: transaction.title,
            amount: transaction.amount,
            category: transaction.category,
            date: formatDate(transaction.date || transaction.createdAt?.toDate()),
        }));

    const quickActions = [
        { icon: 'add-circle', title: 'Add', action: () => navigation.navigate('Transactions', { screen: 'AddTransaction' }) },
        { icon: 'camera', title: 'Scan', action: () => navigation.navigate('Transactions', { screen: 'ScanReceipt' }) },
        { icon: 'card', title: 'Cards', action: () => navigation.navigate('CardsStack') },
        { icon: 'analytics', title: 'Reports', action: () => navigation.navigate('Reports') },
    ];

    const handleQuickActionPress = (action) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        action();
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" />
            
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

            <AnimatedView index={1}>
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={[
                        styles.balanceAmount,
                        // This fix is still applied
                        { color: currentBalance >= 0 ? theme.colors.white : theme.colors.danger }
                    ]}>
                        Rs. {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.balanceDetails}>
                        <View>
                            <Text style={styles.balanceDetailLabel}>Income</Text>
                            <Text style={styles.balanceDetailAmount}>
                                +Rs. {monthlyIncome.toLocaleString()}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.balanceDetailLabel}>Expenses</Text>
                            <Text style={styles.balanceDetailAmount}>
                                -Rs. {monthlySpending.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>
            </AnimatedView>

            <AnimatedView index={2}>
                 <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContainer}>
                        {quickActions.map((action) => (
                            <AnimatedPressable
                                key={action.title}
                                style={styles.quickActionItem}
                                onPress={() => handleQuickActionPress(action.action)}
                            >
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name={action.icon} size={26} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.quickActionText}>{action.title}</Text>
                            </AnimatedPressable>
                        ))}
                    </ScrollView>
                </View>
            </AnimatedView>

            <AnimatedView index={3}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>This Month's Budget</Text>
                    <BudgetCard
                        spent={monthlySpending}
                        // Use the total budget from state (loaded from Firebase)
                        budget={monthlyBudget}
                    />
                </View>
            </AnimatedView>

            <AnimatedView index={4}>
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {recentTransactions.length > 0 ? (
                        recentTransactions.map((transaction) => (
                            <View key={transaction.id} style={styles.transactionItem}>
                                <View style={styles.transactionIcon}>
                                    <Ionicons 
                                        name={transaction.amount > 0 ? 'arrow-up-circle' : 'arrow-down-circle'} 
                                        size={30} 
                                        color={transaction.amount > 0 ? theme.colors.success : theme.colors.danger} 
                                    />
                                </View>
                                <View style={styles.transactionDetails}>
                                    <Text style={styles.transactionTitle}>{transaction.title}</Text>
                                    <Text style={styles.transactionCategory}>{transaction.category}</Text>
                                </View>
                                <View style={styles.transactionAmount}>
                                    <Text style={[
                                        styles.transactionAmountText, 
                                        { color: transaction.amount > 0 ? theme.colors.success : theme.colors.danger }
                                    ]}>
                                        {transaction.amount > 0 ? '+' : '-'}Rs. {Math.abs(transaction.amount).toLocaleString()}
                                    </Text>
                                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyTransactions}>
                            <Ionicons name="receipt-outline" size={48} color={theme.colors.text_secondary} />
                            <Text style={styles.emptyText}>No transactions yet</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Transactions', { screen: 'AddTransaction' })}>
                                <Text style={styles.addFirstText}>Add your first transaction</Text>
                            </TouchableOpacity>
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
    loadingText: { marginTop: theme.spacing.md, fontSize: theme.fontSize.base, color: theme.colors.text_secondary },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.sm },
    headerWelcome: { fontSize: theme.fontSize.base, color: theme.colors.text_secondary },
    headerUser: { fontSize: theme.fontSize['2xl'], color: theme.colors.text_primary, fontWeight: 'bold' },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    balanceCard: { backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.borderRadius.xl },
    balanceLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: theme.fontSize.base, marginBottom: theme.spacing.sm },
    balanceAmount: { color: theme.colors.white, fontSize: 36, fontWeight: 'bold' },
    balanceDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.2)' },
    balanceDetailLabel: { color: 'rgba(255, 255, 255, 0.7)', fontSize: theme.fontSize.sm, marginBottom: 4 },
    balanceDetailAmount: { color: theme.colors.white, fontSize: theme.fontSize.base, fontWeight: '600' },
    section: { marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.md },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
    sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.text_primary },
    seeAllText: { color: theme.colors.primary, fontSize: theme.fontSize.base, fontWeight: '600' },
    quickActionsContainer: { paddingVertical: theme.spacing.sm },
    quickActionItem: { alignItems: 'center', marginRight: theme.spacing.lg },
    quickActionIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.sm },
    quickActionText: { fontSize: theme.fontSize.sm, color: theme.colors.text_secondary, fontWeight: '500' },
    transactionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.sm },
    transactionIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
    transactionDetails: { flex: 1 },
    transactionTitle: { fontSize: theme.fontSize.base, fontWeight: '600', color: theme.colors.text_primary },
    transactionCategory: { fontSize: theme.fontSize.sm, color: theme.colors.text_secondary, textTransform: 'capitalize' },
    transactionAmount: { alignItems: 'flex-end' },
    transactionAmountText: { fontSize: theme.fontSize.base, fontWeight: 'bold' },
    transactionDate: { fontSize: theme.fontSize.sm, color: theme.colors.text_secondary },
    emptyTransactions: { alignItems: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
    emptyText: { fontSize: theme.fontSize.base, color: theme.colors.text_secondary, marginTop: theme.spacing.sm },
    addFirstText: { fontSize: theme.fontSize.base, color: theme.colors.primary, marginTop: theme.spacing.sm, fontWeight: '600' },
});