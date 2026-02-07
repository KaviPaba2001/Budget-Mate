import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { auth } from './firebase';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import EmailLoginScreen from './src/screens/EmailLoginScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

const AuthStack = createStackNavigator();

// ✅ Session timeout configuration
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
const INACTIVITY_WARNING = 5 * 60 * 1000; // 5 minutes before timeout

// Error Boundary Component
class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('App Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.errorContainer}>
                    <Text style={styles.errorText}>Something went wrong</Text>
                    <Text style={styles.errorDetail}>
                        {this.state.error?.message || 'Unknown error'}
                    </Text>
                    <TouchableOpacity 
                        style={styles.errorButton}
                        onPress={() => {
                            this.setState({ hasError: false, error: null });
                        }}
                    >
                        <Text style={styles.errorButtonText}>Retry</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

export default function App() {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [pendingOperations, setPendingOperations] = useState([]);
    
    // ✅ Session management state
    const lastActivityRef = useRef(Date.now());
    const sessionTimeoutRef = useRef(null);
    const appStateRef = useRef(AppState.currentState);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth, 
            (authUser) => {
                console.log('Auth State:', authUser ? 'Logged In' : 'Logged Out');
                setUser(authUser);
                
                if (authUser) {
                    // ✅ Start session monitoring
                    startSessionMonitoring();
                }
                
                if (initializing) setInitializing(false);
            },
            (error) => {
                console.error('Auth State Error:', error);
                Alert.alert('Authentication Error', 'Please restart the app.');
                if (initializing) setInitializing(false);
            }
        );

        // ✅ Monitor app state changes for session management
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            console.log('Cleaning up auth listener');
            unsubscribe();
            subscription.remove();
            if (sessionTimeoutRef.current) {
                clearTimeout(sessionTimeoutRef.current);
            }
        };
    }, [initializing]);

    // ✅ FIX TC035: Handle app state changes (screen lock)
    const handleAppStateChange = (nextAppState) => {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
            // App came to foreground
            checkSessionValidity();
        }
        appStateRef.current = nextAppState;
    };

    // ✅ Start session monitoring
    const startSessionMonitoring = () => {
        lastActivityRef.current = Date.now();
        resetSessionTimeout();
    };

    // ✅ Reset session timeout
    const resetSessionTimeout = () => {
        if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
        }
        
        sessionTimeoutRef.current = setTimeout(() => {
            handleSessionExpiry();
        }, SESSION_TIMEOUT);
    };

    // ✅ Check if session is still valid
    const checkSessionValidity = async () => {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        
        if (timeSinceActivity > SESSION_TIMEOUT) {
            handleSessionExpiry();
        } else if (timeSinceActivity > SESSION_TIMEOUT - INACTIVITY_WARNING) {
            // Warn user session is about to expire
            const remaining = Math.ceil((SESSION_TIMEOUT - timeSinceActivity) / 60000);
            Alert.alert(
                'Session Expiring',
                `Your session will expire in ${remaining} minute(s). Do you want to continue?`,
                [
                    { text: 'Logout', onPress: handleLogout, style: 'destructive' },
                    { text: 'Stay Logged In', onPress: () => {
                        lastActivityRef.current = Date.now();
                        resetSessionTimeout();
                    }}
                ]
            );
        }
    };

    // ✅ Handle session expiry
    const handleSessionExpiry = () => {
        Alert.alert(
            'Session Expired',
            'Your session has expired for security. Please login again.',
            [{ text: 'OK', onPress: handleLogout }]
        );
    };

    // ✅ FIX TC031, TC044: Check for pending operations before logout
    const handleLogout = async () => {
        // ✅ Check if there are unsaved changes
        if (pendingOperations.length > 0) {
            Alert.alert(
                'Unsaved Changes',
                'You have unsaved changes. Logging out will discard them. Continue?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Logout Anyway', 
                        style: 'destructive',
                        onPress: performLogout
                    }
                ]
            );
            return;
        }

        performLogout();
    };

    const performLogout = async () => {
        try {
            console.log('Logging out user...');
            
            // Clear session timeout
            if (sessionTimeoutRef.current) {
                clearTimeout(sessionTimeoutRef.current);
            }
            
            await signOut(auth);
            console.log('Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
            
            // ✅ FIX TC038: Always allow logout locally even if network fails
            if (error.code === 'unavailable' || error.message.includes('network')) {
                console.log('Offline logout - clearing local session');
                // Force local logout
                setUser(null);
            } else {
                Alert.alert('Error', 'Failed to logout. Please try again.');
            }
        }
    };

    const handleLogin = () => {
        console.log("Login successful");
        // Reset session tracking
        lastActivityRef.current = Date.now();
        startSessionMonitoring();
    };

    if (initializing) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#10b981" />
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <AppErrorBoundary>
            <UserProvider>
                <SafeAreaProvider>
                    <NavigationContainer>
                        <SafeAreaView style={styles.container}>
                            {user ? (
                                <AppNavigator 
                                    onLogout={handleLogout}
                                    setPendingOperations={setPendingOperations}
                                />
                            ) : (
                                <AuthStack.Navigator screenOptions={{ headerShown: false }}>
                                    <AuthStack.Screen name="Login">
                                        {props => <LoginScreen {...props} onLogin={handleLogin} />}
                                    </AuthStack.Screen>
                                    <AuthStack.Screen name="EmailLogin">
                                        {props => <EmailLoginScreen {...props} onLogin={handleLogin} />}
                                    </AuthStack.Screen>
                                    <AuthStack.Screen name="Register" component={RegisterScreen} />
                                </AuthStack.Navigator>
                            )}
                        </SafeAreaView>
                    </NavigationContainer>
                </SafeAreaProvider>
            </UserProvider>
        </AppErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111827',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111827',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#f9fafb',
        marginBottom: 10,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    errorDetail: {
        fontSize: 14,
        color: '#9ca3af',
        marginBottom: 20,
        textAlign: 'center',
    },
    errorButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
    },
    errorButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});