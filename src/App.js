import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AgentChat from './components/AgentChat';
import AgentSelection from './components/AgentSelection';
import LoginPopup from './components/LoginPopup';
import { getUserId } from './utils/userId';

const Stack = createStackNavigator();

function Header({ navigation }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => Linking.openURL('https://liva.ai')}>
        <Text style={styles.headerText}>LIVA</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [currentAgent, setCurrentAgent] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [userData, setUserData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get or create userId on app start
    getUserId().then(setUserId);
  }, []);

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/config`)
      .then((res) => res.json())
      .then((data) => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch config:', err);
        setAgents([]);
        setLoading(false);
      });
  }, []);

  const handleAuthSuccess = (data) => {
    setUserData(data);
    setShowLogin(false);
    if (data?.userId) setUserId(data.userId);
  };

  if (loading) {
    return null; // Or show a loading spinner
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          header: (props) => <Header {...props} />,
        }}
      >
        <Stack.Screen name="AgentSelection" options={{ title: 'Select Agent' }}>
          {(props) => (
            <AgentSelection
              {...props}
              agents={agents}
              setCurrentAgent={setCurrentAgent}
              userId={userId}
              onGuestLogin={() => setShowLogin(true)}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="AgentChat" options={{ title: 'Chat' }}>
          {(props) => (
            <AgentChat
              {...props}
              currentAgent={currentAgent}
              setCurrentAgent={setCurrentAgent}
              userId={userId}
              userData={userData}
              onOpenLogin={() => setShowLogin(true)}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
      {showLogin && (
        <LoginPopup
          onClose={() => setShowLogin(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#222',
    padding: 16,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});