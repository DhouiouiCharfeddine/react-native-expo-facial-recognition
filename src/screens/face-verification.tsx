// FaceVerificationScreen.tsx
import * as tf from '@tensorflow/tfjs';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Camera as VisionCamera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Camera, Face, FaceDetectionOptions } from 'react-native-vision-camera-face-detector';

import { BenchmarkDisplay } from '../components/BenchmarkDisplay';
import { faceDetectionService } from '../services/faceDetectionService';
import { faceRecognitionService } from '../services/faceRecognitionService';
import { RegisteredFace } from '../services/faceStorage';
import { photoProcessingService } from '../services/photoProcessingService';
import { faceDebugger } from '../utils/FaceDebugger';
import { performanceMonitor } from '../utils/PerformanceMonitor';

interface FaceVerificationScreenProps {
  onBack: () => void;
  selectedFace: RegisteredFace;
}

export default function FaceVerificationScreen({ onBack, selectedFace }: FaceVerificationScreenProps) {
  const cameraRef = useRef<VisionCamera>(null);

  const { hasPermission } = useCameraPermission();
  const { width, height } = useWindowDimensions();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isMatch: boolean;
    confidence: number;
    message: string;
  } | null>(null);
  const [faceStatus, setFaceStatus] = useState<{ yaw: string; pitch: string; eye: string } | null>(null);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const lastVerificationTime = useRef<number>(0);
  const device = useCameraDevice('front');

  useEffect(() => {
    (async () => {
      const status = await VisionCamera.requestCameraPermission();
      console.log(`Camera permission: ${status}`);

      console.log('tf ready', await tf.ready());

      // Pre-load ArcFace ONNX model using the centralized service
      if (!faceRecognitionService.isModelLoaded()) {
        console.log('Loading ArcFace ONNX model for verification...');
        const model = await faceRecognitionService.loadModel();
        if (model) {
          console.log('ArcFace ONNX model loaded and cached successfully');
        } else {
          console.error('Failed to load ArcFace ONNX model');
        }
      }

      // Pre-load RFB face detection model for gallery photos
      if (!faceDetectionService.isModelLoaded()) {
        console.log('Loading RFB face detection model for verification...');
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
    borderLeftColor: verificationResult
      ? verificationResult.isMatch
        ? 'rgb(0,255,0)'
        : 'rgb(255,0,0)'
      : 'rgb(255,165,0)',
    borderRightColor: verificationResult
      ? verificationResult.isMatch
        ? 'rgb(0,255,0)'
        : 'rgb(255,0,0)'
      : 'rgb(255,165,0)',
    borderBottomColor: verificationResult
      ? verificationResult.isMatch
        ? 'rgb(0,255,0)'
        : 'rgb(255,0,0)'
      : 'rgb(255,165,0)',
    borderTopColor: verificationResult
      ? verificationResult.isMatch
        ? 'rgb(0,255,0)'
        : 'rgb(255,0,0)'
      : 'rgb(255,165,0)',
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

  async function verifyFace(photo: any, bounds: any) {
    try {
      if (isVerifying || !photo) {
        return;
      }

      setIsVerifying(true);
      console.log('Starting face verification...');

      // Start timing for complete verification process
      performanceMonitor.startTimer('face-verification');

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

      // Generate normalized embedding for current face using the centralized service
      const currentEmbedding = await faceRecognitionService.generateFaceEmbedding(processedPhoto.base64, {
        normalize: true,
      });
      if (!currentEmbedding) {
        throw new Error('Failed to generate face embedding');
      }

      console.log('🔍 FACE VERIFICATION DEBUG:');
      console.log(`Selected Face ID: ${selectedFace.id}`);
      console.log(`Selected Face Name: ${selectedFace.name}`);
      console.log(`Selected Face Timestamp: ${new Date(selectedFace.timestamp).toLocaleString()}`);
      console.log('Current embedding:', currentEmbedding.slice(0, 5) + '...' + currentEmbedding.slice(-5));
      console.log(
        'Selected face embedding:',
        selectedFace.embedding.slice(0, 5) + '...' + selectedFace.embedding.slice(-5)
      );

      // Compare embeddings using the centralized service
      const comparisonResult = faceRecognitionService.compareFaces(currentEmbedding, selectedFace.embedding);

      const message = comparisonResult.isMatch
        ? `✓ Identity verified! (${comparisonResult.confidence}% match)`
        : `✗ Identity not verified (${comparisonResult.confidence}% match)`;

      // End timing and log performance
      const verificationTime = performanceMonitor.endTimer('face-verification');
      console.log(`⏱️ Complete face verification took: ${verificationTime.toFixed(2)}ms`);

      setVerificationResult({
        isMatch: comparisonResult.isMatch,
        confidence: comparisonResult.confidence,
        message,
      });

      // Show result for 3 seconds, then allow another verification
      setTimeout(() => {
        setVerificationResult(null);
      }, 3000);
    } catch (error) {
      console.error('Error during face verification:', error);
      Alert.alert('Verification Error', 'Failed to verify face. Please try again.');
      // End timing even if there's an error
      performanceMonitor.endTimer('face-verification');
    } finally {
      setIsVerifying(false);
    }
  }

  const handleFacesDetection = async (faces: Face[]) => {
    try {
      // Update FPS counter
      performanceMonitor.updateFPS();

      if (faces?.length > 0) {
        const face = faces[0];

        drawFaceBounds(face);
        setFaceStatus({
          yaw: face.yawAngle > 15 ? 'Right' : face.yawAngle < -15 ? 'Left' : 'Center',
          pitch: face.pitchAngle > 15 ? 'Up' : face.pitchAngle < -10 ? 'Down' : 'Center',
          eye: face.leftEyeOpenProbability > 0.7 && face.rightEyeOpenProbability > 0.7 ? 'Open' : 'Close',
        });

        // Check if face is well positioned for verification
        const faceWellPositioned =
          Math.abs(face.yawAngle) < 10 &&
          Math.abs(face.pitchAngle) < 10 &&
          face.leftEyeOpenProbability > 0.7 &&
          face.rightEyeOpenProbability > 0.7;

        if (faceWellPositioned && !isVerifying && !verificationResult && cameraRef?.current) {
          // Throttle verification - only verify every 4 seconds
          const now = Date.now();
          if (now - lastVerificationTime.current > 4000) {
            lastVerificationTime.current = now;

            try {
              console.log('Taking photo for verification...');
              const photo = await cameraRef.current.takePhoto();
              if (photo) {
                await verifyFace(photo, face.bounds);
              }
            } catch (photoError) {
              console.error('Error taking photo for verification:', photoError);
              setIsVerifying(false);
            }
          }
        }
      } else {
        drawFaceBounds();
      }
    } catch (error) {
      console.error('Error in face detection:', error);
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setIsVerifying(false);
    lastVerificationTime.current = 0;
  };

  const handleGalleryVerification = async () => {
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
        console.log('Gallery photo selected for verification:', selectedAsset.uri);

        // Process the selected gallery photo for verification
        await processGalleryPhotoForVerification(selectedAsset.uri);
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('Error', 'Failed to select photo from gallery. Please try again.');
    }
  };

  const processGalleryPhotoForVerification = async (uri: string) => {
    try {
      setIsVerifying(true);
      console.log('Processing gallery photo for verification with face detection:', uri);

      // Start timing for complete verification process
      performanceMonitor.startTimer('face-verification');

      // Use the face detection service for gallery photos
      const processedPhoto = await faceDetectionService.processGalleryPhotoWithDetection(uri, { width, height }, 112);

      console.log('Gallery photo processed successfully with face detection');

      // Generate normalized embedding for gallery face using the centralized service
      const currentEmbedding = await faceRecognitionService.generateFaceEmbedding(processedPhoto.base64, {
        normalize: true,
      });
      if (!currentEmbedding) {
        throw new Error('Failed to generate face embedding');
      }

      console.log('🔍 GALLERY FACE VERIFICATION DEBUG:');
      console.log(`Selected Face ID: ${selectedFace.id}`);
      console.log(`Selected Face Name: ${selectedFace.name}`);
      console.log(`Selected Face Timestamp: ${new Date(selectedFace.timestamp).toLocaleString()}`);
      console.log('Gallery embedding:', currentEmbedding.slice(0, 5) + '...' + currentEmbedding.slice(-5));
      console.log(
        'Selected face embedding:',
        selectedFace.embedding.slice(0, 5) + '...' + selectedFace.embedding.slice(-5)
      );

      // Compare embeddings using the centralized service
      const comparisonResult = faceRecognitionService.compareFaces(currentEmbedding, selectedFace.embedding);

      const message = comparisonResult.isMatch
        ? `✓ Identity verified! (${comparisonResult.confidence}% match)`
        : `✗ Identity not verified (${comparisonResult.confidence}% match)`;

      // End timing and log performance
      const verificationTime = performanceMonitor.endTimer('face-verification');
      console.log(`⏱️ Complete gallery face verification took: ${verificationTime.toFixed(2)}ms`);

      setVerificationResult({
        isMatch: comparisonResult.isMatch,
        confidence: comparisonResult.confidence,
        message,
      });

      // Show result for 3 seconds, then allow another verification
      setTimeout(() => {
        setVerificationResult(null);
      }, 3000);
    } catch (error) {
      console.error('Error during gallery face verification:', error);

      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify face from gallery';
      Alert.alert('Verification Error', `${errorMessage}. Please try again with a different photo.`);

      // End timing even if there's an error
      performanceMonitor.endTimer('face-verification');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!hasPermission) return <Text>Camera permission is required to use this feature.</Text>;
  if (device == null) return <Text>Camera device not found.</Text>;

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
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Gallery Button */}
      <TouchableOpacity style={styles.galleryButton} onPress={handleGalleryVerification}>
        <Text style={styles.galleryButtonText}>🖼️ Use Photo</Text>
      </TouchableOpacity>

      {/* Benchmark Toggle Button */}
      <TouchableOpacity style={styles.benchmarkToggleButton} onPress={() => setShowBenchmarks(!showBenchmarks)}>
        <Text style={styles.benchmarkToggleText}>📊 {showBenchmarks ? 'Hide' : 'Show'} Metrics</Text>
      </TouchableOpacity>

      {/* Debug Button */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={() => {
          console.log('🔬 Running face debugging analysis...');
          faceDebugger.runFullAnalysis();
        }}
      >
        <Text style={styles.debugButtonText}>🔬 Debug Faces</Text>
      </TouchableOpacity>

      {/* Performance Benchmark Display */}
      <BenchmarkDisplay
        visible={showBenchmarks}
        position="bottom-right"
        onToggle={() => console.log('Benchmark display toggled')}
      />

      {/* Target Face Info */}
      <View style={styles.targetFaceInfo}>
        <Text style={styles.targetFaceTitle}>Verifying Against:</Text>
        <Text style={styles.targetFaceName}>{selectedFace.name}</Text>
      </View>

      {/* Face Detection Bounds */}
      <Animated.View style={[faceBoxStyle, styles.animatedView]}>
        <Text style={styles.statusText}>Yaw: {faceStatus?.yaw}</Text>
        <Text style={styles.statusText}>Pitch: {faceStatus?.pitch}</Text>
        <Text style={styles.statusText}>Eye: {faceStatus?.eye}</Text>
      </Animated.View>

      {/* Verification Status */}
      {isVerifying && (
        <View style={styles.verifyingStatus}>
          <Text style={styles.verifyingText}>🔄 Verifying Identity...</Text>
        </View>
      )}

      {verificationResult && (
        <View
          style={[
            styles.resultStatus,
            { backgroundColor: verificationResult.isMatch ? 'rgba(0, 200, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)' },
          ]}
        >
          <Text style={styles.resultText}>{verificationResult.message}</Text>
          <TouchableOpacity style={styles.tryAgainButton} onPress={resetVerification}>
            <Text style={styles.tryAgainButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions */}
      {!isVerifying && !verificationResult && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>Position your face in the frame for verification</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  galleryButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1000,
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  benchmarkToggleButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    marginTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    zIndex: 1000,
    alignItems: 'center',
  },
  benchmarkToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    marginTop: 120,
    backgroundColor: 'rgba(138, 43, 226, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    zIndex: 1000,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  targetFaceInfo: {
    position: 'absolute',
    top: 50,
    right: 20,
    left: 100,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 15,
    borderRadius: 20,
  },
  targetFaceTitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 5,
  },
  targetFaceName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  verifyingStatus: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  verifyingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultStatus: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  resultText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  tryAgainButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fff',
  },
  tryAgainButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
  },
});
