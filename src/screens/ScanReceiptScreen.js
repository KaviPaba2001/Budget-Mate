import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator'; // ✅ Crucial for 2026 API
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
const GEMINI_API_KEY = 'AIzaSyAgNgQQARb2tCOzUy5218VeP7Vd3SI6uCA'; 
const OCR_SPACE_API_KEY = 'K84979664988957'; 

// ✅ FIX: 2026 Latest Model Alias
const PRIMARY_GEMINI_MODEL = 'gemini-3-flash-preview'; 

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
    // 📸 IMAGE CAPTURE & PRE-PROCESSING
    // ==========================================
    const handleCamera = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 6],
                quality: 0.8,
            });
            if (!result.canceled) startScan(result.assets[0].uri);
        } catch (error) {
            Alert.alert('Error', 'Could not open camera.');
        }
    };

    const handleGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });
            if (!result.canceled) startScan(result.assets[0].uri);
        } catch (error) {
            Alert.alert('Error', 'Could not open gallery.');
        }
    };

    const startScan = async (uri) => {
        setPreviewImage(uri);
        setLoading(true);
        setStatusMessage('Compressing for AI...');
        
        try {
            // ✅ FIX: Resize & Compress to prevent "Payload Too Large" Errors
            const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1024 } }], // Resizing to 1024px preserves receipt text while reducing size
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            setStatusMessage('AI Analysis (Gemini 3)...');
            await processWithGemini(manipResult.base64);
        } catch (aiError) {
            console.error("Gemini Critical Failure:", aiError);
            Alert.alert("AI Error", `Gemini failed: ${aiError.message}. Switching to backup...`);
            
            try {
                setStatusMessage('Switching to Backup OCR...');
                const rawBase64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                await processWithOCRSpace(rawBase64);
            } catch (ocrError) {
                Alert.alert("Scan Failed", "All methods failed. Please enter details manually.");
                setLoading(false);
            }
        }
    };

    // ==========================================
    // 🧠 METHOD 1: GEMINI AI (Primary)
    // ==========================================
    const processWithGemini = async (base64Data) => {
        const body = {
            contents: [{
                parts: [
                    { text: "Analyze this receipt. Return ONLY a raw JSON object with: { merchant, amount, date (YYYY-MM-DD), category, items, discount, paymentMethod }." },
                    { inline_data: { mime_type: "image/jpeg", data: base64Data } }
                ]
            }],
            generationConfig: {
                response_mime_type: "application/json", // ✅ Forces API to return clean JSON
            }
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.error) throw new Error(result.error.message);

        const rawJsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJsonText) throw new Error("No data returned from AI");

        const data = JSON.parse(rawJsonText);
        finishScan(data, 'Gemini AI');
    };

    // ==========================================
    // 🛡️ METHOD 2: OCR.SPACE (Backup)
    // ==========================================
    const processWithOCRSpace = async (base64) => {
        const formData = new FormData();
        formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
        formData.append('OCREngine', '2'); 

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

    const parseTextLocally = (text) => {
        const lowerText = text.toLowerCase();
        let amount = 0;
        const amountRegex = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
        const potentialAmounts = text.match(amountRegex) || [];
        if (potentialAmounts.length > 0) {
            const numbers = potentialAmounts.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));
            amount = Math.max(...numbers);
        }

        return { 
            merchant: text.split('\n')[0].substring(0, 20) || "Unknown", 
            amount, 
            category: lowerText.includes('food') ? 'food' : 'other', 
            date: new Date().toISOString().split('T')[0],
            items: "Details unavailable (OCR Backup)", 
            discount: 0, 
            paymentMethod: "Unknown"
        };
    };

    const finishScan = (data, source) => {
        Vibration.vibrate(50);
        setLoading(false);

        const note = `🛒 Items: ${data.items || 'N/A'}\n💳 Payment: ${data.paymentMethod || 'N/A'}\n(Scanned via ${source})`;

        Alert.alert(
            `Receipt Scanned`,
            `Merchant: ${data.merchant}\nAmount: Rs. ${data.amount}`,
            [
                { text: 'Retake', style: 'cancel', onPress: () => setPreviewImage(null) },
                {
                    text: 'Save',
                    onPress: () => {
                        navigation.navigate("Transactions", {
                            screen: "AddTransaction",
                            params: {
                                amount: data.amount ? data.amount.toString() : '0',
                                title: data.merchant || 'Scanned Receipt',
                                category: data.category?.toLowerCase() || 'other',
                                type: 'expense',
                                note: note,
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
                {previewImage && <Image source={{ uri: previewImage }} style={styles.loadingBg} blurRadius={20} />}
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
                    <Text style={styles.headerSubtitle}>Powered by Gemini 3 & OCR</Text>
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
                    <TouchableOpacity style={styles.actionCard} onPress={handleCamera}>
                        <LinearGradient colors={[theme.colors.primary_dark, theme.colors.primary]} style={styles.actionGradient}>
                            <Ionicons name="camera" size={32} color="#fff" />
                            <Text style={styles.actionTitle}>Camera</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={handleGallery}>
                        <LinearGradient colors={[theme.colors.surface_light, theme.colors.surface]} style={styles.actionGradient}>
                            <Ionicons name="images" size={32} color={theme.colors.primary} />
                            <Text style={styles.actionTitle}>Gallery</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </AnimatedView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: 20, paddingBottom: 40 },
    header: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: theme.colors.text_primary },
    headerSubtitle: { fontSize: 16, color: theme.colors.text_secondary, marginTop: 4 },
    scannerContainer: { alignItems: 'center', marginBottom: 50, position: 'relative' },
    scannerCircle: { width: 160, height: 160, borderRadius: 80, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.glass_border },
    laserLine: { position: 'absolute', width: 200, height: 2, backgroundColor: theme.colors.primary, top: 80 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text_primary, marginBottom: 16 },
    actionsRow: { flexDirection: 'row', gap: 16, marginBottom: 30 },
    actionCard: { flex: 1, height: 140, borderRadius: 20 },
    actionGradient: { flex: 1, borderRadius: 20, padding: 16, justifyContent: 'center', alignItems: 'center' },
    actionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text_primary, marginTop: 8 },
    loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    loadingBg: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
    loadingOverlay: { backgroundColor: 'rgba(30, 41, 59, 0.9)', padding: 30, borderRadius: 20, alignItems: 'center' },
    loadingText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text_primary, marginTop: 16 },
    loadingSubText: { fontSize: 13, color: theme.colors.text_secondary, marginTop: 6 }
});