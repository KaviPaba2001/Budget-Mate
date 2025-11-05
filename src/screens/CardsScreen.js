import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { theme } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// A reusable component to display a single, beautifully designed card
const Card = ({ card }) => {
    const isVisa = card.type === 'visa';

    // Define card-specific styles and gradients
    const gradientColors = isVisa
        ? ['#1a2a6c', '#0f205B'] // Classic deep blue for Visa
        : ['#252525', '#111111']; // Sleek black for Mastercard

    const Logo = () => {
        if (isVisa) {
            return <Text style={styles.visaLogo}>VISA</Text>;
        }
        // Mastercard Logo
        return (
            <View style={styles.mastercardLogoContainer}>
                <View style={[styles.mastercardCircle, { backgroundColor: '#eb001b', right: 0 }]} />
                <View style={[styles.mastercardCircle, { backgroundColor: '#f79e1b', left: 0, opacity: 0.8 }]} />
            </View>
        );
    };

    return (
        <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <View style={styles.cardHeader}>
                <Ionicons name="hardware-chip-outline" size={40} color="#d4af37" />
                <Logo />
            </View>
            <Text style={styles.cardNumber}>{card.number}</Text>
            <View style={styles.cardFooter}>
                <View>
                    <Text style={styles.cardLabel}>Card Holder</Text>
                    <Text style={styles.cardValue}>{card.name.toUpperCase()}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.cardLabel}>Expires</Text>
                    <Text style={styles.cardValue}>{card.expiry}</Text>
                </View>
            </View>
        </LinearGradient>
    );
};

export default function CardsScreen({ navigation }) {
    // Mock data for demonstration
    const cards = [
        { id: '1', name: 'John Doe', number: '4111  ••••  ••••  1234', expiry: '12/26', bank: 'Visa', type: 'visa' },
        { id: '2', name: 'John Doe', number: '5100  ••••  ••••  5678', expiry: '08/25', bank: 'Mastercard', type: 'mastercard' },
    ];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.screenTitle}>My Cards</Text>
                {cards.map(card => <Card key={card.id} card={card} />)}
            </ScrollView>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddCard')}>
                <Ionicons name="add" size={30} color={theme.colors.white} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContainer: {
        padding: theme.spacing.md,
    },
    screenTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.lg,
    },
    card: {
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        height: 220,
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    visaLogo: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    mastercardLogoContainer: {
        width: 60,
        height: 40,
        justifyContent: 'center',
    },
    mastercardCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        position: 'absolute',
    },
    cardNumber: {
        color: theme.colors.white,
        fontSize: 24,
        fontFamily: 'monospace', // Gives a classic credit card feel
        letterSpacing: 2,
        textAlign: 'left',
        marginTop: theme.spacing.lg,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardLabel: {
        color: theme.colors.gray[300],
        fontSize: 12,
        textTransform: 'uppercase',
    },
    cardValue: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    addButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
    },
});
