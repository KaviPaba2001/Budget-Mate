import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
// Legacy import to handle Expo SDK 52+ file system changes
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import AnimatedView from '../components/AnimatedView';
import { theme } from '../styles/theme';

// ==========================================
// 🔑 CONFIGURATION
// ==========================================
const GEMINI_API_KEY = 'AIzaSyCRdZJ9GvSXO_cR5oQigPqzd01mCfdiB0Y'; 
const OCR_SPACE_API_KEY = 'K84979664988957'; 

// Updated to use the latest stable model for 2025
const PRIMARY_GEMINI_MODEL = 'gemini-2.5-flash';

export default function ScanReceiptScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
            Alert.alert('Permission Required', 'Camera and gallery access are needed.');
        }
    };

    // ==========================================
    // 📸 IMAGE CAPTURE
    // ==========================================
    const handleCamera = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.6, // Balanced quality
                allowsEditing: true,
                aspect: [4, 6],
            });
            if (!result.canceled) startScan(result.assets[0].uri);
        } catch (error) {
            Alert.alert('Error', 'Could not open camera.');
        }
    };

    const handleGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.6,
                allowsEditing: true,
            });
            if (!result.canceled) startScan(result.assets[0].uri);
        } catch (error) {
            Alert.alert('Error', 'Could not open gallery.');
        }
    };

    const startScan = async (uri) => {
        setPreviewImage(uri);
        setLoading(true);
        
        try {
            // Attempt 1: Try Gemini AI (Best Accuracy)
            setStatusMessage('AI Analysis (Gemini 2.5)...');
            await processWithGemini(uri);
        } catch (aiError) {
            console.log("Gemini failed, switching to backup...", aiError.message);
            
            // Attempt 2: Fallback to OCR.Space (Reliable Backup)
            try {
                setStatusMessage('Switching to Backup Scanner...');
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                await processWithOCRSpace(base64);
            } catch (ocrError) {
                console.error("All methods failed", ocrError);
                Alert.alert("Scan Failed", "Could not analyze receipt. Please enter details manually.");
                setLoading(false);
            }
        }
    };

    // ==========================================
    // 🧠 METHOD 1: GEMINI AI (Primary)
    // ==========================================
    const processWithGemini = async (imageUri) => {
        const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });

        const body = {
            contents: [{
                parts: [
                    { text: `You are an expert receipt scanner for Sri Lanka. Analyze this image and extract:
                    - "merchant": Store name (e.g. Keells, Cargills, Uber, PickMe).
                    - "amount": Total value (numeric only, ignore LKR/Rs).
                    - "date": YYYY-MM-DD format.
                    - "category": Choose strictly one from [food, transport, shopping, utilities, health, entertainment, education, salary, other].
                    
                    *CRITICAL*: Look at the ITEMS purchased to decide the category. 
                    - Rice, Veggies, Burger -> food
                    - Petrol, Uber -> transport
                    - Clothes, Shoes -> shopping
                    - Panadol, Asiri Hospital -> health
                    - Dialog, SLT, Bill -> utilities

                    Return ONLY raw JSON.` },
                    { inline_data: { mime_type: "image/jpeg", data: base64 } }
                ]
            }]
        };

        // Try getting available models first if we suspect version issues, 
        // but for speed we try the likely valid one first.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error.message); // Trigger fallback
        }

        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("No text returned from AI");

        const jsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonString);
        
        finishScan(data, 'Gemini AI');
    };

    // ==========================================
    // 🛡️ METHOD 2: OCR.SPACE (Backup)
    // ==========================================
    const processWithOCRSpace = async (base64) => {
        const formData = new FormData();
        formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('OCREngine', '2'); // Better for receipts

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: { 'apikey': OCR_SPACE_API_KEY },
            body: formData,
        });

        const data = await response.json();
        if (!data.ParsedResults?.length) throw new Error("OCR Failed");
        
        const text = data.ParsedResults[0].ParsedText;
        const parsedData = parseTextLocally(text);
        
        finishScan(parsedData, 'OCR Engine');
    };

    // 🤖 Local Smart Parser (For Backup)
    const parseTextLocally = (text) => {
        const lines = text.split(/\r?\n/);
        const lowerText = text.toLowerCase();
        
        // 1. Merchant
        let merchant = "Unknown Store";
        // Common Sri Lankan merchants
        if (lowerText.includes('keells')) merchant = "Keells";
        else if (lowerText.includes('cargills')) merchant = "Cargills Food City";
        else if (lowerText.includes('pickme')) merchant = "PickMe";
        else if (lowerText.includes('uber')) merchant = "Uber";
        else if (lowerText.includes('pizza hut')) merchant = "Pizza Hut";
        else if (lowerText.includes('kfc')) merchant = "KFC";
        else if (lines.length > 0) merchant = lines[0].substring(0, 20); // Fallback to first line

        // 2. Amount
        let amount = 0;
        // Regex for LKR currency formats
        const amountRegex = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
        const potentialAmounts = text.match(amountRegex) || [];
        if (potentialAmounts.length > 0) {
            // Convert to numbers and find the largest one (usually the total)
            const numbers = potentialAmounts.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));
            amount = Math.max(...numbers);
        }

        // 3. Category
        let category = 'other';
        const keywords = {
            food: ['restaurant', 'cafe', 'rice', 'bakery', 'tea', 'keells', 'cargills', 'kfc', 'pizza', 'burger'],
            transport: ['fuel', 'petrol', 'uber', 'pickme', 'taxi', 'highway'],
            utilities: ['dialog', 'slt', 'mobitel', 'electricity', 'water', 'bill'],
            health: ['pharmacy', 'hospital', 'doctor', 'lab'],
            shopping: ['clothing', 'fashion', 'shoes', 'store']
        };

        for (const [cat, words] of Object.entries(keywords)) {
            if (words.some(w => lowerText.includes(w))) {
                category = cat;
                break;
            }
        }

        return { merchant, amount, category, date: new Date().toISOString().split('T')[0] };
    };

    const finishScan = (data, source) => {
        Vibration.vibrate(50);
        setLoading(false);

        Alert.alert(
            `Receipt Scanned (${source})`,
            `Merchant: ${data.merchant || 'Unknown'}\nAmount: Rs. ${data.amount || 0}\nCategory: ${data.category || 'other'}`,
            [
                { text: 'Retake', style: 'cancel', onPress: () => setPreviewImage(null) },
                {
                    text: 'Save',
                    onPress: () => {
                        navigation.navigate("Transactions", {
                            screen: "AddTransaction",
                            params: {
                                amount: data.amount ? data.amount.toString() : '',
                                title: data.merchant || 'Scanned Receipt',
                                category: data.category?.toLowerCase() || 'other',
                                type: 'expense',
                                note: `Scanned via ${source} on ${data.date || 'Today'}`,
                            },
                        });
                        setPreviewImage(null);
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" />
                {previewImage && (
                    <Image source={{ uri: previewImage }} style={styles.loadingBg} blurRadius={20} />
                )}
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>{statusMessage}</Text>
                    <Text style={styles.loadingSubText}>This may take a few seconds...</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <StatusBar barStyle="light-content" />
            
            <AnimatedView index={0}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Smart Scanner</Text>
                    <Text style={styles.headerSubtitle}>Powered by Gemini 2.5 & OCR</Text>
                </View>
            </AnimatedView>

            <AnimatedView index={1}>
                <View style={styles.scannerContainer}>
                    <LinearGradient
                        colors={[theme.colors.surface, theme.colors.surface_light]}
                        style={styles.scannerCircle}
                    >
                        <Ionicons name="scan" size={60} color={theme.colors.primary} />
                    </LinearGradient>
                    <View style={styles.laserLine} />
                </View>
            </AnimatedView>

            <AnimatedView index={2}>
                <Text style={styles.sectionTitle}>Capture Receipt</Text>
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionCard} onPress={handleCamera} activeOpacity={0.8}>
                        <LinearGradient
                            colors={[theme.colors.primary_dark, theme.colors.primary]}
                            style={styles.actionGradient}
                        >
                            <Ionicons name="camera" size={32} color="#fff" style={{ marginBottom: 10 }} />
                            <Text style={styles.actionTitle}>Camera</Text>
                            <Text style={styles.actionDesc}>Take photo</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={handleGallery} activeOpacity={0.8}>
                        <LinearGradient
                            colors={[theme.colors.surface_light, theme.colors.surface]}
                            style={styles.actionGradient}
                        >
                            <Ionicons name="images" size={32} color={theme.colors.primary} style={{ marginBottom: 10 }} />
                            <Text style={styles.actionTitle}>Gallery</Text>
                            <Text style={[styles.actionDesc, { color: theme.colors.text_secondary }]}>Upload file</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </AnimatedView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    headerSubtitle: {
        fontSize: 16,
        color: theme.colors.text_secondary,
        marginTop: 4,
    },
    scannerContainer: {
        alignItems: 'center',
        marginBottom: 50,
        position: 'relative',
    },
    scannerCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.glass_border,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    laserLine: {
        position: 'absolute',
        width: 200,
        height: 2,
        backgroundColor: theme.colors.primary,
        top: 80,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text_primary,
        marginBottom: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 30,
    },
    actionCard: {
        flex: 1,
        height: 140,
        borderRadius: 20,
        ...theme.shadow.md,
    },
    actionGradient: {
        flex: 1,
        borderRadius: 20,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    actionDesc: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingBg: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3,
    },
    loadingOverlay: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.glass_border,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginTop: 16,
    },
    loadingSubText: {
        fontSize: 13,
        color: theme.colors.text_secondary,
        marginTop: 6,
    }
});