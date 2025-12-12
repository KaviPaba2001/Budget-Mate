import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getBudgets } from '../services/firebaseService';
import { theme } from '../styles/theme';

export default function CategoryPicker({ selectedCategory, onSelectCategory, type = 'expense' }) {
    const [modalVisible, setModalVisible] = useState(false);
    const [customCategories, setCustomCategories] = useState([]);

    // Static categories definitions
    const expenseCategories = useMemo(() => [
        { id: 'food', name: 'Food & Dining', icon: 'restaurant' },
        { id: 'transport', name: 'Transportation', icon: 'car' },
        { id: 'shopping', name: 'Shopping', icon: 'bag' },
        { id: 'utilities', name: 'Utilities', icon: 'flash' },
        { id: 'entertainment', name: 'Entertainment', icon: 'game-controller' },
        { id: 'health', name: 'Healthcare', icon: 'medical' },
        { id: 'education', name: 'Education', icon: 'school' },
        { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' },
    ], []);

    const incomeCategories = useMemo(() => [
        { id: 'salary', name: 'Salary', icon: 'briefcase' },
        { id: 'freelance', name: 'Freelance', icon: 'laptop' },
        { id: 'business', name: 'Business', icon: 'storefront' },
        { id: 'investment', name: 'Investment', icon: 'trending-up' },
        { id: 'gift', name: 'Gift', icon: 'gift' },
        { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' },
    ], []);

    // Combine base and custom categories
    const categories = useMemo(() => {
        const base = type === 'expense' ? expenseCategories : incomeCategories;
        // Merge custom categories, ensuring no duplicates by ID
        const combined = [...base];
        customCategories.forEach(custom => {
            if (!combined.some(c => c.id === custom.id)) {
                combined.push(custom);
            }
        });
        return combined;
    }, [type, expenseCategories, incomeCategories, customCategories]);

    // Load custom categories on mount so the initial value displays correctly
    useEffect(() => {
        if (type === 'expense') {
            loadCustomCategories();
        }
    }, [type]);

    const loadCustomCategories = async () => {
        try {
            const budgets = await getBudgets();
            const newCustomCats = [];
            Object.keys(budgets).forEach(categoryId => {
                // Check if it's already in base categories
                const isBase = expenseCategories.some(cat => cat.id === categoryId);
                if (!isBase) {
                    const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
                    newCustomCats.push({
                        id: categoryId,
                        name: categoryName,
                        icon: 'ellipsis-horizontal',
                    });
                }
            });
            setCustomCategories(newCustomCats);
        } catch (error) {
            console.error('Error loading custom categories:', error);
        }
    };

    const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.categoryItem,
                selectedCategory === item.id && styles.selectedCategoryItem,
            ]}
            onPress={() => {
                onSelectCategory(item.id);
                setModalVisible(false);
            }}
            activeOpacity={0.7}
        >
            <View style={styles.categoryIcon}>
                <Ionicons name={item.icon} size={26} color={theme.colors.primary} />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
            {selectedCategory === item.id && (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <>
            <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <View style={styles.pickerContent}>
                    {selectedCategoryData ? (
                        <>
                            <View style={styles.selectedIcon}>
                                <Ionicons name={selectedCategoryData.icon} size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.selectedText}>{selectedCategoryData.name}</Text>
                        </>
                    ) : (
                        <Text style={styles.placeholderText}>Select a category</Text>
                    )}
                </View>
                <Ionicons name="chevron-down" size={20} color={theme.colors.gray[400]} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <TouchableOpacity 
                        activeOpacity={1} 
                        style={styles.modalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <SafeAreaView style={styles.safeArea}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Category</Text>
                                <TouchableOpacity 
                                    onPress={() => setModalVisible(false)}
                                    style={styles.closeButton}
                                >
                                    <Ionicons name="close-circle" size={28} color={theme.colors.text_secondary} />
                                </TouchableOpacity>
                            </View>
                            
                            {/* Category List */}
                            <FlatList
                                data={categories}
                                renderItem={renderCategoryItem}
                                keyExtractor={(item) => item.id}
                                style={styles.categoryList}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={styles.categoryListContent}
                            />

                            {/* Close Button */}
                            <TouchableOpacity 
                                style={styles.bottomCloseButton}
                                onPress={() => setModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.bottomCloseButtonText}>Close</Text>
                            </TouchableOpacity>
                        </SafeAreaView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
        minHeight: 56,
    },
    pickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    selectedIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.sm,
    },
    selectedText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_primary,
        fontWeight: '500',
    },
    placeholderText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl * 1.5,
        borderTopRightRadius: theme.borderRadius.xl * 1.5,
        height: '75%',
        minHeight: 400,
    },
    safeArea: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray[700],
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    categoryList: {
        flex: 1,
    },
    categoryListContent: {
        paddingBottom: theme.spacing.xl,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray[800],
        backgroundColor: theme.colors.surface,
    },
    selectedCategoryItem: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    categoryName: {
        flex: 1,
        fontSize: theme.fontSize.base,
        color: theme.colors.text_primary,
        fontWeight: '500',
    },
    bottomCloseButton: {
        backgroundColor: theme.colors.primary,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        marginTop: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
    },
    bottomCloseButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.base,
        fontWeight: 'bold',
    },
});