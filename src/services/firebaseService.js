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
        console.log('Transaction added successfully:', docRef.id);
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
        
        console.log(`Retrieved ${transactions.length} transactions`);
        return transactions;
    } catch (error) {
        console.error('Error getting transactions:', error);
        throw error;
    }
};

// Update a transaction
export const updateTransaction = async (transactionId, updates) => {
    try {
        console.log('=== updateTransaction called ===');
        console.log('Transaction ID:', transactionId);
        console.log('Updates:', updates);
        
        const userId = getUserId();
        const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
        
        const updateData = {
            ...updates,
            updatedAt: Timestamp.now(),
        };
        
        await updateDoc(transactionRef, updateData);
        
        console.log('✅ Update successful!');
        return { id: transactionId, ...updateData };
    } catch (error) {
        console.error('=== updateTransaction ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error object:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Permission denied. Please check your security settings.');
        } else if (error.code === 'not-found') {
            throw new Error('Transaction not found.');
        }
        
        throw error;
    }
};

// Delete a transaction - ENHANCED VERSION
export const deleteTransaction = async (transactionId) => {
    try {
        console.log('=== deleteTransaction called ===');
        console.log('Transaction ID to delete:', transactionId);
        
        // Check if user is authenticated
        const user = auth.currentUser;
        if (!user) {
            console.error('No user authenticated');
            throw new Error('User not authenticated. Please log in again.');
        }
        
        const userId = user.uid;
        console.log('User ID:', userId);
        console.log('User email:', user.email);
        console.log('User authenticated:', !!user);
        
        // Verify the transaction ID is valid
        if (!transactionId || typeof transactionId !== 'string') {
            console.error('Invalid transaction ID:', transactionId);
            throw new Error('Invalid transaction ID');
        }
        
        // Create document reference: users/{userId}/transactions/{transactionId}
        const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
        console.log('Document reference path:', transactionRef.path);
        console.log('Full path: users/' + userId + '/transactions/' + transactionId);
        
        // Attempt to delete
        console.log('Attempting to delete document...');
        await deleteDoc(transactionRef);
        
        console.log('✅ Delete successful!');
        console.log('Transaction deleted:', transactionId);
        
        return transactionId;
    } catch (error) {
        console.error('=== deleteTransaction ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        
        // Handle specific Firebase errors
        if (error.code === 'permission-denied') {
            console.error('❌ PERMISSION DENIED - Check Firestore security rules');
            console.error('Make sure the rules allow delete for this user');
            throw new Error('Permission denied. You do not have permission to delete this transaction. (Check Firestore Rules)');
        } else if (error.code === 'not-found') {
            console.error('❌ NOT FOUND - Transaction does not exist');
            throw new Error('Transaction not found. It may have already been deleted.');
        } else if (error.code === 'unavailable') {
            console.error('❌ UNAVAILABLE - Network issue or Firestore is down');
            throw new Error('Unable to connect to the database. Please check your internet connection.');
        } else if (error.message.includes('not authenticated')) {
            console.error('❌ NOT AUTHENTICATED - User needs to log in');
            throw new Error('Authentication required. Please log in again.');
        }
        
        console.error('Full error object:', error);
        throw new Error(`Failed to delete transaction: ${error.message}`);
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
        
        console.log(`Retrieved ${transactions.length} ${type} transactions`);
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
        
        console.log(`Retrieved ${transactions.length} transactions for category: ${category}`);
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
            console.log('No budgets found for user. Returning empty object.');
            return {};
        }

        querySnapshot.forEach((doc) => {
            budgets[doc.id] = doc.data().amount;
        });
        
        console.log(`Retrieved ${Object.keys(budgets).length} budget categories`);
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
        console.log('=== saveBudget called ===');
        console.log('Category:', category);
        console.log('Amount:', amount);
        
        const userId = getUserId();
        const budgetRef = doc(db, 'users', userId, 'budgets', category);
        
        await setDoc(budgetRef, { 
            amount: amount,
            updatedAt: Timestamp.now()
        });
        
        console.log('✅ Budget saved successfully');
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
        console.log('=== seedDefaultBudgets called ===');
        const userId = getUserId();
        const budgetsRef = collection(db, 'users', userId, 'budgets');
        
        const batch = writeBatch(db);

        for (const [category, amount] of Object.entries(defaultBudgets)) {
            const docRef = doc(budgetsRef, category);
            batch.set(docRef, { 
                amount: amount,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        }
        
        await batch.commit();
        console.log('✅ Default budgets seeded successfully.');
        return defaultBudgets;
    } catch (error) {
        console.error('Error seeding default budgets:', error);
        throw error;
    }
};

/**
 * Delete a budget category
 * @param {string} category - The category ID to delete
 */
export const deleteBudget = async (category) => {
    try {
        console.log('=== deleteBudget called ===');
        console.log('Category to delete:', category);
        
        const userId = getUserId();
        const budgetRef = doc(db, 'users', userId, 'budgets', category);
        
        await deleteDoc(budgetRef);
        
        console.log('✅ Budget deleted successfully');
        return category;
    } catch (error) {
        console.error('Error deleting budget:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Permission denied. You do not have permission to delete this budget.');
        } else if (error.code === 'not-found') {
            throw new Error('Budget category not found.');
        }
        
        throw error;
    }
};