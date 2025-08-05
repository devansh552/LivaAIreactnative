import { Video } from 'expo-av';
import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { saveRecordingToLivaCloud } from '../hooks/useScreenRecording';

const SharePopup = ({ onClose, userId, agentId, recordingUri }) => {
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleDownload = async () => {
    if (!recordingUri) return;
    // In Expo, you can save to device using FileSystem
    // Example: await FileSystem.downloadAsync(recordingUri, FileSystem.documentDirectory + 'recorded-chat.mp4');
    // Show a message or use a sharing library if needed
  };

  const handleSaveOnLivaCloud = async () => {
    if (!userId || !agentId) {
      setUploadStatus("error");
      return;
    }
    setUploadStatus("uploading");
    try {
      await saveRecordingToLivaCloud(userId, agentId);
      setUploadStatus("success");
    } catch (e) {
      setUploadStatus("error");
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={{ fontSize: 18 }}>X</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Share This Recording</Text>
          {recordingUri ? (
            <Video
              source={{ uri: recordingUri }}
              useNativeControls
              style={{ width: '100%', height: 200 }}
              resizeMode="contain"
            />
          ) : (
            <Text>No recording available.</Text>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSaveOnLivaCloud}>
              <Text>Save on Liva Cloud</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
              <Text>Download</Text>
            </TouchableOpacity>
          </View>
          {uploadStatus === "uploading" && <ActivityIndicator />}
          {uploadStatus === "success" && <Text>Upload successful!</Text>}
          {uploadStatus === "error" && <Text>Error during upload.</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
    position: 'relative',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10, right: 10,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
  },
  actionButton: {
    marginHorizontal: 10,
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 4,
  },
});


export default SharePopup;

