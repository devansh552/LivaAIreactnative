import { useCallback, useEffect, useState } from 'react';
import { error, warn } from '../utils/logger';
// filepath: /Users/cccm1/AnnaOSMobile/app/(tabs)/AgentChat.js
// Defines the exact order in which animations will be requested and loaded.
const ANIMATION_LOAD_ORDER = ['Idle_1', 'Talking_1', 'TR_1', 'TR_2'];
const IDLE_ANIMATION = 'Idle_1';

/**
 * Custom hook to load all base video frames via WebSocket streaming.
 *
 * This version is specifically designed to work with the existing VideoCanvas.js component
 * without requiring any modifications to it.
 *
 * HOW IT WORKS:
 * 1. It prioritizes loading the 'Idle_1' animation.
 * 2. The user-facing `loadingPercentage` is tied ONLY to the progress of 'Idle_1'.
 * 3. As soon as 'Idle_1' is fully loaded, it sets `isAssetsLoaded` to `true`. This is the
 * critical step that "unlocks" VideoCanvas.js, allowing it to start playing animations.
 * 4. It then continues to load the remaining animations ('Talking_1', etc.) sequentially
 * in the background, populating their respective frame arrays.
 */
export default function useVideoCanvasSpriteLoader({
    socketRef,
    currentAgent,
    userId,
    socketConnected,
    instanceId,
}) {
    // -------------------------------------------------------------------------
    // State & Refs
    // -------------------------------------------------------------------------

    // State for the UI loading bar (0-100), based ONLY on idle animation progress.
    const [initialLoadProgress, setInitialLoadProgress] = useState({ loaded: 0, total: 1 });

    // The critical flag that VideoCanvas.js uses to start animations.
    // We will set this to `true` as soon as the idle animation is ready.
    const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);

    // Manages the sequential loading queue.
    const [currentlyLoadingType, setCurrentlyLoadingType] = useState(null);

    // Store base64 image data URIs
    const [baseFrames, setBaseFrames] = useState([]);
    const [baseFramesTalking, setBaseFramesTalking] = useState([]);
    const [baseFramesTalkingTransition, setBaseFramesTalkingTransition] = useState([]);
    const [baseFramesTalkingTransition2, setBaseFramesTalkingTransition2] = useState([]);

    // -------------------------------------------------------------------------
    // Agent Change Cleanup Effect
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!currentAgent) return;
        warn("SPRITE_LOADER", `Agent changed to ${currentAgent?.id}. Clearing all assets.`);

        // Reset all state for the new agent
        setBaseFrames([]);
        setBaseFramesTalking([]);
        setBaseFramesTalkingTransition([]);
        setBaseFramesTalkingTransition2([]);
        setInitialLoadProgress({ loaded: 0, total: 1 });
        setIsAssetsLoaded(false);
        setCurrentlyLoadingType(null);

    }, [currentAgent]);

    // -------------------------------------------------------------------------
    // Memoized WebSocket Event Handlers
    // -------------------------------------------------------------------------

    const handleAnimationTotalFrames = useCallback((data) => {
        const { animation_type, total_frames } = data;
        warn("SPRITE_LOADER", `Server reported ${total_frames} frames for '${animation_type}'.`);

        // If this is our primary idle animation, update the state for the loading bar.
        if (animation_type === IDLE_ANIMATION) {
            setInitialLoadProgress(prev => ({ ...prev, total: total_frames > 0 ? total_frames : 1 }));
        }
    }, []);

    const handleReceiveBaseFrame = useCallback((data) => {
        const stateSetters = {
            'Idle_1': (imgUri) => setBaseFrames(prev => [...prev, imgUri]),
            'Talking_1': (imgUri) => setBaseFramesTalking(prev => [...prev, imgUri]),
            'TR_1': (imgUri) => setBaseFramesTalkingTransition(prev => [...prev, imgUri]),
            'TR_2': (imgUri) => setBaseFramesTalkingTransition2(prev => [...prev, imgUri]),
        };

        const { animation_type, frame_data } = data;
        const setter = stateSetters[animation_type];
        if (!setter) {
            error("SPRITE_LOADER", `Received frame for unknown type: ${animation_type}`);
            return;
        }

        // Use base64 data URI for React Native <Image>
        const imgUri = `data:${frame_data.mime_type};base64,${frame_data.data}`;
        setter(imgUri);
        // If this is a frame for our primary idle animation, update the loading bar progress.
        if (animation_type === IDLE_ANIMATION) {
            setInitialLoadProgress(prev => ({ ...prev, loaded: prev.loaded + 1 }));
        }
    }, []);

    const handleAnimationFramesComplete = useCallback((data) => {
        const { animation_type } = data;
        warn("SPRITE_LOADER", `COMPLETED streaming for '${animation_type}'.`);

        // *** THIS IS THE MOST IMPORTANT STEP ***
        // If the idle animation has just finished, we set isAssetsLoaded to true.
        // This is the signal your existing VideoCanvas.js needs to start working.
        if (animation_type === IDLE_ANIMATION) {
            warn("SPRITE_LOADER", `Primary animation '${IDLE_ANIMATION}' is complete. Unlocking VideoCanvas by setting isAssetsLoaded=true.`);
            setIsAssetsLoaded(true);
        }

        // --- Advance the Loading Queue to the next animation ---
        const completedIndex = ANIMATION_LOAD_ORDER.indexOf(animation_type);
        const isLastInQueue = completedIndex === ANIMATION_LOAD_ORDER.length - 1;

        if (completedIndex > -1 && !isLastInQueue) {
            const nextTypeToLoad = ANIMATION_LOAD_ORDER[completedIndex + 1];
            warn("SPRITE_LOADER", `QUEUE: Advancing to background load '${nextTypeToLoad}'.`);
            setCurrentlyLoadingType(nextTypeToLoad);
        } else {
            warn("SPRITE_LOADER", `QUEUE: All background animations have been loaded.`);
            setCurrentlyLoadingType(null); // All done.
        }
    }, []);

    // -------------------------------------------------------------------------
    // Effects to Manage the Loading Lifecycle
    // -------------------------------------------------------------------------

    // This effect attaches listeners and starts the very first step of the loading queue.
    useEffect(() => {
        const canStartLoading = currentAgent?.id && userId && socketRef?.current && socketConnected && instanceId;
        if (!canStartLoading) return;

        const socket = socketRef.current;
        warn("SPRITE_LOADER", "Attaching WebSocket listeners.");
        socket.on('animation_total_frames', handleAnimationTotalFrames);
        socket.on('receive_base_frame', handleReceiveBaseFrame);
        socket.on('animation_frames_complete', handleAnimationFramesComplete);

        // If nothing is loading, kick off the sequence by starting with the first animation.
        if (!currentlyLoadingType) {
            const firstAnimation = ANIMATION_LOAD_ORDER[0];
            warn("SPRITE_LOADER", `Starting sequential load. First up: '${firstAnimation}'.`);
            setCurrentlyLoadingType(firstAnimation);
        }

        return () => {
            warn("SPRITE_LOADER", "Cleaning up WebSocket listeners.");
            socket.off('animation_total_frames', handleAnimationTotalFrames);
            socket.off('receive_base_frame', handleReceiveBaseFrame);
            socket.off('animation_frames_complete', handleAnimationFramesComplete);
        };
    }, [currentAgent, userId, socketConnected, instanceId, socketRef, handleAnimationTotalFrames, handleReceiveBaseFrame, handleAnimationFramesComplete]);

    // This effect is responsible for sending the request for the *current* animation in the queue.
    // It runs whenever `currentlyLoadingType` changes.
    useEffect(() => {
        const shouldRequest = socketRef?.current && socketConnected && currentAgent?.id && currentlyLoadingType;
        if (!shouldRequest) return;

        warn("SPRITE_LOADER", `REQUESTING: Emitting 'request_specific_base_animation' for Type=${currentlyLoadingType}.`);
        socketRef.current.emit('request_specific_base_animation', {
            agentId: currentAgent.id,
            animationType: currentlyLoadingType
        });
    }, [currentlyLoadingType, socketRef, socketConnected, currentAgent?.id]);

    // -------------------------------------------------------------------------
    // Calculate final return values
    // -------------------------------------------------------------------------
    const loadingPercentage = Math.min(Math.round((initialLoadProgress.loaded / initialLoadProgress.total) * 100), 100);

    return {
        // --- Values for VideoCanvas.js ---
        isAssetsLoaded, // Set to true after Idle animation is done, unlocking the component.
        loadingPercentage, // A 0-100 value based only on Idle animation progress.

        // --- Frame Data ---
        baseFrames,
        baseFramesTalking,
        baseFramesTalkingTransition,
        baseFramesTalkingTransition2,
        
        // --- Unused by VideoCanvas.js but useful for debugging ---
        spriteSheets: [], 
        spritesLoadingProgress: initialLoadProgress.loaded, // Kept for potential debug use
        totalSpritesToLoad: initialLoadProgress.total,     // Kept for potential debug use
    };
}