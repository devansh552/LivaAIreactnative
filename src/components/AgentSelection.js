import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const placeholderProfile = require('../../assets/placeholder-profile.png'); // Place your placeholder image in assets

const AgentSelection = ({ agents, setCurrentAgent, userId, onGuestLogin }) => {
  const navigation = useNavigation();
  const [profileImages, setProfileImages] = useState({});

  useEffect(() => {
    // Fetch profile images for all agents
    const fetchProfileImages = async () => {
      const newProfileImages = {};
      await Promise.all(
        agents.map(async (agent) => {
          try {
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/get_agent_profile_image/${agent.id}`
            );
            if (response.ok) {
              const blob = await response.blob();
              // React Native does not support URL.createObjectURL, so use a workaround:
              // Save the blob to a file and get its URI, or use a remote URL if your backend supports it.
              // For now, fallback to placeholder.
              newProfileImages[agent.id] = null;
            } else {
              newProfileImages[agent.id] = null;
            }
          } catch (error) {
            newProfileImages[agent.id] = null;
          }
        })
      );
      setProfileImages(newProfileImages);
    };
    if (agents.length > 0) fetchProfileImages();
  }, [agents]);

  const handleAgentClick = async (agent) => {
    if (!userId && onGuestLogin) {
      try {
        await onGuestLogin();
      } catch (error) {
        return;
      }
    }
    setCurrentAgent(agent);
    navigation.navigate('AgentChat', { agentId: agent.id });
  };

  const numColumns = Dimensions.get('window').width > 768 ? 3 : 1;

  const renderAgent = ({ item: agent }) => (
    <TouchableOpacity
      key={agent.id}
      style={styles.agentBox}
      onPress={() => handleAgentClick(agent)}
      accessibilityLabel={`Select ${agent.name} as your live video agent`}
    >
      <Image
        source={
          profileImages[agent.id]
            ? { uri: profileImages[agent.id] }
            : placeholderProfile
        }
        style={styles.agentImage}
        resizeMode="cover"
      />
      <View style={styles.agentOverlay}>
        <Text style={styles.agentName}>{agent.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Live Video Agents</Text>
        {agents.length > 0 ? (
          <FlatList
            data={agents}
            renderItem={renderAgent}
            keyExtractor={(item) => item.id.toString()}
            numColumns={numColumns}
            contentContainerStyle={styles.grid}
          />
        ) : (
          <Text style={styles.noAgentsText}>
            No agents are currently online. Please try again later.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191a1b',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 1200,
    width: '100%',
  },
  heading: {
    marginBottom: 30,
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  grid: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  agentBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    margin: 10,
    elevation: 4,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  agentOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    alignItems: 'center',
  },
  agentName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  noAgentsText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default AgentSelection;
