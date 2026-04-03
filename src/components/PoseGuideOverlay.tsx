import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface Props {
  lightingOk?: boolean;
}

export default function PoseGuideOverlay({ lightingOk = true }: Props) {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Human silhouette guide — simple geometric outline */}
      <View style={styles.silhouette}>
        {/* Head */}
        <View style={styles.head} />
        {/* Shoulders */}
        <View style={styles.shoulders} />
        {/* Torso */}
        <View style={styles.torso} />
        {/* Arms */}
        <View style={styles.armLeft} />
        <View style={styles.armRight} />
        {/* Legs */}
        <View style={styles.legLeft} />
        <View style={styles.legRight} />
      </View>

      {/* Guide text */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>Stand 6–8 ft away</Text>
        <Text style={styles.instructionText}>Arms slightly out · Full body visible</Text>
      </View>

      {/* Lighting indicator */}
      <View style={styles.lightingBadge}>
        <View style={[styles.lightingDot, { backgroundColor: lightingOk ? '#4CAF50' : '#FF9800' }]} />
        <Text style={styles.lightingText}>{lightingOk ? 'Good lighting' : 'Improve lighting'}</Text>
      </View>
    </View>
  );
}

const OUTLINE = 'rgba(255,255,255,0.35)';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouette: {
    width: 160,
    height: 420,
    position: 'relative',
    alignItems: 'center',
  },
  head: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: OUTLINE,
    position: 'absolute',
    top: 0,
  },
  shoulders: {
    width: 130,
    height: 20,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 2,
    borderColor: OUTLINE,
    borderBottomWidth: 0,
    position: 'absolute',
    top: 60,
  },
  torso: {
    width: 100,
    height: 120,
    borderWidth: 2,
    borderColor: OUTLINE,
    borderTopWidth: 0,
    position: 'absolute',
    top: 78,
  },
  armLeft: {
    width: 20,
    height: 110,
    borderWidth: 2,
    borderColor: OUTLINE,
    borderRadius: 10,
    position: 'absolute',
    top: 68,
    left: 8,
  },
  armRight: {
    width: 20,
    height: 110,
    borderWidth: 2,
    borderColor: OUTLINE,
    borderRadius: 10,
    position: 'absolute',
    top: 68,
    right: 8,
  },
  legLeft: {
    width: 42,
    height: 160,
    borderWidth: 2,
    borderColor: OUTLINE,
    borderRadius: 10,
    position: 'absolute',
    top: 200,
    left: 30,
  },
  legRight: {
    width: 42,
    height: 160,
    borderWidth: 2,
    borderColor: OUTLINE,
    borderRadius: 10,
    position: 'absolute',
    top: 200,
    right: 30,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
    gap: 4,
  },
  instructionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  lightingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  lightingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lightingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
