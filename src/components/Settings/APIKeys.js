import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const APIKeys = () => {
  const [keys, setKeys] = useState({
    elevenLabs: '',
    openAI: '',
    xKey: '',
    imageGen: '',
  });

  const handleChange = (name, value) => {
    setKeys((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    console.log('Saved API Keys:', keys);
    // Add your save functionality here
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <View style={styles.item}>
          <Text style={styles.label}>ElevenLabs Key</Text>
          <TextInput
            style={styles.input}
            value={keys.elevenLabs}
            onChangeText={(text) => handleChange('elevenLabs', text)}
            placeholder="Enter ElevenLabs Key"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>OpenAI Key</Text>
          <TextInput
            style={styles.input}
            value={keys.openAI}
            onChangeText={(text) => handleChange('openAI', text)}
            placeholder="Enter OpenAI Key"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>X- Key</Text>
          <TextInput
            style={styles.input}
            value={keys.xKey}
            onChangeText={(text) => handleChange('xKey', text)}
            placeholder="Enter X- Key"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Image Generation Key</Text>
          <TextInput
            style={styles.input}
            value={keys.imageGen}
            onChangeText={(text) => handleChange('imageGen', text)}
            placeholder="Enter Image Generation Key"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  form: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 80,
  },
  item: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
    fontSize: 16,
  },
  input: {
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  saveButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007bff',
    borderRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default APIKeys;
