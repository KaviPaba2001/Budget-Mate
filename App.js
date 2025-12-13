// App.js - FINAL CORRECTED VERSION
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react'; // ✅ CRITICAL FIX
import {
    ActivityIndicator,
    Alert,
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth, 
            (authUser) => {
                console.log('Auth State:', authUser ? 'Logged In' : 'Logged Out');
                setUser(authUser);
                if (initializing) setInitializing(false);
            },
            (error) => {
                console.error('Auth State Error:', error);
                Alert.alert('Authentication Error', 'Please restart the app.');
                if (initializing) setInitializing(false);
            }
        );

        return () => {
            console.log('Cleaning up auth listener');
            unsubscribe();
        };
    }, [initializing]);

    const handleLogout = async () => {
        try {
            console.log('Logging out user...');
            await signOut(auth);
            console.log('Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
        }
    };

    const handleLogin = () => {
        console.log("Login successful");
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
                                <AppNavigator onLogout={handleLogout} />
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