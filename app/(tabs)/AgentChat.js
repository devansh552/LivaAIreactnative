import { useLocalSearchParams } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Image as RNImage, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import VideoCanvas from '../../components/RNVideoCanvas';
import axiosChat from '../../src/axiosChat';
import FirstTimeHelpTooltip from '../../src/components/FirstTimeHelpTooltip';
import SharePopup from '../../src/components/SharePopup';
import UserProfileIcon from '../../src/components/UserProfileIcon';
import useMicrophoneRecording from '../../src/hooks/useMicrophoneRecording';
import useScreenRecording from '../../src/hooks/useScreenRecording';
import useVideoCanvasSpriteLoader from '../../src/hooks/useVideoCanvasSpriteLoader';
import { error } from '../../src/utils/logger';
;

const placeholderImageAsset = require('../../assets/media_default_image.jpg');
const micOnIcon = require('../../assets/Icons/mic_on_black.png');
const micOffIcon = require('../../assets/Icons/mic_off_black.png');
const mediaIcon = require('../../assets/Icons/media_black.png');
const chatIcon = require('../../assets/Icons/chat_black.png');
const sendIcon = require('../../assets/Icons/send_message_black.png');

const AgentChat = ({
  currentAgent,
  config,
  setCurrentAgent,
  userId,
  onUpdateLoadingProgress,
  onUpdateLoadingTotal,
  onUpdateApiCallsCompleted,
  onOpenLogin,
  userData,
  onSignOut
}) => {
  const { agentId } = useLocalSearchParams();
  // const navigation = useNavigation();
  
  //const { agentId } = route.params || {};

  // Responsive
  const [isMobile, setIsMobile] = useState(Dimensions.get('window').width <= 768);
  useEffect(() => {
    const handleResize = ({ window }) => setIsMobile(window.width <= 768);
    const sub = Dimensions.addEventListener('change', handleResize);
    return () => sub?.remove();
  }, []);

  // State
  const userResolution = useMemo(() => "512", []);
  const instanceId = useMemo(() => uuidv4(), []);
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [layout, setLayout] = useState('0');
  const [centerInputEnabled, setCenterInputEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [centerMessage, setCenterMessage] = useState('');
  const [voiceDataAndAudioFile, setVoiceDataAndAudioFile] = useState(null);
  const [subtitleText, setSubtitleText] = useState('');
  const subtitleTextRef = useRef(subtitleText);
  useEffect(() => { subtitleTextRef.current = subtitleText; }, [subtitleText]);
  const chatBoxRef = useRef(null);
  const socketRef = useRef(null);
  const videoCanvasRef = useRef(null);

  // Image and history state
  const [placeholderImage, setPlaceholderImage] = useState(placeholderImageAsset);
  const [imageHistory, setImageHistory] = useState([placeholderImageAsset]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Tooltip
  const [showTooltip, setShowTooltip] = useState(false);

  // Socket connection
  const [socketConnected, setSocketConnected] = useState(false);

  // Custom hooks (assumed adapted for React Native)
  const { isRecording, startRecording: startMicRecording, stopRecording: stopMicRecording, inputRef, micStreamRef } = useMicrophoneRecording({
    onAudioRecorded: () => {},
    onUserInputSent: () => {},
  });

  const {
    isScreenRecording,
    startScreenRecording,
    stopScreenRecording,
    audioRecordingDestinationRef,
  } = useScreenRecording({
    layoutRef: useRef(layout),
    subtitleTextRef,
    audioContextRef: useRef(null),
    isRecording,
    micStreamRef,
    micSourceRef: useRef(null),
    scheduledStopRef: useRef(false),
    allBackendProcessedRef: useRef(false),
    setSubtitleText,
  });

  // Sprite loader (adapt as needed)
  const {
    baseFrames,
    baseFramesTalking,
    baseFramesTalkingTransition,
    baseFramesTalkingTransition2,
    spriteSheets,
    spritesLoadingProgress,
    totalSpritesToLoad,
    isAssetsLoaded,
    apiCallsCompleted
  } = useVideoCanvasSpriteLoader({
    socketRef,
    currentAgent,
    userId,
    BACKEND_URL,
    userResolution,
    socketConnected,
    instanceId
  });

  // Fetch messages (adapted for React Native)
  useEffect(() => {
    if (!currentAgent || !config) return;
    const fetchMessages = async () => {
      const conversationId = `conv_${currentAgent.id}_${userId}`;
      try {
        const response = await axiosChat.get('/messages', {
          params: { conversation_id: conversationId },
          headers: {
            'X-App-Name': 'AnnaOS-Interface',
            'X-User-ID': userId,
          },
        });
        setMessages(response.data);
      } catch (err) {
        error("NETWORK_REQUESTS", `${Date.now()} - Error fetching messages:, err`);
      }
    };
    fetchMessages();
  }, [currentAgent, config, userId]);

  // UI Handlers
  const toggleLayout = () => setLayout((prev) => (prev === '0' ? '1' : '0'));
  const toggleChatAndCenterInput = () => {
    setShowChat((prev) => !prev);
    setCenterInputEnabled((prev) => !prev);
  };

  const handlePrev = () => {
    if (currentImageIndex < imageHistory.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setPlaceholderImage(imageHistory[currentImageIndex + 1]);
    }
  };
  const handleNext = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setPlaceholderImage(imageHistory[currentImageIndex - 1]);
    }
  };

  // Message sending logic (adapt to your backend)
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setMessages([...messages, { message: newMessage, sender: { id: userId } }]);
    setNewMessage('');
    // Add your backend message sending logic here
  };

  const sendCenterMessage = async () => {
    if (!centerMessage.trim()) return;
    setMessages([...messages, { message: centerMessage, sender: { id: userId } }]);
    setCenterMessage('');
    // Add your backend message sending logic here
  };

  // Render message bubbles
  const renderMessages = () => (
    <ScrollView style={styles.chatBox} ref={chatBoxRef}>
      {messages.map((msg, idx) => {
        const isUser = msg.sender?.id === userId;
        return (
          <View key={idx} style={[styles.message, isUser ? styles.sent : styles.received]}>
            <Text>{msg.message}</Text>
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.shareButton} onPress={() => setShowSharePopup(true)}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>S</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleLayout}>
          <RNImage source={mediaIcon} style={styles.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleChatAndCenterInput}>
          <RNImage source={chatIcon} style={styles.icon} />
        </TouchableOpacity>
        {userData && <UserProfileIcon userData={userData} onSignOut={onSignOut} />}
      </View>

      {/* Video Canvas and Placeholder */}
      <View style={styles.videoPanel}>
        <View style={styles.videoCanvasWrapper}>
          <VideoCanvas
            ref={videoCanvasRef}
            agentId={currentAgent?.id}
            currentAgent={currentAgent}
            voiceDataAndAudioFile={voiceDataAndAudioFile}
            baseFrames={baseFrames}
            baseFramesTalking={baseFramesTalking}
            baseFramesTalkingTransition={baseFramesTalkingTransition}
            baseFramesTalkingTransition2={baseFramesTalkingTransition2}
            spriteSheets={spriteSheets}
            loggingEnabled={false}
            isAssetsLoaded={isAssetsLoaded}
            userResolution={userResolution}
          />
        </View>
        {layout === '1' && (
          <View style={styles.placeholderCanvas}>
            <RNImage source={placeholderImage} style={styles.placeholderImage} />
            {imageHistory.length > 1 && (
              <View style={styles.imageNavButtons}>
                <TouchableOpacity onPress={handlePrev} disabled={currentImageIndex >= imageHistory.length - 1}>
                  <Text style={styles.navButton}>{'<'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNext} disabled={currentImageIndex <= 0}>
                  <Text style={styles.navButton}>{'>'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Subtitles */}
      <View style={styles.subtitles}>
        <Text style={styles.subtitleText}>{subtitleText}</Text>
      </View>

      {/* Center Input Panel */}
      {centerInputEnabled && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centerInputPanel}
        >
          <TouchableOpacity
            style={[styles.centerMicButton, isRecording && styles.recording]}
            onPressIn={() => {
              startScreenRecording();
              startMicRecording();
            }}
            onPressOut={stopMicRecording}
          >
            <RNImage
              source={isRecording ? micOffIcon : micOnIcon}
              style={styles.micIcon}
            />
          </TouchableOpacity>
          <View style={styles.centerChatInputWrapper}>
            <TextInput
              style={styles.centerChatInput}
              value={centerMessage}
              onChangeText={setCenterMessage}
              placeholder="Ask anything"
              onSubmitEditing={sendCenterMessage}
              ref={inputRef}
            />
            <TouchableOpacity style={styles.centerSendButton} onPress={sendCenterMessage}>
              <RNImage source={sendIcon} style={styles.sendIcon} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Chat Panel */}
      {showChat && (
        <View style={styles.chatPanel}>
          {isMobile && (
            <TouchableOpacity style={styles.mobileBackButton} onPress={toggleChatAndCenterInput}>
              <Text style={styles.mobileBackButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          {renderMessages()}
          <View style={styles.chatInput}>
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.recording]}
              onPressIn={() => {
                startScreenRecording();
                startMicRecording();
              }}
              onPressOut={stopMicRecording}
            >
              <RNImage
                source={isRecording ? micOffIcon : micOnIcon}
                style={styles.micIcon}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Ask Anything"
              onSubmitEditing={sendMessage}
              ref={inputRef}
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <RNImage source={sendIcon} style={styles.sendIcon} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Popups */}
      <Modal visible={showSharePopup} transparent animationType="fade" onRequestClose={() => setShowSharePopup(false)}>
        <SharePopup
          onClose={() => setShowSharePopup(false)}
          userId={userId}
          agentId={currentAgent?.id}
        />
      </Modal>
      <Modal visible={showTooltip} transparent animationType="fade" onRequestClose={() => setShowTooltip(false)}>
        <FirstTimeHelpTooltip
          onClose={() => setShowTooltip(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    zIndex: 10,
    backgroundColor: '#222',
  },
  shareButton: {
    marginRight: 10,
    backgroundColor: 'gray',
    borderRadius: 8,
    padding: 8,
  },
  toggleButton: {
    marginRight: 10,
    backgroundColor: 'gray',
    borderRadius: 8,
    padding: 8,
  },
  icon: { width: 24, height: 24 },
  videoPanel: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCanvasWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderCanvas: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderImage: { width: '100%', height: 200, resizeMode: 'contain', borderRadius: 5 },
  imageNavButtons: { flexDirection: 'row', position: 'absolute', bottom: 10, right: 10 },
  navButton: { color: '#fff', fontSize: 24, marginHorizontal: 10 },
  subtitles: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center' },
  subtitleText: { color: '#fff', fontSize: 16, textAlign: 'center', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  centerInputPanel: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248,0,0,0)',
    padding: 8,
    borderRadius: 30,
    zIndex: 11,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  centerMicButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#87a1f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recording: { backgroundColor: 'red' },
  micIcon: { width: 24, height: 24 },
  centerChatInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  centerChatInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 15, fontSize: 16, backgroundColor: '#fff' },
  centerSendButton: { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { width: 20, height: 24 },
  chatPanel: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%', backgroundColor: '#f0f0f0', zIndex: 100, paddingTop: 40 },
  mobileBackButton: { position: 'absolute', top: 10, right: 10, zIndex: 101 },
  mobileBackButtonText: { color: '#fff', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 8 },
  chatBox: { flex: 1, padding: 10 },
  message: { maxWidth: '60%', marginVertical: 4, padding: 10, borderRadius: 10 },
  sent: { backgroundColor: '#87a1f5', alignSelf: 'flex-end' },
  received: { backgroundColor: '#fff', alignSelf: 'flex-start' },
  chatInput: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ccc' },
  micButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#87a1f5', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, paddingHorizontal: 10, height: 40, marginHorizontal: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#87a1f5', alignItems: 'center', justifyContent: 'center' },
});

export default AgentChat;