// src/utils/userId.js
import * as SecureStore from 'expo-secure-store';
import uuid from 'react-native-uuid';


export const getUserId = async () => {
  let userId = await SecureStore.getItemAsync('userId');
  if (!userId) {
    userId = uuid.v4();
    await SecureStore.setItemAsync('userId', userId);
    console.log('[getUserId] New userId generated:', userId);
  } else {
    console.log('[getUserId] Retrieved existing userId:', userId);
  }
  return userId;
};

