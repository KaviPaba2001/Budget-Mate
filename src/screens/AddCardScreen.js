import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { theme } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { LinearGradient } from 'expo-linear-gradient';

// A simple card component for visual feedback as the user types
const CardPreview = ({ name, number, expiry }) => {
    return (
        <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.cardPreview}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardBank}>My Bank</Text>
                <Ionicons name="wifi" size={24} color="white" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>
            <View style={styles.cardChip}>
                <Ionicons name="hardware-chip-outline" size={40} color="#f59e0b" />
            </View>
            <Text style={styles.cardNumber}>{number || '**** **** **** ****'}</Text>
            <View style={styles.cardFooter}>
                <View>
                    <Text style={styles.cardLabel}>Card Holder</Text>
                    <Text style={styles.cardValue}>{name.toUpperCase() || 'YOUR NAME'}</Text>
                </View>
                <View>
                    <Text style={styles.cardLabel}>Expires</Text>
                    <Text style={styles.cardValue}>{expiry || 'MM/YY'}</Text>
                </View>
            </View>
        </LinearGradient>
    );
};

export default function AddCardScreen({ navigation }) {
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');

    const handleSaveCard = () => {
        if (!cardName || cardNumber.length < 19 || expiryDate.length < 5 || cvv.length < 3) {
            Alert.alert('Invalid Details', 'Please fill in all card details correctly.');
            return;
        }
        // In a real app, you would save this data securely.
        Alert.alert('Success', 'Card added successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    };

    // Format card number with spaces every 4 digits
    const formatCardNumber = (text) => {
        const cleaned = text.replace(/\s/g, '');
        const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
        setCardNumber(formatted);
    };

    // Format expiry date with a slash after 2 digits
    const formatExpiryDate = (text) => {
        const cleaned = text.replace(/\//g, '');
        if (cleaned.length >= 2) {
            setExpiryDate(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
        } else {
            setExpiryDate(cleaned);
        }
    };

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <CardPreview name={cardName} number={cardNumber} expiry={expiryDate} />

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cardholder Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. John Doe"
                        value={cardName}
                        onChangeText={setCardName}
                        placeholderTextColor={theme.colors.text_secondary}
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Card Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChangeText={formatCardNumber}
                        keyboardType="number-pad"
                        maxLength={19}
                        placeholderTextColor={theme.colors.text_secondary}
                    />
                </View>
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Expiry Date</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="MM/YY"
                            value={expiryDate}
                            onChangeText={formatExpiryDate}
                            keyboardType="number-pad"
                            maxLength={5}
                            placeholderTextColor={theme.colors.text_secondary}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>CVV</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="123"
                            value={cvv}
                            onChangeText={setCvv}
                            keyboardType="number-pad"
                            maxLength={3}
                            secureTextEntry
                            placeholderTextColor={theme.colors.text_secondary}
                        />
                    </View>
                </View>
                <CustomButton title="Save Card" onPress={handleSaveCard} style={{ marginTop: theme.spacing.lg }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    cardPreview: {
        margin: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        height: 220,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardBank: {
        color: theme.colors.white,
        fontSize: 20,
        fontWeight: 'bold',
    },
    cardChip: {
        alignSelf: 'flex-start',
    },
    cardNumber: {
        color: theme.colors.white,
        fontSize: 22,
        letterSpacing: 2,
        textAlign: 'center',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardLabel: {
        color: theme.colors.gray[300],
        fontSize: 12,
    },
    cardValue: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    form: {
        padding: theme.spacing.md,
    },
    inputGroup: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        color: theme.colors.text_secondary,
        marginBottom: theme.spacing.sm,
        fontSize: 14,
    },
    input: {
        backgroundColor: theme.colors.surface,
        color: theme.colors.text_primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        fontSize: 16,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
});
