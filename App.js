import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { auth } from './firebase';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import EmailLoginScreen from './src/screens/EmailLoginScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { initializeNetworkListener } from './src/utils/networkHelpers';

const AuthStack = createStackNavigator();

const SESSION_TIMEOUT = 60 * 60 * 1000;
const INACTIVITY_WARNING = 5 * 60 * 1000;

const LoadingScreen = () => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
        scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
        
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, []);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    return (
        <LinearGradient
            colors={['#111827', '#1f2937', '#111827']}
            style={styles.loadingContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <StatusBar barStyle="light-content" backgroundColor="#111827" />
            
            <Animated.View style={[styles.loadingContent, animatedContainerStyle]}>
                <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
                    <Image
                        source={require('./assets/images/loading.png')}
                        style={styles.loadingImage}
                        resizeMode="contain"
                    />
                </Animated.View>

                <Text style={styles.loadingTitle}>Budget Mate</Text>
                <Text style={styles.loadingSubtitle}>Your Personal Finance Manager</Text>

                <View style={styles.loadingIndicatorContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>Initializing...</Text>
                </View>
            </Animated.View>

            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
        </LinearGradient>
    );
};

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
    
    const lastActivityRef = useRef(Date.now());
    const sessionTimeoutRef = useRef(null);
    const appStateRef = useRef(AppState.currentState);
    const networkUnsubscribeRef = useRef(null);

    useEffect(() => {
        console.log('Initializing network listener...');
        networkUnsubscribeRef.current = initializeNetworkListener();
        
        const unsubscribe = onAuthStateChanged(
            auth, 
            (authUser) => {
                console.log('Auth State:', authUser ? 'Logged In' : 'Logged Out');
                setUser(authUser);
                
                if (authUser) {
                    startSessionMonitoring();
                }
                
                setTimeout(() => {
                    setInitializing(false);
                }, 2000);
            },
            (error) => {
                console.error('Auth State Error:', error);
                Alert.alert('Authentication Error', 'Please restart the app.');
                setTimeout(() => {
                    setInitializing(false);
                }, 2000);
            }
        );

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            console.log('Cleaning up auth listener and network listener');
            unsubscribe();
            subscription.remove();
            
            if (networkUnsubscribeRef.current) {
                networkUnsubscribeRef.current();
            }
            
            if (sessionTimeoutRef.current) {
                clearTimeout(sessionTimeoutRef.current);
            }
        };
    }, []);

    const handleAppStateChange = (nextAppState) => {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
            checkSessionValidity();
        }
        appStateRef.current = nextAppState;
    };

    const startSessionMonitoring = () => {
        lastActivityRef.current = Date.now();
        resetSessionTimeout();
    };

    const resetSessionTimeout = () => {
        if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
        }
        
        sessionTimeoutRef.current = setTimeout(() => {
            handleSessionExpiry();
        }, SESSION_TIMEOUT);
    };

    const checkSessionValidity = async () => {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        
        if (timeSinceActivity > SESSION_TIMEOUT) {
            handleSessionExpiry();
        } else if (timeSinceActivity > SESSION_TIMEOUT - INACTIVITY_WARNING) {
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

    const handleSessionExpiry = () => {
        Alert.alert(
            'Session Expired',
            'Your session has expired for security. Please login again.',
            [{ text: 'OK', onPress: handleLogout }]
        );
    };

    const handleLogout = async () => {
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
            
            if (sessionTimeoutRef.current) {
                clearTimeout(sessionTimeoutRef.current);
            }
            
            await signOut(auth);
            console.log('Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
            
            if (error.code === 'unavailable' || error.message.includes('network')) {
                console.log('Offline logout - clearing local session');
                setUser(null);
                Alert.alert(
                    'Logged Out Offline',
                    'You have been logged out locally. Your session will be cleared from the server when you reconnect.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Error', 'Failed to logout. Please try again.');
            }
        }
    };

    const handleLogin = () => {
        console.log("Login successful");
        lastActivityRef.current = Date.now();
        startSessionMonitoring();
    };

    if (initializing) {
        return <LoadingScreen />;
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
        position: 'relative',
    },
    loadingContent: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    imageContainer: {
        marginBottom: 40,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    loadingImage: {
        width: 180,
        height: 180,
    },
    loadingTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#f9fafb',
        marginBottom: 8,
        letterSpacing: 1,
    },
    loadingSubtitle: {
        fontSize: 16,
        color: '#9ca3af',
        marginBottom: 50,
        letterSpacing: 0.5,
    },
    loadingIndicatorContainer: {
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        top: -100,
        left: -100,
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(16, 185, 129, 0.03)',
        bottom: -80,
        right: -80,
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