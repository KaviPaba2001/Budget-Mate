import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { theme } from '../styles/theme';

export default function EditProfileScreen({ navigation }) {
    const { userName, profileImage, setUserName, setProfileImage } = useUser();
    const [tempName, setTempName] = useState(userName);
    const [tempImage, setTempImage] = useState(profileImage);
    const [isSaving, setIsSaving] = useState(false);

    const handleChooseImage = () => {
        Alert.alert(
            "Change Profile Picture",
            "Choose an option",
            [
                { text: "Take Photo", onPress: takePhoto },
                { text: "Choose from Gallery", onPress: chooseFromGallery },
                { text: "Remove Photo", onPress: removePhoto, style: 'destructive' },
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
        
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'], // FIXED
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        
        if (!result.canceled) {
            setTempImage(result.assets[0].uri);
        }
    };

    const chooseFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery access is required to choose a photo.');
            return;
        }
        
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // FIXED
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        
        if (!result.canceled) {
            setTempImage(result.assets[0].uri);
        }
    };

    const removePhoto = () => {
        setTempImage(null);
    };

    const handleSave = async () => {
        if (!tempName.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return;
        }

        setIsSaving(true);

        try {
            // Save name if changed
            if (tempName !== userName) {
                await setUserName(tempName.trim());
            }

            // Save profile image if changed
            if (tempImage !== profileImage) {
                await setProfileImage(tempImage);
            }

            Alert.alert(
                'Success',
                'Profile updated successfully!',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (tempName !== userName || tempImage !== profileImage) {
            Alert.alert(
                'Discard Changes?',
                'You have unsaved changes. Are you sure you want to go back?',
                [
                    { text: 'Keep Editing', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Profile Picture Section */}
                <View style={styles.imageSection}>
                    <Text style={styles.sectionTitle}>Profile Picture</Text>
                    <View style={styles.imageContainer}>
                        <Image
                            source={
                                tempImage 
                                    ? { uri: tempImage } 
                                    : { uri: 'https://placehold.co/200x200/1f2937/f9fafb?text=User' }
                            }
                            style={styles.profileImage}
                        />
                        <TouchableOpacity 
                            style={styles.changeImageButton}
                            onPress={handleChooseImage}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="camera" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.imageHint}>
                        Tap the camera icon to change your profile picture
                    </Text>
                </View>

                {/* Name Section */}
                <View style={styles.nameSection}>
                    <Text style={styles.sectionTitle}>Display Name</Text>
                    <TextInput
                        style={styles.nameInput}
                        value={tempName}
                        onChangeText={setTempName}
                        placeholder="Enter your name"
                        placeholderTextColor={theme.colors.text_secondary}
                        maxLength={50}
                    />
                    <Text style={styles.characterCount}>
                        {tempName.length}/50 characters
                    </Text>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
                        <View style={styles.infoText}>
                            <Text style={styles.infoTitle}>About Your Profile</Text>
                            <Text style={styles.infoDescription}>
                                Your profile information is stored securely and is only visible to you.
                                You can update it anytime.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={handleCancel}
                        disabled={isSaving}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={20} color={theme.colors.text_primary} />
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={isSaving}
                        activeOpacity={0.7}
                    >
                        {isSaving ? (
                            <ActivityIndicator color={theme.colors.white} />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={20} color={theme.colors.white} />
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.md,
        alignSelf: 'flex-start',
    },
    imageContainer: {
        position: 'relative',
        marginVertical: theme.spacing.lg,
    },
    profileImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 4,
        borderColor: theme.colors.primary,
    },
    changeImageButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: theme.colors.background,
    },
    imageHint: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        textAlign: 'center',
        marginTop: theme.spacing.sm,
    },
    nameSection: {
        marginBottom: theme.spacing.xl,
    },
    nameInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.lg,
        color: theme.colors.text_primary,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
    },
    characterCount: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        textAlign: 'right',
        marginTop: theme.spacing.xs,
    },
    infoSection: {
        marginBottom: theme.spacing.xl,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    infoText: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    infoTitle: {
        fontSize: theme.fontSize.base,
        fontWeight: '600',
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.xs,
    },
    infoDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.xs,
    },
    cancelButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
    },
    cancelButtonText: {
        color: theme.colors.text_primary,
        fontSize: theme.fontSize.base,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
    },
    saveButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.base,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});