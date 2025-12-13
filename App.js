import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Import auth functions
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { auth } from './firebase'; // Import your firebase auth instance
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import EmailLoginScreen from './src/screens/EmailLoginScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

const AuthStack = createStackNavigator();

export default function App() {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    // Listen for Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            console.log('Auth State Changed:', authUser ? 'User Logged In' : 'User Logged Out');
            setUser(authUser);
            if (initializing) setInitializing(false);
        });

        // Cleanup subscription on unmount
        return unsubscribe;
    }, []);

    // Handle Logout - Actually sign out from Firebase
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // The onAuthStateChanged listener will automatically set user to null
            // and the UI will switch to the AuthStack
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // Callback for login screens (optional since listener handles state)
    const handleLogin = () => {
        console.log("Login successful");
    };

    if (initializing) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#ffffff" />
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <UserProvider>
            <SafeAreaProvider>
                <NavigationContainer>
                    <SafeAreaView style={styles.container}>
                        {user ? (
                            // Show AppNavigator if user is logged in
                            <AppNavigator onLogout={handleLogout} />
                        ) : (
                            // Show AuthStack if user is logged out
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
});