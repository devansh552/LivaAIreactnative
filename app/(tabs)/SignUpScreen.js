import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await response.json();
      if (response.ok) {
        router.replace('/(tabs)/LoginScreen'); // Go to login after signup
      } else {
        setError(data.error || 'Signup failed.');
      }
    } catch (err) {
      setError('Signup failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.popup}>
        <Text style={styles.title}>Sign Up</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.formGroup}>
          <Text>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            value={name}
            onChangeText={setName}
          />
        </View>
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
        <TouchableOpacity style={styles.submitButton} onPress={handleSignup}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Sign Up</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleButton} onPress={() => router.replace('/(tabs)/LoginScreen')}>
          <Text style={styles.toggleButtonText}>Have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
    position: 'relative',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  formGroup: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 5,
  },
  submitButton: {
    width: '100%',
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  toggleButton: {
    width: '100%',
    padding: 10,
    backgroundColor: '#6c757d',
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  toggleButtonText: {
    color: '#fff',
  },
});