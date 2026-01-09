import { Ionicons } from '@expo/vector-icons';
import * as SMS from 'expo-sms';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import AnimatedView from '../components/AnimatedView';
import EmptyState from '../components/EmptyState';
import { useUser } from '../context/UserContext';
import { addTransaction } from '../services/firebaseService';
import { theme } from '../styles/theme';

const mapBankToCategory = (bankName) => {
    const lowerBank = bankName.toLowerCase();
    if (lowerBank.includes('ceb') || lowerBank.includes('electricity')) return 'utilities';
    if (lowerBank.includes('water') || lowerBank.includes('nwsdb')) return 'utilities';
    if (lowerBank.includes('food') || lowerBank.includes('restaurant')) return 'food';
    if (lowerBank.includes('transport') || lowerBank.includes('uber') || lowerBank.includes('pickme')) return 'transport';
    return 'other';
};

export default function SMSTransactionsScreen({ navigation }) {
    const { userName } = useUser();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [importing, setImporting] = useState(false);

    const filters = ['All', 'Credit', 'Debit'];

    useEffect(() => {
        checkPermissionsAndLoad();
    }, []);

    const checkPermissionsAndLoad = async () => {
        if (Platform.OS === 'android') {
            try {
                const isAvailable = await SMS.isAvailableAsync();
                
                if (!isAvailable) {
                    Alert.alert(
                        'SMS Not Available',
                        'SMS reading is not available on this device. This feature requires a bare React Native app.',
                        [{ text: 'OK' }]
                    );
                    return;
                }

                setHasPermission(true);
                
                // Show demo data instead since Expo doesn't support reading SMS
                Alert.alert(
                    'Demo Mode',
                    'SMS reading requires native permissions. Showing demo transactions.',
                    [{ text: 'OK', onPress: loadDemoTransactions }]
                );
            } catch (error) {
                console.error('Permission error:', error);
                Alert.alert('Feature Unavailable', 'SMS reading is not available in Expo Go. Please use a development build.');
            }
        }
    };

    const loadDemoTransactions = () => {
        setLoading(true);
        
        // Demo transactions for testing UI
        const demoTransactions = [
            {
                id: '1',
                smsId: 'demo1',
                bankName: 'Bank of Ceylon',
                amount: 2500,
                currency: 'LKR',
                type: 'debit',
                reason: 'POS Transaction',
                timestamp: Date.now() - 3600000,
                body: 'BOC Alert: Rs. 2,500.00 debited from A/C *1234 via POS at Keells on 09/01/2026 14:30. Avl Bal: Rs. 25,000.00'
            },
            {
                id: '2',
                smsId: 'demo2',
                bankName: "People's Bank",
                amount: 5000,
                currency: 'LKR',
                type: 'credit',
                reason: 'Account Credit',
                timestamp: Date.now() - 7200000,
                body: "People's Bank: Your account *5678 has been CREDITED with LKR 5,000.00 on 09/01/2026. Balance: LKR 30,000.00"
            },
            {
                id: '3',
                smsId: 'demo3',
                bankName: 'Commercial Bank',
                amount: 1200,
                currency: 'LKR',
                type: 'debit',
                reason: 'ATM Withdrawal',
                timestamp: Date.now() - 86400000,
                body: 'ComBank: ATM Withdrawal of LKR 1,200.00 from card ending 9012 on 08/01/2026 at 16:45. Available: LKR 28,800.00'
            }
        ];
        
        setTimeout(() => {
            setTransactions(demoTransactions);
            setLoading(false);
        }, 1000);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        loadDemoTransactions();
        setRefreshing(false);
    };

    const handleImportTransaction = async (transaction) => {
        if (importing) return;
        setImporting(true);
        try {
            await addTransaction({
                title: `${transaction.bankName} - ${transaction.reason}`,
                amount: transaction.type === 'debit' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount),
                category: mapBankToCategory(transaction.bankName),
                type: transaction.type === 'debit' ? 'expense' : 'income',
                note: `Auto-imported from SMS\n${transaction.body}`,
                date: new Date(transaction.timestamp).toISOString(),
            });

            Alert.alert('Success', 'Transaction imported!', [
                { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
            ]);
        } catch (error) {
            console.error('Error importing transaction:', error);
            Alert.alert('Error', 'Failed to import transaction.');
        } finally {
            setImporting(false);
        }
    };

    const handleImportAll = async () => {
        Alert.alert(
            'Import All',
            `Import ${filteredTransactions.length} transactions?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Import',
                    onPress: async () => {
                        setImporting(true);
                        let successCount = 0;
                        for (const transaction of filteredTransactions) {
                            try {
                                await addTransaction({
                                    title: `${transaction.bankName} - ${transaction.reason}`,
                                    amount: transaction.type === 'debit' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount),
                                    category: mapBankToCategory(transaction.bankName),
                                    type: transaction.type === 'debit' ? 'expense' : 'income',
                                    note: `Auto-imported from SMS`,
                                    date: new Date(transaction.timestamp).toISOString(),
                                });
                                successCount++;
                            } catch (error) {
                                console.error('Import error:', error);
                            }
                        }
                        setImporting(false);
                        Alert.alert('Complete', `Imported ${successCount} transactions.`);
                    },
                },
            ]
        );
    };

    const filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = transaction.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            transaction.bankName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = selectedFilter === 'All' || 
                            (selectedFilter === 'Credit' && transaction.type === 'credit') || 
                            (selectedFilter === 'Debit' && transaction.type === 'debit');
        return matchesSearch && matchesFilter;
    });

    const calculateTotals = () => {
        const totalDebit = filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
        const totalCredit = filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
        return { totalDebit, totalCredit };
    };

    const totals = calculateTotals();

    const renderTransaction = ({ item, index }) => (
        <AnimatedView index={index} delay={50}>
            <View style={styles.transactionItem}>
                <View style={styles.transactionHeader}>
                    <View style={styles.transactionIcon}>
                        <Ionicons 
                            name={item.type === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                            size={30} 
                            color={item.type === 'credit' ? theme.colors.success : theme.colors.danger} 
                        />
                    </View>
                    <View style={styles.transactionDetails}>
                        <Text style={styles.transactionTitle}>{item.bankName}</Text>
                        <Text style={styles.transactionCategory}>{item.reason}</Text>
                        <Text style={styles.transactionDate}>
                            {new Date(item.timestamp).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.transactionRight}>
                        <Text style={[
                            styles.transactionAmountText, 
                            { color: item.type === 'credit' ? theme.colors.success : theme.colors.danger }
                        ]}>
                            {item.type === 'credit' ? '+' : '-'}{item.currency} {item.amount.toFixed(2)}
                        </Text>
                    </View>
                </View>
                
                <TouchableOpacity
                    style={styles.importButton}
                    onPress={() => handleImportTransaction(item)}
                    disabled={importing}
                >
                    {importing ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.importButtonText}>Import to Account</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </AnimatedView>
    );

    if (!hasPermission && Platform.OS === 'android') {
        return (
            <View style={styles.container}>
                <EmptyState
                    icon="phone-portrait-outline"
                    title="SMS Feature Unavailable"
                    message="SMS reading requires a development build with native modules. This feature is not available in Expo Go."
                    actionText="Show Demo Data"
                    onAction={checkPermissionsAndLoad}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AnimatedView index={0}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>SMS Transactions</Text>
                        <Text style={styles.headerSubtitle}>Demo mode - showing sample data</Text>
                    </View>
                    <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                        <Ionicons name="refresh" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
            </AnimatedView>

            <AnimatedView index={1}>
                <View style={styles.summaryCards}>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.success + '20' }]}>
                        <Ionicons name="arrow-down" size={20} color={theme.colors.success} />
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryLabel}>Total Credits</Text>
                            <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
                                LKR {totals.totalCredit.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.danger + '20' }]}>
                        <Ionicons name="arrow-up" size={20} color={theme.colors.danger} />
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryLabel}>Total Debits</Text>
                            <Text style={[styles.summaryAmount, { color: theme.colors.danger }]}>
                                LKR {totals.totalDebit.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>
            </AnimatedView>

            <AnimatedView index={2}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={theme.colors.text_secondary} style={{ marginLeft: theme.spacing.sm }}/>
                    <TextInput 
                        style={styles.searchInput} 
                        placeholder="Search transactions..." 
                        placeholderTextColor={theme.colors.text_secondary} 
                        value={searchQuery} 
                        onChangeText={setSearchQuery} 
                    />
                </View>
            </AnimatedView>

            <AnimatedView index={3}>
                <View style={styles.filterContainer}>
                    {filters.map((filter) => (
                        <TouchableOpacity 
                            key={filter} 
                            style={[styles.filterTab, selectedFilter === filter && styles.activeFilterTab]} 
                            onPress={() => setSelectedFilter(filter)}
                        >
                            <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {filteredTransactions.length > 0 && (
                        <TouchableOpacity 
                            style={styles.importAllButton}
                            onPress={handleImportAll}
                            disabled={importing}
                        >
                            <Ionicons name="cloud-upload" size={16} color={theme.colors.white} />
                            <Text style={styles.importAllText}>Import All</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </AnimatedView>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading transactions...</Text>
                </View>
            ) : filteredTransactions.length > 0 ? (
                <FlatList
                    data={filteredTransactions}
                    renderItem={renderTransaction}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                />
            ) : (
                <EmptyState
                    icon="mail-outline"
                    title="No Transactions"
                    message="Demo transactions will appear here"
                    actionText="Refresh"
                    onAction={onRefresh}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: theme.spacing.md, 
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray[700],
    },
    headerTitle: { fontSize: theme.fontSize['2xl'], fontWeight: 'bold', color: theme.colors.text_primary },
    headerSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.text_secondary, marginTop: 2 },
    summaryCards: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm, marginVertical: theme.spacing.md },
    summaryCard: { flex: 1, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    summaryContent: { flex: 1 },
    summaryLabel: { fontSize: theme.fontSize.xs, color: theme.colors.text_secondary, marginBottom: 4 },
    summaryAmount: { fontSize: 16, fontWeight: 'bold' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.sm },
    searchInput: { flex: 1, padding: theme.spacing.md, fontSize: theme.fontSize.base, color: theme.colors.text_primary },
    filterContainer: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md, gap: theme.spacing.sm, alignItems: 'center' },
    filterTab: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.surface },
    activeFilterTab: { backgroundColor: theme.colors.primary },
    filterText: { fontSize: theme.fontSize.sm, color: theme.colors.text_secondary, fontWeight: '600' },
    activeFilterText: { color: theme.colors.white },
    importAllButton: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.full, gap: 4 },
    importAllText: { color: theme.colors.white, fontSize: theme.fontSize.xs, fontWeight: '600' },
    listContainer: { paddingHorizontal: theme.spacing.md, paddingBottom: 80 },
    transactionItem: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.gray[700] },
    transactionHeader: { flexDirection: 'row', alignItems: 'center' },
    transactionIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
    transactionDetails: { flex: 1 },
    transactionTitle: { fontSize: theme.fontSize.base, fontWeight: '600', color: theme.colors.text_primary, marginBottom: 2 },
    transactionCategory: { fontSize: theme.fontSize.sm, color: theme.colors.text_secondary, marginBottom: 2 },
    transactionDate: { fontSize: 11, color: theme.colors.text_secondary },
    transactionRight: { alignItems: 'flex-end' },
    transactionAmountText: { fontSize: theme.fontSize.base, fontWeight: 'bold', marginBottom: 4 },
    importButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, marginTop: theme.spacing.sm, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.primary, gap: theme.spacing.xs },
    importButtonText: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '600' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: theme.spacing.md, color: theme.colors.text_secondary },
});