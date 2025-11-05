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
// Import the new budget functions
import { getBudgets, getTransactions, saveBudget, seedDefaultBudgets } from '../services/firebaseService';
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
    const [newBudgetCategory, setNewBudgetCategory] = useState("");
    const [newBudgetAmount, setNewBudgetAmount] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    // This will hold the budgets loaded from Firebase
    const [categoryBudgets, setCategoryBudgets] = useState({});

    // Load transactions and budgets when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch both transactions and budgets
            const transactionData = await getTransactions();
            let budgetsData = await getBudgets();

            // If no budgets, seed the default ones
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

    // Calculate spending by category for current month
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

                // Check if transaction is in current month
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

    // Create budgets array with actual spending
    const budgets = Object.keys(categoryBudgets).map(categoryKey => {
        const categoryNames = {
            'food': 'Food & Dining',
            'transport': 'Transportation',
            'utilities': 'Utilities',
            'shopping': 'Shopping',
            'entertainment': 'Entertainment',
            'health': 'Healthcare',
        };

        const categoryIcons = {
            'food': 'restaurant',
            'transport': 'car',
            'utilities': 'flash',
            'shopping': 'bag',
            'entertainment': 'game-controller',
            'health': 'medical',
        };

        // Handle dynamically added categories
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
        // 1. Checks if fields are empty. (They are not, so it continues)
        if (!newBudgetCategory || !newBudgetAmount) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        // 2. Tries to convert `newBudgetAmount` ("shopping") to a number
        const amount = parseFloat(newBudgetAmount);
        
        // 3. `parseFloat("shopping")` is NaN (Not a Number).
        // 4. `isNaN(amount)` is TRUE, so it enters this `if` block.
        if (isNaN(amount) || amount <= 0) {
            // 5. It shows this alert, which is what you are seeing.
            Alert.alert('Error', 'Please enter a valid amount');
            return; // 6. It stops here.
        }

        // This code below is never reached because of the error above.
        // If you swap the inputs, this code will run.

        // Use the category name as the ID (lowercase)
        const categoryKey = newBudgetCategory.toLowerCase().trim();

        try {
            // Save to Firebase
            await saveBudget(categoryKey, amount);
            
            // Update local state to reflect change instantly
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
            Alert.alert('Error', 'Failed to save budget.');
        }
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
                {/* Overall Budget Summary */}
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

                {/* Budget Categories */}
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
                                <View key={budget.id} style={styles.budgetItem}>
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
                                    </View>
                                    <BudgetCard
                                        spent={budget.spent}
                                        budget={budget.budget}
                                        showTitle={false}
                                        compact={true}
                                    />
                                </View>
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
                            <Text style={styles.inputLabel}>Budget Amount</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={newBudgetAmount}
                                onChangeText={setNewBudgetAmount}
                                placeholder="0.00"
                                keyboardType="numeric"
                                placeholderTextColor={theme.colors.text_secondary}
                            />
                        </View>
                        <TouchableOpacity style={styles.saveButton} onPress={handleAddBudget}>
                            <Text style={styles.saveButtonText}>Add Budget</Text>
                        </TouchableOpacity>
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
        textTransform: 'capitalize', // To make dynamic categories look nice
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
});