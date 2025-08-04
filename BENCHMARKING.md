# 📊 Performance Benchmarking Guide

This guide explains how to measure real performance metrics for your React Native Facial Recognition app to get accurate benchmark data for your README.md.

## 🎯 What We Can Measure

### **Core Metrics**
- **Face Detection FPS**: Frames per second for real-time face detection
- **Embedding Generation Time**: Time to generate 512-dimensional face embeddings
- **Face Verification Time**: Complete time for identity verification process
- **Memory Usage**: RAM consumption during processing
- **Model Size**: ONNX model file size

### **Additional Metrics**
- **Face Registration Time**: Time to register a new face
- **Model Loading Time**: Time to load the ArcFace ONNX model
- **Average Detection Time**: Time per individual face detection

## 🚀 How to Run Benchmarks

### **Method 1: Real-Time Visual Monitoring**

1. **Enable Benchmark Display**:
   ```typescript
   // The benchmark display is already integrated into your screens
   // Toggle it on/off using the "📊 Show/Hide Metrics" button
   ```

2. **Use the App Normally**:
   - Open any camera screen (Camera, Registration, or Verification)
   - The benchmark display will show real-time metrics
   - Tap to expand for detailed view

3. **Monitor Different Scenarios**:
   - **Good Lighting**: Test in bright, well-lit conditions
   - **Low Light**: Test in dim lighting
   - **Different Distances**: Test with face close/far from camera
   - **Multiple Operations**: Register faces, then verify them

### **Method 2: Automated Data Collection**

1. **Start Benchmark Collection**:
   ```typescript
   import { benchmarkCollector } from './src/utils/BenchmarkCollector';

   // Start collecting data (in your app code)
   benchmarkCollector.startCollection();
   ```

2. **Use the App for Testing**:
   - Perform various operations (register faces, verify faces, etc.)
   - Let it run for at least 2-3 minutes to collect sufficient samples

3. **Stop and Get Results**:
   ```typescript
   // Stop collection and get results
   const results = benchmarkCollector.stopCollection();
   console.log('Benchmark Results:', results);
   ```

### **Method 3: Console Log Analysis**

1. **Enable Console Logging**:
   - The performance monitor automatically logs detailed timing information
   - Look for logs like:
     ```
     ⏱️ Embedding generation took: 245.67ms
     ⏱️ Complete face verification took: 456.32ms
     📊 PERFORMANCE BENCHMARK SUMMARY
     ```

2. **Collect Data Over Time**:
   - Use the app for 10-15 minutes
   - Note down the timing values from console logs
   - Calculate averages, mins, and maxes manually

## 📱 Testing Different Devices

### **Device Categories to Test**

1. **High-End Devices**:
   - iPhone 15 Pro, Samsung Galaxy S24 Ultra
   - Expected: 45-60 FPS, <200ms embedding generation

2. **Mid-Range Devices**:
   - iPhone 12, Samsung Galaxy S22
   - Expected: 30-45 FPS, 200-400ms embedding generation

3. **Budget Devices**:
   - Older iPhones (iPhone XR), Budget Android
   - Expected: 20-35 FPS, 400-800ms embedding generation

### **Testing Conditions**

1. **Lighting Conditions**:
   - ☀️ Bright outdoor lighting
   - 💡 Indoor lighting
   - 🌙 Low light conditions

2. **Face Positioning**:
   - Centered, well-positioned faces
   - Off-center or angled faces
   - Multiple faces in frame

3. **App States**:
   - Fresh app start (cold start)
   - After running for extended periods
   - With multiple faces registered

## 🔧 Advanced Benchmarking

### **Custom Benchmark Integration**

Add this to any screen where you want detailed benchmarking:

```typescript
import { benchmarkCollector } from '../utils/BenchmarkCollector';
import { performanceMonitor } from '../utils/PerformanceMonitor';

// In your component
const runCustomBenchmark = async () => {
  console.log('🚀 Starting custom benchmark...');

  // Reset and start fresh
  performanceMonitor.reset();
  benchmarkCollector.startCollection();

  // Your testing code here...

  // Stop after 2 minutes
  setTimeout(() => {
    const results = benchmarkCollector.stopCollection();
    if (results) {
      console.log('📊 Custom benchmark completed!');
      // Use results.exportResults() for JSON export
    }
  }, 120000); // 2 minutes
};
```

### **Memory Profiling**

```typescript
// Monitor memory usage during heavy operations
performanceMonitor.updateMemoryUsage();
const memoryStats = performanceMonitor.getMemoryStats();
console.log(`💾 Memory: ${memoryStats.used}MB / ${memoryStats.total}MB (${memoryStats.percentage}%)`);
```

## 📈 Analyzing Results

### **Understanding the Numbers**

1. **Face Detection FPS**:
   - **60+ FPS**: Excellent (high-end devices)
   - **30-60 FPS**: Good (most modern devices)
   - **15-30 FPS**: Acceptable (budget devices)
   - **<15 FPS**: Poor (needs optimization)

2. **Embedding Generation**:
   - **<200ms**: Excellent
   - **200-400ms**: Good
   - **400-800ms**: Acceptable
   - **>800ms**: Slow (consider optimization)

3. **Face Verification**:
   - **<300ms**: Excellent
   - **300-600ms**: Good
   - **600-1000ms**: Acceptable
   - **>1000ms**: Slow

4. **Memory Usage**:
   - **<100MB**: Excellent
   - **100-200MB**: Good
   - **200-400MB**: Acceptable
   - **>400MB**: High (potential memory leaks)

### **Generating README Benchmarks**

Use the automated format generator:

```typescript
const results = benchmarkCollector.stopCollection();
if (results) {
  // This will print README-ready format
  console.log('Copy this to your README.md:');
  // The console will show formatted benchmark data
}
```

## 🎮 Quick Testing Script

Add this to your main app for quick benchmark testing:

```typescript
// Add to App.tsx or any main component
const ENABLE_BENCHMARK_MODE = __DEV__; // Only in development

useEffect(() => {
  if (ENABLE_BENCHMARK_MODE) {
    console.log('🔧 Benchmark mode enabled - Press Volume Up to start/stop');

    // You can add gesture handlers or button presses to control benchmarking
    // This is just an example of how to integrate it
  }
}, []);
```

## 📊 Example Benchmark Output

Here's what you'll see in the console:

```
📊 BENCHMARK RESULTS SUMMARY
================================
🕒 Test Duration: 180.5s
📱 Device: iPhone 14 Pro Max

🎯 Face Detection FPS:
   Min: 42 fps
   Max: 58 fps
   Avg: 52 fps
   Samples: 90

🧠 Embedding Generation:
   Min: 156ms
   Max: 298ms
   Avg: 187ms
   Samples: 25

🔐 Face Verification:
   Min: 234ms
   Max: 445ms
   Avg: 312ms
   Samples: 15

💾 Memory Usage:
   Min: 68MB
   Max: 142MB
   Avg: 89MB
   Samples: 90
================================

📝 README.md BENCHMARK FORMAT:
--------------------------------
### **Benchmarks**
- **Face Detection**: ~30 FPS (avg: 30)
- **Embedding Generation**: ~156-298ms per face (avg: 187ms)
- **Face Verification**: ~234-445ms total (avg: 312ms)
- **Model Size**: ~23MB (ArcFace ONNX)
- **Memory Usage**: ~68-142MB during processing (avg: 89MB)
--------------------------------
```

## ⚠️ Important Notes

### **Testing Best Practices**

1. **Test on Real Devices**: Simulators won't give accurate performance data
2. **Multiple Test Runs**: Run benchmarks several times for consistent results
3. **Different Scenarios**: Test with various face counts, lighting, distances
4. **Clean App State**: Restart the app between major benchmark runs
5. **Battery Level**: Test with >50% battery (low battery affects performance)

### **Common Issues**

1. **Zero FPS**: Face detection not working (check camera permissions)
2. **High Memory**: Potential memory leaks (restart app and retest)
3. **Slow Performance**: Background apps consuming resources
4. **Inconsistent Results**: Test multiple times and average the results

## 🔍 Troubleshooting

### **If Benchmarks Show Poor Performance**

1. **Check Device Resources**:
   - Close other apps
   - Ensure good network connectivity
   - Check available storage space

2. **Optimize Settings**:
   - Reduce face detection accuracy if needed
   - Implement frame skipping for low-end devices
   - Consider model quantization for smaller size

3. **Profile Memory Usage**:
   - Look for memory leaks
   - Ensure proper tensor disposal
   - Monitor garbage collection

---

**📌 Remember**: These benchmarks help you understand real-world performance and provide accurate data for your README.md. Test on multiple devices and conditions for the most representative results!
