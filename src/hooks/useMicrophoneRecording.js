import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { error, log } from '../utils/logger';

/**
 * Custom hook to handle microphone recording.
 * 
 * @param {Function} onAudioRecorded - Callback function to handle the recorded audio.
 * @param {Function} onUserInputSent - Callback to inform parent when user input is sent.
 */
const useMicrophoneRecording = ({ onAudioRecorded, onUserInputSent }) => {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef(null);
  const inputRef = useRef(null);

  /**
   * Starts the microphone recording.
   */
  const startRecording = useCallback(async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      log('Recording started.');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        alert('Microphone access was denied. Please enable permissions in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        alert('No microphone found. Please check your device settings.');
      } else if (err.name === 'AbortError') {
        alert('Microphone access request was interrupted.');
      } else {
        alert('An error occurred while trying to access the microphone.');
      }
      error('Error accessing microphone:', err);
    }
  }, []); // dependencies are empty because we only use stable refs and browser APIs

  /**
   * Stops the microphone recording.
   */
  const stopRecording = useCallback(async () => {
    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (onAudioRecorded) {
        // You can convert the file to base64 if needed using expo-file-system
        onAudioRecorded(uri);
      }
      if (onUserInputSent) onUserInputSent();
      log('Recording stopped.');
    } catch (err) {
      alert('Could not stop recording: ' + err.message);
    }
  }, [onAudioRecorded, onUserInputSent]);

  /**
   * Handles keydown and keyup events for the space bar.
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (inputRef.current && document.activeElement === inputRef.current) {
          return;
        }
        e.preventDefault();

        if (isRecording) {
          return;
        }
        startRecording();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (inputRef.current && document.activeElement === inputRef.current) {
          return;
        }
        e.preventDefault();

        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    inputRef,
    micStreamRef: null // Not needed in Expo
  };
};

export default useMicrophoneRecording;
