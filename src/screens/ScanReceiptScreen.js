import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles/theme';
import CustomButton from '../components/CustomButton';
import { Ionicons } from '@expo/vector-icons';

// --- PASTE YOUR GOOGLE CLOUD VISION API KEY HERE ---
const GOOGLE_VISION_API_KEY = 'AIzaSyDYy3F2dANKnHSw61Zud2BRJlOPLSbVYU8';
// ----------------------------------------------------

export default function ScanReceiptScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            await ImagePicker.requestCameraPermissionsAsync();
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        })();
    }, []);

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.getCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
            return;
        }
        let result = await ImagePicker.launchCameraAsync({ quality: 1 });
        if (!result.canceled) processImageForOcr(result.assets[0].uri);
    };

    const handleChooseFromGallery = async () => {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery access is required to choose a photo.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
        if (!result.canceled) processImageForOcr(result.assets[0].uri);
    };
    
    const processImageForOcr = async (imageUri) => {
        if (GOOGLE_VISION_API_KEY === 'YOUR_API_KEY_HERE') {
            Alert.alert('API Key Missing', 'Please add your Google Cloud Vision API key to ScanReceiptScreen.js');
            return;
        }

        setLoading(true);
        try {
            const base64ImageData = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
            const requestBody = {
                requests: [{ image: { content: base64ImageData }, features: [{ type: 'TEXT_DETECTION' }] }],
            };

            const apiResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            
            const responseJson = await apiResponse.json();

            // Improved Error Handling
            if (responseJson.error) {
                console.error(responseJson.error);
                Alert.alert('Google API Error', responseJson.error.message + "\n\nPlease ensure your API key is correct and billing is enabled on your Google Cloud project.");
            } else if (responseJson.responses && responseJson.responses[0].fullTextAnnotation) {
                const detectedText = responseJson.responses[0].fullTextAnnotation.text;
                parseOcrResult(detectedText);
            } else {
                Alert.alert('OCR Failed', 'No text could be extracted from the image. Please try again with a clearer picture.');
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while processing the image.');
        } finally {
            setLoading(false);
        }
    };
    
    const parseOcrResult = (text) => {
        let amount = '0.00';
        let title = 'Scanned Receipt';
        
        const lines = text.split('\n');
        const totalLine = lines.find(line => line.toLowerCase().includes('total') || line.toLowerCase().includes('amount'));
        
        let foundAmount;
        if (totalLine) {
            foundAmount = totalLine.match(/(\d+\.\d{2})/);
        } else {
            const amounts = text.match(/(\d+\.\d{2})/g) || [];
            const numericAmounts = amounts.map(parseFloat);
            if (numericAmounts.length > 0) {
                foundAmount = [Math.max(...numericAmounts).toFixed(2)];
            }
        }

        if (foundAmount) {
            amount = foundAmount[0];
        }

        navigation.navigate('Transactions', {
            screen: 'AddTransaction',
            params: { amount, title, note: text },
        });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.subtitle}>Analyzing Receipt...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Ionicons name="scan-circle-outline" size={100} color={theme.colors.primary} />
            <Text style={styles.title}>Scan or Upload a Receipt</Text>
            <Text style={styles.subtitle}>Choose an option below to add a new transaction from a receipt.</Text>
            <View style={styles.buttonContainer}>
                 <CustomButton
                    title="Use Camera"
                    onPress={handleTakePhoto}
                    variant="primary"
                    style={{ flex: 1 }}
                />
                 <CustomButton
                    title="From Gallery"
                    onPress={handleChooseFromGallery}
                    variant="secondary"
                    style={{ flex: 1 }}
                />
            </View>
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
        marginTop: theme.spacing.lg,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        width: '100%',
    }
});
