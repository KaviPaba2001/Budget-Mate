import { Ionicons } from '@expo/vector-icons';
// Import signInWithEmailAndPassword instead of createUser...
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth } from '../../firebase'; // Keep db if you need it, but auth is essential
import { theme } from '../styles/theme';

// Pass `onLogin` prop, which App.js now provides
export default function EmailLoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Rename function to handleLogin
  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Missing Information', 'Please enter both email and password.');
    }
    setIsLoading(true);
    try {
      // Use signInWithEmailAndPassword
      await signInWithEmailAndPassword(auth, email, password);
      
      // Call the onLogin prop from App.js on success
      onLogin(); 

    } catch (error) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      Alert.alert('Login Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-outline" size={28} color={theme.colors.text_primary} />
      </TouchableOpacity>
      
      {/* Update UI Text */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
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
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
          <Text style={styles.loginButtonText}>{isLoading ? 'Signing In...' : 'Login'}</Text>
        </TouchableOpacity>
        
        {/* Add a link to the Register screen */}
        <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLinkText}>Don't have an account? <Text style={{color: theme.colors.primary}}>Register</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Updated styles
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
    loginButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
    },
    loginButtonText: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.white,
    },
    registerLink: {
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    registerLinkText: {
        fontSize: theme.fontSize.base,
        color: theme.colors.text_secondary,
    }
});