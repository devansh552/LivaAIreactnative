import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import axiosChat from '../../src/axiosChat';
import AgentSelection from '../../src/components/AgentSelection';
import { getUserId } from '../../src/utils/userId';

type UserData = {
  userId: string;
  [key: string]: any;
};

export default function HomeScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const storedUserData = await SecureStore.getItemAsync('userData');
      console.log('Stored userData:', storedUserData);
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
        setLoading(false);
      } else {
        try {
          const userId = await getUserId();
          console.log('Generated userId:', userId);
          if (userId) {
            await guestLogin(userId);
          } else {
            console.log('No userId generated');
            setErrorMsg('Failed to get userId for guest login');
            setLoading(false);
          }
        } catch (err) {
          console.log('Error in getUserId or guestLogin:', err, JSON.stringify(err));
          setErrorMsg(
            'Error in getUserId or guestLogin: ' +
              (err && typeof err === 'object' && 'message' in err
                ? (err as { message: string }).message
                : JSON.stringify(err))
          );
          setLoading(false);
        }
      }
    })();
  }, []);

  const guestLogin = async (userId: string) => {
    try {
      console.log('Attempting guest login with userId:', userId);
      const response = await axiosChat.post('/initialize-guest-user', { userId });
      console.log('Guest login response:', response.data);
      setUserData(response.data);
      await SecureStore.setItemAsync('userData', JSON.stringify(response.data));
    } catch (err) {
      console.log('Guest login error:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        setErrorMsg('Guest login error: ' + (err as { message: string }).message);
      } else {
        setErrorMsg('Guest login error: Unknown error');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userData || !userData.userId) return;
    setLoading(true);
    axiosChat.get('/config')
      .then((res: any) => {
        setAgents(res.data.agents || []);
        setLoading(false);
      })
      .catch((err: any) => {
        setErrorMsg('Failed to fetch config: ' + err.message);
        setAgents([]);
        setLoading(false);
      });
  }, [userData]);

  useEffect(() => {
    SecureStore.setItemAsync('test', '123').then(() => {
      SecureStore.getItemAsync('test').then(val => console.log('SecureStore test value:', val));
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  if (agents.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No agents are currently online. Please try again later.</Text>
      </View>
    );
  }

  return (
    <AgentSelection
      agents={agents}
      setCurrentAgent={() => {}}
      userId={userData ? userData.userId : null}
      onGuestLogin={() => {
        if (userData && userData.userId) {
          guestLogin(userData.userId);
        }
      }}
    />
  );
}
