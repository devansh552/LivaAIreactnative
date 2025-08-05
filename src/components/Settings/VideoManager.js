import { StyleSheet, Text, View } from 'react-native';

const VideoManager = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Manager</Text>
      <Text>Manage your video settings and configurations here.</Text>
      {/* Add video management functionality here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: 600,
    marginHorizontal: 'auto',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
});

export default VideoManager;
