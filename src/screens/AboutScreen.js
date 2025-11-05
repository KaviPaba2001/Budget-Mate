import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import AnimatedView from '../components/AnimatedView';

export default function AboutScreen() {
    return (
        <ScrollView style={styles.container}>
            <AnimatedView index={0}>
                <View style={styles.header}>
                    <Ionicons name="information-circle-outline" size={80} color={theme.colors.primary} />
                    <Text style={styles.appName}>Finance Tracker</Text>
                    <Text style={styles.appVersion}>Version 1.0.0</Text>
                </View>
            </AnimatedView>
            <AnimatedView index={1}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About the App</Text>
                    <Text style={styles.sectionText}>
                        Finance Tracker is a modern, secure, and private way to manage your personal finances. All your data is stored locally on your device, ensuring your privacy is always protected.
                    </Text>
                </View>
            </AnimatedView>
            <AnimatedView index={2}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Features</Text>
                    <Text style={styles.sectionText}>
                        • Track income and expenses effortlessly.
                        {'\n'}• Set and monitor budgets to stay on target.
                        {'\n'}• Scan receipts to automatically add transactions.
                        {'\n'}• Manage your debit/credit cards securely.
                        {'\n'}• Visualize your financial health with detailed reports.
                    </Text>
                </View>
            </AnimatedView>
            <AnimatedView index={3}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Developed By</Text>
                    <Text style={styles.sectionText}>
                        •Kavindu Pabasara
                        {'\n'}•Geethmila Jayasooriya
                        {'\n'}•Thennakoon
                    </Text>
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
    header: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginTop: theme.spacing.md,
    },
    appVersion: {
        fontSize: 16,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.xs,
    },
    section: {
        padding: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text_primary,
        marginBottom: theme.spacing.md,
    },
    sectionText: {
        fontSize: 16,
        color: theme.colors.text_secondary,
        lineHeight: 24,
    },
});
