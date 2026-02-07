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
    
    const [amount, setAmount] = useState(params.amount ? String(params.amount) : "");
    const [title, setTitle] = useState(params.title || "");
    const [category, setCategory] = useState(params.category || "");
    const [type, setType] = useState('expense');
    const [note, setNote] = useState(params.note || "");
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (route.params) {
            if (route.params.amount) setAmount(String(route.params.amount));
            if (route.params.title) setTitle(route.params.title);
            if (route.params.category) setCategory(route.params.category);
            if (route.params.note) setNote(route.params.note);
        }
    }, [route.params]);

    // ✅ FIX TC012: Sanitize amount input - only allow numbers and one decimal point
    const handleAmountChange = (text) => {
        // Remove all non-numeric characters except decimal point
        const cleaned = text.replace(/[^0-9.]/g, '');
        
        // Ensure only one decimal point
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            // Multiple decimals - keep only first one
            setAmount(parts[0] + '.' + parts.slice(1).join(''));
        } else {
            setAmount(cleaned);
        }
    };

    const handleSaveTransaction = async () => {
        // ✅ FIX TC023: Prevent duplicate submissions with debounce
        if (isSaving) {
            console.log('Save already in progress, ignoring duplicate tap');
            return;
        }

        // Validate all fields
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a transaction title');
            return;
        }

        if (!category) {
            Alert.alert('Error', 'Please select a category');
            return;
        }

        if (!amount || amount.trim() === '') {
            Alert.alert('Error', 'Please enter an amount');
            return;
        }

        // ✅ FIX TC011 & TC012: Comprehensive amount validation
        const numAmount = parseFloat(amount);
        
        if (isNaN(numAmount)) {
            Alert.alert('Error', 'Please enter a valid numeric amount');
            return;
        }

        if (numAmount <= 0) {
            Alert.alert('Error', 'Amount must be greater than zero');
            return;
        }

        if (numAmount > 999999999) {
            Alert.alert('Error', 'Amount is too large. Please enter a reasonable value.');
            return;
        }

        setLoading(true);
        setIsSaving(true); // ✅ Set saving flag

        try {
            const transactionData = {
                title: title.trim(),
                amount: type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount),
                category: category,
                type: type,
                note: note.trim(),
                date: new Date().toISOString(),
            };

            await addTransaction(transactionData);

            if (type === 'expense') {
                try {
                    const [transactions, budgets] = await Promise.all([
                        getTransactions(),
                        getBudgets()
                    ]);
                    await checkBudgetAndNotify(transactions, budgets);
                } catch (notifError) {
                    console.error('Error checking budget notifications:', notifError);
                }
            }

            // Reset form
            setAmount("");
            setTitle("");
            setCategory("");
            setNote("");

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
            Alert.alert('Error', 'Failed to save: ' + error.message);
        } finally {
            setLoading(false);
            setIsSaving(false); // ✅ Reset saving flag
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
                            onChangeText={handleAmountChange}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            editable={!loading}
                        />
                    </View>
                    {amount && parseFloat(amount) > 0 && (
                        <Text style={styles.helperText}>
                            Amount: Rs. {parseFloat(amount).toLocaleString()}
                        </Text>
                    )}
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
                        maxLength={100}
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
                        maxLength={500}
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                    style={[
                        styles.saveButton, 
                        (loading || isSaving) && styles.saveButtonDisabled
                    ]} 
                    onPress={handleSaveTransaction}
                    disabled={loading || isSaving}
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
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.md },
    section: { marginBottom: theme.spacing.lg },
    sectionTitle: {
        fontSize: theme.fontSize.base,
        fontWeight: '600',
        color: theme.colors.text_secondary,
        marginBottom: theme.spacing.sm,
    },
    typeSelector: { flexDirection: 'row', gap: theme.spacing.md },
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
    activeExpenseButton: { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },
    activeIncomeButton: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
    typeButtonText: { fontSize: theme.fontSize.base, fontWeight: '600', color: theme.colors.text_secondary },
    activeTypeButtonText: { color: theme.colors.white },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
    },
    currencySymbol: { fontSize: 24, fontWeight: 'bold', color: theme.colors.gray[400], marginRight: theme.spacing.sm },
    amountInput: { flex: 1, paddingVertical: theme.spacing.md, fontSize: 24, fontWeight: 'bold', color: theme.colors.text_primary },
    helperText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.xs,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.base,
        color: theme.colors.text_primary,
    },
    noteInput: { height: 120 },
    saveButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.lg,
    },
    saveButtonDisabled: { backgroundColor: theme.colors.gray[600], opacity: 0.6 },
    saveButtonText: { color: theme.colors.white, fontSize: theme.fontSize.lg, fontWeight: 'bold' },
});