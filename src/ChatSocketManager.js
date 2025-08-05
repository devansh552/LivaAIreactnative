import { io } from 'socket.io-client';
import { log, warn, error } from './utils/logger';
/**
 * Initializes the Chat Socket connection and registers all event handlers.
 *
 * @param {object} params - An object with all required parameters and callbacks.
 * @returns {Socket} - The initialized Socket.IO connection.
 */
export function initializeChatSocket({
  currentAgent,
  config,
  userId,
  BACKEND_URL,
  videoCanvasRef,
  setPlaceholderImage,
  setImageHistory,
  setCurrentImageIndex,
  currentImageIndex,
  setMessages,
  pendingMessagesRef,
  pendingImagesRef,
  chunkMasterIndexMapRef,
  masterIndexToSetIdMapRef,
  flushedMCIRef,
  audioContextRef,
  bufferMapRef,
  receivedAudioChunksCountRef,
  startProcessingRef, 
  bufferedChunksRef,   
  globalAudioSetIdRef,
  noMoreChunksRef,
  userResolution,
  decodePromiseMapRef, 
  setSubtitleText, 
  instanceId   
}) {
  // Initialization log using CHAT_SOCKET level.
  log("CHAT_SOCKET", `${Date.now()} - Initializing socket with userResolution: ${userResolution}`);
  const socket = io(BACKEND_URL, {
    query: {
      user_id: userId,
      userResolution : userResolution,
      agent_id: currentAgent.id,
      instance_id: instanceId
    },
    transports: ['websocket'],
  });
  // ─── STORE THE AUDIO HEADER ──────────────────────────────
  let audioHeaderBytes = null;

  // ─── PROCESSING EACH AUDIO CHUNK ───────────────────────────
  const processChunk = async (chunkData, currentSetId) => {
    const { audio_data, chunk_index, animationFramesChunk, master_chunk_index } = chunkData;
    const audioKey = `${currentSetId}-${chunk_index}`;
    log("VIDEO_CANVAS", `${Date.now()} - Received audio chunk. key=${audioKey}, master_chunk_index=${master_chunk_index}`);

    if (!audio_data) {
      warn("VIDEO_CANVAS", `${Date.now()} - No audio_data for ${audioKey}`);
      return;
    }
    log("VIDEO_CANVAS", `${Date.now()} - audio_data length for ${audioKey}: ${audio_data.length}`);
    log("VIDEO_CANVAS", `${Date.now()} - Raw audio_data (first 40 chars) for ${audioKey}: ${audio_data.slice(0, 40)}`);

    // Pass animation frames (if any) to the VideoCanvas immediately.
    if (animationFramesChunk && videoCanvasRef.current) {
      log("VIDEO_CANVAS", `${Date.now()} - Passing animationFramesChunk for ${audioKey}`);
      videoCanvasRef.current.handleIncomingAnimationData(animationFramesChunk, chunk_index, currentSetId);
    } else {
      log("VIDEO_CANVAS", `${Date.now()} - No animationFramesChunk for ${audioKey}`);
    }

    // Map the chunk key to its master_chunk_index.
    if (typeof master_chunk_index !== 'undefined' && master_chunk_index !== null) {
      chunkMasterIndexMapRef.current.set(audioKey, master_chunk_index);
      masterIndexToSetIdMapRef.current.set(master_chunk_index, currentSetId);
      log("VIDEO_CANVAS", `${Date.now()} - Mapped ${audioKey} to master_chunk_index ${master_chunk_index}`);
    } else {
      warn("VIDEO_CANVAS", `${Date.now()} - master_chunk_index is undefined for ${audioKey}`);
    }

    // Skip duplicate chunks if already processed.
    if (bufferMapRef.current.has(audioKey)) {
      log("VIDEO_CANVAS", `${Date.now()} - Duplicate audioKey ${audioKey} found. Skipping decoding.`);
      return;
    }

    try {
      // Remove accidental whitespace/newlines from the base64 string.
      const base64Str = audio_data.replace(/\s/g, '');
      const binary = atob(base64Str);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      // For the very first chunk, save the header bytes (assume 44 bytes header for WAV)
      if (chunk_index === 0 && !audioHeaderBytes) {
        audioHeaderBytes = bytes.slice(0, 44);
        log("VIDEO_CANVAS", `${Date.now()} - Stored audio header for ${audioKey}`);
      }
      log("VIDEO_CANVAS", `${Date.now()} - Starting decode for ${audioKey} (bytes length: ${len})`);
      const startDecode = performance.now();
      const decodePromise = audioContextRef.current.decodeAudioData(bytes.buffer);
      decodePromiseMapRef.current.set(audioKey, decodePromise);
      const audioBuffer = await decodePromise;
      const endDecode = performance.now();
      bufferMapRef.current.set(audioKey, audioBuffer);
      log("VIDEO_CANVAS", `${Date.now()} - Decoded ${audioKey} in ${(endDecode - startDecode).toFixed(2)}ms, duration: ${audioBuffer.duration.toFixed(2)}s`);
      decodePromiseMapRef.current.delete(audioKey);
    } catch (err) {
      error("VIDEO_CANVAS", `${Date.now()} - Error decoding audio chunk for ${audioKey}. Data (first 40 chars): ${audio_data.slice(0, 40)}`, err);
      // If this is not the first chunk and we have a header saved, try again by prepending it.
      if (chunk_index > 0 && audioHeaderBytes) {
        try {
          log("VIDEO_CANVAS", `${Date.now()} - Attempting to decode ${audioKey} with prepended header.`);
          const base64Str = audio_data.replace(/\s/g, '');
          const binary = atob(base64Str);
          const len = binary.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const combined = new Uint8Array(audioHeaderBytes.length + bytes.length);
          combined.set(audioHeaderBytes, 0);
          combined.set(bytes, audioHeaderBytes.length);
          const startDecodeRetry = performance.now();
          const decodePromiseRetry = audioContextRef.current.decodeAudioData(combined.buffer);
          decodePromiseMapRef.current.set(audioKey, decodePromiseRetry);
          const audioBuffer = await decodePromiseRetry;
          const endDecodeRetry = performance.now();
          bufferMapRef.current.set(audioKey, audioBuffer);
          log("VIDEO_CANVAS", `${Date.now()} - Decoded (with header) ${audioKey} in ${(endDecodeRetry - startDecodeRetry).toFixed(2)}ms, duration: ${audioBuffer.duration.toFixed(2)}s`);
          decodePromiseMapRef.current.delete(audioKey);
        } catch (retryError) {
          error("VIDEO_CANVAS", `${Date.now()} - Retry decoding failed for ${audioKey}`, retryError);
        }
      }
    }
  };

  // ─── SOCKET EVENT HANDLERS ─────────────────────────────
  socket.on('connect', () => {
    log("NETWORK_REQUESTS", "Connected to Chat Socket.IO server");
    log("NETWORK_REQUESTS", `${Date.now()} - Socket connected. ID: ${socket.id}`);
  });
  // Listen for disconnection
  socket.on('disconnect', (reason) => {
    warn("NETWORK_REQUESTS", `${Date.now()} - Socket disconnected: ${reason}`);

    // Try reconnecting manually after a small delay if not intentional
    if (reason !== "io client disconnect") {
      setTimeout(() => {
        log("NETWORK_REQUESTS", `${Date.now()} - Attempting to reconnect...`);
        socket.connect();
      }, 3000); // 3-second delay before reconnecting
    }
  });
  // Handle reconnection attempts
  socket.on('reconnect_attempt', (attempt) => {
    log("NETWORK_REQUESTS", `${Date.now()} - Reconnection attempt #${attempt}`);
  });

  // Successfully reconnected
  socket.on('reconnect', (attempt) => {
    log("NETWORK_REQUESTS", `${Date.now()} - Successfully reconnected after ${attempt} attempts`);
  });

  socket.on('new_image', (data) => {
    const { master_chunk_index, image_data } = data;
    log("IMAGE", `${Date.now()} - Received new_image: master_chunk_index=${master_chunk_index}`);
    let imageSrc;
    try {
      if (!image_data || typeof image_data !== 'object') {
        throw new Error('image_data is not an object.');
      }
      const { image: image_base64 } = image_data;
      if (!image_base64 || typeof image_base64 !== 'string') {
        throw new Error('image_data.image is missing or not a string.');
      }
      const hasDataUriPrefix = image_base64.startsWith('data:image/');
      imageSrc = hasDataUriPrefix ? image_base64 : `data:image/jpeg;base64,${image_base64}`;
      // Validate the base64 data by attempting to decode it.
      atob(hasDataUriPrefix ? imageSrc.split(',')[1] : image_base64);
      const setId = masterIndexToSetIdMapRef.current.get(master_chunk_index);
      if (setId === undefined) {
        throw new Error(`No setId found for master_chunk_index=${master_chunk_index}`);
      }
      const uniqueKey = `${setId}-${master_chunk_index}`;
      if (flushedMCIRef.current.has(uniqueKey)) {
        setPlaceholderImage(imageSrc);
        log("IMAGE", `${Date.now()} - Late image received and displayed for master_chunk_index=${master_chunk_index}, setId=${setId}`);
        setImageHistory((prev) => [imageSrc, ...prev].slice(0, 20));
        if (currentImageIndex === 0) {
          setPlaceholderImage(imageSrc);
        } else {
          setCurrentImageIndex((prev) => prev + 1);
        }
      } else {
        pendingImagesRef.current.set(uniqueKey, imageSrc);
        log("IMAGE", `${Date.now()} - Queued new_image for master_chunk_index=${master_chunk_index}, setId=${setId}`);
      }
    } catch (e) {
      error("IMAGE", `${Date.now()} - Invalid image data for master_chunk_index=${master_chunk_index}:`, e);
      if (masterIndexToSetIdMapRef.current.has(master_chunk_index)) {
        const setId = masterIndexToSetIdMapRef.current.get(master_chunk_index);
        const uniqueKey = `${setId}-${master_chunk_index}`;
        setPlaceholderImage('/media_default_image.jpg');
        flushedMCIRef.current.add(uniqueKey);
        log("IMAGE", `${Date.now()} - Fallback image set for master_chunk_index=${master_chunk_index}, setId=${setId}`);
        setImageHistory((prev) => ['/media_default_image.jpg', ...prev].slice(0, 20));
        if (currentImageIndex === 0) {
          setPlaceholderImage('/media_default_image.jpg');
        } else {
          setCurrentImageIndex((prev) => prev + 1);
        }
      }
    }
  });

  // ─── Modified Audio Chunk Reception: Process each chunk immediately ───────
  socket.on('receive_audio', (chunkData) => {
    log("VIDEO_CANVAS", `${Date.now()} - "receive_audio" event received:`, chunkData);
    const { audio_data, chunk_index, master_chunk_index } = chunkData;
    log("VIDEO_CANVAS", `${Date.now()} - Audio Chunk Details:
      Chunk Index: ${chunk_index}
      Master Chunk Index: ${master_chunk_index}
      Audio Data Length: ${audio_data ? audio_data.length : 'No audio data'}
    `);
    // Increment global set id when chunk_index === 0.
    if (chunk_index === 0) {
      globalAudioSetIdRef.current += 1;
      log("VIDEO_CANVAS", `${Date.now()} - Starting new set => setId=${globalAudioSetIdRef.current}`);
    }
    // Update the count of received audio chunks.
    receivedAudioChunksCountRef.current += 1;
    const currentSetId = globalAudioSetIdRef.current;
    // Immediately process the chunk—no buffering here.
    processChunk(chunkData, currentSetId);
  });

  socket.on('audio_end', () => {
    log("VIDEO_CANVAS", `${Date.now()} - Audio stream ended.`);
    noMoreChunksRef.current = true;
  });

  socket.on('new_message', (message) => {
    const expectedConvId = `conv_${currentAgent.id}_${userId}`;
    if (message.conversation_id !== expectedConvId) {
      log("VIDEO_CANVAS", `${Date.now()} - Message not for this conversation.`);
      return;
    }
    const { master_chunk_index } = message;
    if (typeof master_chunk_index === 'number') {
      const setId = masterIndexToSetIdMapRef.current.get(master_chunk_index);
      if (setId === undefined) {
        warn("VIDEO_CANVAS", `${Date.now()} - No setId found for master_chunk_index=${master_chunk_index}. Message deferred.`, message);
        return;
      }
      const uniqueKey = `${setId}-${master_chunk_index}`;
      const existing = pendingMessagesRef.current.get(uniqueKey) || [];
      existing.push(message);
      pendingMessagesRef.current.set(uniqueKey, existing);
      log("VIDEO_CANVAS", `${Date.now()} - Queued message for master_chunk_index=${master_chunk_index}, setId=${setId}:`, message);
    } else {
      setMessages((prev) => [...prev, message]);
      log("VIDEO_CANVAS", `${Date.now()} - New message (no master_chunk_index):`, message);
    }
    // Note: We no longer update subtitle text immediately here.
  });

  socket.on('connect_error', (err) => {
    error("NETWORK_REQUESTS", `${Date.now()} - Socket connection error:`, err);
  });

  socket.on('user_audio', (data) => {
    const { user_id, audio_data } = data;
    log("AUDIO_PROCESSING", `${Date.now()} - Received audio from user ${user_id}:`, audio_data);
  });

  socket.on('receive_frame_image', (data) => {
    log("FRAME_IMAGE", `${Date.now()} - Received frame image:`, data);
    if (videoCanvasRef.current && videoCanvasRef.current.handleIncomingFrameImage) {
      videoCanvasRef.current.handleIncomingFrameImage(data.frame_data, data.chunk_index);
    }
  });
  return socket;
}
