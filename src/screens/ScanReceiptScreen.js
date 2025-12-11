import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import { theme } from '../styles/theme';

// Free OCR API Key
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
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: true,
                aspect: [4, 3],
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                console.log('Photo taken, has base64:', !!asset.base64);
                setPreviewImage(asset.uri);
                
                if (asset.base64) {
                    await processImageForOcr(asset.base64);
                } else {
                    Alert.alert('Error', 'Failed to get image data. Please try again.');
                }
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
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: true,
                aspect: [4, 3],
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                console.log('Image selected, has base64:', !!asset.base64);
                setPreviewImage(asset.uri);
                
                if (asset.base64) {
                    await processImageForOcr(asset.base64);
                } else {
                    Alert.alert('Error', 'Failed to get image data. Please try again.');
                }
            }
        } catch (error) {
            console.error('Gallery error:', error);
            Alert.alert('Error', 'Failed to select image: ' + error.message);
        }
    };

    const processImageForOcr = async (base64Image) => {
        setLoading(true);
        setDebugInfo('Analyzing receipt...');

        try {
            console.log('Starting smart OCR processing...');
            setDebugInfo('Reading receipt text...');

            const formData = new FormData();
            formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
            formData.append('language', 'eng');
            formData.append('isOverlayRequired', 'false');
            formData.append('detectOrientation', 'true');
            formData.append('scale', 'true');
            formData.append('OCREngine', '2');

            const response = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: {
                    'apikey': OCR_SPACE_API_KEY,
                },
                body: formData,
            });

            const data = await response.json();
            
            if (data.IsErroredOnProcessing) {
                const errorMessage = data.ErrorMessage?.[0] || "Unknown error from OCR provider.";
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
            console.log('📄 Extracted text:', text);
            
            setDebugInfo('Analyzing transaction details...');
            await smartParseReceipt(text);

        } catch (err) {
            console.error('OCR Processing Error:', err);
            Alert.alert(
                "Processing Error", 
                `Failed to process receipt: ${err.message}\n\nPlease check your internet connection and try again.`
            );
            setLoading(false);
        }
    };

    const smartParseReceipt = async (text) => {
        try {
            console.log('🧠 ========== SMART RECEIPT ANALYSIS ==========');
            
            const lines = text.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
            const fullText = text.toLowerCase();
            
            // ============ DETERMINE TRANSACTION TYPE (Income/Expense) ============
            let transactionType = 'expense'; // Default to expense
            
            const incomeKeywords = [
                'salary', 'payment received', 'deposit', 'credit', 'income', 
                'refund', 'reimbursement', 'bonus', 'commission', 'dividend',
                'interest earned', 'cashback', 'reward', 'payment confirmation',
                'transfer received', 'received from'
            ];
            
            const expenseKeywords = [
                'receipt', 'invoice', 'bill', 'paid', 'purchase', 'sale',
                'debit', 'charge', 'total', 'subtotal', 'amount due', 'payment',
                'thank you for your purchase', 'tax', 'vat', 'gst'
            ];
            
            const incomeScore = incomeKeywords.reduce((score, kw) => 
                score + (fullText.includes(kw) ? 1 : 0), 0);
            const expenseScore = expenseKeywords.reduce((score, kw) => 
                score + (fullText.includes(kw) ? 1 : 0), 0);
            
            if (incomeScore > expenseScore) {
                transactionType = 'income';
            }
            
            console.log('💳 Transaction Type:', transactionType.toUpperCase());
            console.log('   Income indicators:', incomeScore, '| Expense indicators:', expenseScore);
            
            // ============ EXTRACT AMOUNT ============
            let amount = '';
            let foundAmount = 0.0;
            
            const amountKeywords = [
                'total', 'amount', 'grand total', 'subtotal', 'balance', 
                'due', 'pay', 'sum', 'payable', 'net amount', 'final amount',
                'total amount', 'grand sum', 'amount paid', 'paid'
            ];
            
            // Strategy 1: Look near amount keywords
            console.log('💰 Searching for amount...');
            for (let i = 0; i < lines.length; i++) {
                const lowerLine = lines[i].toLowerCase();
                
                if (amountKeywords.some(kw => lowerLine.includes(kw))) {
                    const searchArea = lines[i] + " " + (lines[i + 1] || "") + " " + (lines[i + 2] || "");
                    
                    const patterns = [
                        /(?:Rs\.?|LKR|₹)\s*(\d{1,3}(?:[,\s]\d{3})*(?:[.,]\d{2})?)/gi,  // With currency
                        /(\d{1,3}(?:[,\s]\d{3})*[.,]\d{2})/g,                           // Formatted
                        /(\d+[.,]\d{2})/g,                                               // Simple decimal
                    ];
                    
                    for (const pattern of patterns) {
                        const matches = searchArea.match(pattern);
                        if (matches) {
                            const values = matches.map(m => {
                                const cleaned = m.replace(/[Rs\.₹LKR,\s]/gi, '').replace(',', '.');
                                return parseFloat(cleaned);
                            }).filter(v => !isNaN(v) && v > 0);
                            
                            if (values.length > 0) {
                                const maxVal = Math.max(...values);
                                if (maxVal > foundAmount) {
                                    foundAmount = maxVal;
                                    console.log('   ✓ Found amount near keyword:', foundAmount);
                                }
                            }
                        }
                    }
                }
            }
            
            // Strategy 2: Find largest reasonable number
            if (foundAmount === 0) {
                console.log('   Strategy 2: Finding largest number...');
                const allPatterns = [
                    /(?:Rs\.?|LKR|₹)\s*(\d{1,3}(?:[,\s]\d{3})*(?:[.,]\d{2})?)/gi,
                    /(\d{1,3}(?:[,\s]\d{3})*[.,]\d{2})/g,
                ];
                
                for (const pattern of allPatterns) {
                    const matches = text.match(pattern);
                    if (matches) {
                        const values = matches.map(m => {
                            const cleaned = m.replace(/[Rs\.₹LKR,\s]/gi, '').replace(',', '.');
                            return parseFloat(cleaned);
                        }).filter(v => !isNaN(v) && v > 0 && v < 10000000); // Reasonable range
                        
                        if (values.length > 0) {
                            foundAmount = Math.max(...values);
                            console.log('   ✓ Largest reasonable number:', foundAmount);
                            break;
                        }
                    }
                }
            }
            
            if (foundAmount > 0) {
                amount = foundAmount.toFixed(2);
            }
            
            console.log('💵 Final Amount:', amount || 'NOT FOUND');
            
            // ============ SMART CATEGORY DETECTION ============
            let category = 'other';
            let categoryConfidence = 0;
            
            const categoryPatterns = {
                food: {
                    keywords: [
                        'restaurant', 'cafe', 'coffee', 'burger', 'pizza', 'kitchen',
                        'dining', 'meal', 'food', 'bakery', 'bistro', 'grill',
                        'breakfast', 'lunch', 'dinner', 'snack', 'beverage',
                        'mcdonald', 'kfc', 'subway', 'domino', 'starbucks',
                        'menu', 'order', 'table', 'waiter', 'tip', 'dine'
                    ],
                    weight: 1
                },
                transport: {
                    keywords: [
                        'fuel', 'gas', 'petrol', 'diesel', 'uber', 'taxi', 'cab',
                        'station', 'transport', 'bus', 'train', 'metro', 'ticket',
                        'parking', 'toll', 'vehicle', 'ride', 'driver', 'trip',
                        'pickup', 'drop', 'fare', 'travel'
                    ],
                    weight: 1
                },
                shopping: {
                    keywords: [
                        'mart', 'market', 'super', 'grocery', 'store', 'shop',
                        'retail', 'mall', 'clothing', 'fashion', 'electronics',
                        'goods', 'merchandise', 'purchase', 'bought', 'sale'
                    ],
                    weight: 0.8
                },
                utilities: {
                    keywords: [
                        'electric', 'electricity', 'water', 'bill', 'utility',
                        'gas bill', 'power', 'energy', 'internet', 'phone',
                        'mobile', 'broadband', 'wifi', 'telephone', 'subscription'
                    ],
                    weight: 1
                },
                entertainment: {
                    keywords: [
                        'cinema', 'movie', 'theatre', 'theater', 'game', 'gaming',
                        'entertainment', 'ticket', 'show', 'concert', 'event',
                        'netflix', 'spotify', 'youtube', 'streaming', 'subscription',
                        'park', 'museum', 'zoo'
                    ],
                    weight: 1
                },
                health: {
                    keywords: [
                        'pharmacy', 'doctor', 'hospital', 'clinic', 'medical',
                        'health', 'medicine', 'drug', 'prescription', 'lab',
                        'diagnostic', 'test', 'checkup', 'consultation', 'treatment',
                        'dental', 'eye care', 'surgery'
                    ],
                    weight: 1
                },
                education: {
                    keywords: [
                        'school', 'college', 'university', 'education', 'course',
                        'class', 'tuition', 'fee', 'book', 'stationery', 'library',
                        'exam', 'study', 'learning', 'training', 'workshop'
                    ],
                    weight: 1
                },
                salary: {
                    keywords: [
                        'salary', 'wage', 'payroll', 'payment advice', 'pay slip',
                        'earnings', 'gross pay', 'net pay', 'compensation'
                    ],
                    weight: 1
                },
                freelance: {
                    keywords: [
                        'freelance', 'contract', 'project payment', 'invoice',
                        'consultation fee', 'service charge', 'professional fee',
                        'gig', 'upwork', 'fiverr', 'freelancer'
                    ],
                    weight: 1
                },
                investment: {
                    keywords: [
                        'dividend', 'interest', 'investment', 'stock', 'mutual fund',
                        'returns', 'profit', 'capital gain', 'trading', 'portfolio'
                    ],
                    weight: 1
                },
            };
            
            console.log('🏷️  Analyzing category...');
            
            for (const [cat, config] of Object.entries(categoryPatterns)) {
                let score = 0;
                config.keywords.forEach(keyword => {
                    if (fullText.includes(keyword.toLowerCase())) {
                        score += config.weight;
                    }
                });
                
                if (score > categoryConfidence) {
                    categoryConfidence = score;
                    category = cat;
                }
            }
            
            // Adjust category based on transaction type
            if (transactionType === 'income') {
                const incomeCategories = ['salary', 'freelance', 'investment', 'other'];
                if (!incomeCategories.includes(category)) {
                    category = 'salary'; // Default income category
                }
            }
            
            console.log('📂 Detected Category:', category.toUpperCase());
            console.log('   Confidence Score:', categoryConfidence);
            
            // ============ EXTRACT MERCHANT/TITLE ============
            let title = 'Scanned Receipt';
            
            // Try to find merchant name (usually first few lines)
            for (let i = 0; i < Math.min(5, lines.length); i++) {
                const line = lines[i];
                // Look for lines with letters, not too long, no amounts
                if (line.length > 3 && 
                    line.length < 50 &&
                    /[a-zA-Z]/.test(line) &&
                    !amountKeywords.some(kw => line.toLowerCase().includes(kw)) &&
                    !/^\d+[.,]\d{2}$/.test(line) &&
                    !/^\d{2}\/\d{2}/.test(line)) {
                    
                    title = line.substring(0, 30);
                    console.log('🏪 Merchant/Title:', title);
                    break;
                }
            }
            
            // ============ EXTRACT DATE (Optional) ============
            let date = new Date().toISOString();
            const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
            const dateMatch = text.match(datePattern);
            if (dateMatch) {
                console.log('📅 Found date on receipt:', dateMatch[0]);
            }
            
            console.log('🎯 ========== ANALYSIS COMPLETE ==========');
            
            setLoading(false);
            
            // Show confirmation dialog with extracted data
            Alert.alert(
                '✅ Receipt Scanned Successfully',
                `Type: ${transactionType === 'income' ? '💰 Income' : '💸 Expense'}\n` +
                `Amount: Rs. ${amount || 'Not found'}\n` +
                `Category: ${category}\n` +
                `From: ${title}\n\n` +
                `Confidence: ${categoryConfidence > 2 ? 'High' : categoryConfidence > 0 ? 'Medium' : 'Low'}`,
                [
                    {
                        text: 'Edit',
                        onPress: () => navigateToAddTransaction(amount, title, category, transactionType, text, true)
                    },
                    {
                        text: 'Confirm',
                        onPress: () => navigateToAddTransaction(amount, title, category, transactionType, text, false)
                    }
                ]
            );

        } catch (err) {
            console.error("Smart parsing error:", err);
            setLoading(false);
            Alert.alert('Error', 'Failed to analyze receipt. Please try manual entry.');
        }
    };

    const navigateToAddTransaction = (amount, title, category, type, rawText, shouldEdit) => {
        navigation.navigate("Transactions", {
            screen: "AddTransaction",
            params: {
                amount: amount || '',
                title: title || 'Scanned Receipt',
                category: category || 'other',
                type: type || 'expense',
                note: `📸 Auto-scanned receipt\n\n${rawText.substring(0, 200)}${rawText.length > 200 ? '...' : ''}`,
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                {previewImage && (
                    <Image source={{ uri: previewImage }} style={styles.previewImage} />
                )}
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
                <Text style={styles.debugText}>{debugInfo}</Text>
                <View style={styles.loadingSteps}>
                    <Text style={styles.stepText}>🔍 Reading text...</Text>
                    <Text style={styles.stepText}>💰 Extracting amount...</Text>
                    <Text style={styles.stepText}>🏷️  Detecting category...</Text>
                    <Text style={styles.stepText}>🎯 Analyzing type...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name="scan-circle-outline" size={120} color={theme.colors.primary} />
            </View>
            
            <Text style={styles.title}>AI Receipt Scanner</Text>
            <Text style={styles.subtitle}>
                Automatically detect amount, category, and transaction type from your receipts
            </Text>

            <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.featureText}>Auto-detect expense/income</Text>
                </View>
                <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.featureText}>Smart category recognition</Text>
                </View>
                <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.featureText}>Instant amount extraction</Text>
                </View>
            </View>

            <View style={styles.buttonContainer}>
                <CustomButton 
                    title="📷 Take Photo" 
                    onPress={handleTakePhoto} 
                    variant="primary" 
                    style={styles.button}
                />
                <CustomButton 
                    title="🖼️  Choose Photo" 
                    onPress={handleChooseFromGallery} 
                    variant="secondary" 
                    style={styles.button}
                />
            </View>
            
            <Text style={styles.footerText}>Powered by AI OCR Technology</Text>
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
    iconContainer: {
        marginBottom: theme.spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
        lineHeight: 22,
    },
    featuresContainer: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.xl,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    featureText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        width: '100%',
    },
    button: {
        flex: 1,
    },
    previewImage: {
        width: 280,
        height: 280,
        borderRadius: theme.borderRadius.xl,
        marginBottom: theme.spacing.lg,
        resizeMode: 'contain',
        borderWidth: 3,
        borderColor: theme.colors.primary,
    },
    debugText: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.primary,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
    },
    loadingSteps: {
        marginTop: theme.spacing.lg,
        alignItems: 'center',
    },
    stepText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text_secondary,
        marginVertical: 4,
    },
    footerText: {
        marginTop: theme.spacing.xl,
        color: theme.colors.gray[600],
        fontSize: 11,
        fontStyle: 'italic',
    }
});