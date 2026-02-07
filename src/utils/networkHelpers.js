import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

let isConnected = true;

// Initialize network listener
export const initializeNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
        isConnected = state.isConnected;
        console.log('Network status changed:', state.isConnected ? 'Online' : 'Offline');
    });
    return unsubscribe;
};

// Check if device is online
export const checkNetworkConnection = async () => {
    try {
        const state = await NetInfo.fetch();
        return state.isConnected;
    } catch (error) {
        console.error('Error checking network:', error);
        return false;
    }
};

// Show network error alert
export const showNetworkError = (customMessage) => {
    Alert.alert(
        'No Internet Connection',
        customMessage || 'Please check your internet connection and try again.',
        [{ text: 'OK' }]
    );
};

// Wrapper for network-dependent operations
export const withNetworkCheck = async (operation, errorMessage) => {
    const isOnline = await checkNetworkConnection();
    
    if (!isOnline) {
        showNetworkError(errorMessage);
        return { success: false, error: 'No network connection' };
    }
    
    try {
        const result = await operation();
        return { success: true, data: result };
    } catch (error) {
        // Check if error is network-related
        if (error.code === 'unavailable' || error.message?.includes('network')) {
            showNetworkError();
        }
        return { success: false, error };
    }
};

// Get current network state
export const getCurrentNetworkState = async () => {
    try {
        const state = await NetInfo.fetch();
        return {
            isConnected: state.isConnected,
            type: state.type,
            isInternetReachable: state.isInternetReachable,
        };
    } catch (error) {
        console.error('Error getting network state:', error);
        return {
            isConnected: false,
            type: 'unknown',
            isInternetReachable: false,
        };
    }
};

export default {
    initializeNetworkListener,
    checkNetworkConnection,
    showNetworkError,
    withNetworkCheck,
    getCurrentNetworkState,
};