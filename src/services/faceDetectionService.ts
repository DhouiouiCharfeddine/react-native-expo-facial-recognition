import * as tf from '@tensorflow/tfjs';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { photoProcessingService, ProcessedPhoto } from './photoProcessingService';

interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceDetectionResult {
  bounds: FaceBounds;
  confidence: number;
}

class FaceDetectionService {
  private model: tf.GraphModel | null = null;
  private isLoading = false;

  /**
   * Load the RFB face detection model
   */
  async loadModel(): Promise<tf.GraphModel | null> {
    if (this.model) {
      return this.model;
    }

    if (this.isLoading) {
      // Wait for the model to finish loading
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.model;
    }

    try {
      this.isLoading = true;
      console.log('Loading RFB face detection model...');

      // Load the ONNX model from the models directory
      const modelPath = '../models/version-RFB-320-int8.onnx';
      this.model = await tf.loadGraphModel(modelPath);

      console.log('✅ RFB face detection model loaded successfully');
      return this.model;
    } catch (error) {
      console.error('❌ Failed to load RFB face detection model:', error);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if the model is loaded
   */
  isModelLoaded(): boolean {
    return this.model !== null;
  }

  /**
   * Detect faces in an image using the RFB model
   */
  async detectFaces(
    imageUri: string,
    screenDimensions: { width: number; height: number }
  ): Promise<FaceDetectionResult[]> {
    if (!this.model) {
      await this.loadModel();
      if (!this.model) {
        throw new Error('Face detection model is not loaded');
      }
    }

    console.log('🔍 Detecting faces in gallery image...');

    // Step 1: Resize image to screen dimensions for consistent processing
    const resizedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: screenDimensions.width, height: screenDimensions.height } }],
      {
        compress: 1,
        format: SaveFormat.JPEG,
      }
    );

    console.log('📏 Resized image to screen dimensions:', screenDimensions);

    // Step 2: Prepare image tensor for the model
    const imageTensor = await this.prepareImageTensor(resizedImage.uri);

    try {
      // Step 3: Run face detection
      const predictions = (await this.model.predict(imageTensor)) as tf.Tensor;

      // Step 4: Process predictions to extract face bounds
      const faces = await this.processPredictions(predictions, screenDimensions);

      console.log(`🎯 Detected ${faces.length} face(s) in image`);

      return faces;
    } finally {
      imageTensor.dispose();
    }
  }

  /**
   * Process gallery photo with face detection and cropping
   */
  async processGalleryPhotoWithDetection(
    imageUri: string,
    screenDimensions: { width: number; height: number },
    finalSize: number = 112
  ): Promise<ProcessedPhoto> {
    console.log('🖼️ Processing gallery photo with face detection...');

    // Step 1: Detect faces in the image
    const detectedFaces = await this.detectFaces(imageUri, screenDimensions);

    if (detectedFaces.length === 0) {
      throw new Error('No faces detected in the selected image');
    }

    // Use the first (most confident) detected face
    const primaryFace = detectedFaces[0];
    console.log('👤 Using primary detected face:', primaryFace);

    // Step 2: Resize original image to screen dimensions
    const resizedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: screenDimensions.width, height: screenDimensions.height } }],
      {
        compress: 1,
        format: SaveFormat.JPEG,
      }
    );

    // Step 3: Use photo processing service to crop and resize
    const processedPhoto = await photoProcessingService.processFacePhoto(resizedImage.uri, screenDimensions, {
      bounds: primaryFace.bounds,
      previewDimensions: screenDimensions,
      isMirrored: false, // Gallery photos are not mirrored
      finalSize,
    });

    console.log('✅ Gallery photo processed successfully with face detection');
    return processedPhoto;
  }

  /**
   * Prepare image tensor for the RFB model
   */
  private async prepareImageTensor(imageUri: string): Promise<tf.Tensor> {
    try {
      // First resize the image to model input size and get base64
      const modelInputImage = await manipulateAsync(imageUri, [{ resize: { width: 320, height: 240 } }], {
        compress: 1,
        format: SaveFormat.JPEG,
        base64: true,
      });

      if (!modelInputImage.base64) {
        throw new Error('Failed to get base64 from processed image');
      }

      // Decode base64 to tensor
      const imageTensor = tf.browser.fromPixels(await this.createImageFromBase64(modelInputImage.base64));

      // Normalize pixel values to [0, 1]
      const normalized = imageTensor.div(255.0);

      // Add batch dimension [1, height, width, channels]
      const batched = normalized.expandDims(0);

      imageTensor.dispose();

      return batched;
    } catch (error) {
      console.error('Error preparing image tensor:', error);
      throw new Error('Failed to prepare image for face detection');
    }
  }

  /**
   * Create image element from base64 for tensor creation
   */
  private createImageFromBase64(base64: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = error => reject(error);
      img.src = `data:image/jpeg;base64,${base64}`;
    });
  }

  /**
   * Process model predictions to extract face bounds
   */
  private async processPredictions(
    predictions: tf.Tensor,
    imageDimensions: { width: number; height: number }
  ): Promise<FaceDetectionResult[]> {
    const predictionData = await predictions.data();
    const faces: FaceDetectionResult[] = [];

    // RFB model typically outputs: [batch, num_detections, 6]
    // Where each detection is: [x1, y1, x2, y2, confidence, class]
    const shape = predictions.shape;
    let numDetections = shape[1] ?? 0;

    for (let i = 0; i < numDetections; i++) {
      const baseIndex = i * 6;

      const x1 = predictionData[baseIndex] * imageDimensions.width;
      const y1 = predictionData[baseIndex + 1] * imageDimensions.height;
      const x2 = predictionData[baseIndex + 2] * imageDimensions.width;
      const y2 = predictionData[baseIndex + 3] * imageDimensions.height;
      const confidence = predictionData[baseIndex + 4];

      // Filter by confidence threshold
      if (confidence > 0.5) {
        const bounds: FaceBounds = {
          x: Math.max(0, x1),
          y: Math.max(0, y1),
          width: Math.max(0, x2 - x1),
          height: Math.max(0, y2 - y1),
        };

        faces.push({
          bounds,
          confidence,
        });
      }
    }

    // Sort by confidence (highest first)
    faces.sort((a, b) => b.confidence - a.confidence);

    predictions.dispose();
    return faces;
  }

  /**
   * Dispose of the model to free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      console.log('🗑️ Face detection model disposed');
    }
  }
}

export const faceDetectionService = new FaceDetectionService();
