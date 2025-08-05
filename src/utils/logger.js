// src/utils/logger.js

export const DRAW_ON_CANVAS = false;

export const LOG_LEVELS = {
  MP4_EXTRACTION: false,
  MP4_SPRITE_DATA: false,
  SPRITE_LOADER: false,
  VIDEO_CANVAS: true,
  OVERLAY: false,
  USER_INPUT: false,
  VIDEO_CHUNKS: false,
  AUDIO_PROCESSING: false,
  RECORDING: false,
  NETWORK_REQUESTS: false,
  GENERAL: false,
  DRAW_EVERY_FRAME_COUNTER: false,
  AGENT_CHAT: false,
  CHAT_SOCKET: false,
  IMAGE: false,
  MESSAGE: false,
  DEBUG_LOG: false,
  FRAME_IMAGE : false,
  FRAME_LOG: false,
};

const colorMap = {
  VIDEO_CANVAS: "deepskyblue",
  OVERLAY: "limegreen",
  USER_INPUT: "magenta",
  VIDEO_CHUNKS: "teal",
  AUDIO_PROCESSING: "tomato",
  NETWORK_REQUESTS: "orange",
  GENERAL: "black",
  DRAW_EVERY_FRAME_COUNTER: "purple",
  AGENT_CHAT: "royalblue",
  CHAT_SOCKET: "dodgerblue",
  IMAGE: "deeppink",
  MESSAGE: "seagreen",
  DEBUG_LOG: "deeppink",
};

export const log = (category = "GENERAL", ...args) => {
  if (!LOG_LEVELS[category]) return;
  const color = colorMap[category] || colorMap.GENERAL;
  console.log(`[${category}]`, ...args); // Color formatting may not work in React Native
};

export const warn = (category = "GENERAL", ...args) => {
  if (!LOG_LEVELS[category]) return;
  const color = colorMap[category] || colorMap.GENERAL;
  console.warn(`[${category}]`, ...args);
};

export const error = (category = "GENERAL", ...args) => {
  if (!LOG_LEVELS[category]) return;
  const color = colorMap[category] || colorMap.GENERAL;
  console.error(`[${category}]`, ...args);
};

export const setLogLevel = (category, isEnabled) => {
  if (LOG_LEVELS.hasOwnProperty(category)) {
    LOG_LEVELS[category] = isEnabled;
    console.log(`[${category}] Logging for category "${category}" is now ${isEnabled ? "ENABLED" : "DISABLED"}`);
  } else {
    console.warn(`Invalid log category: "${category}"`);
  }
};