import { StyleSheet, Text, View } from 'react-native';

const TaskManager = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Task Manager</Text>
      <Text>Manage your tasks settings and configurations here.</Text>
      {/* Add task management functionality here */}
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

export default TaskManager;
