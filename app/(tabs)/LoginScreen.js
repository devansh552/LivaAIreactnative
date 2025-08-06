import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        router.replace('/(tabs)/HomeScreen'); // Navigate to landing page
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
    setLoading(false);
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // Implement guest login logic here if needed
      router.replace('/(tabs)/HomeScreen');
    } catch (err) {
      setError('Guest login failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.popup}>
        <Text style={styles.title}>Login</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.formGroup}>
          <Text>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.formGroup}>
          <Text>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        <TouchableOpacity style={styles.submitButton} onPress={handleLogin}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Login</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleButton} onPress={() => router.push('/(tabs)/SignUpScreen')}>
          <Text style={styles.toggleButtonText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
        <View style={{ height: 1, backgroundColor: '#ccc', marginVertical: 10, width: '100%' }} />
        <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  popup: { width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 8, padding: 20, elevation: 5 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#191a1b', textAlign: 'center' },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
  formGroup: { marginBottom: 15 },
  input: { width: '100%', padding: 10, borderRadius: 4, borderWidth: 1, borderColor: '#ccc', marginBottom: 5, backgroundColor: '#fff' },
  submitButton: { backgroundColor: '#007bff', borderRadius: 4, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
  toggleButton: { marginTop: 10, alignItems: 'center' },
  toggleButtonText: { color: '#007bff' },
  guestButton: { marginTop: 10, padding: 12, borderRadius: 4, backgroundColor: '#007bff', alignItems: 'center' },
  guestButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default LoginScreen;