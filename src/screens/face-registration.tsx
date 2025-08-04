// FaceRegistrationScreen.tsx
import * as tf from '@tensorflow/tfjs';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Camera as VisionCamera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Camera, Face, FaceDetectionOptions } from 'react-native-vision-camera-face-detector';
import { faceDetectionService } from '../services/faceDetectionService';
import { faceRecognitionService } from '../services/faceRecognitionService';
import { faceStorage } from '../services/faceStorage';
import { photoProcessingService } from '../services/photoProcessingService';
import { performanceMonitor } from '../utils/PerformanceMonitor';

interface FaceRegistrationScreenProps {
  onBack: () => void;
}

export default function FaceRegistrationScreen({ onBack }: FaceRegistrationScreenProps) {
  const cameraRef = useRef<VisionCamera>(null);

  const { hasPermission } = useCameraPermission();
  const { width, height } = useWindowDimensions();
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [userName, setUserName] = useState('');
  const [faceStatus, setFaceStatus] = useState<{ yaw: string; pitch: string; eye: string } | null>(null);
  const [isReadyToCapture, setIsReadyToCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<{ path: string; base64?: string } | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'selection' | 'camera' | 'photo-review'>('selection');
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [currentFaceBounds, setCurrentFaceBounds] = useState<any>(null);
  const device = useCameraDevice('front');

  useEffect(() => {
    (async () => {
      const status = await VisionCamera.requestCameraPermission();
      console.log(`Camera permission: ${status}`);

      console.log('tf ready', await tf.ready());

      // Pre-load ArcFace ONNX model using the centralized service
      if (!faceRecognitionService.isModelLoaded()) {
        console.log('Loading ArcFace ONNX model for registration...');
        const model = await faceRecognitionService.loadModel();
        if (model) {
          console.log('ArcFace ONNX model loaded and cached successfully');
        } else {
          console.error('Failed to load ArcFace ONNX model');
        }
      }

      // Pre-load RFB face detection model for gallery photos
      if (!faceDetectionService.isModelLoaded()) {
        console.log('Loading RFB face detection model for registration...');
        const detectionModel = await faceDetectionService.loadModel();
        if (detectionModel) {
          console.log('RFB face detection model loaded and cached successfully');
        } else {
          console.error('Failed to load RFB face detection model');
        }
      }
    })();
  }, [device]);

  const aFaceW = useSharedValue(0);
  const aFaceH = useSharedValue(0);
  const aFaceX = useSharedValue(0);
  const aFaceY = useSharedValue(0);

  const drawFaceBounds = (face?: Face) => {
    if (face) {
      const { width, height, x, y } = face.bounds;
      aFaceW.value = width;
      aFaceH.value = height;
      aFaceX.value = x;
      aFaceY.value = y;
    } else {
      aFaceW.value = aFaceH.value = aFaceX.value = aFaceY.value = 0;
    }
  };

  const faceBoxStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    borderWidth: 4,
    borderLeftColor: isReadyToCapture ? 'rgb(0,255,0)' : 'rgb(255,165,0)',
    borderRightColor: isReadyToCapture ? 'rgb(0,255,0)' : 'rgb(255,165,0)',
    borderBottomColor: isReadyToCapture ? 'rgb(0,255,0)' : 'rgb(255,165,0)',
    borderTopColor: isReadyToCapture ? 'rgb(0,255,0)' : 'rgb(255,165,0)',
    width: withTiming(aFaceW.value, { duration: 100 }),
    height: withTiming(aFaceH.value, { duration: 100 }),
    left: withTiming(aFaceX.value, { duration: 100 }),
    top: withTiming(aFaceY.value, { duration: 100 }),
  }));

  const faceDetectionOptions = useRef<FaceDetectionOptions>({
    performanceMode: 'accurate',
    landmarkMode: 'all',
    contourMode: 'none',
    classificationMode: 'all',
    trackingEnabled: false,
    windowWidth: width,
    windowHeight: height,
    autoScale: true,
  }).current;

  async function registerFace(base64: string) {
    try {
      setRegistering(true);
      console.log('Registering face with ArcFace model...');

      // Start timing for face registration
      performanceMonitor.startTimer('face-registration');

      // Generate normalized face embedding using the centralized service
      const embedding = await faceRecognitionService.generateFaceEmbedding(base64, { normalize: true });

      if (!embedding) {
        console.error('Failed to generate face embedding');
        Alert.alert('Error', 'Failed to process face. Please try again.');
        setRegistering(false);
        return;
      }

      // Save face data to local storage
      try {
        const faceData = {
          id: faceStorage.generateFaceId(),
          name: userName,
          embedding: embedding,
          photoPath: capturedPhoto?.path,
          timestamp: Date.now(),
        };

        await faceStorage.saveRegisteredFace(faceData);
        console.log(`Face registered and saved successfully for user: ${userName}`);

        // End timing and log performance
        const registrationTime = performanceMonitor.endTimer('face-registration');
        console.log(`⏱️ Complete face registration took: ${registrationTime.toFixed(2)}ms`);

        setRegistered(true);
        setRegistering(false);

        Alert.alert(
          'Registration Successful!',
          `Face has been registered for ${userName} and saved locally. You can now use it for verification.`,
          [
            {
              text: 'Register Another',
              onPress: () => {
                setRegistered(false);
                setUserName('');
                setCapturedPhoto(null);
                setCurrentScreen('selection');
              },
            },
            {
              text: 'Done',
              onPress: onBack,
            },
          ]
        );
      } catch (storageError) {
        console.error('Error saving face data:', storageError);
        Alert.alert('Storage Error', 'Face was processed successfully but failed to save. Please try again.', [
          {
            text: 'Retry',
            onPress: () => {
              setRegistering(false);
            },
          },
        ]);
      }

      return embedding;
    } catch (error) {
      console.error('Error registering face:', error);
      Alert.alert('Error', 'Failed to register face. Please try again.');
      setRegistering(false);
    }
  }

  async function processCapturedPhoto(photo: any, bounds: any) {
    try {
      if (!photo) {
        return;
      }

      console.log('Processing captured photo:', photo.path);
      console.log('Photo dimensions:', photo.width, 'x', photo.height);
      console.log('Is mirrored:', photo.isMirrored);
      console.log('Received bounds:', bounds);

      // Use the photo processing service with the new 3-step approach
      const processedPhoto = await photoProcessingService.processFacePhoto(
        photo.path,
        { width: photo.width, height: photo.height },
        {
          bounds,
          previewDimensions: { width, height },
          isMirrored: photo.isMirrored,
          finalSize: 112,
        }
      );

      console.log('Photo processed successfully using service');

      // Store the photo and base64 for later registration
      setCapturedPhoto({
        path: photo.path,
        base64: processedPhoto.base64,
      });
      setCurrentScreen('photo-review'); // Move to photo review screen
    } catch (err) {
      console.error('Error processing captured photo:', err);
      Alert.alert('Error', 'Failed to process photo. Please try again.');
    }
  }

  async function completeRegistration() {
    if (!capturedPhoto?.base64 || !userName.trim()) {
      Alert.alert('Error', 'Photo or name is missing');
      return;
    }

    await registerFace(capturedPhoto.base64);
  }

  const handleFacesDetection = async (faces: Face[]) => {
    try {
      if (faces?.length > 0 && currentScreen === 'camera') {
        const face = faces[0];

        const faceBounds = face.bounds;
        drawFaceBounds(face);
        setCurrentFaceBounds(faceBounds); // Store current face bounds
        setFaceStatus({
          yaw: face.yawAngle > 15 ? 'Right' : face.yawAngle < -15 ? 'Left' : 'Center',
          pitch: face.pitchAngle > 15 ? 'Up' : face.pitchAngle < -10 ? 'Down' : 'Center',
          eye: face.leftEyeOpenProbability > 0.7 && face.rightEyeOpenProbability > 0.7 ? 'Open' : 'Close',
        });

        // Check if face is in good position for registration
        const faceReady =
          Math.abs(face.yawAngle) < 10 &&
          Math.abs(face.pitchAngle) < 10 &&
          face.leftEyeOpenProbability > 0.7 &&
          face.rightEyeOpenProbability > 0.7;

        setIsReadyToCapture(faceReady);
      } else {
        drawFaceBounds();
        setIsReadyToCapture(false);
        setCurrentFaceBounds(null);
      }
    } catch (error) {
      console.error('Error in face detection:', error);
    }
  };

  const handleCaptureFace = async () => {
    if (!isReadyToCapture || !currentFaceBounds) {
      Alert.alert('Position Face', 'Please position your face properly (center, eyes open)');
      return;
    }

    if (cameraRef?.current) {
      const photo = await cameraRef.current?.takePhoto();
      if (photo) {
        await processCapturedPhoto(photo, currentFaceBounds);
      }
    }
  };

  const handleGalleryPick = async () => {
    try {
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access gallery is required to select a photo.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for face photos
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        console.log('Gallery photo selected:', selectedAsset.uri);

        // Process the selected gallery photo
        await processGalleryPhoto(selectedAsset.uri);
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('Error', 'Failed to select photo from gallery. Please try again.');
    }
  };

  const processGalleryPhoto = async (uri: string) => {
    try {
      console.log('Processing gallery photo with face detection:', uri);

      // Use the face detection service for gallery photos
      const processedPhoto = await faceDetectionService.processGalleryPhotoWithDetection(uri, { width, height }, 112);

      console.log('Gallery photo processed successfully with face detection');
      // Store the photo and base64 for registration
      setCapturedPhoto({
        path: uri,
        base64: processedPhoto.base64,
      });
      setCurrentScreen('photo-review'); // Move to photo review screen
    } catch (err) {
      console.error('Error processing gallery photo:', err);

      // Show more specific error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to process selected photo';
      Alert.alert('Error', `${errorMessage}. Please try again with a different photo.`);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setCurrentScreen('selection');
    setUserName('');
    setRegistered(false);
  };

  if (!hasPermission) return <Text>Camera permission is required to use this feature.</Text>;
  if (device == null) return <Text>Camera device not found.</Text>;

  // Selection Screen - Choose between camera or gallery
  if (currentScreen === 'selection') {
    return (
      <View style={styles.selectionContainer}>
        {/* Header */}
        <View style={styles.selectionHeader}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>Face Registration</Text>
            <Text style={styles.subtitleText}>Choose how to capture your face</Text>
          </View>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionButton} onPress={() => setCurrentScreen('camera')}>
            <Text style={styles.optionIcon}>📷</Text>
            <Text style={styles.optionTitle}>Use Camera</Text>
            <Text style={styles.optionDescription}>Take a live photo with face detection guidance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={handleGalleryPick}>
            <Text style={styles.optionIcon}>🖼️</Text>
            <Text style={styles.optionTitle}>Choose from Gallery</Text>
            <Text style={styles.optionDescription}>Select an existing photo from your gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>📋 Tips for best results:</Text>
          <Text style={styles.tipText}>• Face should be clearly visible and well-lit</Text>
          <Text style={styles.tipText}>• Look directly at the camera</Text>
          <Text style={styles.tipText}>• Remove glasses if possible</Text>
          <Text style={styles.tipText}>• Avoid shadows on the face</Text>
        </View>
      </View>
    );
  }

  if (currentScreen === 'camera') {
    // Camera View for Face Detection
    return (
      <View style={StyleSheet.absoluteFill}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          faceDetectionCallback={handleFacesDetection}
          faceDetectionOptions={faceDetectionOptions}
          photo={true}
        />

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('selection')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Face Registration</Text>
          <Text style={styles.subtitleText}>Position your face to capture</Text>
        </View>

        {/* Face Detection Info */}
        <Animated.View style={[faceBoxStyle, styles.animatedView]}>
          <Text style={styles.statusText}>Yaw: {faceStatus?.yaw}</Text>
          <Text style={styles.statusText}>Pitch: {faceStatus?.pitch}</Text>
          <Text style={styles.statusText}>Eye: {faceStatus?.eye}</Text>
        </Animated.View>

        {/* Capture Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[
              styles.captureButton,
              {
                backgroundColor: isReadyToCapture ? '#4CAF50' : '#666',
              },
            ]}
            onPress={handleCaptureFace}
            disabled={!isReadyToCapture}
          >
            <Text style={styles.captureButtonText}>📷 Capture Face</Text>
          </TouchableOpacity>

          {!isReadyToCapture && (
            <Text style={styles.instructionText}>
              {faceStatus
                ? 'Position your face in the center and keep eyes open'
                : 'Look at the camera to detect your face'}
            </Text>
          )}

          {isReadyToCapture && <Text style={styles.readyText}>✓ Ready to capture!</Text>}
        </View>
      </View>
    );
  }

  // Photo Review and Registration View
  if (currentScreen === 'photo-review') {
    return (
      <View style={styles.photoReviewContainer}>
        {/* Captured Photo */}
        {capturedPhoto && <Image source={{ uri: `file://${capturedPhoto.path}` }} style={styles.capturedImage} />}

        {/* Overlay Controls */}
        <View style={styles.photoOverlay}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.photoTitleContainer}>
            <Text style={styles.titleText}>Complete Registration</Text>
            <Text style={styles.subtitleText}>Enter your name to finish</Text>
          </View>

          {/* Registration Form */}
          <View style={styles.registrationForm}>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              placeholderTextColor="#aaa"
              value={userName}
              onChangeText={setUserName}
              editable={!registering}
              autoFocus={true}
            />

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetakePhoto} disabled={registering}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  {
                    backgroundColor: userName.trim() ? '#4CAF50' : '#666',
                  },
                ]}
                onPress={completeRegistration}
                disabled={registering || !userName.trim()}
              >
                <Text style={styles.registerButtonText}>
                  {registering ? 'Registering...' : 'Complete Registration'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Default fallback (should not reach here)
  return (
    <View style={styles.container}>
      <Text>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Common styles
  animatedView: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    borderRadius: 20,
    padding: 10,
  },
  statusText: {
    color: 'lightgreen',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1000,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    left: 100,
    alignItems: 'center',
  },
  titleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitleText: {
    color: '#ddd',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    fontSize: 16,
    color: '#000',
    width: '100%',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructionText: {
    color: '#ff9800',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  readyText: {
    color: '#4CAF50',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },

  // Camera capture styles
  captureButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Photo review styles
  photoReviewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  photoTitleContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    left: 100,
    alignItems: 'center',
  },
  registrationForm: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  registerButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    flex: 2,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retakeButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: '#666',
    flex: 1,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Selection Screen Styles
  selectionContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  selectionHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 20,
  },
  optionButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  optionDescription: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  tipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    paddingTop: 20,
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  tipText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 5,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
