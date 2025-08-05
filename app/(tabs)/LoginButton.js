import { StyleSheet, Text, TouchableOpacity } from 'react-native';

const LoginButton = ({ onOpenLogin }) => (
  <TouchableOpacity style={styles.button} onPress={onOpenLogin}>
    <Text style={styles.text}>Login / Sign Up</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007bff',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
 },
});





export default LoginButton;
