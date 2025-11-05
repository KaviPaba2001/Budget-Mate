import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    Timestamp,
    updateDoc,
    where
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

// Delete a transaction
export const deleteTransaction = async (transactionId) => {
    try {
        const userId = getUserId();
        const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
        
        await deleteDoc(transactionRef);
        return transactionId;
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw error;
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