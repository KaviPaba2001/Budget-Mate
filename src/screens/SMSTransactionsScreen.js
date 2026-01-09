import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    PermissionsAndroid,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import AnimatedView from '../components/AnimatedView';
import EmptyState from '../components/EmptyState';
import { addTransaction } from '../services/firebaseService';
import { theme } from '../styles/theme';

const mapBankToCategory = (bankName) => {
    const lowerBank = bankName.toLowerCase();
    if (lowerBank.includes('ceb') || lowerBank.includes('electricity')) return 'utilities';
    if (lowerBank.includes('water') || lowerBank.includes('nwsdb')) return 'utilities';
    if (lowerBank.includes('food') || lowerBank.includes('restaurant') || lowerBank.includes('keells')) return 'food';
    if (lowerBank.includes('transport') || lowerBank.includes('uber') || lowerBank.includes('pickme')) return 'transport';
    if (lowerBank.includes('shopping') || lowerBank.includes('mall')) return 'shopping';
    return 'other';
};

// Parse SMS transaction details
const parseSMSTransaction = (sms) => {
    const body = sms.body || '';
    const lowerBody = body.toLowerCase();
    
    // Extract bank name
    let bankName = 'Unknown Bank';
    if (lowerBody.includes('boc') || lowerBody.includes('bank of ceylon')) bankName = 'Bank of Ceylon';
    else if (lowerBody.includes("people's bank") || lowerBody.includes('peoples bank')) bankName = "People's Bank";
    else if (lowerBody.includes('commercial bank') || lowerBody.includes('combank')) bankName = 'Commercial Bank';
    else if (lowerBody.includes('sampath')) bankName = 'Sampath Bank';
    else if (lowerBody.includes('hnb') || lowerBody.includes('hatton')) bankName = 'HNB';
    else if (lowerBody.includes('seylan')) bankName = 'Seylan Bank';
    else if (lowerBody.includes('dfcc')) bankName = 'DFCC Bank';
    else if (lowerBody.includes('nations trust') || lowerBody.includes('ntb')) bankName = 'Nations Trust Bank';
    else if (lowerBody.includes('pan asia')) bankName = 'Pan Asia Bank';
    else if (lowerBody.includes('union')) bankName = 'Union Bank';
    
    // Extract amount (supports formats like: Rs. 2,500.00, LKR 2500, 2,500.00)
    const amountMatch = body.match(/(?:Rs\.?|LKR|රු)\s*([0-9,]+\.?\d*)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    
    // Determine transaction type (debit/credit)
    const isDebit = lowerBody.includes('debit') || 
                    lowerBody.includes('withdrawn') || 
                    lowerBody.includes('paid') ||
                    lowerBody.includes('purchase') ||
                    lowerBody.includes('spent');
    const isCredit = lowerBody.includes('credit') || 
                     lowerBody.includes('deposit') || 
                     lowerBody.includes('received') ||
                     lowerBody.includes('credited');
    
    const type = isCredit ? 'credit' : (isDebit ? 'debit' : 'unknown');
    
    // Extract reason/description
    let reason = 'Transaction';
    if (lowerBody.includes('atm')) reason = 'ATM Withdrawal';
    else if (lowerBody.includes('pos')) reason = 'POS Transaction';
    else if (lowerBody.includes('online') || lowerBody.includes('internet')) reason = 'Online Transaction';
    else if (lowerBody.includes('transfer')) reason = 'Transfer';
    else if (lowerBody.includes('deposit')) reason = 'Deposit';
    else if (lowerBody.includes('salary')) reason = 'Salary';
    else if (lowerBody.includes('bill') || lowerBody.includes('payment')) reason = 'Bill Payment';
    
    return {
        id: sms._id || String(Date.now() + Math.random()),
        smsId: sms._id,
        bankName,
        amount,
        currency: 'LKR',
        type,
        reason,
        timestamp: sms.date || Date.now(),
        body,
    };
};

// Filter function to identify bank/financial SMS
const isBankSMS = (sms) => {
    const body = sms.body?.toLowerCase() || '';
    const address = sms.address?.toLowerCase() || '';
    
    // Check if sender is a bank
    const bankKeywords = [
        'boc', 'bank', 'sampath', 'commercial', 'hnb', 'seylan', 
        'peoples', 'dfcc', 'nations trust', 'ntb', 'pan asia'
    ];
    
    // Check if message contains financial keywords
    const financialKeywords = [
        'debit', 'credit', 'withdraw', 'deposit', 'balance', 
        'account', 'transaction', 'rs.', 'lkr', 'payment'
    ];
    
    const hasBank = bankKeywords.some(keyword => body.includes(keyword) || address.includes(keyword));
    const hasFinancial = financialKeywords.some(keyword => body.includes(keyword));
    
    return hasBank && hasFinancial;
};

export default function SMSTransactionsScreen({ navigation }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [importing, setImporting] = useState(false);

    const filters = ['All', 'Credit', 'Debit'];

    useEffect(() => {
        requestSMSPermissions();
    }, []);

    const requestSMSPermissions = async () => {
        if (Platform.OS !== 'android') {
            Alert.alert(
                'iOS Not Supported',
                'SMS reading is only available on Android devices due to platform restrictions.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_SMS,
                {
                    title: 'SMS Permission Required',
                    message: 'Finance Tracker needs access to read SMS messages to automatically detect bank transactions. Your privacy is protected - we only read bank/financial messages.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'Grant Access',
                }
            );

            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('SMS permission granted');
                setHasPermission(true);
                loadSMSTransactions();
            } else {
                console.log('SMS permission denied');
                Alert.alert(
                    'Permission Required',
                    'SMS reading permission is required to automatically detect bank transactions from your messages.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error requesting SMS permission:', error);
            Alert.alert('Error', 'Failed to request SMS permissions.');
        }
    };

    const loadSMSTransactions = async () => {
        setLoading(true);
        try {
            // Read SMS from last 30 days
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            const filter = {
                box: 'inbox', // 'inbox' (default), 'sent', 'draft', 'outbox', 'failed', 'queued', and '' for all
                minDate: thirtyDaysAgo,
                maxCount: 100, // Limit to 100 most recent messages
            };

            SmsAndroid.list(
                JSON.stringify(filter),
                (fail) => {
                    console.error('Failed to load SMS:', fail);
                    Alert.alert('Error', 'Failed to read SMS messages. Please check permissions.');
                    setLoading(false);
                },
                (count, smsList) => {
                    console.log('SMS Count:', count);
                    
                    const messages = JSON.parse(smsList);
                    
                    // Filter only bank/financial SMS
                    const bankMessages = messages.filter(isBankSMS);
                    
                    console.log(`Found ${bankMessages.length} bank messages out of ${messages.length} total`);
                    
                    // Parse transactions
                    const parsedTransactions = bankMessages
                        .map(parseSMSTransaction)
                        .filter(t => t.amount > 0 && t.type !== 'unknown') // Only valid transactions
                        .sort((a, b) => b.timestamp - a.timestamp); // Sort by date, newest first
                    
                    setTransactions(parsedTransactions);
                    setLoading(false);
                }
            );
        } catch (error) {
            console.error('Error loading SMS:', error);
            Alert.alert('Error', 'Failed to load SMS messages: ' + error.message);
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadSMSTransactions();
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

            Alert.alert('Success', 'Transaction imported successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
            ]);
        } catch (error) {
            console.error('Error importing transaction:', error);
            Alert.alert('Error', 'Failed to import transaction: ' + error.message);
        } finally {
            setImporting(false);
        }
    };

    const handleImportAll = async () => {
        Alert.alert(
            'Import All Transactions',
            `Import ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Import',
                    onPress: async () => {
                        setImporting(true);
                        let successCount = 0;
                        let failCount = 0;
                        
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
                                failCount++;
                            }
                        }
                        
                        setImporting(false);
                        
                        if (failCount > 0) {
                            Alert.alert('Import Complete', 
                                `Successfully imported ${successCount} transaction${successCount !== 1 ? 's' : ''}.\n${failCount} failed.`);
                        } else {
                            Alert.alert('Success', 
                                `Imported ${successCount} transaction${successCount !== 1 ? 's' : ''} successfully!`);
                        }
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
        <AnimatedView index={index % 10}>
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
                            {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
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
                    icon="lock-closed-outline"
                    title="Permission Required"
                    message="SMS reading permission is required to automatically detect bank transactions from your messages."
                    actionText="Grant Permission"
                    onAction={requestSMSPermissions}
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
                        <Text style={styles.headerSubtitle}>Auto-detect bank transactions</Text>
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
                    <Text style={styles.loadingText}>Reading SMS messages...</Text>
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
                    title="No Transactions Found"
                    message={hasPermission ? "No bank transactions detected in your SMS messages from the last 30 days." : "Grant SMS permission to detect bank transactions."}
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