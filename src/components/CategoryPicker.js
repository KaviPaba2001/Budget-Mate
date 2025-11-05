import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

export default function CategoryPicker({ selectedCategory, onSelectCategory, type = 'expense' }) {
    const [modalVisible, setModalVisible] = useState(false);

    // Correctly defined arrays for categories
    const expenseCategories = [
        { id: 'food', name: 'Food & Dining', icon: 'restaurant' },
        { id: 'transport', name: 'Transportation', icon: 'car' },
        { id: 'shopping', name: 'Shopping', icon: 'bag' },
        { id: 'utilities', name: 'Utilities', icon: 'flash' },
        { id: 'entertainment', name: 'Entertainment', icon: 'game-controller' },
        { id: 'health', name: 'Healthcare', icon: 'medical' },
        { id: 'education', name: 'Education', icon: 'school' },
        { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' },
    ];

    const incomeCategories = [
        { id: 'salary', name: 'Salary', icon: 'briefcase' },
        { id: 'freelance', name: 'Freelance', icon: 'laptop' },
        { id: 'business', name: 'Business', icon: 'storefront' },
        { id: 'investment', name: 'Investment', icon: 'trending-up' },
        { id: 'gift', name: 'Gift', icon: 'gift' },
        { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' },
    ];

    const categories = type === 'expense' ? expenseCategories : incomeCategories;
    
    // DEBUGGING: Let's check if the categories array is correct.
    // console.log('Categories available:', categories);

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
        >
            <View style={styles.categoryIcon}>
                <Ionicons name={item.icon} size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
            {selectedCategory === item.id && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <>
            <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setModalVisible(true)}
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
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Category</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text_secondary} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={categories}
                            renderItem={renderCategoryItem}
                            keyExtractor={(item) => item.id}
                            style={styles.categoryList}
                        />
                    </View>
                </View>
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
    },
    pickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    selectedIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
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
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.gray[700],
    },
    modalTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    categoryList: {
        flex: 1,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.background,
    },
    selectedCategoryItem: {
        backgroundColor: theme.colors.primary,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
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
});
