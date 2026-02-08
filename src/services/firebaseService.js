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
import { checkNetworkConnection, showNetworkError } from '../utils/networkHelpers';

// Get current user ID
const getUserId = () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('No user logged in');
    }
    return user.uid;
};

// Wrapper function for network-dependent operations
const withNetworkCheck = async (operation, operationName) => {
    const isOnline = await checkNetworkConnection();
    
    if (!isOnline) {
        const errorMessage = `Cannot ${operationName} while offline. Please check your internet connection.`;
        showNetworkError(errorMessage);
        throw new Error(errorMessage);
    }
    
    return await operation();
};

// Default Budgets (for new users)
const defaultBudgets = {
    'food': 12000,
    'transport': 6000,
    'utilities': 4000,
    'shopping': 5000,
    'entertainment': 3000,
    'health': 5000,
};

// --- Transaction Functions ---

export const addTransaction = async (transactionData) => {
    return withNetworkCheck(async () => {
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
    }, 'add transaction');
};

export const getTransactions = async () => {
    return withNetworkCheck(async () => {
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
    }, 'load transactions');
};

export const updateTransaction = async (transactionId, updates) => {
    return withNetworkCheck(async () => {
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
    }, 'update transaction');
};

export const deleteTransaction = async (transactionId) => {
    return withNetworkCheck(async () => {
        try {
            console.log('=== deleteTransaction called ===');
            console.log('Transaction ID to delete:', transactionId);
            
            const user = auth.currentUser;
            if (!user) {
                console.error('No user authenticated');
                throw new Error('User not authenticated. Please log in again.');
            }
            
            const userId = user.uid;
            console.log('User ID:', userId);
            
            if (!transactionId || typeof transactionId !== 'string') {
                console.error('Invalid transaction ID:', transactionId);
                throw new Error('Invalid transaction ID');
            }
            
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
            
            if (error.code === 'permission-denied') {
                throw new Error('Permission denied. You do not have permission to delete this transaction.');
            } else if (error.code === 'not-found') {
                throw new Error('Transaction not found. It may have already been deleted.');
            } else if (error.code === 'unavailable') {
                throw new Error('Unable to connect to the database. Please check your internet connection.');
            }
            
            throw error;
        }
    }, 'delete transaction');
};

export const getTransactionsByType = async (type) => {
    return withNetworkCheck(async () => {
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
    }, 'load transactions by type');
};

export const getTransactionsByCategory = async (category) => {
    return withNetworkCheck(async () => {
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
    }, 'load transactions by category');
};

// --- BUDGET FUNCTIONS ---

export const getBudgets = async () => {
    return withNetworkCheck(async () => {
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
    }, 'load budgets');
};

export const saveBudget = async (category, amount) => {
    return withNetworkCheck(async () => {
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
    }, 'save budget');
};

export const seedDefaultBudgets = async () => {
    return withNetworkCheck(async () => {
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
    }, 'create default budgets');
};

// ✅ NEW: Check if budget category has associated transactions
export const checkBudgetTransactions = async (category) => {
    return withNetworkCheck(async () => {
        try {
            const userId = getUserId();
            const transactionsRef = collection(db, 'users', userId, 'transactions');
            const q = query(
                transactionsRef,
                where('category', '==', category)
            );
            
            const querySnapshot = await getDocs(q);
            const transactions = [];
            
            querySnapshot.forEach((doc) => {
                transactions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`Found ${transactions.length} transactions for category: ${category}`);
            return {
                count: transactions.length,
                transactions: transactions
            };
        } catch (error) {
            console.error('Error checking budget transactions:', error);
            throw error;
        }
    }, 'check budget transactions');
};

// ✅ NEW: Reassign transactions from one category to another
export const reassignTransactions = async (oldCategory, newCategory) => {
    return withNetworkCheck(async () => {
        try {
            const userId = getUserId();
            const transactionsRef = collection(db, 'users', userId, 'transactions');
            const q = query(
                transactionsRef,
                where('category', '==', oldCategory)
            );
            
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            let updateCount = 0;
            
            querySnapshot.forEach((docSnapshot) => {
                const docRef = doc(db, 'users', userId, 'transactions', docSnapshot.id);
                batch.update(docRef, {
                    category: newCategory,
                    updatedAt: Timestamp.now(),
                    previousCategory: oldCategory
                });
                updateCount++;
            });
            
            await batch.commit();
            console.log(`✅ Reassigned ${updateCount} transactions from ${oldCategory} to ${newCategory}`);
            return updateCount;
        } catch (error) {
            console.error('Error reassigning transactions:', error);
            throw error;
        }
    }, 'reassign transactions');
};

// ✅ FIXED: Delete budget category with transaction handling
export const deleteBudget = async (category, options = {}) => {
    const { deleteTransactions = false, reassignTo = null } = options;
    
    return withNetworkCheck(async () => {
        try {
            console.log('=== deleteBudget called ===');
            console.log('Category to delete:', category);
            console.log('Options:', options);
            
            const userId = getUserId();
            
            // Check for transactions first
            const { count, transactions } = await checkBudgetTransactions(category);
            
            if (count > 0) {
                if (reassignTo) {
                    // Reassign transactions to new category
                    await reassignTransactions(category, reassignTo);
                    console.log(`Reassigned ${count} transactions to ${reassignTo}`);
                } else if (deleteTransactions) {
                    // Delete all transactions in category
                    const batch = writeBatch(db);
                    transactions.forEach(txn => {
                        const txnRef = doc(db, 'users', userId, 'transactions', txn.id);
                        batch.delete(txnRef);
                    });
                    await batch.commit();
                    console.log(`Deleted ${count} transactions`);
                } else {
                    throw new Error('Cannot delete budget with transactions without specifying action');
                }
            }
            
            // Delete the budget category
            const budgetRef = doc(db, 'users', userId, 'budgets', category);
            await deleteDoc(budgetRef);
            
            console.log('✅ Budget deletion completed');
            return {
                category,
                transactionsAffected: count,
                action: reassignTo ? 'reassigned' : (deleteTransactions ? 'deleted' : 'none')
            };
        } catch (error) {
            console.error('Error deleting budget:', error);
            
            if (error.code === 'permission-denied') {
                throw new Error('Permission denied. You do not have permission to delete this budget.');
            } else if (error.code === 'not-found') {
                throw new Error('Budget category not found.');
            }
            
            throw error;
        }
    }, 'delete budget');
};