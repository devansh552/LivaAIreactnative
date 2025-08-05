import { useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

const GeneralSettings = () => {
  const [settings, setSettings] = useState({
    notifications: false,
    darkMode: false,
    autoUpdates: false,
  });

  const handleSwitchChange = (name, value) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: value,
    }));
  };

  const handleSave = () => {
    console.log('Saved settings: ', settings);
    // Add your save functionality here (e.g., API call)
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>General Settings</Text>
      <View style={styles.form}>
        <View style={styles.checkboxItem}>
          <Text style={styles.label}>Enable Notifications</Text>
          <Switch
            value={settings.notifications}
            onValueChange={(value) => handleSwitchChange('notifications', value)}
          />
        </View>
        <View style={styles.checkboxItem}>
          <Text style={styles.label}>Enable Dark Mode</Text>
          <Switch
            value={settings.darkMode}
            onValueChange={(value) => handleSwitchChange('darkMode', value)}
          />
        </View>
        <View style={styles.checkboxItem}>
          <Text style={styles.label}>Enable Auto Updates</Text>
          <Switch
            value={settings.autoUpdates}
            onValueChange={(value) => handleSwitchChange('autoUpdates', value)}
          />
        </View>
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { maxWidth: 600, width: '100%', alignSelf: 'center', paddingBottom: 80 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  form: { marginBottom: 32 },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  label: { fontSize: 16 },
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
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default GeneralSettings;

