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
import { useUser } from '../context/UserContext';
import { addTransaction } from '../services/firebaseService';
import { theme } from '../styles/theme';

// Helper function to map bank transactions to categories
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
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_SMS,
                    {
                        title: 'SMS Permission',
                        message: 'This app needs to read SMS to automatically track bank transactions',
                        buttonPositive: 'OK',
                    }
                );

                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    setHasPermission(true);
                    await loadTransactions();
                } else {
                    Alert.alert(
                        'Permission Required',
                        'Please enable SMS permission in Settings to auto-track transactions'
                    );
                }
            } catch (error) {
                console.error('Permission error:', error);
            }
        }
    };

    const loadTransactions = async () => {
        setLoading(true);
        try {
            await syncSMSTransactions();
        } catch (error) {
            console.error('Error loading transactions:', error);
            Alert.alert('Error', 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTransactions();
        setRefreshing(false);
    };

    const syncSMSTransactions = async () => {
        const filter = { box: 'inbox', maxCount: 500 };

        SmsAndroid.list(
            JSON.stringify(filter),
            (fail) => console.error('Failed to get SMS:', fail),
            async (count, smsList) => {
                try {
                    const smsArray = JSON.parse(smsList);
                    const bankTransactions = await filterBankTransactions(smsArray);
                    setTransactions(bankTransactions);
                } catch (error) {
                    console.error('Error syncing SMS:', error);
                }
            }
        );
    };

    const filterBankTransactions = async (messages) => {
        const newTransactions = [];

        for (const msg of messages) {
            const body = msg.body;
            
            // Filter out OTP messages
            const otpPatterns = [
                /\b\d{4,8}\s*is\s*(?:the\s*)?(?:one-time|OTP|password|verification)/i,
                /OTP\s*(?:is|:)?\s*\d{4,8}/i,
                /verification\s*code/i,
                /one-time\s*password/i,
                /use\s*\d{4,8}\s*as\s*OTP/i,
                /your\s*OTP.*?is\s*\d{4,8}/i,
                /keep\s*your\s*OTP\s*confidential/i,
            ];
            
            if (otpPatterns.some(pattern => pattern.test(body))) continue;

            let bankName = 'Unknown Bank';
            let amount = 0;
            let currency = 'LKR';
            let transactionType = null;
            let reason = 'Not defined';
            let transactionDate = parseInt(msg.date);

            // Bank of Ceylon
            if (body.includes('Bank of Ceylon') || body.includes('BOC')) {
                bankName = 'Bank of Ceylon';
                const amountMatch = body.match(/(?:Rs\.?|USD|EUR)\s*([\d,]+\.?\d*)/i);
                if (amountMatch) {
                    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                    const currMatch = body.match(/(Rs\.?|USD|EUR)/i);
                    if (currMatch) currency = currMatch[1].replace('.', '');
                }
                
                if (/POS\/ATM Transaction/i.test(body)) {
                    transactionType = 'debit';
                    reason = 'POS/ATM Transaction';
                    const merchantMatch = body.match(/at\s+([A-Z][A-Za-z\s]+?)(?:\.|Thank)/i);
                    if (merchantMatch) reason = `Payment at ${merchantMatch[1].trim()}`;
                }
            }
            
            // People's Bank
            else if (body.includes('Peoples Bank') || body.includes('LANKAPAY')) {
                bankName = "People's Bank";
                const amountMatch = body.match(/(?:LKR|Rs\.?)\s*([\d,]+\.?\d*)/i);
                if (amountMatch) {
                    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                    currency = 'LKR';
                }
                
                if (/Billpay/i.test(body)) {
                    transactionType = 'debit';
                    const billMatch = body.match(/to\s+([A-Z\s\(\)\/]+?)(?:\s+on|\s+Ref)/i);
                    reason = billMatch ? `Bill Payment - ${billMatch[1].trim()}` : 'Bill Payment';
                } else if (/Credited/i.test(body)) {
                    transactionType = 'credit';
                    reason = /Automatic Transfer/i.test(body) ? 'Automatic Transfer' : 'Account Credit';
                } else if (/LANKAPAY.*Transfer/i.test(body)) {
                    transactionType = 'debit';
                    reason = 'Online Transfer (LANKAPAY)';
                }
                
                const dateMatch = body.match(/on\s+(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) transactionDate = new Date(dateMatch[1]).getTime();
            }
            
            // Hatton National Bank
            else if (body.includes('HNB ALERT') || body.includes('HNB')) {
                bankName = 'Hatton National Bank';
                const amountMatch = body.match(/Amt.*?:([\d,]+\.?\d*)\s*LKR/i);
                if (amountMatch) {
                    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                    currency = 'LKR';
                }
                
                if (/CASH WITH/i.test(body)) {
                    transactionType = 'debit';
                    const locationMatch = body.match(/Location:([^,]+)/i);
                    reason = locationMatch ? `Cash Withdrawal at ${locationMatch[1].trim()}` : 'Cash Withdrawal';
                }
            }
            
            // Commercial Bank
            else if (body.includes('ComBank') || /card ending.*?\d{4}/i.test(body)) {
                bankName = 'Commercial Bank';
                const amountMatch = body.match(/(?:LKR|Rs\.?)\s*([\d,]+\.?\d*)/i);
                if (amountMatch) {
                    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                    currency = 'LKR';
                }
                
                if (/Withdrawal/i.test(body)) {
                    transactionType = 'debit';
                    const locationMatch = body.match(/at\s+([A-Z0-9\s\-]+?)(?:\s+for|\s+BR)/i);
                    reason = locationMatch ? `ATM Withdrawal at ${locationMatch[1].trim()}` : 'ATM Withdrawal';
                }
            }
            
            // Sampath Bank
            else if (body.includes('Sampath Bank')) {
                bankName = 'Sampath Bank';
                const amountMatch = body.match(/(?:Rs\.?|LKR)\s*([\d,]+\.?\d*)/i);
                if (amountMatch) {
                    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                    currency = 'LKR';
                }
                
                if (/debited/i.test(body)) {
                    transactionType = 'debit';
                    reason = 'Account Debit';
                } else if (/credited/i.test(body)) {
                    transactionType = 'credit';
                    reason = 'Account Credit';
                }
            }
            
            // CEB
            else if (body.includes('CEB')) {
                bankName = 'Ceylon Electricity Board';
                const amountMatch = body.match(/Rs\.?\s*([\d,]+\.?\d*)/i);
                if (amountMatch) {
                    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                    currency = 'LKR';
                }
                
                if (/Payment.*?received/i.test(body)) {
                    transactionType = 'debit';
                    const accMatch = body.match(/A\/C No\.?\s*(\d+)/i);
                    reason = accMatch ? `Electricity Bill - A/C ${accMatch[1]}` : 'Electricity Bill';
                }
            }
            
            // NWSDB
            else if (body.includes('NWSDB')) {
                bankName = 'Water Board';
                const amountMatch = body.match(/Rs\.?\s*([\d,]+\.?\d*)/i);
                if (amountMatch) {
                    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                    currency = 'LKR';
                }
                
                if (/Payment.*?received/i.test(body)) {
                    transactionType = 'debit';
                    const accMatch = body.match(/A\/C No[,.\s]*([0-9\/]+)/i);
                    reason = accMatch ? `Water Bill - A/C ${accMatch[1]}` : 'Water Bill';
                }
            }

            if (!transactionType || amount === 0) continue;

            newTransactions.push({
                id: msg._id,
                smsId: msg._id,
                bankName,
                amount,
                currency,
                type: transactionType,
                reason,
                timestamp: transactionDate,
                body: body, // Keep original SMS body
            });
        }

        return newTransactions;
    };

    // Import single transaction to Firebase
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

            Alert.alert('Success', 'Transaction imported to your account!', [
                { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
            ]);
        } catch (error) {
            console.error('Error importing transaction:', error);
            Alert.alert('Error', 'Failed to import transaction. Please try again.');
        } finally {
            setImporting(false);
        }
    };

    // Import all transactions
    const handleImportAll = async () => {
        Alert.alert(
            'Import All Transactions',
            `Import all ${filteredTransactions.length} SMS transactions to your account?`,
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
                                console.error('Error importing transaction:', error);
                                failCount++;
                            }
                        }

                        setImporting(false);
                        Alert.alert(
                            'Import Complete',
                            `Successfully imported ${successCount} transactions.\nFailed: ${failCount}`,
                            [
                                { text: 'View Dashboard', onPress: () => navigation.navigate('Dashboard') }
                            ]
                        );
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
        const totalDebit = filteredTransactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalCredit = filteredTransactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
        
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
                            {new Date(item.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Text>
                    </View>
                    <View style={styles.transactionRight}>
                        <Text style={[
                            styles.transactionAmountText, 
                            { color: item.type === 'credit' ? theme.colors.success : theme.colors.danger }
                        ]}>
                            {item.type === 'credit' ? '+' : '-'}{item.currency} {item.amount.toFixed(2)}
                        </Text>
                        <View style={[
                            styles.typeChip,
                            { backgroundColor: item.type === 'credit' ? '#10b98120' : '#ef444420' }
                        ]}>
                            <Text style={[
                                styles.typeText,
                                { color: item.type === 'credit' ? theme.colors.success : theme.colors.danger }
                            ]}>
                                {item.type.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>
                
                {/* Import Button */}
                <TouchableOpacity
                    style={styles.importButton}
                    onPress={() => handleImportTransaction(item)}
                    disabled={importing}
                    activeOpacity={0.7}
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

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <EmptyState
                    icon="lock-closed-outline"
                    title="SMS Permission Required"
                    message="Grant SMS permission to automatically track your bank transactions"
                    actionText="Grant Permission"
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
                        <Text style={styles.headerSubtitle}>Auto-detected bank messages</Text>
                    </View>
                    <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                        <Ionicons 
                            name="refresh" 
                            size={24} 
                            color={theme.colors.primary} 
                            style={refreshing && { opacity: 0.5 }}
                        />
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
                    
                    {/* Import All Button */}
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
                    <Text style={styles.loadingText}>Scanning SMS transactions...</Text>
                </View>
            ) : filteredTransactions.length > 0 ? (
                <FlatList
                    data={filteredTransactions}
                    renderItem={renderTransaction}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    }
                />
            ) : (
                <EmptyState
                    icon="mail-outline"
                    title="No Bank Transactions Found"
                    message="Your bank transaction SMS will appear here automatically"
                    actionText="Refresh"
                    onAction={onRefresh}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: theme.colors.background 
    },
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
    headerTitle: { 
        fontSize: theme.fontSize['2xl'], 
        fontWeight: 'bold', 
        color: theme.colors.text_primary 
    },
    headerSubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        marginTop: 2,
    },
    summaryCards: { 
        flexDirection: 'row', 
        paddingHorizontal: theme.spacing.md, 
        gap: theme.spacing.sm, 
        marginVertical: theme.spacing.md 
    },
    summaryCard: { 
        flex: 1, 
        padding: theme.spacing.md, 
        borderRadius: theme.borderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    summaryContent: {
        flex: 1,
    },
    summaryLabel: { 
        fontSize: theme.fontSize.xs, 
        color: theme.colors.text_secondary, 
        marginBottom: 4 
    },
    summaryAmount: { 
        fontSize: 16, 
        fontWeight: 'bold' 
    },
    searchContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: theme.colors.surface, 
        borderRadius: theme.borderRadius.md, 
        marginHorizontal: theme.spacing.md, 
        marginBottom: theme.spacing.md, 
        paddingHorizontal: theme.spacing.sm 
    },
    searchInput: { 
        flex: 1, 
        padding: theme.spacing.md, 
        fontSize: theme.fontSize.base, 
        color: theme.colors.text_primary 
    },
    filterContainer: { 
        flexDirection: 'row', 
        paddingHorizontal: theme.spacing.md, 
        marginBottom: theme.spacing.md, 
        gap: theme.spacing.sm,
        alignItems: 'center',
    },
    filterTab: { 
        paddingHorizontal: theme.spacing.md, 
        paddingVertical: theme.spacing.sm, 
        borderRadius: theme.borderRadius.full, 
        backgroundColor: theme.colors.surface 
    },
    activeFilterTab: { 
        backgroundColor: theme.colors.primary 
    },
    filterText: { 
        fontSize: theme.fontSize.sm, 
        color: theme.colors.text_secondary, 
        fontWeight: '600' 
    },
    activeFilterText: { 
        color: theme.colors.white 
    },
    importAllButton: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        gap: 4,
    },
    importAllText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.xs,
        fontWeight: '600',
    },
    listContainer: { 
        paddingHorizontal: theme.spacing.md, 
        paddingBottom: 80 
    },
    transactionItem: { 
        backgroundColor: theme.colors.surface, 
        padding: theme.spacing.md, 
        borderRadius: theme.borderRadius.lg, 
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
    },
    transactionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionIcon: { 
        width: 40, 
        height: 40, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: theme.spacing.md 
    },
    transactionDetails: { 
        flex: 1 
    },
    transactionTitle: { 
        fontSize: theme.fontSize.base, 
        fontWeight: '600', 
        color: theme.colors.text_primary, 
        marginBottom: 2 
    },
    transactionCategory: { 
        fontSize: theme.fontSize.sm, 
        color: theme.colors.text_secondary, 
        marginBottom: 2 
    },
    transactionDate: { 
        fontSize: 11, 
        color: theme.colors.text_secondary 
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmountText: { 
        fontSize: theme.fontSize.base, 
        fontWeight: 'bold', 
        marginBottom: 4 
    },
    typeChip: { 
        paddingHorizontal: 8, 
        paddingVertical: 2, 
        borderRadius: 10 
    },
    typeText: { 
        fontSize: 9, 
        fontWeight: 'bold' 
    },
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
        marginTop: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        gap: theme.spacing.xs,
    },
    importButtonText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    loadingText: { 
        marginTop: theme.spacing.md, 
        color: theme.colors.text_secondary 
    },
});