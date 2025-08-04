// faceRecognitionService.ts - Centralized service for face recognition model and embeddings
import * as tf from '@tensorflow/tfjs';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import { Asset } from 'expo-asset';
import * as ort from 'onnxruntime-react-native';

const modelPath = '../models/arcfaceresnet100-11-int8.onnx';
//const modelPath = '../models/arcface.onnx';

class FaceRecognitionService {
  private modelSession: ort.InferenceSession | null = null;
  private isModelLoading = false;

  // ArcFace model constants (matching web implementation)
  private readonly INPUT_SIZE = 112;

  /**
   * Load the ArcFace ONNX model and cache it
   */
  async loadModel(): Promise<ort.InferenceSession | null> {
    // If model is already loaded, return it
    if (this.modelSession) {
      return this.modelSession;
    }

    // If model is currently loading, wait for it
    if (this.isModelLoading) {
      while (this.isModelLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.modelSession;
    }

    try {
      this.isModelLoading = true;
      console.log('Loading ArcFace ONNX model...');

      const modelOnnx = await Asset.fromModule(require(modelPath));
      await modelOnnx.downloadAsync();

      console.log('Model asset downloaded, creating ONNX session...');
      console.log('Model URI:', modelOnnx.localUri);

      const session = await ort.InferenceSession.create(modelOnnx.localUri!, {
        executionProviders: ['cpu'],
      });

      console.log('ArcFace ONNX model loaded successfully');
      console.log('Model input names:', session.inputNames);
      console.log('Model output names:', session.outputNames);

      this.modelSession = session;
      return session;
    } catch (error) {
      console.error('Error loading ArcFace ONNX model:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return null;
    } finally {
      this.isModelLoading = false;
    }
  }

  /**
   * L2 normalize a vector (make it unit length)
   */
  l2Normalize(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) {
      return vec;
    }
    return vec.map(v => v / norm);
  }

  /**
   * Calculate cosine similarity between two embeddings
   *
   * This implementation matches the web calculateCosineSimilarity exactly:
   * ```javascript
   * const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
   * const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
   * const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
   * return dot / (normA * normB);
   * ```
   */
  calculateCosineSimilarity(a: number[] | Float32Array, b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same length');
    }

    // Exactly matching web implementation with reduce()
    const dot = Array.from(a).reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(Array.from(a).reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot / (normA * normB);
  }

  async generateFaceEmbedding(base64: string, options?: { normalize?: boolean }): Promise<number[] | null> {
    try {
      // Ensure model is loaded
      const session = await this.loadModel();
      if (!session) {
        console.error('ArcFace ONNX model not loaded');
        return null;
      }

      //console.log('base64', base64);

      // 1. Decode and Resize Image Tensor using TF.js
      const imageBuffer = Buffer.from(base64, 'base64'); // Use Buffer for reliability
      const imageTensor = tf.tidy(() => {
        const decoded = decodeJpeg(imageBuffer);
        // Resize to [112, 112] and ensure it's 3 channels (RGB)
        return decoded
          .resizeBilinear([this.INPUT_SIZE, this.INPUT_SIZE])
          .toFloat()
          .expandDims(0)
          .slice([0, 0, 0, 0], [1, 112, 112, 3])
          .squeeze();
      });

      // 2. Convert to Grayscale using TF.js's built-in method
      // This is more accurate than manual conversion after rounding.
      const grayTensor = tf.image.rgbToGrayscale(imageTensor as any);
      const grayPixels = await grayTensor.data(); // This will be Float32Array of [0, 255]

      // We need Uint8Array for histogram calculation
      const gray = new Uint8Array(grayPixels.map((p: number) => Math.round(p)));

      // The following histogram equalization logic remains the same
      // as it operates on a Uint8Array [0, 255], which we've now correctly derived.

      // 3. Calculate histogram
      const hist = new Uint32Array(256).fill(0);
      for (let i = 0; i < gray.length; i++) {
        hist[gray[i]]++;
      }

      // 4. Calculate CDF (cumulative distribution function)
      const cdf = new Uint32Array(256).fill(0);
      cdf[0] = hist[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + hist[i];
      }

      // 5. Normalize CDF
      const cdfMin = cdf.find(v => v > 0) || 0;
      const totalPixels = gray.length;
      const cdfNormalized = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        cdfNormalized[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
      }

      // 6. Apply histogram equalization
      const equalizedGray = new Uint8Array(this.INPUT_SIZE * this.INPUT_SIZE);
      for (let i = 0; i < gray.length; i++) {
        equalizedGray[i] = cdfNormalized[gray[i]];
      }

      // 7. Prepare input tensor in NCHW format (channel first) for ArcFace
      const input = new Float32Array(3 * this.INPUT_SIZE * this.INPUT_SIZE);
      for (let i = 0; i < this.INPUT_SIZE * this.INPUT_SIZE; i++) {
        const val = equalizedGray[i];
        input[i] = val; // R channel
        input[i + this.INPUT_SIZE * this.INPUT_SIZE] = val; // G channel
        input[i + 2 * this.INPUT_SIZE * this.INPUT_SIZE] = val; // B channel
      }

      // console.log('input', input);

      // Create tensor in NCHW format [1, 3, 112, 112]
      const tensor = new ort.Tensor('float32', input, [1, 3, this.INPUT_SIZE, this.INPUT_SIZE]);

      // Run inference
      const output = await session.run({ [session.inputNames[0]]: tensor });
      const raw = output[session.outputNames[0]].data as Float32Array;

      // Clean up tensors
      tf.dispose([imageTensor, grayTensor]);
      // ONNX Tensors don't have a dispose method in onnxruntime-react-native's public API

      // L2 Normalize the output embedding
      const norm = Math.sqrt(Array.from(raw).reduce((sum, x) => sum + x * x, 0));
      if (norm === 0) return Array.from(raw); // Avoid division by zero
      const normalized = Array.from(raw).map(x => x / norm);

      return normalized;
    } catch (error) {
      console.error('Error generating face embedding:', error);
      return null;
    }
  }

  /**
   * Compare two face embeddings (already normalized) - matches web usage
   * Use this when comparing with web-generated embeddings that are already L2 normalized
   */
  compareEmbeddingsRaw(
    embedding1: number[] | Float32Array,
    embedding2: number[]
  ): {
    similarity: number;
    distance: number;
    isMatch: boolean;
    confidence: number;
  } {
    // Direct comparison without re-normalization (web embeddings are already normalized)
    const similarity = this.calculateCosineSimilarity(embedding1, embedding2);
    const distance = 1 - similarity;

    const threshold = 0.6;
    const isMatch = similarity >= threshold;
    const confidence = Math.round(similarity * 100);

    console.log(`🎯 RAW EMBEDDING COMPARISON: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
    console.log(`📊 Cosine Similarity: ${similarity.toFixed(6)} (${confidence}%)`);
    console.log(`📏 Cosine Distance: ${distance.toFixed(6)}`);
    console.log(`🎚️ Threshold: ${threshold} (similarity must be >= ${threshold})`);

    return {
      similarity,
      distance,
      isMatch,
      confidence,
    };
  }

  /**
   * Compare two face embeddings and return similarity metrics
   * This method ensures normalization for backwards compatibility
   */
  compareFaces(
    embedding1: number[],
    embedding2: number[]
  ): {
    similarity: number;
    distance: number;
    isMatch: boolean;
    confidence: number;
  } {
    // Ensure both embeddings are normalized for consistent comparison
    const normalized1 = this.l2Normalize(embedding1);
    const normalized2 = this.l2Normalize(embedding2);

    // Use the raw comparison method
    return this.compareEmbeddingsRaw(normalized1, normalized2);
  }

  /**
   * Get model info if loaded
   */
  getModelInfo(): { inputNames: string[]; outputNames: string[] } | null {
    if (!this.modelSession) {
      return null;
    }
    return {
      inputNames: [...this.modelSession.inputNames],
      outputNames: [...this.modelSession.outputNames],
    };
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this.modelSession !== null;
  }

  /**
   * Clear the model from memory (useful for testing or memory management)
   */
  clearModel(): void {
    if (this.modelSession) {
      console.log('Clearing ArcFace model from memory...');
      this.modelSession = null;
    }
  }
}

// Export a singleton instance
export const faceRecognitionService = new FaceRecognitionService();
