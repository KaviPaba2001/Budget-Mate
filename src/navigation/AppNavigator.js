import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Text } from 'react-native';
import * as Haptics from 'expo-haptics';

// Import all screens
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import BudgetScreen from '../screens/BudgetScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import ScanReceiptScreen from '../screens/ScanReceiptScreen';
import CardsScreen from '../screens/CardsScreen';
import AddCardScreen from '../screens/AddCardScreen';
import AboutScreen from '../screens/AboutScreen'; // New

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const darkHeaderOptions = {
    headerStyle: { backgroundColor: theme.colors.surface, borderBottomWidth: 0, elevation: 0 },
    headerTintColor: theme.colors.text_primary,
    headerTitleStyle: { fontWeight: 'bold' },
};

const screenTransitionOptions = { ...TransitionPresets.SlideFromRightIOS };

function TransactionsStack() {
    return (
        <Stack.Navigator screenOptions={{ ...darkHeaderOptions, ...screenTransitionOptions }}>
            <Stack.Screen name="TransactionsList" component={TransactionsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ title: 'Add Transaction' }} />
            <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} options={{ title: 'Scan Receipt' }} />
        </Stack.Navigator>
    );
}

function CardsStack() {
    return (
        <Stack.Navigator screenOptions={{ ...darkHeaderOptions, ...screenTransitionOptions }}>
            <Stack.Screen name="CardsList" component={CardsScreen} options={{ title: "My Cards" }}/>
            <Stack.Screen name="AddCard" component={AddCardScreen} options={{ title: 'Add New Card' }} />
        </Stack.Navigator>
    );
}

function DashboardStack() {
    return (
        <Stack.Navigator screenOptions={{ ...darkHeaderOptions, ...screenTransitionOptions }}>
            <Stack.Screen name="DashboardHome" component={DashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
            <Stack.Screen name="CardsStack" component={CardsStack} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
}

// New: Stack for Settings and its sub-screens
function SettingsStack() {
    return (
        <Stack.Navigator screenOptions={{ ...darkHeaderOptions, ...screenTransitionOptions }}>
            <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: "Settings" }} />
            <Stack.Screen name="About" component={AboutScreen} options={{ title: "About" }} />
            {/* You can add other settings sub-screens here in the future */}
        </Stack.Navigator>
    );
}


export default function AppNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Transactions') iconName = focused ? 'list' : 'list-outline';
                    else if (route.name === 'Budget') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
                    else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarLabel: ({ color, focused }) => <Text style={{ color, fontSize: 10, fontWeight: focused ? 'bold' : 'normal', paddingBottom: 5 }}>{route.name}</Text>,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.text_secondary,
                tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.gray[700], height: 60 },
                headerShown: false,
            })}
        >
            <Tab.Screen 
                name="Dashboard" 
                component={DashboardStack} 
                listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
            />
            <Tab.Screen 
                name="Transactions" 
                component={TransactionsStack} 
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Transactions', { screen: 'TransactionsList' });
                    },
                })}
            />
            <Tab.Screen 
                name="Budget" 
                component={BudgetScreen} 
                options={{ headerShown: true, title: "Budget", ...darkHeaderOptions }}
                listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
            />
            {/* The Settings tab now points to the new SettingsStack */}
            <Tab.Screen 
                name="Settings" 
                component={SettingsStack} 
                listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
            />
        </Tab.Navigator>
    );
}
