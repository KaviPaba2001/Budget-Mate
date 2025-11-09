import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';
import { theme } from '../styles/theme';

// Import screens - Cards screens removed
import AboutScreen from '../screens/AboutScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import BudgetScreen from '../screens/BudgetScreen';
import DashboardScreen from '../screens/DashboardScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ScanReceiptScreen from '../screens/ScanReceiptScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import TransactionsScreen from '../screens/TransactionsScreen';

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
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ title: 'Transaction Details' }} />
            <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ title: 'Add Transaction' }} />
            <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} options={{ title: 'Scan Receipt' }} />
        </Stack.Navigator>
    );
}

function DashboardStack() {
    return (
        <Stack.Navigator screenOptions={{ ...darkHeaderOptions, ...screenTransitionOptions }}>
            <Stack.Screen name="DashboardHome" component={DashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
        </Stack.Navigator>
    );
}

// Settings Stack with onLogout prop
function SettingsStack({ onLogout }) {
    return (
        <Stack.Navigator screenOptions={{ ...darkHeaderOptions, ...screenTransitionOptions }}>
            <Stack.Screen name="SettingsHome" options={{ title: "Settings" }}>
                {props => <SettingsScreen {...props} onLogout={onLogout} />}
            </Stack.Screen>
            <Stack.Screen 
                name="EditProfile" 
                component={EditProfileScreen} 
                options={{ title: "Edit Profile" }} 
            />
            <Stack.Screen name="About" component={AboutScreen} options={{ title: "About" }} />
        </Stack.Navigator>
    );
}

export default function AppNavigator({ onLogout }) {
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
            <Tab.Screen 
                name="Settings" 
                listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
            >
                {props => <SettingsStack {...props} onLogout={onLogout} />}
            </Tab.Screen>
        </Tab.Navigator>
    );
}