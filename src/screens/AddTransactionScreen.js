import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import CategoryPicker from '../components/CategoryPicker';
import { addTransaction, getBudgets, getTransactions } from '../services/firebaseService';
import { checkBudgetAndNotify } from '../services/notificationService';
import { theme } from '../styles/theme';

export default function AddTransactionScreen({ navigation, route }) {
    const params = route.params || {};
    
    const [amount, setAmount] = useState(params.amount || "");
    const [title, setTitle] = useState(params.title || "");
    const [category, setCategory] = useState(params.category || "");
    const [type, setType] = useState('expense');
    const [note, setNote] = useState(params.note || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (route.params) {
            if (route.params.amount) setAmount(route.params.amount);
            if (route.params.title) setTitle(route.params.title);
            if (route.params.category) setCategory(route.params.category);
            if (route.params.note) setNote(route.params.note);
        }
    }, [route.params]);

    const handleSaveTransaction = async () => {
        // Validation
        if (!amount || !title || !category) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        setLoading(true);

        try {
            // Prepare transaction data
            const transactionData = {
                title: title.trim(),
                amount: type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount),
                category: category,
                type: type,
                note: note.trim(),
                date: new Date().toISOString(),
            };

            // Save to Firebase
            await addTransaction(transactionData);

            // If it's an expense, check budget and send notifications
            if (type === 'expense') {
                try {
                    const [transactions, budgets] = await Promise.all([
                        getTransactions(),
                        getBudgets()
                    ]);
                    
                    // Check budget and send notifications
                    await checkBudgetAndNotify(transactions, budgets);
                } catch (notifError) {
                    console.error('Error checking budget notifications:', notifError);
                    // Don't block the user if notification fails
                }
            }

            Alert.alert(
                'Success',
                'Transaction saved successfully!',
                [
                    { 
                        text: 'OK', 
                        onPress: () => {
                            navigation.navigate('TransactionsList', { refresh: true });
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error saving transaction:', error);
            Alert.alert(
                'Error', 
                'Failed to save transaction. Please try again.\n\n' + error.message
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
                {/* Transaction Type Selector */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transaction Type</Text>
                    <View style={styles.typeSelector}>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                type === 'expense' && styles.activeExpenseButton,
                            ]}
                            onPress={() => setType('expense')}
                            disabled={loading}
                        >
                            <Ionicons
                                name="arrow-down"
                                size={20}
                                color={type === 'expense' ? theme.colors.white : theme.colors.danger}
                            />
                            <Text
                                style={[
                                    styles.typeButtonText,
                                    type === 'expense' && styles.activeTypeButtonText,
                                ]}
                            >
                                Expense
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                type === 'income' && styles.activeIncomeButton,
                            ]}
                            onPress={() => setType('income')}
                            disabled={loading}
                        >
                            <Ionicons
                                name="arrow-up"
                                size={20}
                                color={type === 'income' ? theme.colors.white : theme.colors.success}
                            />
                            <Text
                                style={[
                                    styles.typeButtonText,
                                    type === 'income' && styles.activeTypeButtonText,
                                ]}
                            >
                                Income
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Amount Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Amount *</Text>
                    <View style={styles.amountContainer}>
                        <Text style={styles.currencySymbol}>Rs.</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            keyboardType="numeric"
                            editable={!loading}
                        />
                    </View>
                </View>

                {/* Title Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Title *</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter transaction title"
                        editable={!loading}
                    />
                </View>

                {/* Category Picker */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Category *</Text>
                    <CategoryPicker
                        selectedCategory={category}
                        onSelectCategory={setCategory}
                        type={type}
                    />
                </View>

                {/* Note Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Note (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.noteInput]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Add a note about this transaction..."
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        editable={!loading}
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                    onPress={handleSaveTransaction}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.colors.white} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Transaction</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.md,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.fontSize.base,
        fontWeight: '600',
        color: theme.colors.text_secondary,
        marginBottom: theme.spacing.sm,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
        gap: theme.spacing.sm,
    },
    activeExpenseButton: {
        backgroundColor: theme.colors.danger,
        borderColor: theme.colors.danger,
    },
    activeIncomeButton: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    typeButtonText: {
        fontSize: theme.fontSize.base,
        fontWeight: '600',
        color: theme.colors.text_secondary,
    },
    activeTypeButtonText: {
        color: theme.colors.white,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.gray[400],
        marginRight: theme.spacing.sm,
    },
    amountInput: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.base,
        color: theme.colors.text_primary,
    },
    noteInput: {
        height: 120,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.lg,
    },
    saveButtonDisabled: {
        backgroundColor: theme.colors.gray[600],
    },
    saveButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
    },
});