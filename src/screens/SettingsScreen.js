import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
    const { userName, setUserName, profileImage, setProfileImage } = useUser();
    const [smsEnabled, setSmsEnabled] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [biometricEnabled, setBiometricEnabled] = useState(true);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [tempUserName, setTempUserName] = useState(userName || 'User');
    
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

    const handleSaveName = () => {
        setUserName(tempUserName);
        Alert.alert("Success", "Your name has been updated.");
    };

    const handleChangeProfilePicture = () => {
        Alert.alert(
            "Change Profile Picture",
            "Choose an option",
            [
                { text: "Take Photo...", onPress: takePhoto },
                { text: "Choose from Gallery...", onPress: chooseFromGallery },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
            return;
        }
        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const chooseFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery access is required to choose a photo.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    // DIRECT LOGOUT - NO POPUP
    const handleLogout = () => {
        console.log('Direct logout triggered');
        if (onLogout && typeof onLogout === 'function') {
            onLogout(); // Directly call logout function
        } else {
            console.error('onLogout function not available');
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
            <View style={styles.profileHeader}>
                <TouchableOpacity onPress={() => profileImage && setImageModalVisible(true)}>
                    <Image
                        source={profileImage ? { uri: profileImage } : { uri: 'https://placehold.co/100x100/1f2937/f9fafb?text=U' }}
                        style={styles.profileImage}
                    />
                    <TouchableOpacity style={styles.editIcon} onPress={handleChangeProfilePicture}>
                        <Ionicons name="camera-outline" size={20} color={theme.colors.white} />
                    </TouchableOpacity>
                </TouchableOpacity>
                <View style={styles.profileInfo}>
                    <TextInput 
                        style={styles.profileNameInput}
                        value={tempUserName}
                        onChangeText={setTempUserName}
                        onBlur={handleSaveName}
                        placeholder="Enter your name"
                        placeholderTextColor={theme.colors.text_secondary}
                    />
                    <Text style={styles.profileEmail}>Your personal account</Text>
                </View>
            </View>

            {settingSections.map((section, sectionIndex) => (
                <View key={sectionIndex} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.sectionContent}>
                        {section.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
                    </View>
                </View>
            ))}

            {/* LOGOUT SECTION */}
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

            {/* IMAGE MODAL */}
            <Modal
                visible={isImageModalVisible}
                transparent={true}
                onRequestClose={() => setImageModalVisible(false)}
            >
                <View style={styles.imageModalContainer}>
                    <Image source={{ uri: profileImage }} style={styles.fullScreenImage} />
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setImageModalVisible(false)}
                    >
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* CHANGE PIN MODAL */}
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
                                    // Add real PIN validation logic here
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
    container: { flex: 1, backgroundColor: theme.colors.background },
    profileHeader: { alignItems: 'center', padding: theme.spacing.lg, backgroundColor: theme.colors.surface, margin: theme.spacing.md, borderRadius: theme.borderRadius.lg },
    profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: theme.colors.primary },
    editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.colors.primary, padding: 8, borderRadius: 20 },
    profileInfo: { alignItems: 'center', marginTop: theme.spacing.md },
    profileNameInput: { fontSize: theme.fontSize.xl, fontWeight: 'bold', color: theme.colors.text_primary, padding: theme.spacing.xs, textAlign: 'center', minWidth: 150 },
    profileEmail: { fontSize: theme.fontSize.base, color: theme.colors.text_secondary, marginTop: theme.spacing.xs },
    section: { marginTop: theme.spacing.sm, marginHorizontal: theme.spacing.md },
    sectionTitle: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text_secondary, marginBottom: theme.spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionContent: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, overflow: 'hidden' },
    settingItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.background },
    lastItem: { borderBottomWidth: 0 },
    settingIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
    settingTitle: { flex: 1, fontSize: theme.fontSize.base, color: theme.colors.text_primary },
    settingAction: { justifyContent: 'center' },
    
    // LOGOUT STYLES
    logoutItem: { backgroundColor: '#FEF2F2' },
    logoutIcon: { backgroundColor: '#FEE2E2' },
    logoutText: { color: '#EF4444', fontWeight: '600' },
    
    // IMAGE MODAL
    imageModalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%', resizeMode: 'contain' },
    closeButton: { position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
    
    // CHANGE PIN MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    pinModalContainer: { width: '100%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
    modalTitle: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.text_primary, marginBottom: theme.spacing.md, textAlign: 'center' },
    modalInput: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, color: theme.colors.text_primary },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md },
    modalButtonCancel: { backgroundColor: '#6B7280', paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.md },
    modalButtonSave: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.md },
    modalButtonText: { color: theme.colors.white, fontWeight: '600' },
});
