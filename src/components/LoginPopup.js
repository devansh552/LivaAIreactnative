// src/components/LoginPopup.js
import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const LoginPopup = ({ onClose, onAuthSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // Replace with your backend URL
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        onAuthSuccess(data);
        onClose();
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
    setLoading(false);
  };

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
        onAuthSuccess(data);
        onClose();
      } else {
        setError(data.error || 'Signup failed.');
      }
    } catch (err) {
      setError('Signup failed. Please try again.');
    }
    setLoading(false);
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // Implement guest login logic here
      // Example: call your backend to create a guest user
      setLoading(false);
      onAuthSuccess({ guest: true });
      onClose();
    } catch (err) {
      setError('Guest login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={{ fontSize: 24 }}>&times;</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isSignup ? 'Sign Up' : 'Login'}</Text>
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
          {isSignup && (
            <View style={styles.formGroup}>
              <Text>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}
          <TouchableOpacity style={styles.submitButton} onPress={isSignup ? handleSignup : handleLogin}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{isSignup ? 'Sign Up' : 'Login'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.toggleButton} onPress={() => { setIsSignup(!isSignup); setError(''); }}>
            <Text style={styles.toggleButtonText}>{isSignup ? 'Have an account? Login' : "Don't have an account? Sign Up"}</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: '#ccc', marginVertical: 10, width: '100%' }} />
          <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: 'transparent',
    zIndex: 2,
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
  guestButton: {
    width: '100%',
    padding: 10,
    backgroundColor: '#28a745',
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  guestButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default LoginPopup;
