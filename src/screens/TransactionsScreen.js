import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import EmptyState from '../components/EmptyState';
import { deleteTransaction, getTransactions } from '../services/firebaseService';
import { theme } from '../styles/theme';

export default function TransactionsScreen({ navigation, route }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const filters = ['All', 'Income', 'Expense'];

    // Load transactions when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadTransactions();
        }, [])
    );

    // Also reload if route params indicate refresh
    useEffect(() => {
        if (route.params?.refresh) {
            loadTransactions();
        }
    }, [route.params?.refresh]);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const data = await getTransactions();
            
            // Format the data for display
            const formattedTransactions = data.map(transaction => ({
                id: transaction.id,
                title: transaction.title,
                amount: transaction.amount,
                category: transaction.category,
                type: transaction.type,
                date: formatDate(transaction.date || transaction.createdAt?.toDate()),
                note: transaction.note || '',
            }));
            
            setTransactions(formattedTransactions);
        } catch (error) {
            console.error('Error loading transactions:', error);
            Alert.alert('Error', 'Failed to load transactions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'Unknown date';
        
        const d = typeof date === 'string' ? new Date(date) : date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDeleteTransaction = (transactionId, transactionTitle) => {
        Alert.alert(
            'Delete Transaction',
            `Are you sure you want to delete "${transactionTitle}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTransaction(transactionId);
                            setTransactions(prev => prev.filter(t => t.id !== transactionId));
                            Alert.alert('Success', 'Transaction deleted successfully');
                        } catch (error) {
                            console.error('Error deleting transaction:', error);
                            Alert.alert('Error', 'Failed to delete transaction');
                        }
                    }
                }
            ]
        );
    };

    const filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = transaction.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = 
            selectedFilter === 'All' || 
            (selectedFilter === 'Income' && transaction.type === 'income') || 
            (selectedFilter === 'Expense' && transaction.type === 'expense');
        return matchesSearch && matchesFilter;
    });

    const renderTransaction = ({ item }) => (
        <TouchableOpacity 
            style={styles.transactionItem}
            onLongPress={() => handleDeleteTransaction(item.id, item.title)}
        >
            <View style={styles.transactionIcon}>
                <Ionicons 
                    name={item.amount > 0 ? 'arrow-up-circle' : 'arrow-down-circle'} 
                    size={30} 
                    color={item.amount > 0 ? theme.colors.success : theme.colors.danger} 
                />
            </View>
            <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>{item.title}</Text>
                <Text style={styles.transactionCategory}>{item.category}</Text>
            </View>
            <View style={styles.transactionAmount}>
                <Text style={[
                    styles.transactionAmountText, 
                    { color: item.amount > 0 ? theme.colors.success : theme.colors.danger }
                ]}>
                    {item.amount > 0 ? '+' : '-'}Rs. {Math.abs(item.amount).toLocaleString()}
                </Text>
                <Text style={styles.transactionDate}>{item.date}</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
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
            </View>

            {filteredTransactions.length > 0 ? (
                <FlatList
                    data={filteredTransactions}
                    renderItem={renderTransaction}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <EmptyState
                    icon="list-outline"
                    title={searchQuery || selectedFilter !== 'All' ? "No Matching Transactions" : "No Transactions Yet"}
                    message={searchQuery || selectedFilter !== 'All' ? "Try adjusting your search or filter." : "When you add a transaction, it will appear here."}
                    actionText="Add First Transaction"
                    onAction={() => navigation.navigate('AddTransaction')}
                />
            )}

            <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => navigation.navigate('AddTransaction')}
            >
                <Ionicons name="add" size={30} color={theme.colors.white} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: theme.colors.background, 
        paddingTop: theme.spacing.md 
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
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
        gap: theme.spacing.sm 
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
    listContainer: { 
        paddingHorizontal: theme.spacing.md, 
        paddingBottom: 80 
    },
    transactionItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: theme.colors.surface, 
        padding: theme.spacing.md, 
        borderRadius: theme.borderRadius.lg, 
        marginBottom: theme.spacing.sm 
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
        color: theme.colors.text_primary 
    },
    transactionCategory: { 
        fontSize: theme.fontSize.sm, 
        color: theme.colors.text_secondary,
        textTransform: 'capitalize',
    },
    transactionAmount: { 
        alignItems: 'flex-end' 
    },
    transactionAmountText: { 
        fontSize: theme.fontSize.base, 
        fontWeight: 'bold' 
    },
    transactionDate: { 
        fontSize: theme.fontSize.sm, 
        color: theme.colors.text_secondary 
    },
    addButton: { 
        position: 'absolute', 
        bottom: 30, 
        right: 30, 
        width: 60, 
        height: 60, 
        borderRadius: 30, 
        backgroundColor: theme.colors.primary, 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 8 
    },
});