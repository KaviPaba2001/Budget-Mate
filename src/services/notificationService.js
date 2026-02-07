import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Request notification permissions
export const requestNotificationPermissions = async () => {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
            console.log('Notification permissions not granted');
            return false;
        }
        
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('budget-alerts', {
                name: 'Budget Alerts',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#10b981',
            });
        }
        
        console.log('Notification permissions granted');
        return true;
    } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return false;
    }
};

// Send budget warning notification
export const sendBudgetWarning = async (category, spent, budget, percentage) => {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            console.log('Cannot send notification - no permission');
            return;
        }

        let title = '';
        let body = '';
        let data = { type: 'budget_warning', category, spent, budget };

        if (percentage >= 100) {
            // Over budget
            title = '🚨 Budget Exceeded!';
            body = `You've exceeded your ${category} budget!\nSpent: Rs. ${spent.toLocaleString()} of Rs. ${budget.toLocaleString()}`;
            data.severity = 'exceeded';
        } else if (percentage >= 90) {
            // 90% warning
            title = '⚠️ Budget Alert!';
            body = `You've used ${percentage.toFixed(0)}% of your ${category} budget.\nRemaining: Rs. ${(budget - spent).toLocaleString()}`;
            data.severity = 'high';
        } else if (percentage >= 75) {
            // 75% warning
            title = '📊 Budget Notice';
            body = `You've used ${percentage.toFixed(0)}% of your ${category} budget.\nRemaining: Rs. ${(budget - spent).toLocaleString()}`;
            data.severity = 'medium';
        }

        if (title) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: title,
                    body: body,
                    data: data,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null, // Send immediately
            });

            console.log('Budget notification sent:', title);
        }
    } catch (error) {
        console.error('Error sending budget notification:', error);
    }
};

// Send total budget warning
export const sendTotalBudgetWarning = async (totalSpent, totalBudget, percentage) => {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        let title = '';
        let body = '';

        if (percentage >= 100) {
            title = '🚨 Monthly Budget Exceeded!';
            body = `You've exceeded your total monthly budget!\nSpent: Rs. ${totalSpent.toLocaleString()} of Rs. ${totalBudget.toLocaleString()}`;
        } else if (percentage >= 90) {
            title = '⚠️ Monthly Budget Alert!';
            body = `You've used ${percentage.toFixed(0)}% of your monthly budget.\nRemaining: Rs. ${(totalBudget - totalSpent).toLocaleString()}`;
        } else if (percentage >= 75) {
            title = '📊 Monthly Budget Notice';
            body = `You've used ${percentage.toFixed(0)}% of your monthly budget.\nRemaining: Rs. ${(totalBudget - totalSpent).toLocaleString()}`;
        }

        if (title) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: title,
                    body: body,
                    data: { type: 'total_budget_warning', totalSpent, totalBudget },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null,
            });

            console.log('Total budget notification sent:', title);
        }
    } catch (error) {
        console.error('Error sending total budget notification:', error);
    }
};

// Check budget and send notifications if needed
export const checkBudgetAndNotify = async (transactions, budgets) => {
    try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Calculate spending by category for current month
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

        // Check each category budget
        for (const category in categorySpending) {
            if (budgets[category]) {
                const spent = categorySpending[category];
                const budget = budgets[category];
                const percentage = (spent / budget) * 100;

                // Send notification at 75%, 90%, or 100%+
                if (percentage >= 75) {
                    await sendBudgetWarning(category, spent, budget, percentage);
                }
            }
        }

        // Check total budget
        const totalSpent = Object.values(categorySpending).reduce((sum, val) => sum + val, 0);
        const totalBudget = Object.values(budgets).reduce((sum, val) => sum + val, 0);
        const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        if (totalPercentage >= 75) {
            await sendTotalBudgetWarning(totalSpent, totalBudget, totalPercentage);
        }

    } catch (error) {
        console.error('Error checking budget:', error);
    }
};