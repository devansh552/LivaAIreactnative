// src/hooks/useScreenRecording.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { error, log } from '../utils/logger';

const useScreenRecording = () => {
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const parentCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioRecordingDestinationRef = useRef(null);
  const silentOscillatorRef = useRef(null);

  // Create an offscreen composite canvas and continuously draw the composite image.
  useEffect(() => {
    const parentCanvas = document.createElement('canvas');
    parentCanvas.width = 1024;
    parentCanvas.height = 512;
    parentCanvasRef.current = parentCanvas;
    const ctx = parentCanvas.getContext('2d');

    // Helper: Wrap text into multiple lines.
    const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
      const words = text.split(' ');
      let line = '';
      const lines = [];
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, y - ((lines.length - 1 - i) * lineHeight));
      }
    };

    function drawComposite() {
      if (!ctx) return;
      // Update canvas size if layout has changed.
      parentCanvas.width = 1024;
      ctx.clearRect(0, 0, parentCanvas.width, parentCanvas.height);

      const videoEl = document.querySelector('.video-canvas');
      if (videoEl) {
        ctx.drawImage(videoEl, 0, 0, 512, 512);
      }
      const imgEl = document.querySelector('.placeholder-image img');
      if (imgEl) {
        ctx.drawImage(
          imgEl,
          0,
          0,
          imgEl.naturalWidth,
          imgEl.naturalHeight,
          512,
          0,
          512,
          512
        );
      }

      // Draw subtitles (if any)
      const subtitle = "";
      if (subtitle) {
        const fontSize = 24;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.shadowColor = "black";
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 4;
        
        const xPos = parentCanvas.width / 2;
        const bottomMargin = 20;
        const yPos = parentCanvas.height - bottomMargin;
        const maxSubtitleWidth = parentCanvas.width * 0.9;
        const lineHeight = fontSize * 1.2;
        wrapText(ctx, subtitle, xPos, yPos, maxSubtitleWidth, lineHeight);
      }
      requestAnimationFrame(drawComposite);
    }
    drawComposite();
  }, []);

  // Function to start screen recording.
  const startScreenRecording = useCallback(() => {
    if (!parentCanvasRef.current) return;

    if (audioContextRef.current) {
      audioRecordingDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
      silentOscillatorRef.current = audioContextRef.current.createOscillator();
      const silentGain = audioContextRef.current.createGain();
      silentGain.gain.value = 0;
      silentOscillatorRef.current.connect(silentGain);
      silentGain.connect(audioRecordingDestinationRef.current);
      silentOscillatorRef.current.start();
      log("RECORDING", `${Date.now()} - Silent oscillator started.`);
    }

    const canvasStream = parentCanvasRef.current.captureStream(30);
    let combinedStream;
    if (audioRecordingDestinationRef.current) {
      const audioStream = audioRecordingDestinationRef.current.stream;
      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);
    } else {
      combinedStream = canvasStream;
    }
    log(
      "RECORDING",
      `${Date.now()} - Combined stream: ${combinedStream.getVideoTracks().length} video track(s), ${combinedStream.getAudioTracks().length} audio track(s).`
    );
    try {
      mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    } catch (e) {
      error("RECORDING", `${Date.now()} - MediaRecorder error:`, e);
      return;
    }
    recordedChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      // Save the recording globally so SharePopup can pick it up.
      window.lastRecording = blob;
      log("RECORDING", `${Date.now()} - Recording saved to window.lastRecording.`);
    };
    mediaRecorderRef.current.start();
    setIsScreenRecording(true);
    log("RECORDING", `${Date.now()} - Started screen recording.`);
  }, []);

  // Function to stop screen recording.
  const stopScreenRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      log("RECORDING", `${Date.now()} - Stopped screen recording.`);
    }
    setIsScreenRecording(false);
    if (silentOscillatorRef.current) {
      silentOscillatorRef.current.stop();
      silentOscillatorRef.current.disconnect();
      silentOscillatorRef.current = null;
      log("RECORDING", `${Date.now()} - Silent oscillator stopped.`);
    }
    audioRecordingDestinationRef.current = null;
  }, []);

  return {
    parentCanvasRef,
    isScreenRecording,
    startScreenRecording,
    stopScreenRecording,
    audioRecordingDestinationRef, // Exposed so AgentChat can connect audio sources.
  };
};

export default useScreenRecording;
// front-end sample code
export const saveRecordingToLivaCloud = async (userId, agentId) => {
  if (!window.lastRecording) {
    throw new Error("No recording available.");
  }

  const formData = new FormData();
  formData.append("video", window.lastRecording, "recorded-chat.webm");

  // Append the dynamic user and agent IDs
  formData.append("user_id", userId);
  formData.append("agent_id", agentId);

  try {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed.");
    }

    const data = await response.json();
    console.log("Recording uploaded successfully:", data);
    return data;
  } catch (e) {
    console.error("Error uploading recording:", e);
    throw e;
  }
};