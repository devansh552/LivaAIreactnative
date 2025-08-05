// UserProfileIcon.js
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const UserProfileIcon = ({ userData, onSignOut }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigation = useNavigation();

  const displayLetter = userData.name
    ? userData.name.trim().charAt(0).toUpperCase()
    : userData.displayLetter || '';

  return (
    <View style={styles.userProfile}>
      <TouchableOpacity style={styles.profileIcon} onPress={() => setDropdownOpen(true)}>
        <Text style={styles.iconText}>{displayLetter}</Text>
      </TouchableOpacity>
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPressOut={() => setDropdownOpen(false)}>
          <View style={styles.dropdown}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { /* Future Profile action */ setDropdownOpen(false); }}>
              <Text>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                navigation.navigate('Settings');
                setDropdownOpen(false);
              }}
            >
              <Text>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                onSignOut();
                navigation.navigate('Home');
                setDropdownOpen(false);
              }}
            >
              <Text>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  userProfile: { position: 'relative' },
  profileIcon: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingTop: 50,
    paddingRight: 10,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 4,
    minWidth: 150,
    elevation: 4,
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
});

export default UserProfileIcon;
