import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import { theme } from '../styles/theme';

// Free OCR API Key (Use 'helloworld' for testing)
const OCR_SPACE_API_KEY = 'K84979664988957'; 

export default function ScanReceiptScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        try {
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
            const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (cameraStatus !== 'granted') {
                Alert.alert('Permission Required', 'Camera access is needed to scan receipts.');
            }
            if (libraryStatus !== 'granted') {
                Alert.alert('Permission Required', 'Photo library access is needed.');
            }
        } catch (error) {
            console.error('Permission error:', error);
        }
    };

    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.getCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera access is required.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'], 
                quality: 0.6,
                allowsEditing: true,
                aspect: [4, 3],
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const uri = result.assets[0].uri;
                setPreviewImage(uri);
                await processImageForOcr(uri);
            }
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'Failed to take photo: ' + error.message);
        }
    };

    const handleChooseFromGallery = async () => {
        try {
            const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery access is required.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.6, 
                allowsEditing: true,
                aspect: [4, 3],
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const uri = result.assets[0].uri;
                setPreviewImage(uri);
                await processImageForOcr(uri);
            }
        } catch (error) {
            console.error('Gallery error:', error);
            Alert.alert('Error', 'Failed to select image: ' + error.message);
        }
    };

    const processImageForOcr = async (imageUri) => {
        setLoading(true);
        setDebugInfo('Processing receipt...');

        try {
            // FIXED: Replaced FileSystem.EncodingType.Base64 with string 'base64'
            const base64Image = await FileSystem.readAsStringAsync(imageUri, {
                encoding: 'base64',
            });

            setDebugInfo('Sending to OCR server...');

            const formData = new FormData();
            formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
            formData.append('language', 'eng');
            formData.append('isOverlayRequired', 'false');
            formData.append('isTable', 'true');
            formData.append('scale', 'true');

            const response = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: {
                    'apikey': OCR_SPACE_API_KEY,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const data = await response.json();
            
            if (data.IsErroredOnProcessing) {
                const errorMessage = data.ErrorMessage && data.ErrorMessage.length > 0 
                    ? data.ErrorMessage[0] 
                    : "Unknown error from OCR provider.";
                Alert.alert("OCR Error", errorMessage);
                setLoading(false);
                return;
            }

            if (!data.ParsedResults || data.ParsedResults.length === 0) {
                Alert.alert("No Text Found", "Could not read any text. Please try a clearer image.");
                setLoading(false);
                return;
            }

            const text = data.ParsedResults[0].ParsedText;
            parseOcrResult(text);

        } catch (err) {
            console.error(err);
            Alert.alert("Connection Error", "Failed to connect to OCR server.\nPlease check your internet.");
            setLoading(false);
        }
    };

    const parseOcrResult = (text) => {
        let amount = '0.00';
        let title = 'Scanned Receipt';
        let category = 'shopping';

        try {
            const lines = text.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
            
            let foundAmount = 0.0;
            const totalKeywords = ['total', 'amount', 'grand', 'subtotal', 'balance', 'due', 'pay'];
            
            for (let i = 0; i < lines.length; i++) {
                const lowerLine = lines[i].toLowerCase();
                if (totalKeywords.some(kw => lowerLine.includes(kw))) {
                    const combined = lines[i] + " " + (lines[i + 1] || "");
                    const matches = combined.match(/(\d+[.,]\d{2})/g);
                    if (matches) {
                        const values = matches.map(m => parseFloat(m.replace(/,/g, '')));
                        const maxVal = Math.max(...values);
                        if (maxVal > foundAmount) foundAmount = maxVal;
                    }
                }
            }

            if (foundAmount === 0) {
                const allMatches = text.match(/(\d+\.\d{2})/g);
                if (allMatches) {
                    const values = allMatches.map(v => parseFloat(v));
                    foundAmount = Math.max(...values);
                }
            }

            if (foundAmount > 0) amount = foundAmount.toFixed(2);

            const store = lines.find(line => 
                line.length > 3 && 
                !line.toLowerCase().includes('total') && 
                !/\d{2}\/\d{2}/.test(line) && 
                /[a-zA-Z]/.test(line)
            );
            if (store) title = store.substring(0, 30);

            const fullText = text.toLowerCase();
            if (fullText.match(/food|restaurant|cafe|coffee|burger|pizza|kitchen/)) category = "food";
            else if (fullText.match(/fuel|gas|petrol|uber|taxi|station/)) category = "transport";
            else if (fullText.match(/pharmacy|doctor|hospital|clinic|med/)) category = "health";
            else if (fullText.match(/mart|market|super|grocery/)) category = "shopping";
            else if (fullText.match(/cinema|movie|theatre|game/)) category = "entertainment";

        } catch (err) {
            console.error("Parsing error:", err);
        }

        setLoading(false);

        navigation.navigate("Transactions", {
            screen: "AddTransaction",
            params: {
                amount,
                title,
                category,
                note: "Scanned Receipt Content:\n\n" + text,
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                {previewImage && (
                    <Image source={{ uri: previewImage }} style={styles.previewImage} />
                )}
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.debugText}>{debugInfo}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Ionicons name="scan-circle-outline" size={100} color={theme.colors.primary} />
            <Text style={styles.title}>Scan Your Receipt</Text>
            <Text style={styles.subtitle}>Capture or upload a receipt to extract details automatically.</Text>

            <View style={styles.buttonContainer}>
                <CustomButton title="Take Photo" onPress={handleTakePhoto} variant="primary" />
                <CustomButton title="Choose from Gallery" onPress={handleChooseFromGallery} variant="secondary" />
            </View>
            
            <Text style={styles.footerText}>Powered by OCR.space (Free API)</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
    },
    title: {
        fontSize: theme.fontSize['2xl'],
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        width: '100%',
        marginTop: theme.spacing.lg,
    },
    previewImage: {
        width: 200,
        height: 200,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        resizeMode: 'contain',
    },
    debugText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.sm,
        fontStyle: 'italic',
    },
    footerText: {
        position: 'absolute',
        bottom: 20,
        color: theme.colors.gray[600],
        fontSize: 10,
    }
});