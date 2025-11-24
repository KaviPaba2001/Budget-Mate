import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import { theme } from '../styles/theme';

const GOOGLE_VISION_API_KEY = 'AIzaSyDYy3F2dANKnHSw61Zud2BRJlOPLSbVYU8';

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
                Alert.alert('Permission Required', 'Camera access is needed.');
            }
            if (libraryStatus !== 'granted') {
                Alert.alert('Permission Required', 'Photo library access is needed.');
            }
        } catch (error) {
            console.error('Permission error:', error);
        }
    };

    // -------------------------------------------------------------
    // 📌 Capture a photo
    // -------------------------------------------------------------
    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.getCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: [ImagePicker.MediaType.Image], // UPDATED ✔
                quality: 0.8,
                allowsEditing: true,
                aspect: [4, 3],
            });

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                setPreviewImage(uri);
                await processImageForOcr(uri);
            }
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'Failed to take photo.');
        }
    };

    // -------------------------------------------------------------
    // 📌 Select image from gallery
    // -------------------------------------------------------------
    const handleChooseFromGallery = async () => {
        try {
            const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery access is required.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: [ImagePicker.MediaType.Image], // UPDATED ✔
                quality: 0.8,
                allowsEditing: true,
                aspect: [4, 3],
            });

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                setPreviewImage(uri);
                await processImageForOcr(uri);
            }
        } catch (error) {
            console.error('Gallery error:', error);
            Alert.alert('Error', 'Failed to select image.');
        }
    };

    // -------------------------------------------------------------
    // 📌 Convert image to Base64 and send to Google Vision API
    // -------------------------------------------------------------
    const processImageForOcr = async (imageUri) => {
        if (!GOOGLE_VISION_API_KEY) {
            Alert.alert("Error", "Google Vision API key missing.");
            return;
        }

        setLoading(true);
        setDebugInfo('Reading image...');

        try {
            // Convert image to Base64
            const base64Image = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            if (!base64Image) {
                throw new Error("Failed to read image.");
            }

            setDebugInfo('Sending to Google Vision API...');

            const requestBody = {
                requests: [
                    {
                        image: { content: base64Image },
                        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
                    },
                ],
            };

            const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            console.log("OCR Response:", data);

            if (data.error) {
                Alert.alert("Vision API Error", data.error.message);
                setLoading(false);
                return;
            }

            const text =
                data.responses?.[0]?.fullTextAnnotation?.text ??
                '';

            if (text.length === 0) {
                Alert.alert("No Text Found", "Receipt text could not be detected.");
                setLoading(false);
                return;
            }

            parseOcrResult(text);

        } catch (err) {
            Alert.alert("Error", "Failed to process image.\n\n" + err.message);
            setLoading(false);
        }
    };

    // -------------------------------------------------------------
    // 📌 Parse extracted text → amount, title, category
    // -------------------------------------------------------------
    const parseOcrResult = (text) => {
        let amount = '0.00';
        let title = 'Scanned Receipt';
        let category = 'other';

        try {
            const lines = text
                .split("\n")
                .map(t => t.trim())
                .filter(Boolean);

            const totalKeywords = ['total', 'amount', 'grand', 'subtotal'];

            let foundAmount = null;

            for (let i = 0; i < lines.length; i++) {
                const lower = lines[i].toLowerCase();

                if (totalKeywords.some(kw => lower.includes(kw))) {
                    const nums = (lines[i] + " " + (lines[i + 1] ?? ""))
                        .match(/\d+(?:\.\d{2})?/g);

                    if (nums) {
                        foundAmount = Math.max(...nums.map(n => parseFloat(n)));
                        break;
                    }
                }
            }

            if (!foundAmount) {
                const nums = text.match(/\d+(?:\.\d{2})?/g);
                if (nums) {
                    foundAmount = Math.max(...nums.map(n => parseFloat(n)));
                }
            }

            if (foundAmount) amount = foundAmount.toFixed(2);

            // Guess title
            const store = lines.find(line =>
                /[a-zA-Z]/.test(line) && !/^\d+$/.test(line)
            );

            if (store) title = store.slice(0, 50);

            // Auto detect category
            const l = title.toLowerCase();
            if (l.includes("food") || l.includes("cafe")) category = "food";
            if (l.includes("fuel") || l.includes("petrol")) category = "transport";
            if (l.includes("pharmacy") || l.includes("medical")) category = "health";
            if (l.includes("mart") || l.includes("store")) category = "shopping";

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
                note: "Scanned Receipt:\n\n" + text,
            },
        });
    };

    // -------------------------------------------------------------
    // 📌 UI Rendering
    // -------------------------------------------------------------
    if (loading) {
        return (
            <View style={styles.container}>
                {previewImage && (
                    <Image source={{ uri: previewImage }} style={styles.previewImage} />
                )}
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.subtitle}>{debugInfo}</Text>
                <Text style={styles.debugText}>Please wait...</Text>
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
        </View>
    );
}

// -------------------------------------------------------------
// 📌 Styles
// -------------------------------------------------------------
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
    },
    debugText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.sm,
        fontStyle: 'italic',
    },
});
