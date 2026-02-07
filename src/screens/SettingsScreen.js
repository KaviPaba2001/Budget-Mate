import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { theme } from '../styles/theme';

export default function SettingsScreen({ navigation, onLogout }) {
    const { userName, profileImage } = useUser();
    const [smsEnabled, setSmsEnabled] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [biometricEnabled, setBiometricEnabled] = useState(true);
    
    // Change PIN modal states
    const [isPinModalVisible, setPinModalVisible] = useState(false);
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const settingSections = [
        {
            title: 'Security',
            items: [
                { icon: 'finger-print', title: 'Biometric Login', type: 'switch', value: biometricEnabled, onToggle: setBiometricEnabled },
                { icon: 'lock-closed', title: 'Change PIN', type: 'navigation', onPress: () => setPinModalVisible(true) },
            ],
        },
        {
            title: 'Automation',
            items: [
                { icon: 'chatbubble-ellipses', title: 'SMS Detection', type: 'switch', value: smsEnabled, onToggle: setSmsEnabled },
                { icon: 'notifications', title: 'Push Notifications', type: 'switch', value: notificationsEnabled, onToggle: setNotificationsEnabled },
            ],
        },
        {
            title: 'Data Management',
            items: [
                { icon: 'cloud-download', title: 'Export Data', type: 'navigation', onPress: () => Alert.alert('Info', 'Data export feature coming soon') },
                { icon: 'refresh', title: 'Backup & Restore', type: 'navigation', onPress: () => Alert.alert('Info', 'Backup feature coming soon') },
                { icon: 'trash', title: 'Clear Data', type: 'navigation', onPress: () => Alert.alert('Warning', 'This will permanently delete all your data.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive' }]) },
            ],
        },
        {
            title: 'Support',
            items: [
                { icon: 'help-circle', title: 'Help & FAQ', type: 'navigation', onPress: () => Alert.alert('Info', 'Help section coming soon') },
                { icon: 'mail', title: 'Contact Support', type: 'navigation', onPress: () => Alert.alert('Info', 'Support contact coming soon') },
                { icon: 'information-circle', title: 'About', type: 'navigation', onPress: () => navigation.navigate('About') },
            ],
        },
    ];

    const handleLogout = () => {
        console.log('=== LOGOUT BUTTON PRESSED ===');
        if (onLogout && typeof onLogout === 'function') {
            console.log('Calling onLogout function...');
            onLogout();
        } else {
            console.error('ERROR: onLogout function not available');
            Alert.alert('Error', 'Logout function is not available. Please restart the app.');
        }
    };

    const renderSettingItem = (item, index) => (
        <TouchableOpacity
            key={index}
            style={[
                styles.settingItem,
                index === settingSections.find(section => section.items.includes(item))?.items.length - 1 && styles.lastItem
            ]}
            onPress={item.onPress}
            disabled={item.type === 'switch'}
            activeOpacity={0.7}
        >
            <View style={styles.settingIcon}>
                <Ionicons name={item.icon} size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <View style={styles.settingAction}>
                {item.type === 'switch' ? (
                    <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: '#374151', true: theme.colors.primary }}
                        thumbColor={theme.colors.white}
                        ios_backgroundColor="#374151"
                    />
                ) : (
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.text_secondary} />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Profile Header */}
            <TouchableOpacity 
                style={styles.profileHeader}
                onPress={() => navigation.navigate('EditProfile')}
                activeOpacity={0.7}
            >
                <Image
                    source={profileImage ? { uri: profileImage } : { uri: 'https://placehold.co/100x100/1f2937/f9fafb?text=U' }}
                    style={styles.profileImage}
                />
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{userName}</Text>
                    <View style={styles.editProfileButton}>
                        <Text style={styles.editProfileText}>Edit Profile</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                    </View>
                </View>
            </TouchableOpacity>

            {/* Settings Sections */}
            {settingSections.map((section, sectionIndex) => (
                <View key={sectionIndex} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.sectionContent}>
                        {section.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
                    </View>
                </View>
            ))}

            {/* Logout Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.sectionContent}>
                    <TouchableOpacity
                        style={[styles.settingItem, styles.logoutItem, styles.lastItem]}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.settingIcon, styles.logoutIcon]}>
                            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                        </View>
                        <Text style={[styles.settingTitle, styles.logoutText]}>Logout</Text>
                        <View style={styles.settingAction}>
                            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Change PIN Modal */}
            <Modal
                visible={isPinModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPinModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pinModalContainer}>
                        <Text style={styles.modalTitle}>Change PIN</Text>

                        <TextInput
                            placeholder="Current PIN"
                            secureTextEntry
                            keyboardType="numeric"
                            value={currentPin}
                            onChangeText={setCurrentPin}
                            style={styles.modalInput}
                            placeholderTextColor={theme.colors.text_secondary}
                        />
                        <TextInput
                            placeholder="New PIN"
                            secureTextEntry
                            keyboardType="numeric"
                            value={newPin}
                            onChangeText={setNewPin}
                            style={styles.modalInput}
                            placeholderTextColor={theme.colors.text_secondary}
                        />
                        <TextInput
                            placeholder="Confirm New PIN"
                            secureTextEntry
                            keyboardType="numeric"
                            value={confirmPin}
                            onChangeText={setConfirmPin}
                            style={styles.modalInput}
                            placeholderTextColor={theme.colors.text_secondary}
                        />

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={styles.modalButtonCancel}
                                onPress={() => {
                                    setCurrentPin('');
                                    setNewPin('');
                                    setConfirmPin('');
                                    setPinModalVisible(false);
                                }}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonSave}
                                onPress={() => {
                                    if (newPin !== confirmPin) {
                                        Alert.alert('Error', 'New PIN and Confirm PIN do not match.');
                                        return;
                                    }
                                    if (newPin.length < 4) {
                                        Alert.alert('Error', 'PIN must be at least 4 digits.');
                                        return;
                                    }
                                    Alert.alert('Success', 'PIN changed successfully.');
                                    setCurrentPin('');
                                    setNewPin('');
                                    setConfirmPin('');
                                    setPinModalVisible(false);
                                }}
                            >
                                <Text style={styles.modalButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: theme.colors.background 
    },
    profileHeader: { 
        flexDirection: 'row',
        alignItems: 'center', 
        padding: theme.spacing.lg, 
        backgroundColor: theme.colors.surface, 
        margin: theme.spacing.md, 
        borderRadius: theme.borderRadius.lg 
    },
    profileImage: { 
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        borderWidth: 3, 
        borderColor: theme.colors.primary 
    },
    profileInfo: { 
        flex: 1,
        marginLeft: theme.spacing.md 
    },
    profileName: { 
        fontSize: theme.fontSize.xl, 
        fontWeight: 'bold', 
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.xs,
    },
    editProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    editProfileText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    section: { 
        marginTop: theme.spacing.sm, 
        marginHorizontal: theme.spacing.md 
    },
    sectionTitle: { 
        fontSize: theme.fontSize.sm, 
        fontWeight: '600', 
        color: theme.colors.text_secondary, 
        marginBottom: theme.spacing.sm, 
        textTransform: 'uppercase', 
        letterSpacing: 0.5 
    },
    sectionContent: { 
        backgroundColor: theme.colors.surface, 
        borderRadius: theme.borderRadius.lg, 
        overflow: 'hidden' 
    },
    settingItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: theme.spacing.md, 
        paddingVertical: theme.spacing.md, 
        borderBottomWidth: 1, 
        borderBottomColor: theme.colors.background 
    },
    lastItem: { 
        borderBottomWidth: 0 
    },
    settingIcon: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: theme.colors.background, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: theme.spacing.md 
    },
    settingTitle: { 
        flex: 1, 
        fontSize: theme.fontSize.base, 
        color: theme.colors.text_primary 
    },
    settingAction: { 
        justifyContent: 'center' 
    },
    logoutItem: { 
        backgroundColor: 'rgba(239, 68, 68, 0.1)' 
    },
    logoutIcon: { 
        backgroundColor: 'rgba(239, 68, 68, 0.2)' 
    },
    logoutText: { 
        color: '#EF4444', 
        fontWeight: '600' 
    },
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20 
    },
    pinModalContainer: { 
        width: '100%', 
        backgroundColor: theme.colors.surface, 
        borderRadius: theme.borderRadius.lg, 
        padding: theme.spacing.lg 
    },
    modalTitle: { 
        fontSize: theme.fontSize.lg, 
        fontWeight: 'bold', 
        color: theme.colors.text_primary, 
        marginBottom: theme.spacing.md, 
        textAlign: 'center' 
    },
    modalInput: { 
        backgroundColor: theme.colors.background, 
        borderRadius: theme.borderRadius.md, 
        padding: theme.spacing.md, 
        marginBottom: theme.spacing.sm, 
        color: theme.colors.text_primary 
    },
    modalButtonRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: theme.spacing.md 
    },
    modalButtonCancel: { 
        backgroundColor: '#6B7280', 
        paddingVertical: theme.spacing.sm, 
        paddingHorizontal: theme.spacing.lg, 
        borderRadius: theme.borderRadius.md 
    },
    modalButtonSave: { 
        backgroundColor: theme.colors.primary, 
        paddingVertical: theme.spacing.sm, 
        paddingHorizontal: theme.spacing.lg, 
        borderRadius: theme.borderRadius.md 
    },
    modalButtonText: { 
        color: theme.colors.white, 
        fontWeight: '600' 
    },
});