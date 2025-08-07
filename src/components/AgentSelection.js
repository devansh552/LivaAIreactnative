import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
const placeholderProfile = require('../../assets/placeholder-profile.png'); // Place your placeholder image in assets

const AgentSelection = ({ agents, setCurrentAgent, userId, onGuestLogin }) => {
  const router = useRouter();
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
              // Convert blob to base64
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];
                // Save to file
                const fileUri = `${FileSystem.cacheDirectory}${agent.id}.png`;
                await FileSystem.writeAsStringAsync(fileUri, base64data, { encoding: FileSystem.EncodingType.Base64 });
                newProfileImages[agent.id] = fileUri;
                setProfileImages((prev) => ({ ...prev, [agent.id]: fileUri }));
              };
              reader.readAsDataURL(blob);
            } else {
              newProfileImages[agent.id] = null;
            }
          } catch (error) {
            newProfileImages[agent.id] = null;
          }
        })
      );
      // setProfileImages(newProfileImages); // Already set inside reader.onloadend
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
    router.push({ pathname: '/(tabs)/AgentChat', params: { agentId: agent.id } });
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
      <Text style={styles.heading}>Live Video Agents</Text>
      {agents.length > 0 ? (
        <FlatList
          data={agents}
          renderItem={renderAgent}
          keyExtractor={(item) => item.id.toString()}
          numColumns={1}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={true}
        />
      ) : (
        <Text style={styles.noAgentsText}>
          No agents are currently online. Please try again later.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191a1b',
    width: '100%',
    justifyContent: 'flex-start',
    padding: 0,
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
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
    paddingBottom: 40, // Extra space for scrolling
  },
  agentBox: {
    width: '90%',
    height: 340,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginVertical: 20,
    alignSelf: 'center',
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
