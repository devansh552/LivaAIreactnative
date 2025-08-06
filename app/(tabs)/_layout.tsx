// app/layout.tsx
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

type UserData = {
  name: string;
  userId: string;
  displayLetter?: string;
};

export default function RootLayout() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Load user from secure storage
  useEffect(() => {
    const loadUser = async () => {
      const data = await SecureStore.getItemAsync('userData');
      if (data) {
        setUserData(JSON.parse(data));
      }
    };
    loadUser();
  }, []);

  // When user logs in or signs up
  const handleAuthSuccess = async (data: any) => {
    await SecureStore.setItemAsync('userData', JSON.stringify(data));
    setUserData(data);
  };

  return (
    <>
      <Stack
        screenOptions={{
          headerTitle: '',
          // headerLeft: () => (
          //   <Pressable onPress={() => router.push('/')}>
          //     <Text style={{ marginLeft: 16 }}>🏠 Home</Text>
          //   </Pressable>
          // ),
          // headerRight: () => (
          //   <LoginButton onOpenLogin={() => setShowLoginModal(true)} />
          // ),
        }}
      />
      {/* {showLoginModal && (
        <LoginPopup
          onClose={() => setShowLoginModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )} */}
    </>
  );
}
