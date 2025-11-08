import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import BudgetCard from '../components/BudgetCard';
import { deleteBudget, getBudgets, getTransactions, saveBudget, seedDefaultBudgets } from '../services/firebaseService';
import { theme } from '../styles/theme';

// Animated component for staggered entry
const AnimatedView = ({ children, index }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    React.useEffect(() => {
        opacity.value = withDelay(index * 150, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
        translateY.value = withDelay(index * 150, withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }));
    }, []);

    return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

export default function BudgetScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [newBudgetCategory, setNewBudgetCategory] = useState("");
    const [newBudgetAmount, setNewBudgetAmount] = useState("");
    const [editBudgetAmount, setEditBudgetAmount] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoryBudgets, setCategoryBudgets] = useState({});

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const transactionData = await getTransactions();
            let budgetsData = await getBudgets();

            if (Object.keys(budgetsData).length === 0) {
                budgetsData = await seedDefaultBudgets();
            }
            
            setTransactions(transactionData);
            setCategoryBudgets(budgetsData);

        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const calculateCategorySpending = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const categorySpending = {};

        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                let transactionDate;
                if (transaction.date) {
                    transactionDate = new Date(transaction.date);
                } else if (transaction.createdAt?.toDate) {
                    transactionDate = transaction.createdAt.toDate();
                } else {
                    transactionDate = new Date();
                }

                if (transactionDate.getMonth() === currentMonth && 
                    transactionDate.getFullYear() === currentYear) {
                    
                    const category = transaction.category;
                    const amount = Math.abs(transaction.amount);
                    
                    if (!categorySpending[category]) {
                        categorySpending[category] = 0;
                    }
                    categorySpending[category] += amount;
                }
            }
        });

        return categorySpending;
    };

    const categorySpending = calculateCategorySpending();

    const categoryNames = {
        'food': 'Food & Dining',
        'transport': 'Transportation',
        'utilities': 'Utilities',
        'shopping': 'Shopping',
        'entertainment': 'Entertainment',
        'health': 'Healthcare',
        'education': 'Education',
        'salary': 'Salary',
        'freelance': 'Freelance',
        'business': 'Business',
        'investment': 'Investment',
        'gift': 'Gift',
        'other': 'Other',
    };

    const categoryIcons = {
        'food': 'restaurant',
        'transport': 'car',
        'utilities': 'flash',
        'shopping': 'bag',
        'entertainment': 'game-controller',
        'health': 'medical',
        'education': 'school',
        'salary': 'briefcase',
        'freelance': 'laptop',
        'business': 'storefront',
        'investment': 'trending-up',
        'gift': 'gift',
        'other': 'ellipsis-horizontal',
    };

    const budgets = Object.keys(categoryBudgets).map(categoryKey => {
        const displayName = categoryNames[categoryKey] || categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);

        return {
            id: categoryKey,
            category: displayName,
            spent: categorySpending[categoryKey] || 0,
            budget: categoryBudgets[categoryKey],
            icon: categoryIcons[categoryKey] || 'ellipsis-horizontal',
        };
    });

    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.budget, 0);

    const handleAddBudget = async () => {
        const categoryInput = newBudgetCategory.trim();
        const amountInput = newBudgetAmount.trim();

        if (!categoryInput || !amountInput) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const amount = parseFloat(amountInput);
        
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount (numbers only)');
            return;
        }

        const categoryKey = categoryInput.toLowerCase();

        try {
            await saveBudget(categoryKey, amount);
            
            setCategoryBudgets(prev => ({
                ...prev,
                [categoryKey]: amount,
            }));

            Alert.alert('Success', 'Budget category added successfully!');
            
            setModalVisible(false);
            setNewBudgetCategory("");
            setNewBudgetAmount("");

        } catch (error) {
            console.error('Error saving budget:', error);
            Alert.alert('Error', 'Failed to save budget. Please try again.\n\n' + error.message);
        }
    };

    const handleBudgetPress = (budget) => {
        setSelectedBudget(budget);
        setEditBudgetAmount(budget.budget.toString());
        setEditModalVisible(true);
    };

    const handleUpdateBudget = async () => {
        const amountInput = editBudgetAmount.trim();

        if (!amountInput) {
            Alert.alert('Error', 'Please enter an amount');
            return;
        }

        const amount = parseFloat(amountInput);
        
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        try {
            await saveBudget(selectedBudget.id, amount);
            
            setCategoryBudgets(prev => ({
                ...prev,
                [selectedBudget.id]: amount,
            }));

            Alert.alert('Success', 'Budget updated successfully!');
            setEditModalVisible(false);
            setSelectedBudget(null);
            setEditBudgetAmount("");

        } catch (error) {
            console.error('Error updating budget:', error);
            Alert.alert('Error', 'Failed to update budget. Please try again.');
        }
    };

    const handleDeleteBudget = () => {
        Alert.alert(
            'Delete Budget',
            `Are you sure you want to delete the budget for ${selectedBudget.category}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteBudget(selectedBudget.id);
                            
                            setCategoryBudgets(prev => {
                                const newBudgets = { ...prev };
                                delete newBudgets[selectedBudget.id];
                                return newBudgets;
                            });

                            Alert.alert('Success', 'Budget deleted successfully!');
                            setEditModalVisible(false);
                            setSelectedBudget(null);
                            setEditBudgetAmount("");

                        } catch (error) {
                            console.error('Error deleting budget:', error);
                            Alert.alert('Error', 'Failed to delete budget. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading budget data...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                <AnimatedView index={0}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Monthly Budget Overview</Text>
                        <View style={styles.summaryDetails}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Total Budget</Text>
                                <Text style={styles.summaryAmount}>Rs. {totalBudget.toLocaleString()}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Total Spent</Text>
                                <Text style={[styles.summaryAmount, { color: totalSpent > totalBudget ? theme.colors.danger : theme.colors.success }]}>
                                    Rs. {totalSpent.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                        <BudgetCard spent={totalSpent} budget={totalBudget} />
                        <View style={styles.summaryFooter}>
                            <Text style={styles.summaryFooterLabel}>Remaining</Text>
                            <Text style={[
                                styles.summaryFooterAmount,
                                { color: (totalBudget - totalSpent) >= 0 ? theme.colors.success : theme.colors.danger }
                            ]}>
                                Rs. {(totalBudget - totalSpent).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </AnimatedView>

                <AnimatedView index={1}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Budget Categories</Text>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => setModalVisible(true)}
                            >
                                <Ionicons name="add" size={20} color={theme.colors.primary} />
                                <Text style={styles.addButtonText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                        {budgets.length > 0 ? (
                            budgets.map((budget) => (
                                <TouchableOpacity
                                    key={budget.id}
                                    style={styles.budgetItem}
                                    onPress={() => handleBudgetPress(budget)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.budgetHeader}>
                                        <View style={styles.budgetIconContainer}>
                                            <Ionicons name={budget.icon} size={24} color={theme.colors.primary} />
                                        </View>
                                        <View style={styles.budgetInfo}>
                                            <Text style={styles.budgetCategory}>{budget.category}</Text>
                                            <Text style={styles.budgetAmounts}>
                                                Rs. {budget.spent.toLocaleString()} / Rs. {budget.budget.toLocaleString()}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={theme.colors.text_secondary} />
                                    </View>
                                    <BudgetCard
                                        spent={budget.spent}
                                        budget={budget.budget}
                                        showTitle={false}
                                        compact={true}
                                    />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyBudgets}>
                                <Ionicons name="pie-chart-outline" size={48} color={theme.colors.text_secondary} />
                                <Text style={styles.emptyText}>No budget categories yet</Text>
                                <TouchableOpacity onPress={() => setModalVisible(true)}>
                                    <Text style={styles.addFirstText}>Add your first budget</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </AnimatedView>
            </ScrollView>

            {/* Add Budget Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Budget Category</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text_secondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Category Name</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={newBudgetCategory}
                                onChangeText={setNewBudgetCategory}
                                placeholder="e.g., Groceries, Gas, etc."
                                placeholderTextColor={theme.colors.text_secondary}
                            />
                            <Text style={styles.inputLabel}>Budget Amount (Rs.)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={newBudgetAmount}
                                onChangeText={setNewBudgetAmount}
                                placeholder="5000"
                                keyboardType="numeric"
                                placeholderTextColor={theme.colors.text_secondary}
                            />
                        </View>
                        <TouchableOpacity 
                            style={styles.saveButton} 
                            onPress={handleAddBudget}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.saveButtonText}>Add Budget</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Edit/Delete Budget Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Budget</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text_secondary} />
                            </TouchableOpacity>
                        </View>
                        {selectedBudget && (
                            <View style={styles.modalBody}>
                                <Text style={styles.inputLabel}>Category: {selectedBudget.category}</Text>
                                <Text style={styles.inputLabel}>Budget Amount (Rs.)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editBudgetAmount}
                                    onChangeText={setEditBudgetAmount}
                                    placeholder="5000"
                                    keyboardType="numeric"
                                    placeholderTextColor={theme.colors.text_secondary}
                                />
                            </View>
                        )}
                        <View style={styles.editButtonContainer}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.deleteButton]} 
                                onPress={handleDeleteBudget}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={20} color={theme.colors.white} />
                                <Text style={styles.modalButtonText}>Delete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.updateButton]} 
                                onPress={handleUpdateBudget}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="checkmark" size={20} color={theme.colors.white} />
                                <Text style={styles.modalButtonText}>Update</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerContent: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: theme.spacing.md, fontSize: theme.fontSize.base, color: theme.colors.text_secondary },
    scrollContainer: {
        padding: theme.spacing.md,
    },
    summaryCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
        marginBottom: theme.spacing.xl,
    },
    summaryTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.lg,
    },
    summaryDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    summaryItem: {
        alignItems: 'flex-start',
    },
    summaryLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        marginBottom: theme.spacing.xs,
    },
    summaryAmount: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    summaryFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.background,
    },
    summaryFooterLabel: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        fontWeight: '600',
    },
    summaryFooterAmount: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    addButtonText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.base,
        fontWeight: '600',
    },
    budgetItem: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    budgetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    budgetIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    budgetInfo: {
        flex: 1,
    },
    budgetCategory: {
        fontSize: theme.fontSize.base,
        fontWeight: '600',
        color: theme.colors.text_primary,
        textTransform: 'capitalize',
    },
    budgetAmounts: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
    },
    emptyBudgets: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
    },
    emptyText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.sm,
    },
    addFirstText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.primary,
        marginTop: theme.spacing.sm,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    modalBody: {
        marginBottom: theme.spacing.lg,
    },
    inputLabel: {
        fontSize: theme.fontSize.base,
        fontWeight: '600',
        color: theme.colors.text_secondary,
        marginBottom: theme.spacing.sm,
    },
    modalInput: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.base,
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
    },
    saveButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.base,
        fontWeight: 'bold',
    },
    editButtonContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    modalButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.xs,
    },
    deleteButton: {
        backgroundColor: theme.colors.danger,
    },
    updateButton: {
        backgroundColor: theme.colors.primary,
    },
    modalButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.base,
        fontWeight: 'bold',
    },
});