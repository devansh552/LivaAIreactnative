// LoadingBar.js
import { Animated, StyleSheet, View } from 'react-native';

const LoadingBar = ({ progress, total, apiCallsCompleted }) => {
  // Only render the loading bar if there’s work to do.
  if (total <= 0) return null;
  if (apiCallsCompleted && progress >= total) return null;
  const widthPercent = (progress / total) * 100;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.bar}>
        <Animated.View
          style={[
            styles.progress,
            { width: `${widthPercent}%` }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 10,
    zIndex: 1000,
    width: '100%',
  },
  bar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ccc',
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#00ff00',
    width: '0%',
  },
});




export default LoadingBar;
