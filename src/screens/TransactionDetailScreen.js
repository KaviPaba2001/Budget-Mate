import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
import { deleteTransaction, updateTransaction } from '../services/firebaseService';
import { theme } from '../styles/theme';

export default function TransactionDetailScreen({ navigation, route }) {
    const { transaction } = route.params;
    
    const [isEditing, setIsEditing] = useState(false);
    const [amount, setAmount] = useState(Math.abs(transaction.amount).toString());
    const [title, setTitle] = useState(transaction.title);
    const [category, setCategory] = useState(transaction.category);
    const [type, setType] = useState(transaction.type);
    const [note, setNote] = useState(transaction.note || '');
    const [loading, setLoading] = useState(false);

    const formatDate = (date) => {
        if (!date) return 'Unknown date';
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleSave = async () => {
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
            const updates = {
                title: title.trim(),
                amount: type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount),
                category: category,
                type: type,
                note: note.trim(),
            };

            await updateTransaction(transaction.id, updates);

            // Navigate back immediately after successful update
            navigation.goBack();
            
            // Show success message after navigation
            setTimeout(() => {
                Alert.alert('Success', 'Transaction updated successfully!');
            }, 500);
        } catch (error) {
            console.error('Error updating transaction:', error);
            Alert.alert('Error', 'Failed to update transaction. Please try again.');
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await deleteTransaction(transaction.id);
                            Alert.alert('Success', 'Transaction deleted successfully!', [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        navigation.navigate('TransactionsList', { refresh: true });
                                    },
                                },
                            ]);
                        } catch (error) {
                            console.error('Error deleting transaction:', error);
                            Alert.alert('Error', 'Failed to delete transaction. Please try again.');
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        setAmount(Math.abs(transaction.amount).toString());
        setTitle(transaction.title);
        setCategory(transaction.category);
        setType(transaction.type);
        setNote(transaction.note || '');
        setIsEditing(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Processing...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            {/* Header with Amount */}
            <View style={[styles.header, { backgroundColor: transaction.type === 'income' ? theme.colors.success : theme.colors.danger }]}>
                <View style={styles.headerIcon}>
                    <Ionicons 
                        name={transaction.type === 'income' ? 'arrow-up-circle' : 'arrow-down-circle'} 
                        size={50} 
                        color={theme.colors.white} 
                    />
                </View>
                <Text style={styles.headerLabel}>
                    {transaction.type === 'income' ? 'Income' : 'Expense'}
                </Text>
                {isEditing ? (
                    <View style={styles.amountEditContainer}>
                        <Text style={styles.currencySymbol}>Rs.</Text>
                        <TextInput
                            style={styles.amountEditInput}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                        />
                    </View>
                ) : (
                    <Text style={styles.headerAmount}>
                        Rs. {Math.abs(transaction.amount).toLocaleString()}
                    </Text>
                )}
            </View>

            {/* Details Section */}
            <View style={styles.content}>
                {/* Title */}
                <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Title</Text>
                    {isEditing ? (
                        <TextInput
                            style={styles.detailInput}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Enter title"
                            placeholderTextColor={theme.colors.text_secondary}
                        />
                    ) : (
                        <Text style={styles.detailValue}>{transaction.title}</Text>
                    )}
                </View>

                {/* Category */}
                <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Category</Text>
                    {isEditing ? (
                        <CategoryPicker
                            selectedCategory={category}
                            onSelectCategory={setCategory}
                            type={type}
                        />
                    ) : (
                        <View style={styles.categoryDisplay}>
                            <Ionicons 
                                name={getCategoryIcon(transaction.category)} 
                                size={20} 
                                color={theme.colors.primary} 
                            />
                            <Text style={[styles.detailValue, { marginLeft: theme.spacing.sm, textTransform: 'capitalize' }]}>
                                {transaction.category}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Type */}
                {isEditing && (
                    <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Type</Text>
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    type === 'expense' && styles.activeExpenseButton,
                                ]}
                                onPress={() => setType('expense')}
                            >
                                <Ionicons
                                    name="arrow-down"
                                    size={18}
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
                            >
                                <Ionicons
                                    name="arrow-up"
                                    size={18}
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
                )}

                {/* Date */}
                <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                        {formatDate(transaction.date || transaction.createdAt?.toDate())}
                    </Text>
                </View>

                {/* Note */}
                <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Note</Text>
                    {isEditing ? (
                        <TextInput
                            style={[styles.detailInput, styles.noteInput]}
                            value={note}
                            onChangeText={setNote}
                            placeholder="Add a note (optional)"
                            placeholderTextColor={theme.colors.text_secondary}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    ) : (
                        <Text style={[styles.detailValue, !transaction.note && { fontStyle: 'italic', color: theme.colors.text_secondary }]}>
                            {transaction.note || 'No note added'}
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                {isEditing ? (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={handleCancel}
                        >
                            <Ionicons name="close" size={20} color={theme.colors.text_primary} />
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.saveButton]}
                            onPress={handleSave}
                        >
                            <Ionicons name="checkmark" size={20} color={theme.colors.white} />
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={handleDelete}
                        >
                            <Ionicons name="trash-outline" size={20} color={theme.colors.white} />
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => setIsEditing(true)}
                        >
                            <Ionicons name="create-outline" size={20} color={theme.colors.white} />
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

// Helper function for category icons
const getCategoryIcon = (category) => {
    const icons = {
        food: 'restaurant',
        transport: 'car',
        shopping: 'bag',
        utilities: 'flash',
        entertainment: 'game-controller',
        health: 'medical',
        education: 'school',
        salary: 'briefcase',
        freelance: 'laptop',
        business: 'storefront',
        investment: 'trending-up',
        gift: 'gift',
        other: 'ellipsis-horizontal',
    };
    return icons[category] || 'ellipsis-horizontal';
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
    header: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    headerIcon: {
        marginBottom: theme.spacing.md,
    },
    headerLabel: {
        fontSize: theme.fontSize.base,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    headerAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    amountEditContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.white,
        marginRight: theme.spacing.sm,
    },
    amountEditInput: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.white,
        minWidth: 100,
    },
    content: {
        padding: theme.spacing.md,
    },
    detailSection: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
    },
    detailLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_primary,
        fontWeight: '500',
    },
    detailInput: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.base,
        color: theme.colors.text_primary,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
    },
    noteInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    categoryDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.sm,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
        gap: theme.spacing.xs,
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
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.text_secondary,
    },
    activeTypeButtonText: {
        color: theme.colors.white,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.sm,
    },
    editButton: {
        backgroundColor: theme.colors.primary,
    },
    editButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.base,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: theme.colors.danger,
    },
    deleteButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.base,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: theme.colors.success,
    },
    saveButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.base,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
    },
    cancelButtonText: {
        color: theme.colors.text_primary,
        fontSize: theme.fontSize.base,
        fontWeight: '600',
    },
});