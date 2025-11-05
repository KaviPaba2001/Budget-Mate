import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack'; // Import StackNavigator
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import EmailLoginScreen from './src/screens/EmailLoginScreen'; // Import EmailLoginScreen
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen'; // Import RegisterScreen

const AuthStack = createStackNavigator(); // Create the stack

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuthStatus = async () => {
        try {
            const authStatus = await AsyncStorage.getItem('isAuthenticated');
            if (authStatus === 'true') {
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const handleLogin = async () => {
        try {
            await AsyncStorage.setItem('isAuthenticated', 'true');
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Error saving auth status:', error);
            setIsAuthenticated(true); // Fallback
        }
    };

    const handleLogout = async () => {
        console.log('Logout initiated...');
        try {
            await AsyncStorage.removeItem('isAuthenticated');
        } catch (error) {
            console.error('Error clearing auth data:', error);
        }
        setIsAuthenticated(false);
        console.log('User logged out, showing login screen');
    };


    if (isLoading) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <View style={styles.loadingContainer}>
                        {/* Add loading spinner if needed */}
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
                        {isAuthenticated ? (
                            <AppNavigator onLogout={handleLogout} />
                        ) : (
                            // Render the Auth Stack when not authenticated
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
    },
});