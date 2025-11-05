import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { signInAnonymously } from 'firebase/auth';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth } from '../../firebase';
import { theme } from '../styles/theme';

export default function LoginScreen({ navigation, onLogin }) {
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Demo PIN (you can change this)
    const CORRECT_PIN = '1234';

    const handleBiometricLogin = async () => {
        setIsAuthenticating(true);
        try {
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (isEnrolled) {
                const { success } = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Login to Finance Tracker',
                });
                if (success) {
                    // Sign in anonymously to Firebase
                    console.log('Biometric authentication successful, signing into Firebase...');
                    await signInAnonymously(auth);
                    console.log('Firebase sign-in successful!');
                    onLogin(); // Navigate to HomeScreen
                }
            } else {
                Alert.alert('No Biometrics', 'Please set up biometrics on your device or use PIN login.');
            }
        } catch (error) {
            console.error('Biometric login error:', error);
            Alert.alert('Authentication Error', 'Failed to authenticate. Please try again or use PIN login.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handlePinLogin = () => {
        setPin('');
        setShowPinModal(true);
    };

    const handlePinSubmit = () => {
        if (!pin) {
            Alert.alert('Error', 'Please enter your PIN');
            return;
        }

        setIsValidating(true);

        // Simulate validation delay
        setTimeout(async () => {
            if (pin === CORRECT_PIN) {
                try {
                    // Sign in anonymously to Firebase
                    console.log('PIN authentication successful, signing into Firebase...');
                    await signInAnonymously(auth);
                    console.log('Firebase sign-in successful!');
                    
                    setIsValidating(false);
                    setShowPinModal(false);
                    setPin('');
                    onLogin(); // Navigate to home page
                } catch (error) {
                    setIsValidating(false);
                    console.error('Firebase authentication error:', error);
                    Alert.alert('Authentication Error', 'Failed to sign in. Please try again.');
                    setPin('');
                }
            } else {
                setIsValidating(false);
                Alert.alert('Error', 'Incorrect PIN. Please try again.');
                setPin('');
            }
        }, 1000);
    };

    const closePinModal = () => {
        setShowPinModal(false);
        setPin('');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Ionicons name="wallet-outline" size={60} color={theme.colors.primary} />
                </View>
                <Text style={styles.title}>Finance Tracker</Text>
                <Text style={styles.subtitle}>Secure Private Automated</Text>
            </View>

            <View style={styles.content}>
                <TouchableOpacity
                    style={[styles.loginButton, {backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary}]}
                    onPress={() => navigation?.navigate('EmailLogin')}
                    disabled={isAuthenticating}
                >
                    <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
                    <Text style={[styles.loginButtonText, {color: theme.colors.text_primary}]}>
                        Login with Email
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.loginButton, {backgroundColor: theme.colors.primary}]}
                    onPress={handleBiometricLogin}
                    disabled={isAuthenticating}
                >
                    {isAuthenticating ? (
                        <ActivityIndicator color={theme.colors.white} />
                    ) : (
                        <>
                            <Ionicons name="finger-print-outline" size={24} color={theme.colors.white} />
                            <Text style={styles.loginButtonText}>Use Biometric</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.loginButton, {backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary}]}
                    onPress={handlePinLogin}
                    disabled={isAuthenticating}
                >
                    <Ionicons name="keypad-outline" size={24} color={theme.colors.primary} />
                    <Text style={[styles.loginButtonText, {color: theme.colors.text_primary}]}>
                        Use PIN
                    </Text>
                </TouchableOpacity>
            </View>

            {/* PIN MODAL POPUP */}
            <Modal
                visible={showPinModal}
                transparent={true}
                animationType="slide"
                onRequestClose={closePinModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Enter PIN</Text>
                            <TouchableOpacity onPress={closePinModal}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.pinInstruction}>
                            Enter your 4-digit PIN to continue
                        </Text>

                        <TextInput
                            style={styles.pinInput}
                            value={pin}
                            onChangeText={setPin}
                            placeholder="Enter PIN"
                            keyboardType="number-pad"
                            secureTextEntry={true}
                            maxLength={6}
                            autoFocus={true}
                        />

                        <TouchableOpacity
                            style={[styles.confirmButton, (!pin || isValidating) && styles.disabledButton]}
                            onPress={handlePinSubmit}
                            disabled={!pin || isValidating}
                        >
                            {isValidating ? (
                                <ActivityIndicator color={theme.colors.white} />
                            ) : (
                                <Text style={styles.confirmButtonText}>Confirm</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={closePinModal}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <Text style={styles.demoHint}>
                            Demo PIN: 1234
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontSize: theme.fontSize['3xl'],
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    subtitle: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.sm,
    },
    content: {
        gap: theme.spacing.md,
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.md,
    },
    loginButtonText: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.white,
    },
    
    // PIN MODAL STYLES
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 15,
        padding: 25,
        width: '90%',
        maxWidth: 350,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    pinInstruction: {
        fontSize: 14,
        color: theme.colors.text_secondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    pinInput: {
        borderWidth: 1,
        borderColor: theme.colors.text_secondary,
        borderRadius: 8,
        padding: 15,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
        backgroundColor: theme.colors.background,
        color: theme.colors.text_primary,
    },
    confirmButton: {
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    disabledButton: {
        backgroundColor: theme.colors.text_secondary,
    },
    confirmButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: theme.colors.background,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
    },
    cancelButtonText: {
        color: theme.colors.text_secondary,
        fontSize: 16,
        fontWeight: '600',
    },
    demoHint: {
        fontSize: 12,
        color: theme.colors.text_secondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});