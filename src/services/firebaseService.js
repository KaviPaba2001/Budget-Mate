import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { auth, db } from '../../firebase';

// Get current user ID
const getUserId = () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('No user logged in');
    }
    return user.uid;
};

// --- Default Budgets (for new users) ---
const defaultBudgets = {
    'food': 12000,
    'transport': 6000,
    'utilities': 4000,
    'shopping': 5000,
    'entertainment': 3000,
    'health': 5000,
};

// --- Transaction Functions ---

// Add a new transaction
export const addTransaction = async (transactionData) => {
    try {
        const userId = getUserId();
        const transactionsRef = collection(db, 'users', userId, 'transactions');
        
        const transaction = {
            ...transactionData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        
        const docRef = await addDoc(transactionsRef, transaction);
        return { id: docRef.id, ...transaction };
    } catch (error) {
        console.error('Error adding transaction:', error);
        throw error;
    }
};

// Get all transactions for current user
export const getTransactions = async () => {
    try {
        const userId = getUserId();
        const transactionsRef = collection(db, 'users', userId, 'transactions');
        const q = query(transactionsRef, orderBy('createdAt', 'desc'));
        
        const querySnapshot = await getDocs(q);
        const transactions = [];
        
        querySnapshot.forEach((doc) => {
            transactions.push({
                id: doc.id,
                ...doc.data(),
            });
        });
        
        return transactions;
    } catch (error) {
        console.error('Error getting transactions:', error);
        throw error;
    }
};

// Update a transaction
export const updateTransaction = async (transactionId, updates) => {
    try {
        const userId = getUserId();
        const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
        
        await updateDoc(transactionRef, {
            ...updates,
            updatedAt: Timestamp.now(),
        });
        
        return { id: transactionId, ...updates };
    } catch (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
};

// Delete a transaction - WITH ENHANCED DEBUGGING
export const deleteTransaction = async (transactionId) => {
    try {
        console.log('=== deleteTransaction called ===');
        console.log('Transaction ID to delete:', transactionId);
        
        const userId = getUserId();
        console.log('User ID:', userId);
        
        const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
        console.log('Document reference path:', transactionRef.path);
        
        console.log('Attempting to delete document...');
        await deleteDoc(transactionRef);
        
        console.log('✅ Delete successful!');
        return transactionId;
    } catch (error) {
        console.error('=== deleteTransaction ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error object:', error);
        
        // Throw with more context
        throw new Error(`Failed to delete transaction: ${error.message} (Code: ${error.code || 'unknown'})`);
    }
};

// Get transactions by type (income/expense)
export const getTransactionsByType = async (type) => {
    try {
        const userId = getUserId();
        const transactionsRef = collection(db, 'users', userId, 'transactions');
        const q = query(
            transactionsRef, 
            where('type', '==', type),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const transactions = [];
        
        querySnapshot.forEach((doc) => {
            transactions.push({
                id: doc.id,
                ...doc.data(),
            });
        });
        
        return transactions;
    } catch (error) {
        console.error('Error getting transactions by type:', error);
        throw error;
    }
};

// Get transactions by category
export const getTransactionsByCategory = async (category) => {
    try {
        const userId = getUserId();
        const transactionsRef = collection(db, 'users', userId, 'transactions');
        const q = query(
            transactionsRef, 
            where('category', '==', category),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const transactions = [];
        
        querySnapshot.forEach((doc) => {
            transactions.push({
                id: doc.id,
                ...doc.data(),
            });
        });
        
        return transactions;
    } catch (error) {
        console.error('Error getting transactions by category:', error);
        throw error;
    }
};


// --- BUDGET FUNCTIONS ---

/**
 * Gets all budgets for the current user.
 * Returns an object (e.g., {'food': 12000, 'transport': 6000})
 */
export const getBudgets = async () => {
    try {
        const userId = getUserId();
        const budgetsRef = collection(db, 'users', userId, 'budgets');
        const querySnapshot = await getDocs(budgetsRef);
        
        const budgets = {};
        if (querySnapshot.empty) {
            console.log('No budgets found for user. Seeding default budgets...');
            return {};
        }

        querySnapshot.forEach((doc) => {
            budgets[doc.id] = doc.data().amount;
        });
        
        return budgets;
    } catch (error) {
        console.error('Error getting budgets:', error);
        throw error;
    }
};

/**
 * Creates or updates a specific budget category for the user.
 * @param {string} category - The category ID (e.g., 'food')
 * @param {number} amount - The budget amount
 */
export const saveBudget = async (category, amount) => {
    try {
        const userId = getUserId();
        const budgetRef = doc(db, 'users', userId, 'budgets', category);
        
        await setDoc(budgetRef, { amount: amount });
        return { id: category, amount: amount };
    } catch (error) {
        console.error('Error saving budget:', error);
        throw error;
    }
};

/**
 * Saves the default budgets for a new user.
 */
export const seedDefaultBudgets = async () => {
    try {
        const userId = getUserId();
        const budgetsRef = collection(db, 'users', userId, 'budgets');
        
        const batch = writeBatch(db);

        for (const [category, amount] of Object.entries(defaultBudgets)) {
            const docRef = doc(budgetsRef, category);
            batch.set(docRef, { amount: amount });
        }
        
        await batch.commit();
        console.log('Default budgets seeded successfully.');
        return defaultBudgets;
    } catch (error) {
        console.error('Error seeding default budgets:', error);
        throw error;
    }
};