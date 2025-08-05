// src/axiosChat.js

import axios from 'axios';
import { getUserId } from './utils/userId';

// Define your app name here
const APP_NAME = 'AnnaOS-Interface'; // Change this if your app name differs

const axiosChat = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
  headers: {
    'X-App-Name': APP_NAME,
    'Content-Type': 'application/json',
  },
});

// Async request interceptor for userId
axiosChat.interceptors.request.use(
  async (config) => {
    const userId = await getUserId();
    config.headers['X-User-ID'] = userId;
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosChat;
