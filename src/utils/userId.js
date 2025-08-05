// src/utils/userId.js
import * as SecureStore from 'expo-secure-store';
import uuid from 'react-native-uuid';

export const getUserId = async () => {
  let userId = await SecureStore.getItemAsync('userId');
  if (!userId) {
    userId = uuid.v4(); // This works in React Native
    await SecureStore.setItemAsync('userId', userId);
  }
  return userId;
};
