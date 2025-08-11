// VideoCanvas.js
import PropTypes from "prop-types";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DRAW_ON_CANVAS,
  error,
  log,
  warn,
} from "../src/utils/logger"; // Ensure VIDEO_CANVAS is correctly exported and imported
import "./AgentChat.css";

const FADE_IN_FRAMES = 0;
const FADE_OUT_FRAMES = 0;
const DRAW_OVERLAY_SPRITE = false;

/**
 * TRANSITION POINTS
 * - TRANSITION_1 = 50 (default, will be overridden by agent config)
 * - TRANSITION_2 = 101 (default, will be overridden by agent config)
 */
// const TRANSITION_1 = 53; // Will be replaced by agent config
// const TRANSITION_2 = 83; // Will be replaced by agent config

// Let's assume your logger.js might look something like this for the VIDEO_CANVAS flag:
// export const LOG_LEVELS = {
//   VIDEO_CANVAS: true, // <-- The flag you mentioned
//   DEBUG_LOG: true,
//   // ... other flags
// };
// And you'd import it where needed. For this component, we'll assume
// you have a way to access this flag, e.g., directly or via a config object.
// For the purpose of this example, I will use a placeholder.
// Placeholder REMOVED

/** Helper Function to Feather Sprite Edges **/
function drawFeatheredSprite(context, spriteSheet, sx, sy, sw, sh, dx, dy) {
  const offCanvas = document.createElement("canvas");
  offCanvas.width = sw;
  offCanvas.height = sh;
  const offCtx = offCanvas.getContext("2d");

  // Draw the sprite onto the offCanvas
  offCtx.drawImage(spriteSheet, sx, sy, sw, sh, 0, 0, sw, sh);

  // Apply feathering effect
  offCtx.save();
  offCtx.globalCompositeOperation = "destination-out";

  const centerX = sw / 2;
  const centerY = sh / 2;
  const innerRadius = Math.min(sw, sh) * 0.40;
  const outerRadius = Math.min(sw, sh) * 0.50;
  const gradient = offCtx.createRadialGradient(
    centerX,
    centerY,
    innerRadius,
    centerX,
    centerY,
    outerRadius
  );

  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.95)");

  offCtx.fillStyle = gradient;
  offCtx.fillRect(0, 0, sw, sh);
  offCtx.restore();

  // Draw the feathered sprite onto the main canvas
  context.drawImage(offCanvas, dx, dy, sw, sh);
}

const VideoCanvas = forwardRef(
  (
    {
      agentId,
      currentAgent, // Received currentAgent prop
      baseFrames,
      baseFramesTalking,
      baseFramesTalkingTransition,
      baseFramesTalkingTransition2,
      spriteSheets,
      voiceDataAndAudioFile,
      onAnimationChunkStart,
      onAnimationComplete,
      loggingEnabled, // You have loggingEnabled, maybe VIDEO_CANVAS is related or part of a logger config object
      isAssetsLoaded,
      userResolution,
    },
    ref
  ) => {
    // Memoized canvas size
    const canvasSize = useMemo(
      () => ({
        width: Number(userResolution),
        height: Number(userResolution),
      }),
      [userResolution]
    );

    // Extract and memoize agent-specific configuration for drawing and transitions
    const agentDisplayConfig = useMemo(() => {
      const tr1 = currentAgent?.tr_1_frame;
      const tr2 = currentAgent?.tr_2_frame;
      const posX = currentAgent?.POS_X;
      const posY = currentAgent?.POS_Y;
      const width = currentAgent?.WIDTH;
      const height = currentAgent?.HEIGHT;

      return {
        posX: typeof posX === 'number' ? posX : 150, // Default from original hardcoded sprite draw
        posY: typeof posY === 'number' ? posY : 30,   // Default
        width: typeof width === 'number' && width > 0 ? width : 200, // Default
        height: typeof height === 'number' && height > 0 ? height : 200, // Default
        tr1: typeof tr1 === 'number' ? tr1 : 53,  // Default from original VideoCanvas const
        tr2: typeof tr2 === 'number' ? tr2 : 83,  // Default
      };
    }, [currentAgent]);

    const TRANSITION_1 = agentDisplayConfig.tr1;
    const TRANSITION_2 = agentDisplayConfig.tr2;

    /**************************************************************************
     * State and Refs
     **************************************************************************/
    const canvasRef = useRef(null);

    // Base frames (IDLE)
    const baseFramesImagesRef = useRef([]);
    // Talking frames
    const baseFramesTalkingRef = useRef([]);
    // Transition frames #1
    const baseFramesTalkingTransitionRef = useRef([]);
    // Transition frames #2
    const baseFramesTalkingTransition2Ref = useRef([]);
    // Sprite sheets
    const spriteSheetsRef = useRef({});

    // Overlay animations + states
    const [overlayAnimations, setOverlayAnimations] = useState([]);
    const overlayAnimationsRef = useRef([]);
    const animationStatesRef = useRef([]);

    // Global ping-pong
    const globalFrameIndexRef = useRef(0);
    const frameDirectionRef = useRef(1);

    // Animation queue
    const animationQueueRef = useRef([]);
    const isSetPlayingRef = useRef(false);

    const overlayFrameImagesRef = useRef(new Map());

    // "actualMode" can be: 'idle', 'talking', or 'transition'
    const actualModeRef = useRef("idle");

    // Return to frame if talking ends
    const shouldReturnToFrameRef = useRef(false);

    // Which transition point (value from TRANSITION_1 or TRANSITION_2) we chose
    const chosenTransitionRef = useRef(null);
    // Which transition frames set #1 or #2 ("transition1" or "transition2")
    const chosenTransitionModeRef = useRef(null);

    // User input subrange logic
    const userInputRef = useRef(false); // used for a single "User Input Received" text
    const userInputActiveRef = useRef(false); // true => apply subrange logic (ONLY in idle)
    const userInputMinFrameRef = useRef(0);
    const userInputMaxFrameRef = useRef(24);

    // Unique ID for new incoming sets
    const globalSetIdRef = useRef(0);

    // Make sure we only call onAnimationComplete once per idle cycle
    const hasAnimationCompletedRef = useRef(false);

    /**************************************************************************
     * useEffect for baseFrames
     **************************************************************************/
    useEffect(() => {
      baseFramesImagesRef.current = baseFrames || [];
      if (baseFrames && baseFrames.length > 0) {
        log("SPRITE_LOADER", `Updated base frames (IDLE) => count: ${baseFrames.length}`);
      }
      log("VIDEO_CANVAS", `Initialized base frames (IDLE): count=${baseFramesImagesRef.current.length}`);
    }, [baseFrames]);

    /**************************************************************************
     * useEffect for baseFramesTalking
     **************************************************************************/
    useEffect(() => {
      baseFramesTalkingRef.current = baseFramesTalking || [];
      if (baseFramesTalking && baseFramesTalking.length > 0) {
        log("SPRITE_LOADER", `Updated base frames (TALKING) => count: ${baseFramesTalking.length}`);
      }
      log("VIDEO_CANVAS", `Initialized talking frames: count=${baseFramesTalkingRef.current.length}`);
    }, [baseFramesTalking]);

    /**************************************************************************
     * useEffect for baseFramesTalkingTransition
     **************************************************************************/
    useEffect(() => {
      baseFramesTalkingTransitionRef.current =
        baseFramesTalkingTransition || [];
      if (
        baseFramesTalkingTransition &&
        baseFramesTalkingTransition.length > 0
      ) {
        log(
          "SPRITE_LOADER",
          `Updated transition #1 frames => count: ${baseFramesTalkingTransition.length}`
        );
      }
      log("VIDEO_CANVAS", `Initialized transition #1 frames: count=${baseFramesTalkingTransitionRef.current.length}`);
    }, [baseFramesTalkingTransition]);

    /**************************************************************************
     * useEffect for baseFramesTalkingTransition2
     **************************************************************************/
    useEffect(() => {
      baseFramesTalkingTransition2Ref.current =
        baseFramesTalkingTransition2 || [];
      if (
        baseFramesTalkingTransition2 &&
        baseFramesTalkingTransition2.length > 0
      ) {
        log(
          "SPRITE_LOADER",
          `Updated transition #2 frames => count: ${baseFramesTalkingTransition2.length}`
        );
      }
      log("VIDEO_CANVAS", `Initialized transition #2 frames: count=${baseFramesTalkingTransition2Ref.current.length}`);
    }, [baseFramesTalkingTransition2]);

    /**************************************************************************
     * useEffect for spriteSheets
     **************************************************************************/
    useEffect(() => {
      if (spriteSheets && spriteSheets.length > 0) {
        spriteSheets.forEach(({ img, filename }) => {
          spriteSheetsRef.current[filename] = img;
          log("SPRITE_LOADER", `Mapped sprite sheet: ${filename}`);
        });
        log(
          "SPRITE_LOADER",
          `Updated spriteSheets => total now: ${Object.keys(spriteSheetsRef.current).length}`
        );
      }
      log("VIDEO_CANVAS", `Initialized spriteSheets: total count=${Object.keys(spriteSheetsRef.current).length}`);
    }, [spriteSheets]);

    /**************************************************************************
     * getSpriteSheet helper
     **************************************************************************/
    const getSpriteSheet = useCallback(
      (sheet_filename) => {
        if (spriteSheetsRef.current[sheet_filename]) {
          return spriteSheetsRef.current[sheet_filename];
        }
        const baseName =
          sheet_filename.substring(0, sheet_filename.lastIndexOf(".")) ||
          sheet_filename;
        const possibleExtensions = ["webp", "png"];

        for (let ext of possibleExtensions) {
          const newFilename = `${baseName}.${ext}`;
          if (spriteSheetsRef.current[newFilename]) {
            log(
              "VIDEO_CANVAS",
              `Found sprite sheet with alternative extension: ${newFilename}`
            );
            return spriteSheetsRef.current[newFilename];
          }
        }
        warn("VIDEO_CANVAS", `Sprite sheet not found for filename: ${sheet_filename}`);
        return null;
      },
      []
    );

    /**************************************************************************
     * processAnimationData
     **************************************************************************/
    const processAnimationData = useCallback(
      (dataArray, chunkIndex, uniqueSetId) => {
        log("DEBUG_LOG", `processAnimationData START => chunkIndex=${chunkIndex}, uniqueSetId=${uniqueSetId}`);
        if (!dataArray || !dataArray.length) {
          warn("VIDEO_CANVAS", "Empty or invalid animation data array. Aborting set.");
          isSetPlayingRef.current = false;
          return;
        }

        const gfi = globalFrameIndexRef.current;
        const fd = frameDirectionRef.current;
        log("DEBUG_LOG", `processAnimationData => current globalFrameIndex=${gfi}, frameDirection=${fd}, actualMode=${actualModeRef.current}`);

        const targetSet = dataArray[0];
        if (!targetSet) {
          warn("VIDEO_CANVAS", "targetSet (index=0) not found. Aborting.");
          isSetPlayingRef.current = false;
          return;
        }

        const { sections, mode, zone_top_left } = targetSet;
        if (!sections || !sections.length) {
          warn("VIDEO_CANVAS", "targetSet has no sections. Aborting.");
          isSetPlayingRef.current = false;
          return;
        }

        // Build overlay animations
        const newOverlays = sections
          .map((section, sIndex) => {
            if (!Array.isArray(section) || !section.length) return null;
            const frames = section.map((frameObj) => ({ // frameObj is an item from the backend's overlay_frames_list
              matched_sprite_frame_number: frameObj.matched_sprite_frame_number,
              matched_filename: frameObj.matched_filename,
              sheet_filename: frameObj.sheet_filename,
              coordinates: frameObj.coordinates,
              mode: frameObj.mode || mode,
              // MODIFIED: Ensure original_frame_index_in_section is stored for unique key generation later
              original_frame_index_in_section: frameObj.frame_index
            }));
            return {
              mode: frames[0].mode || mode,
              frames,
              sectionIndex: sIndex,
              sectionData: section, // Keep original section data if needed elsewhere, though 'frames' is primary now
              setIndex: 0, // Assuming only one set in dataArray[0] for this structure
              chunkIndex,
              zone_top_left,
              uniqueSetId,
            };
          })
          .filter(Boolean);

        setOverlayAnimations(newOverlays);
        overlayAnimationsRef.current = newOverlays;
        animationStatesRef.current = newOverlays.map(() => ({
        playing: false,
        currentDrawingFrame: 0,
        done: false,
        audioStarted: false,          // <-- NEW
        }));

        // Reset idle completion flag
        hasAnimationCompletedRef.current = false;

        log("DEBUG_LOG", `processAnimationData => Overlays set, overlayAnimationsRef length=${newOverlays.length}`);
      },
      []
    );

    /**************************************************************************
     * processNextAnimationSet
     **************************************************************************/
    const processNextAnimationSet = useCallback(() => {
      log("DEBUG_LOG", "processNextAnimationSet CALLED");
      if (!isAssetsLoaded) {
        log("DEBUG_LOG", "processNextAnimationSet => Aborting, assets not loaded");
        return;
      }
      if (isSetPlayingRef.current) {
        log("DEBUG_LOG", "processNextAnimationSet => Aborting, isSetPlayingRef is true");
        return;
      }
      if (!animationQueueRef.current.length) {
        log("DEBUG_LOG", "processNextAnimationSet => Aborting, queue is empty");
        return;
      }

      isSetPlayingRef.current = true;
      log("DEBUG_LOG", "processNextAnimationSet => isSetPlayingRef set to true");

      // Dequeue next animation set
      const nextSet = animationQueueRef.current.shift();
      if (!nextSet?.dataArray?.length) {
        warn("VIDEO_CANVAS", "Next animation set is invalid or empty. Skipping.");
        isSetPlayingRef.current = false;
        if (!animationQueueRef.current.length) {
          actualModeRef.current = "idle";
        }
        return;
      }

      log("DEBUG_LOG", `processNextAnimationSet => Dequeued item: chunkIndex=${nextSet.chunkIndex}, uniqueSetId=${nextSet.uniqueSetId}`);
      const { dataArray, chunkIndex, uniqueSetId } = nextSet;

      if (actualModeRef.current === "talking" && chunkIndex === 0) {
        log("DEBUG_LOG", "Fresh chunk detected in talking mode; jumping timeline to frame 0.");
        globalFrameIndexRef.current = 0;
      }

      processAnimationData(dataArray, chunkIndex, uniqueSetId);
    }, [isAssetsLoaded, processAnimationData]);

    /**************************************************************************
     * handleIncomingAnimationData
     **************************************************************************/
    const handleIncomingAnimationData = useCallback(
      (animationDataArray, chunkIndex, forcedSetId = null) => {
        log("DEBUG_LOG", `handleIncomingAnimationData START => chunkIndex=${chunkIndex}, set length=${animationDataArray?.length || 0}`);
        let uniqueSetId;
        if (typeof forcedSetId === "number") {
          uniqueSetId = forcedSetId;
        } else {
          uniqueSetId = globalSetIdRef.current++;
        }

        animationQueueRef.current.push({
          dataArray: animationDataArray,
          chunkIndex,
          uniqueSetId,
        });

        log(
          "DEBUG_LOG",
          `handleIncomingAnimationData => Added new animation set: chunkIndex=${chunkIndex}, uniqueSetId=${uniqueSetId}, queueSize=${animationQueueRef.current.length}`
        );
        log(
          "DEBUG_LOG",
          `handleIncomingAnimationData => isAssetsLoaded=${isAssetsLoaded}, isSetPlayingRef=${isSetPlayingRef.current}, actualModeRef=${actualModeRef.current}`
        );

        if (
          isAssetsLoaded &&
          !isSetPlayingRef.current &&
          actualModeRef.current === "idle"
        ) {
          log("DEBUG_LOG", "handleIncomingAnimationData => Idle state confirmed; calling processNextAnimationSet");
          processNextAnimationSet();
        } else {
          log("DEBUG_LOG", "handleIncomingAnimationData => NOT calling processNextAnimationSet");
        }
      },
      [isAssetsLoaded, processNextAnimationSet]
    );

    /**************************************************************************
     * getNearestTransitionPoint
     **************************************************************************/
    const getNearestTransitionPoint = useCallback((currentFrame) => {
      const dist1 = Math.abs(currentFrame - TRANSITION_1);
      const dist2 = Math.abs(currentFrame - TRANSITION_2);
      return dist1 <= dist2 ? TRANSITION_1 : TRANSITION_2;
    }, [TRANSITION_1, TRANSITION_2]); // Depends on agent-derived TRANSITION_1 and TRANSITION_2

    /**************************************************************************
     * Main Ping-Pong + Transition Logic
     **************************************************************************/
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        error("VIDEO_CANVAS", "Canvas element not found. Cannot animate.");
        return;
      }

      const ctx = canvas.getContext("2d");
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;

      const frameRate = 24; // FPS
      const frameDuration = 1000 / frameRate;
      let lastFrameTime = performance.now();
      let animationFrameId = null;

      log("VIDEO_CANVAS", "Starting draw loop immediately.");

      function drawLoop(currentTime) {
        const elapsed = currentTime - lastFrameTime;
        if (elapsed >= frameDuration) {
          lastFrameTime = currentTime - (elapsed % frameDuration);

          // 1) Clear the canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // 2) Choose the appropriate base frame array
          let framesArray = baseFramesImagesRef.current;
          if (
            actualModeRef.current === "talking" &&
            baseFramesTalkingRef.current.length > 0
          ) {
            framesArray = baseFramesTalkingRef.current;
          } else if (actualModeRef.current === "transition") {
            if (chosenTransitionModeRef.current === "transition1") {
              framesArray = baseFramesTalkingTransitionRef.current;
            } else if (chosenTransitionModeRef.current === "transition2") {
              framesArray = baseFramesTalkingTransition2Ref.current;
            } else {
              framesArray = baseFramesImagesRef.current;
            }
          }

          const framesCount = framesArray.length;
          const gfi = globalFrameIndexRef.current;
          const fd = frameDirectionRef.current;

          // 3) Draw the base frame
          const baseImage = framesArray[gfi];
          if (baseImage) {
            ctx.drawImage(
              baseImage,
              0,
              0,
              canvasSize.width,
              canvasSize.height
            );
          }
          
          // 4) Draw overlays
          const animList = overlayAnimationsRef.current;
          const states = animationStatesRef.current;
          
          // MODIFICATION: Initialize variables for overlay debug text
          let currentOverlayFilenameForDisplay = "";
          let currentOverlaySpriteFrameNumForDisplay = null;
          let currentOverlayOriginalFrameIndexForDisplay = null; // MODIFIED: Added for debug

          animList.forEach((anim, idx) => {
            const st = states[idx];
            if (!st.done) {
              const animMode = anim.mode.toLowerCase();
              const forwardMatch = fd === 1 && animMode === "forward";
              const reverseMatch = fd === -1 && animMode === "reverse";

              if (!st.playing) {
                const startFrame = anim.frames[0]?.matched_sprite_frame_number;
                if (gfi === startFrame && (forwardMatch || reverseMatch)) {
                  st.playing = true;
                  st.currentDrawingFrame = 0;
                  log(
                    "VIDEO_CANVAS",
                    `Overlay START => chunkIndex=${anim.chunkIndex}, sectionIndex=${anim.sectionIndex}`
                  );
                  log("DEBUG_LOG", `Overlay set st.playing=true, actualModeRef.current=talking`);
                  actualModeRef.current = "talking";

                  if (userInputActiveRef.current) {
                    userInputActiveRef.current = false;
                    log("USER_INPUT", "Exiting subrange mode because overlay started.");
                  }

                  
                }
              }

              if (st.playing) {
                const subIdx = st.currentDrawingFrame;
                if (anim.frames[subIdx]) {
                  let alpha = 1.0;
                  if (subIdx < FADE_IN_FRAMES) {
                    alpha = subIdx / FADE_IN_FRAMES;
                  }
                  const remain = anim.frames.length - subIdx - 1;
                  if (remain < FADE_OUT_FRAMES) {
                    alpha = Math.min(alpha, (remain + 1) / FADE_OUT_FRAMES);
                    alpha = Math.max(alpha, 0.1);
                  }
                  ctx.globalAlpha = alpha;
                
                  const {
                    sheet_filename,
                    coordinates,
                    matched_sprite_frame_number,
                    mode,
                    matched_filename,
                    original_frame_index_in_section // MODIFIED: Destructure to use in key
                  } = anim.frames[subIdx];
                  
                  // MODIFICATION: Set details for debug display
                  currentOverlayFilenameForDisplay = matched_filename || sheet_filename || "N/A";
                  currentOverlaySpriteFrameNumForDisplay = matched_sprite_frame_number;
                  currentOverlayOriginalFrameIndexForDisplay = original_frame_index_in_section; // MODIFIED: For debug


                  const [dx_sprite, dy_sprite] = anim.zone_top_left || [9999, 9999]; // Renamed to avoid conflict
                  // MODIFIED: Key for retrieving pre-loaded overlay image
                  const overlayKey = `${anim.chunkIndex}-${anim.sectionIndex}-${matched_sprite_frame_number}-${original_frame_index_in_section}`;
                  const overlayImg = overlayFrameImagesRef.current.get(overlayKey);

                  if (!DRAW_OVERLAY_SPRITE) {
                    if (overlayImg && overlayImg.complete) {
                      // Use agentDisplayConfig for drawing parameters
                      drawFeatheredSprite(ctx, overlayImg, 0, 0, agentDisplayConfig.width, agentDisplayConfig.height, agentDisplayConfig.posX, agentDisplayConfig.posY);
                    } else if (overlayImg && !overlayImg.complete) {
                      // warn("VIDEO_CANVAS", `Overlay image not yet complete for key: ${overlayKey}`);
                    } else if (!overlayImg) {
                      // warn("VIDEO_CANVAS", `Overlay image not found for key: ${overlayKey}`);
                    }
                  } else {
                    if (sheet_filename && coordinates?.length === 4) {
                      const [sx, sy, sw, sh] = coordinates;
                      const spriteSheet = getSpriteSheet(sheet_filename);
                      if (spriteSheet) {
                        // This call uses dx_sprite, dy_sprite from anim.zone_top_left, not agent config
                        drawFeatheredSprite(ctx, spriteSheet, sx, sy, sw, sh, dx_sprite, dy_sprite);
                      }
                    }
                  }
                  
                  log(
                    "VIDEO_CANVAS",
                    `Drawing Frame: matched_sprite_frame_number=${matched_sprite_frame_number}, mode=${mode}, globalFrameIndex=${globalFrameIndexRef.current}, direction=${fd === 1 ? "forward" : "reverse"}, overlayKey=${overlayKey}`
                  );
                  ctx.globalAlpha = 1.0;
          if (
          !st.audioStarted &&
          (
            // first audio chunk: wait until talking frame 
          (anim.chunkIndex === 0 && st.currentDrawingFrame === 3) ||
          // all later chunks: start immediately on their first frame
          (anim.chunkIndex !== 0 && st.currentDrawingFrame === 0)
        )
        ) {
        st.audioStarted = true;

        if (onAnimationChunkStart && anim.uniqueSetId !== undefined) {
          onAnimationChunkStart(anim.uniqueSetId, anim.chunkIndex);
        } else if (onAnimationChunkStart) {
          onAnimationChunkStart(anim.chunkIndex);
        }
        }

                  st.currentDrawingFrame++;
                  if (st.currentDrawingFrame >= anim.frames.length) {
                    st.playing = false;
                    st.done = true;
                    log(
                      "VIDEO_CANVAS",
                      `Overlay COMPLETE => chunkIndex=${anim.chunkIndex}, sectionIndex=${anim.sectionIndex}`
                    );
                  }
                }
              }
            }
          });

          // 5) Cleanup completed overlays
          const activeOverlays = [];
          const activeStates = [];
          for (let i = 0; i < overlayAnimationsRef.current.length; i++) {
            if (!animationStatesRef.current[i].done) {
              activeOverlays.push(overlayAnimationsRef.current[i]);
              activeStates.push(animationStatesRef.current[i]);
            }
          }
          if (activeOverlays.length !== overlayAnimationsRef.current.length) {
            setOverlayAnimations(activeOverlays);
            overlayAnimationsRef.current = activeOverlays;
            animationStatesRef.current = activeStates;
            log("DEBUG_LOG", `Overlay cleanup => new length=${activeOverlays.length}`);
          }

          if (!overlayAnimationsRef.current.length && isSetPlayingRef.current) {
            log("DEBUG_LOG", "All overlays done for current set => isSetPlayingRef set to false");
            isSetPlayingRef.current = false;

            if (animationQueueRef.current.length) {
              log("DEBUG_LOG", "drawLoop => still items in queue => calling processNextAnimationSet()");
              processNextAnimationSet();
            } else {
              shouldReturnToFrameRef.current = true;
              log("DEBUG_LOG", "drawLoop => queue empty => set shouldReturnToFrameRef=true");
            }
          }

          // --- MODIFIED SECTION FOR DEBUG TEXT ---
          // Check the DRAW_ON_CANVAS flag from logger.js
          if (DRAW_ON_CANVAS) { // <<< MODIFIED: Use the imported DRAW_ON_CANVAS
            // White debug text (original DRAW_ON_CANVAS content)
            if (userInputRef.current) {
              const infoText = "User Input Received";
              ctx.fillStyle = "yellow";
              ctx.font = "24px Arial";
              const txtWidth = ctx.measureText(infoText).width;
              ctx.fillText(infoText, (canvasSize.width - txtWidth) / 2, 50);
              userInputRef.current = false;
            }
            ctx.fillStyle = "white"; // Default for original debug
            ctx.font = "16px Arial";
            ctx.fillText(`Frame: ${gfi}/${framesCount > 0 ? framesCount -1 : 0}`, 10, 20);
            ctx.fillText(`Direction: ${fd === 1 ? "Forward" : "Backward"}`, 10, 40);
            ctx.fillText(`Mode: ${actualModeRef.current}`, 10, 60);

            // Red debug text (overlay details)
            // const currentGFI = globalFrameIndexRef.current; // Already available as gfi
            // const currentFD = frameDirectionRef.current; // Already available as fd
            // const currentMode = actualModeRef.current; // Already available
            // const directionText = fd === 1 ? "Forward" : "Backward"; // Already available

            let debugLines = [];
            // The white text above already shows GFI, Mode, Dir.
            // The red text will focus on overlay details if present.

            if (currentOverlayFilenameForDisplay && currentOverlayFilenameForDisplay !== "N/A") {
                debugLines.push(`Overlay: ${currentOverlayFilenameForDisplay}`);
                if (currentOverlaySpriteFrameNumForDisplay !== null) {
                    debugLines.push(`SpriteFrame (Base): ${currentOverlaySpriteFrameNumForDisplay}`);
                }
                if (currentOverlayOriginalFrameIndexForDisplay !== null) {
                    debugLines.push(`OverlayFrameIdx: ${currentOverlayOriginalFrameIndexForDisplay}`);
                }
            }

            if (debugLines.length > 0) {
                ctx.fillStyle = "red"; // Red for these additional details
                ctx.font = "14px Arial"; // Potentially different font for these
                ctx.textAlign = "left";

                let yPos = 80; // Start after the white debug text
                // The original yPos for red text was:
                // let yPos = DRAW_ON_CANVAS ? 80 : 20;
                // yPos += canvasSize.height * 0.30;
                // Since DRAW_ON_CANVAS is now the main condition, the '20' part is not reachable here.
                // We'll use 80 as a base and then add the percentage offset.
                yPos += canvasSize.height * 0.30;

                const lineHeight = 16;

                for (let i = 0; i < debugLines.length; i++) {
                    ctx.fillText(debugLines[i], 10, yPos + (i * lineHeight));
                }
            }
          }
          // --- END MODIFIED SECTION ---


          // 6) Ping-Pong or Transition Logic
          if (actualModeRef.current === "talking" && shouldReturnToFrameRef.current) {
            if (chosenTransitionRef.current === null) {
              const currentFrame = globalFrameIndexRef.current;
              const nearest = getNearestTransitionPoint(currentFrame);
              chosenTransitionRef.current = nearest;
              chosenTransitionModeRef.current =
                nearest === TRANSITION_1 ? "transition1" : "transition2";
              log("VIDEO_CANVAS", `Overlays done in 'talking' => chosen transition point is ${nearest}, mode=${chosenTransitionModeRef.current}`);
            }

            const chosen = chosenTransitionRef.current;
            if (globalFrameIndexRef.current > chosen) {
              globalFrameIndexRef.current--;
            } else if (globalFrameIndexRef.current < chosen) {
              globalFrameIndexRef.current++;
            } else {
              shouldReturnToFrameRef.current = false;
              log("DEBUG_LOG", `Reached chosen transition => now using transition frames: ${chosenTransitionModeRef.current}`);
              if (chosenTransitionModeRef.current === "transition1") {
                if (baseFramesTalkingTransitionRef.current.length > 0) {
                  actualModeRef.current = "transition";
                  globalFrameIndexRef.current = 0;
                  frameDirectionRef.current = 1;
                } else {
                  actualModeRef.current = "idle";
                  globalFrameIndexRef.current = 0;
                }
              } else { // transition2
                if (baseFramesTalkingTransition2Ref.current.length > 0) {
                  actualModeRef.current = "transition";
                  globalFrameIndexRef.current = 0;
                  frameDirectionRef.current = 1;
                } else {
                  actualModeRef.current = "idle";
                  globalFrameIndexRef.current = 0;
                }
              }
              if (animationQueueRef.current.length) {
                log("DEBUG_LOG", "Transition complete and queue not empty; calling processNextAnimationSet()");
                processNextAnimationSet();
              }
            }
          } else if (actualModeRef.current === "transition") {
            let tFrames = baseFramesTalkingTransitionRef.current;
            if (chosenTransitionModeRef.current === "transition2") {
              tFrames = baseFramesTalkingTransition2Ref.current;
            }
            const tCount = tFrames.length;
            if (globalFrameIndexRef.current < tCount - 1) {
              globalFrameIndexRef.current++;
            } else {
              log("VIDEO_CANVAS", "Transition complete => idle (frame 0).");
              actualModeRef.current = "idle";
              globalFrameIndexRef.current = 0;
              frameDirectionRef.current = 1;
              chosenTransitionRef.current = null;
              chosenTransitionModeRef.current = null;
              log("DEBUG_LOG", "Completed transition => actualMode=idle, chosenTransitionRef cleared");
              if (animationQueueRef.current.length) {
                log("DEBUG_LOG", "Queue not empty after transition; calling processNextAnimationSet()");
                processNextAnimationSet();
              }
            }
          } else if (actualModeRef.current === "idle") {
            let minFrame = 0;
            let maxFrame = framesCount > 0 ? framesCount - 1 : 0;

            let speed = 1;
            if (userInputActiveRef.current) {
              minFrame = userInputMinFrameRef.current;
              maxFrame = userInputMaxFrameRef.current;
              if (
                globalFrameIndexRef.current < minFrame ||
                globalFrameIndexRef.current > maxFrame
              ) {
                speed = 2;
                log("DEBUG_LOG", `IDLE & subrange => speed=2 because gfi is outside [${minFrame}, ${maxFrame}]`);
              }
            }
            
            if (framesCount > 0) { // Ensure there are frames to operate on
                if (globalFrameIndexRef.current < minFrame) {
                frameDirectionRef.current = 1;
                globalFrameIndexRef.current += frameDirectionRef.current * speed;
                if (globalFrameIndexRef.current > minFrame) {
                    globalFrameIndexRef.current = minFrame;
                }
                } else if (globalFrameIndexRef.current > maxFrame) {
                frameDirectionRef.current = -1;
                globalFrameIndexRef.current += frameDirectionRef.current * speed;
                if (globalFrameIndexRef.current < maxFrame) {
                    globalFrameIndexRef.current = maxFrame;
                }
                } else {
                  // NEW SIMPLIFIED PING-PONG LOGIC (for idle mode)
                  globalFrameIndexRef.current += frameDirectionRef.current * speed;

                  if (globalFrameIndexRef.current >= maxFrame) {
                      globalFrameIndexRef.current = maxFrame; // Clamp to max
                      frameDirectionRef.current = -1; // Immediately reverse for next frame
                      log("VIDEO_CANVAS", "Reached last idle frame, reversing.");
                  } else if (globalFrameIndexRef.current <= minFrame) {
                      globalFrameIndexRef.current = minFrame; // Clamp to min
                      frameDirectionRef.current = 1; // Immediately reverse for next frame
                      log("VIDEO_CANVAS", "Reached first idle frame, reversing.");
                  }
                }
            }


            if (
              animationQueueRef.current.length === 0 &&
              overlayAnimationsRef.current.length === 0 &&
              !hasAnimationCompletedRef.current &&
              typeof onAnimationComplete === "function"
            ) {
              hasAnimationCompletedRef.current = true;
              log("VIDEO_CANVAS", "Idle state with no pending animations; calling onAnimationComplete.");
              onAnimationComplete();
            }
          } else { // Talking mode (non-transition, non-idle)
            let minFrame = 0;
            let maxFrame = framesCount > 0 ? framesCount - 1 : 0;
            let speed = 1;

            if (framesCount > 0) { // Ensure there are frames to operate on
                if (globalFrameIndexRef.current < minFrame) {
                frameDirectionRef.current = 1;
                globalFrameIndexRef.current += frameDirectionRef.current * speed;
                } else if (globalFrameIndexRef.current > maxFrame) {
                frameDirectionRef.current = -1;
                globalFrameIndexRef.current += frameDirectionRef.current * speed;
                } else {
                  // NEW SIMPLIFIED PING-PONG LOGIC (for talking mode)
                  globalFrameIndexRef.current += frameDirectionRef.current * speed;

                  if (globalFrameIndexRef.current >= maxFrame) {
                      globalFrameIndexRef.current = maxFrame; // Clamp to max
                      frameDirectionRef.current = -1; // Immediately reverse for next frame
                  } else if (globalFrameIndexRef.current <= minFrame) {
                      globalFrameIndexRef.current = minFrame; // Clamp to min
                      frameDirectionRef.current = 1; // Immediately reverse for next frame
                  }
                }
            }
          }
          log("FRAME_LOG", `Frame: ${globalFrameIndexRef.current}, Direction: ${frameDirectionRef.current === 1 ? "Forward" : "Backward"}, Mode: ${actualModeRef.current}${actualModeRef.current === "transition" ? `, Transition Mode: ${chosenTransitionModeRef.current}` : ""}`);
        }

        animationFrameId = requestAnimationFrame(drawLoop);
      }

      animationFrameId = requestAnimationFrame(drawLoop);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          log("VIDEO_CANVAS", "Draw loop canceled on cleanup.");
        }
      };
    }, [
      canvasSize,
      onAnimationChunkStart,
      processNextAnimationSet,
      getNearestTransitionPoint,
      onAnimationComplete,
      agentDisplayConfig, // Add agentDisplayConfig as it's used in drawLoop
      TRANSITION_1,      // Add TRANSITION_1 as it's used in drawLoop logic
      TRANSITION_2,      // Add TRANSITION_2 as it's used in drawLoop logic
      // DRAW_ON_CANVAS is a module-level constant, so it doesn't need to be in dependencies
    ]);

    /**************************************************************************
     * If assets just loaded, attempt next set if idle
     **************************************************************************/
    useEffect(() => {
      if (isAssetsLoaded && !isSetPlayingRef.current) {
        log("DEBUG_LOG", "isAssetsLoaded just changed to true, calling processNextAnimationSet if idle...");
        processNextAnimationSet();
      }
    }, [isAssetsLoaded, processNextAnimationSet]);

    /**************************************************************************
     * Cleanup on unmount
     **************************************************************************/
    useEffect(() => {
      return () => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
          log("VIDEO_CANVAS", "Canvas cleared on unmount.");
        }
      };
    }, []);

    /**************************************************************************
     * Expose methods to parent
     **************************************************************************/
    useImperativeHandle(ref, () => ({
      handleIncomingAnimationData(animationDataArray, chunkIndex, forcedSetId) {
        handleIncomingAnimationData(animationDataArray, chunkIndex, forcedSetId);
      },
    
      setBaseFrames(newFrames) {
        if (newFrames && newFrames.length) {
          baseFramesImagesRef.current = newFrames;
          log("VIDEO_CANVAS", `setBaseFrames => ${newFrames.length} frames`);
        }
      },
    
      setSpriteSheets(newSpriteSheets) {
        if (newSpriteSheets && newSpriteSheets.length) {
          newSpriteSheets.forEach(({ img, filename }) => {
            spriteSheetsRef.current[filename] = img;
            log("VIDEO_CANVAS", `setSpriteSheets => ${filename}`);
          });
          log("VIDEO_CANVAS", `setSpriteSheets => total now: ${Object.keys(spriteSheetsRef.current).length}`);
        }
      },
    
      setUserInputSentToBackend() {
        userInputRef.current = true;
        userInputActiveRef.current = true;
        log("USER_INPUT", `[VideoCanvas] setUserInputSentToBackend => userInputActiveRef=true, globalFrameIndex=${globalFrameIndexRef.current}, actualMode=${actualModeRef.current}`);
      },
    
      handleIncomingFrameImage(frameData, chunkIndex) {
        // MODIFIED: Destructure frame_index from frameData
        const { section_index, matched_sprite_frame_number, image_data, frame_index } = frameData;
        if (
          typeof section_index === "undefined" ||
          typeof matched_sprite_frame_number === "undefined" ||
          typeof frame_index === "undefined" || // MODIFIED: Add check for frame_index
          !image_data
        ) {
          warn("VIDEO_CANVAS", "Incomplete frameData received in handleIncomingFrameImage (missing section_index, matched_sprite_frame_number, or frame_index)", frameData);
          return;
        }
        // MODIFIED: Key uses chunkIndex, section_index, matched_sprite_frame_number, AND frame_index for uniqueness
        const key = `${chunkIndex}-${section_index}-${matched_sprite_frame_number}-${frame_index}`;
        let imageSrc;
        if (image_data.startsWith("data:image/")) {
          imageSrc = image_data;
        } else {
          imageSrc = `data:image/jpeg;base64,${image_data}`;
        }
        const img = new Image();
        img.src = imageSrc;
        // img.onload = () => { // Optional: log when image is actually loaded if needed for debugging
        //   log("VIDEO_CANVAS", `Overlay frame image loaded for key: ${key}`);
        // };
        // img.onerror = () => {
        //   warn("VIDEO_CANVAS", `Error loading overlay frame image for key: ${key}`);
        // };
        overlayFrameImagesRef.current.set(key, img);
        log("VIDEO_CANVAS", `Stored overlay frame image for key: ${key}`);
      },
    }));
    

    return (
      <div className="video-canvas-container">
        <canvas ref={canvasRef} className="video-canvas" />
      </div>
    );
  }
);

VideoCanvas.propTypes = {
  agentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  currentAgent: PropTypes.shape({ // Added currentAgent prop type
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    POS_X: PropTypes.number,
    POS_Y: PropTypes.number,
    WIDTH: PropTypes.number,
    HEIGHT: PropTypes.number,
    tr_1_frame: PropTypes.number,
    tr_2_frame: PropTypes.number,
    // You can add other fields from currentAgent if they are used or need documentation
  }),
  baseFrames: PropTypes.arrayOf(PropTypes.instanceOf(Image)),
  baseFramesTalking: PropTypes.arrayOf(PropTypes.instanceOf(Image)),
  baseFramesTalkingTransition: PropTypes.arrayOf(PropTypes.instanceOf(Image)),
  baseFramesTalkingTransition2: PropTypes.arrayOf(PropTypes.instanceOf(Image)),
  spriteSheets: PropTypes.arrayOf(
    PropTypes.shape({
      img: PropTypes.instanceOf(Image).isRequired,
      filename: PropTypes.string.isRequired,
    })
  ),
  voiceDataAndAudioFile: PropTypes.any,
  onAnimationChunkStart: PropTypes.func,
  onAnimationComplete: PropTypes.func,
  loggingEnabled: PropTypes.bool,
  isAssetsLoaded: PropTypes.bool,
  userResolution: PropTypes.string,
};

VideoCanvas.defaultProps = {
  currentAgent: null, // Default for currentAgent
  baseFrames: [],
  baseFramesTalking: [],
  baseFramesTalkingTransition: [],
  baseFramesTalkingTransition2: [],
  spriteSheets: [],
  voiceDataAndAudioFile: null,
  onAnimationChunkStart: null,
  onAnimationComplete: null,
  loggingEnabled: false, // Default for your existing prop
  isAssetsLoaded: false,
};

export default React.memo(VideoCanvas);