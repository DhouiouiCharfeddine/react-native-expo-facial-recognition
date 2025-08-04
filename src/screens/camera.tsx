// Camera.tsx - Face Recognition Screen with Performance Monitoring
import * as tf from '@tensorflow/tfjs';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import { Asset } from 'expo-asset';
import { ImageManipulator } from 'expo-image-manipulator';
import * as ort from 'onnxruntime-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Camera as VisionCamera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Camera, Face, FaceDetectionOptions } from 'react-native-vision-camera-face-detector';
import { BenchmarkDisplay } from '../components/BenchmarkDisplay';
import { performanceMonitor } from '../utils/PerformanceMonitor';

// ArcFace ONNX model will be loaded dynamically

interface CameraScreenProps {
  onBack: () => void;
}

export default function CameraScreen({ onBack }: CameraScreenProps) {
  const cameraRef = useRef<VisionCamera>(null);
  const modelRef = useRef<ort.InferenceSession | null>(null);

  const { hasPermission } = useCameraPermission();
  const { width, height } = useWindowDimensions();
  const [recognized, setRecognized] = useState(false);
  const [faceStatus, setFaceStatus] = useState<{ yaw: string; pitch: string; eye: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const lastPhotoTime = useRef<number>(0);
  const device = useCameraDevice('front');

  useEffect(() => {
    (async () => {
      const status = await VisionCamera.requestCameraPermission();
      console.log(`Camera permission: ${status}`);

      console.log('tf ready', await tf.ready());

      // Load ArcFace ONNX model once on app start
      if (!modelRef.current) {
        console.log('Loading ArcFace ONNX model on app start...');
        modelRef.current = await loadModel();
        if (modelRef.current) {
          console.log('ArcFace ONNX model loaded and cached successfully');
        } else {
          console.error('Failed to load ArcFace ONNX model');
        }
      }
    })();
  }, [device]);

  // Reset states when screen becomes active
  useEffect(() => {
    setRecognized(false);
    setIsProcessing(false);
    lastPhotoTime.current = 0;
  }, []);

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
    borderLeftColor: 'rgb(0,255,0)',
    borderRightColor: 'rgb(0,255,0)',
    borderBottomColor: 'rgb(0,255,0)',
    borderTopColor: 'rgb(0,255,0)',
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

  // ArcFace ONNX model loader
  const loadModel = async (): Promise<ort.InferenceSession | null> => {
    try {
      console.log('Loading ArcFace ONNX model...');

      const modelOnnx = await Asset.fromModule(require('../models/arcfaceresnet100-11-int8.onnx'));
      await modelOnnx.downloadAsync();

      console.log('Model asset downloaded, creating ONNX session...');
      console.log('Model URI:', modelOnnx.localUri);

      const session = await ort.InferenceSession.create(modelOnnx.localUri!, {
        executionProviders: ['cpu'],
      });

      console.log('ArcFace ONNX model loaded successfully');
      console.log('Model input names:', session.inputNames);
      console.log('Model output names:', session.outputNames);

      return session;
    } catch (error) {
      console.error('Error loading ArcFace ONNX model:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return null;
    }
  };

  async function runModelOnFace(base64: string) {
    try {
      setRecognized(true);
      console.log('Running ArcFace face recognition...');

      // Start timing for embedding generation
      performanceMonitor.startTimer('embedding-generation');

      // Use cached ONNX model or load if not available
      let session = modelRef.current;
      if (!session) {
        console.log('ArcFace model not cached, loading...');
        session = await loadModel();
        modelRef.current = session;
      }

      if (!session) {
        console.error('ArcFace ONNX model not loaded');
        return;
      }

      console.log('ArcFace model loaded successfully');

      console.log('Processing face image with ArcFace model...');

      // Convert base64 to image tensor
      const imageBuffer = await tf.util.encodeString(base64, 'base64').buffer;
      const uint8array = new Uint8Array(imageBuffer);

      // ArcFace typically expects 112x112 input in CHW format [1, 3, 112, 112]
      const imageTensor = decodeJpeg(uint8array)
        .resizeBilinear([112, 112]) // ArcFace expects 112x112 input
        .toFloat()
        .div(tf.scalar(255)) // Normalize to [0, 1]
        .sub(tf.scalar(0.5))
        .div(tf.scalar(0.5)); // Normalize to [-1, 1]

      console.log('Input tensor shape (HWC):', imageTensor.shape);

      // Convert from HWC to CHW format [112, 112, 3] -> [3, 112, 112]
      const transposed = imageTensor.transpose([2, 0, 1]);
      const inputData = await transposed.data();

      console.log('Input data length:', inputData.length);
      console.log('Expected input shape: [1, 3, 112, 112] = 37632 elements');

      // Create ONNX tensor
      const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 112, 112]);

      // Run inference
      const feeds: Record<string, ort.Tensor> = {};
      feeds[session.inputNames[0]] = inputTensor;

      console.log('Running ONNX inference...');
      const results = await session.run(feeds);

      const outputTensor = results[session.outputNames[0]];
      console.log('Output tensor shape:', outputTensor.dims);
      console.log('Output tensor type:', outputTensor.type);

      // Get the face embedding vector
      const embedding = Array.from(outputTensor.data as Float32Array);

      console.log('Embedding length:', embedding.length);
      console.log('Embedding sample (first 10 values):', embedding.slice(0, 10));
      console.log('ArcFace embedding extracted successfully');

      // End timing and log performance
      const embeddingTime = performanceMonitor.endTimer('embedding-generation');
      console.log(`⏱️ Embedding generation took: ${embeddingTime.toFixed(2)}ms`);

      // Clean up tensors
      imageTensor.dispose();
      transposed.dispose();
      inputTensor.dispose();

      // Clean up ONNX output tensors
      Object.values(results).forEach((tensor) => tensor.dispose());

      // TODO: Store this vector for comparison
      // For authentication, you would:
      // 1. Store this vector when enrolling a user
      // 2. Compare with stored vectors using cosine similarity or euclidean distance
      return embedding;
    } catch (error) {
      console.error('Error running ArcFace model on face:', error);
    }
  }

  async function processPhotoAndRunModel(photo: any) {
    try {
      if (recognized || isProcessing || !photo) {
        return;
      }

      setIsProcessing(true);
      setRecognized(true);

      console.log('Processing photo for face recognition...');
      console.log('Photo dimensions:', photo.width, 'x', photo.height);

      // Use the full photo instead of cropping to avoid coordinate issues
      // The face should be well-positioned since we only capture when positioned correctly
      let imageToProcess = await ImageManipulator.manipulate(photo.path);
      imageToProcess.resize({ width: 112, height: 112 }); // Resize to 112x112 for ArcFace model

      const result = await imageToProcess.renderAsync();
      const base64 = await result.saveAsync({ base64: true });

      if (base64) {
        console.log('Photo processed successfully, running face recognition...');
        await runModelOnFace(base64?.base64 || '');
      } else {
        throw new Error('Failed to generate base64');
      }
    } catch (err) {
      console.error('Error processing photo:', err);
      setRecognized(false); // Reset on error so user can try again
    } finally {
      setIsProcessing(false);
    }
  }

  const handleFacesDetection = async (faces: Face[]) => {
    try {
      // Start timing for face detection
      performanceMonitor.startTimer('face-detection');

      // Update FPS counter
      performanceMonitor.updateFPS();

      if (faces?.length > 0) {
        const face = faces[0];

        const faceBounds = face.bounds;
        drawFaceBounds(face);
        setFaceStatus({
          yaw: face.yawAngle > 15 ? 'Right' : face.yawAngle < -15 ? 'Left' : 'Center',
          pitch: face.pitchAngle > 15 ? 'Up' : face.pitchAngle < -10 ? 'Down' : 'Center',
          eye: face.leftEyeOpenProbability > 0.7 && face.rightEyeOpenProbability > 0.7 ? 'Open' : 'Close',
        });

        // Check if face is well positioned and we're not already processing
        const faceWellPositioned =
          Math.abs(face.yawAngle) < 10 &&
          Math.abs(face.pitchAngle) < 10 &&
          face.leftEyeOpenProbability > 0.7 &&
          face.rightEyeOpenProbability > 0.7;

        if (faceWellPositioned && !recognized && !isProcessing && cameraRef?.current) {
          // Throttle photo taking - only take a photo every 3 seconds
          const now = Date.now();
          if (now - lastPhotoTime.current > 3000) {
            lastPhotoTime.current = now;

            try {
              console.log('Taking photo for face recognition...');
              const photo = await cameraRef.current.takePhoto();
              if (photo) {
                await processPhotoAndRunModel(photo);
              }
            } catch (photoError) {
              console.error('Error taking photo:', photoError);
              setIsProcessing(false);
              // Reset after a delay to allow another attempt
              setTimeout(() => {
                if (recognized) setRecognized(false);
              }, 2000);
            }
          }
        }
      } else {
        drawFaceBounds();
      }

      // End timing for face detection
      performanceMonitor.endTimer('face-detection');
    } catch (error) {
      console.error('Error in face detection:', error);
      // End timing even if there's an error
      performanceMonitor.endTimer('face-detection');
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

      {/* Benchmark Toggle Button */}
      <TouchableOpacity
        style={styles.benchmarkToggleButton}
        onPress={() => setShowBenchmarks(!showBenchmarks)}
      >
        <Text style={styles.benchmarkToggleText}>
          📊 {showBenchmarks ? 'Hide' : 'Show'} Metrics
        </Text>
      </TouchableOpacity>

      {/* Performance Benchmark Display */}
      <BenchmarkDisplay
        visible={showBenchmarks}
        position="top-right"
        onToggle={() => console.log('Benchmark display toggled')}
      />

      {/* Face Detection Info */}
      <Animated.View style={[faceBoxStyle, styles.animatedView]}>
        <Text style={styles.statusText}>Yaw: {faceStatus?.yaw}</Text>
        <Text style={styles.statusText}>Pitch: {faceStatus?.pitch}</Text>
        <Text style={styles.statusText}>Eye: {faceStatus?.eye}</Text>
      </Animated.View>

      {/* Processing/Recognition Status */}
      {isProcessing && (
        <View style={styles.processingStatus}>
          <Text style={styles.processingText}>🔄 Processing Face...</Text>
        </View>
      )}

      {recognized && !isProcessing && (
        <View style={styles.recognitionStatus}>
          <Text style={styles.recognitionText}>✓ Face Recognized</Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setRecognized(false);
              setIsProcessing(false);
              lastPhotoTime.current = 0;
            }}
          >
            <Text style={styles.resetButtonText}>Try Again</Text>
          </TouchableOpacity>
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
  processingStatus: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recognitionStatus: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 200, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  recognitionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#fff',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
