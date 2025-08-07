// VideoCanvas.js
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
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
import { Dimensions, StyleSheet, View } from "react-native";
import * as THREE from "three";

const VideoCanvas = forwardRef(
  (
    {
      agentId,
      currentAgent,
      baseFrames,
      baseFramesTalking,
      baseFramesTalkingTransition,
      baseFramesTalkingTransition2,
      spriteSheets,
      voiceDataAndAudioFile,
      onAnimationChunkStart,
      onAnimationComplete,
      loggingEnabled,
      isAssetsLoaded,
      userResolution,
    },
    ref
  ) => {
    // Canvas size
    const canvasSize = useMemo(
      () => ({
        width: Number(userResolution) || Dimensions.get("window").width,
        height: Number(userResolution) || Dimensions.get("window").width,
      }),
      [userResolution]
    );

    // Animation state
    const [frameIndex, setFrameIndex] = useState(0);
    const texturesRef = useRef([]);
    const overlayTexturesRef = useRef([]);

    // Load baseFrames as textures
    useEffect(() => {
      let isMounted = true;
      async function loadTextures() {
        if (!baseFrames || baseFrames.length === 0) return;
        const loaded = [];
        for (let i = 0; i < baseFrames.length; i++) {
          let asset = baseFrames[i];
          if (typeof asset === "string") {
            loaded.push(await new Promise((resolve) => {
              new THREE.TextureLoader().load(asset, resolve);
            }));
          } else if (asset?.localUri || asset?.uri) {
            loaded.push(await new Promise((resolve) => {
              new THREE.TextureLoader().load(asset.localUri || asset.uri, resolve);
            }));
          }
        }
        if (isMounted) texturesRef.current = loaded;
      }
      loadTextures();
      return () => { isMounted = false; };
    }, [baseFrames]);

    // TODO: Load overlay textures similarly and store in overlayTexturesRef

    // Animation loop for frame index
    useEffect(() => {
      let animation;
      function loop() {
        setFrameIndex((prev) => (texturesRef.current.length > 0 ? (prev + 1) % texturesRef.current.length : 0));
        animation = requestAnimationFrame(loop);
      }
      if (texturesRef.current.length > 0) {
        animation = requestAnimationFrame(loop);
      }
      return () => animation && cancelAnimationFrame(animation);
    }, [baseFrames]);

    // Main GLView drawing logic
    const onContextCreate = useCallback(async (gl) => {
      const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(
        width / -2, width / 2, height / 2, height / -2, 1, 1000
      );
      camera.position.z = 2;

      // Plane geometry for sprite
      const geometry = new THREE.PlaneGeometry(width, height);

      // Create a mesh with a placeholder texture
      let mesh;
      if (texturesRef.current.length > 0) {
        mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({ map: texturesRef.current[frameIndex] })
        );
      } else {
        mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
      }
      scene.add(mesh);

      // TODO: Add overlay meshes for overlays, set their opacity/material as needed

      // Animation loop
      function render() {
        // Update mesh texture if frameIndex changes
        if (texturesRef.current.length > 0) {
          mesh.material.map = texturesRef.current[frameIndex];
          mesh.material.needsUpdate = true;
        }
        // TODO: Update overlay meshes as needed

        renderer.render(scene, camera);
        gl.endFrameEXP();
        requestAnimationFrame(render);
      }
      render();
    }, [frameIndex]);

    // Expose methods to parent (stubbed for now)
    useImperativeHandle(ref, () => ({
      // Implement as needed
    }));

    return (
      <View style={[styles.container, { width: canvasSize.width, height: canvasSize.height }]}>
        <GLView
          style={{ flex: 1, width: "100%", height: "100%" }}
          onContextCreate={onContextCreate}
        />
        {/* For debug text, you can overlay a <Text> component here */}
        {/* <Text style={styles.debugText}>Frame: {frameIndex}</Text> */}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#191a1b",
    alignItems: "center",
    justifyContent: "center",
  },
  debugText: {
    position: "absolute",
    top: 10,
    left: 10,
    color: "white",
    fontSize: 16,
    zIndex: 10,
  },
});

VideoCanvas.propTypes = {
  agentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  currentAgent: PropTypes.object,
  baseFrames: PropTypes.arrayOf(PropTypes.any),
  baseFramesTalking: PropTypes.arrayOf(PropTypes.any),
  baseFramesTalkingTransition: PropTypes.arrayOf(PropTypes.any),
  baseFramesTalkingTransition2: PropTypes.arrayOf(PropTypes.any),
  spriteSheets: PropTypes.arrayOf(
    PropTypes.shape({
      img: PropTypes.any.isRequired,
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
  currentAgent: null,
  baseFrames: [],
  baseFramesTalking: [],
  baseFramesTalkingTransition: [],
  baseFramesTalkingTransition2: [],
  spriteSheets: [],
  voiceDataAndAudioFile: null,
  onAnimationChunkStart: null,
  onAnimationComplete: null,
  loggingEnabled: false,
  isAssetsLoaded: false,
};

export default React.memo(VideoCanvas);