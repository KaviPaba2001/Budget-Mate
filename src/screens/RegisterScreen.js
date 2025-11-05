import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebase'; // Adjust path if needed
import { theme } from '../styles/theme'; // Adjust path if needed

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
        return Alert.alert('Missing Information', 'Please enter both email and password.');
    }
    setIsLoading(true);
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create a document for the user in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      // **FIXED CODE**: Show a success alert, and upon tapping the button,
      // navigate the user to the EmailLogin screen.
      Alert.alert(
        'Account Created',
        'Your account was created successfully. Please log in to continue.',
        [
          {
            text: 'Continue to Login',
            onPress: () => navigation.navigate('EmailLogin'), // Directs user to the login screen
          },
        ]
      );

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Registration Error', 'This email address is already in use.');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Registration Error', 'The password must be at least 6 characters long.');
      } else {
        Alert.alert('Registration Error', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-outline" size={28} color={theme.colors.text_primary} />
      </TouchableOpacity>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your financial journey with us</Text>
      </View>
      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.text_secondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={theme.colors.text_secondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={isLoading}>
          <Text style={styles.registerButtonText}>{isLoading ? 'Creating Account...' : 'Register'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Styles are consistent with the "Emerald Night" theme
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: theme.fontSize['3xl'],
        fontWeight: 'bold',
        color: theme.colors.text_primary,
    },
    subtitle: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
        marginTop: theme.spacing.sm,
    },
    content: {
        gap: theme.spacing.md,
    },
    input: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.md,
        fontSize: theme.fontSize.lg,
        color: theme.colors.text_primary,
        borderWidth: 1,
        borderColor: theme.colors.gray[700],
    },
    registerButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
    },
    registerButtonText: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.white,
    },
});
