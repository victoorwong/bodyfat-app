import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
  route: RouteProp<RootStackParamList, 'Camera'>;
};

const FRONT_TIPS = [
  'Stand 6–8 ft from camera',
  'Full body visible head to toe',
  'Arms slightly away from body',
  'Even lighting, no harsh shadows',
];

const BACK_TIPS = [
  'Same distance as front photo',
  'Full body visible from behind',
  'Arms slightly away from body',
  'Same lighting conditions',
];

export default function CameraScreen({ navigation, route }: Props) {
  const { step } = route.params;
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isTaking, setIsTaking] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [showGuide, setShowGuide] = useState(true);
  const { setFrontPhoto, setBackPhoto } = useAssessmentStore();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  if (!permission) return <View style={s.container} />;

  if (!permission.granted) {
    return (
      <View style={s.permissionContainer}>
        <Text style={s.permissionText}>Camera access is required to take photos.</Text>
        <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
          <Text style={s.permissionBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePhoto = (uri: string) => {
    if (step === 'front') setFrontPhoto(uri);
    else setBackPhoto(uri);
    navigation.navigate('Review', { photoUri: uri, step });
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isTaking) return;
    setIsTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) handlePhoto(photo.uri);
    } catch {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsTaking(false);
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery access is needed to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      handlePhoto(result.assets[0].uri);
    }
  };

  const isFront = step === 'front';
  const tips = isFront ? FRONT_TIPS : BACK_TIPS;

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* Photo guide overlay */}
      {showGuide && (
        <View style={StyleSheet.absoluteFill}>
          <View style={s.guideOverlay}>
            <View style={[s.guideCard, { marginTop: insets.top + 70 }]}>
              <Text style={s.guideTitle}>
                {isFront ? 'Front Photo Tips' : 'Back Photo Tips'}
              </Text>
              {tips.map((tip, i) => (
                <View key={i} style={s.guideTipRow}>
                  <View style={s.guideTipDot} />
                  <Text style={s.guideTipText}>{tip}</Text>
                </View>
              ))}
              <TouchableOpacity style={s.guideReadyBtn} onPress={() => setShowGuide(false)}>
                <Text style={s.guideReadyBtnText}>I'm Ready</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Step indicator */}
      {!showGuide && (
        <View style={[s.stepBanner, { top: insets.top + 60 }]}>
          <View style={s.stepPill}>
            <View style={[s.stepDot, isFront ? s.stepDotActive : s.stepDotDone]} />
            <View style={s.stepLine} />
            <View style={[s.stepDot, !isFront ? s.stepDotActive : s.stepDotInactive]} />
          </View>
          <Text style={s.stepLabel}>
            {isFront ? 'Step 1 of 2 — Front photo' : 'Step 2 of 2 — Back photo'}
          </Text>
          <Text style={s.stepHint}>
            {isFront
              ? 'Stand facing the camera, full body visible'
              : 'Turn around, full body visible from behind'}
          </Text>
        </View>
      )}

      {/* Top bar */}
      <View style={[s.topBar, { top: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Text style={s.iconBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={s.topBarRight}>
          {!showGuide && (
            <TouchableOpacity onPress={() => setShowGuide(true)} style={s.iconBtn}>
              <Text style={s.iconBtnText}>?</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} style={s.iconBtn}>
            <Text style={s.iconBtnText}>⟳</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom controls */}
      {!showGuide && (
        <View style={[s.bottomBar, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity onPress={handlePickFromGallery} style={s.galleryBtn}>
            <Text style={s.galleryBtnText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCapture}
            style={[s.captureBtn, isTaking && s.captureBtnDisabled]}
            disabled={isTaking}
          >
            <View style={s.captureInner} />
          </TouchableOpacity>

          <View style={s.galleryBtn} />
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionText: { color: theme.textSecondary, fontSize: 16, textAlign: 'center' },
  permissionBtn: {
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  permissionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  backBtn: { marginTop: 8 },
  backBtnText: { color: theme.textSecondary, fontSize: 15 },

  guideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  guideCard: {
    backgroundColor: 'rgba(30,30,30,0.97)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  guideTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 18,
    textAlign: 'center',
  },
  guideTipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  guideTipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.accent, flexShrink: 0 },
  guideTipText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, flex: 1, lineHeight: 20 },
  guideReadyBtn: {
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  guideReadyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { color: '#fff', fontSize: 18 },
  stepBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 8,
  },
  stepPill: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepDotActive: { backgroundColor: theme.accent },
  stepDotDone: { backgroundColor: '#4ADE80' },
  stepDotInactive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  stepLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },
  stepHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
  galleryBtn: {
    width: 72,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  galleryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
});
