/**
 * Benchmark data collection utility
 * Collects and analyzes performance metrics for generating README benchmarks
 */

import { PerformanceMetrics, performanceMonitor } from './PerformanceMonitor';

export interface BenchmarkResults {
  faceDetectionFPS: {
    min: number;
    max: number;
    average: number;
    samples: number;
  };
  embeddingGeneration: {
    min: number;
    max: number;
    average: number;
    samples: number;
  };
  faceVerification: {
    min: number;
    max: number;
    average: number;
    samples: number;
  };
  memoryUsage: {
    min: number;
    max: number;
    average: number;
    samples: number;
  };
  testDuration: number;
  deviceInfo: string;
}

export class BenchmarkCollector {
  private static instance: BenchmarkCollector;
  private isCollecting: boolean = false;
  private startTime: number = 0;
  private samples: PerformanceMetrics[] = [];
  private maxSamples: number = 100;

  public static getInstance(): BenchmarkCollector {
    if (!BenchmarkCollector.instance) {
      BenchmarkCollector.instance = new BenchmarkCollector();
    }
    return BenchmarkCollector.instance;
  }

  /**
   * Start collecting benchmark data
   */
  public startCollection(): void {
    console.log('🚀 Starting benchmark data collection...');
    this.isCollecting = true;
    this.startTime = Date.now();
    this.samples = [];

    // Collect samples every 2 seconds
    const interval = setInterval(() => {
      if (!this.isCollecting) {
        clearInterval(interval);
        return;
      }

      const metrics = performanceMonitor.getMetrics();
      this.samples.push(metrics);

      if (this.samples.length >= this.maxSamples) {
        this.stopCollection();
        clearInterval(interval);
      }
    }, 2000);
  }

  /**
   * Stop collecting benchmark data and generate results
   */
  public stopCollection(): BenchmarkResults | null {
    if (!this.isCollecting) {
      console.warn('Benchmark collection is not running');
      return null;
    }

    this.isCollecting = false;
    const testDuration = Date.now() - this.startTime;

    console.log('⏹️ Stopping benchmark data collection...');
    console.log(`📊 Collected ${this.samples.length} samples over ${testDuration}ms`);

    const results = this.analyzeResults(testDuration);
    this.logResults(results);

    return results;
  }

  /**
   * Analyze collected samples and generate benchmark results
   */
  private analyzeResults(testDuration: number): BenchmarkResults {
    if (this.samples.length === 0) {
      throw new Error('No samples collected');
    }

    // Filter out samples with zero values (not yet measured)
    const fpsValues = this.samples.map(s => s.faceDetectionFPS).filter(v => v > 0);
    const embeddingValues = this.samples.map(s => s.embeddingGenerationTime).filter(v => v > 0);
    const verificationValues = this.samples.map(s => s.verificationTime).filter(v => v > 0);
    const memoryValues = this.samples.map(s => s.memoryUsage.used).filter(v => v > 0);

    return {
      faceDetectionFPS: this.calculateStats(fpsValues),
      embeddingGeneration: this.calculateStats(embeddingValues),
      faceVerification: this.calculateStats(verificationValues),
      memoryUsage: this.calculateStats(memoryValues),
      testDuration,
      deviceInfo: this.getDeviceInfo(),
    };
  }

  /**
   * Calculate min, max, average for a set of values
   */
  private calculateStats(values: number[]) {
    if (values.length === 0) {
      return { min: 0, max: 0, average: 0, samples: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);

    return { min, max, average, samples: values.length };
  }

  /**
   * Get device information for benchmark context
   */
  private getDeviceInfo(): string {
    // In React Native, we have limited device info access
    // This would need to be enhanced with react-native-device-info
    return 'React Native Device';
  }

  /**
   * Log detailed benchmark results
   */
  private logResults(results: BenchmarkResults): void {
    console.log('\n📊 BENCHMARK RESULTS SUMMARY');
    console.log('================================');
    console.log(`🕒 Test Duration: ${(results.testDuration / 1000).toFixed(1)}s`);
    console.log(`📱 Device: ${results.deviceInfo}`);
    console.log('');

    console.log('🎯 Face Detection FPS:');
    console.log(`   Min: ${results.faceDetectionFPS.min} fps`);
    console.log(`   Max: ${results.faceDetectionFPS.max} fps`);
    console.log(`   Avg: ${results.faceDetectionFPS.average} fps`);
    console.log(`   Samples: ${results.faceDetectionFPS.samples}`);
    console.log('');

    if (results.embeddingGeneration.samples > 0) {
      console.log('🧠 Embedding Generation:');
      console.log(`   Min: ${results.embeddingGeneration.min}ms`);
      console.log(`   Max: ${results.embeddingGeneration.max}ms`);
      console.log(`   Avg: ${results.embeddingGeneration.average}ms`);
      console.log(`   Samples: ${results.embeddingGeneration.samples}`);
      console.log('');
    }

    if (results.faceVerification.samples > 0) {
      console.log('🔐 Face Verification:');
      console.log(`   Min: ${results.faceVerification.min}ms`);
      console.log(`   Max: ${results.faceVerification.max}ms`);
      console.log(`   Avg: ${results.faceVerification.average}ms`);
      console.log(`   Samples: ${results.faceVerification.samples}`);
      console.log('');
    }

    console.log('💾 Memory Usage:');
    console.log(`   Min: ${results.memoryUsage.min}MB`);
    console.log(`   Max: ${results.memoryUsage.max}MB`);
    console.log(`   Avg: ${results.memoryUsage.average}MB`);
    console.log(`   Samples: ${results.memoryUsage.samples}`);

    console.log('================================');

    // Generate README-ready format
    this.generateReadmeFormat(results);
  }

  /**
   * Generate README-compatible benchmark format
   */
  private generateReadmeFormat(results: BenchmarkResults): void {
    console.log('\n📝 README.md BENCHMARK FORMAT:');
    console.log('--------------------------------');
    console.log('### **Benchmarks**');
    console.log(`- **Face Detection**: ~${results.faceDetectionFPS.min}-${results.faceDetectionFPS.max} FPS (avg: ${results.faceDetectionFPS.average})`);

    if (results.embeddingGeneration.samples > 0) {
      console.log(`- **Embedding Generation**: ~${results.embeddingGeneration.min}-${results.embeddingGeneration.max}ms per face (avg: ${results.embeddingGeneration.average}ms)`);
    }

    if (results.faceVerification.samples > 0) {
      console.log(`- **Face Verification**: ~${results.faceVerification.min}-${results.faceVerification.max}ms total (avg: ${results.faceVerification.average}ms)`);
    }

    console.log(`- **Model Size**: ~23MB (ArcFace ONNX)`);
    console.log(`- **Memory Usage**: ~${results.memoryUsage.min}-${results.memoryUsage.max}MB during processing (avg: ${results.memoryUsage.average}MB)`);
    console.log('--------------------------------');
  }

  /**
   * Export results as JSON for external analysis
   */
  public exportResults(results: BenchmarkResults): string {
    return JSON.stringify(results, null, 2);
  }

  /**
   * Check if collection is currently running
   */
  public isCollectionRunning(): boolean {
    return this.isCollecting;
  }

  /**
   * Get current sample count
   */
  public getSampleCount(): number {
    return this.samples.length;
  }
}

// Export singleton instance
export const benchmarkCollector = BenchmarkCollector.getInstance();
