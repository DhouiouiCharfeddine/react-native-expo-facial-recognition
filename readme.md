# 🔐 React Native Facial Recognition App

A complete, production-ready React Native facial recognition application using the state-of-the-art **ArcFace ONNX model**. Features face registration, real-time verification, and secure local storage of biometric data.

![React Native](./src/assets/images/splash-icon.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React%20Native-0.79-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~53.0-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-~5.8-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

### 🎯 **Core Functionality**
- **Face Registration**: Capture and register faces with names
- **Face Verification**: Real-time comparison against registered faces
- **Face Recognition**: Identify faces from the camera feed
- **Persistent Storage**: Local storage using AsyncStorage (privacy-first)

### 🧠 **AI & Machine Learning**
- **ArcFace ONNX Model**: State-of-the-art face recognition with 512-dimensional embeddings
- **Real-time Processing**: Live face detection and analysis
- **High Accuracy**: Cosine similarity matching with configurable thresholds
- **On-device Processing**: All AI processing happens locally for privacy

### 📱 **User Experience**
- **Intuitive Navigation**: Clean home screen with clear options
- **Real-time Feedback**: Live face positioning guidance
- **Visual Indicators**: Color-coded borders (green=match, red=no match, orange=positioning)
- **Empty States**: Helpful guidance for first-time users
- **Error Handling**: Graceful error recovery and user feedback

### 🔒 **Privacy & Security**
- **Local-only Storage**: Face data never leaves the device
- **No Cloud Dependencies**: Completely offline operation
- **Secure Embeddings**: Mathematical representations, not actual photos
- **Permission Handling**: Proper camera permission management

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Expo CLI**: `npm install -g @expo/cli`
- **iOS Simulator** or **Android Emulator** (or physical device)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/maateusx/react-native-facial-recognition.git
   cd react-native-facial-recognition
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on your preferred platform**
   ```bash
   # iOS Simulator
   npm run ios

   # Android Emulator
   npm run android

   # Web Browser
   npm run web
   ```

## 📖 Usage Guide

### 1. **Register a Face**
1. Tap "👤 Register Face" on the home screen
2. Position your face in the camera frame
3. Wait for the green border (face properly positioned)
4. Tap "📷 Capture Face" when ready
5. Review the captured photo
6. Enter your name and tap "Complete Registration"

### 2. **Verify Identity**
1. Tap "🔐 Verify Face" on the home screen
2. Select a registered face from the list
3. Tap "Start Verification"
4. Position your face in the camera frame
5. The app will automatically verify your identity
6. See real-time results with confidence percentage

### 3. **General Recognition**
1. Tap "📷 Open Camera" on the home screen
2. Point camera at any face
3. The app will attempt to recognize registered faces
4. See real-time face detection and analysis

## 🏗️ Architecture

### **Project Structure**
```
src/
├── screens/           # App screens
│   ├── App.tsx       # Main navigation
│   ├── camera.tsx    # General face recognition
│   ├── face-registration.tsx
│   ├── face-selection.tsx
│   └── face-verification.tsx
├── services/         # Business logic
│   └── faceStorage.ts
└── assets/           # Static assets
    └── models/       # ONNX model files
```

### **Tech Stack**
- **Frontend**: React Native + Expo
- **Language**: TypeScript
- **AI/ML**: ONNX Runtime + ArcFace model
- **Computer Vision**: react-native-vision-camera
- **Storage**: AsyncStorage
- **Animations**: React Native Reanimated

### **Key Components**

#### **Face Storage Service** (`src/services/faceStorage.ts`)
- Handles CRUD operations for registered faces
- AsyncStorage persistence
- Face data validation and management

#### **ArcFace Integration**
- ONNX model loading and inference
- 512-dimensional face embeddings
- Cosine similarity matching
- Tensor memory management

## 🔧 Configuration

### **Face Recognition Threshold**
Adjust the similarity threshold in `face-verification.tsx`:
```typescript
const threshold = 0.6; // 60% similarity required
```

### **Camera Settings**
Configure face detection options in any camera screen:
```typescript
const faceDetectionOptions = {
  performanceMode: 'accurate',
  landmarkMode: 'all',
  classificationMode: 'all',
  // ... other options
};
```

### **Model Configuration**
The ArcFace model expects:
- **Input**: 112×112×3 images, normalized to [-1, 1]
- **Output**: 512-dimensional embedding vectors
- **Format**: ONNX (CPU execution)

## 📊 Performance

### **Benchmarks**
- **Face Detection**: ~30 FPS (device dependent)
- **Embedding Generation**: ~100-300ms per face
- **Face Verification**: ~400-500ms total
- **Model Size**: ~23MB (ArcFace ONNX)
- **Memory Usage**: ~50-100MB during processing

> 📊 **Want to generate your own benchmark data?**
>
> Check out our comprehensive [**BENCHMARKING.md**](BENCHMARKING.md) guide to learn how to:
> - Measure real performance on your devices
> - Use the built-in benchmark tools
> - Collect and analyze performance metrics
> - Generate README-ready benchmark data

### **Optimization Tips**
- Use device GPU acceleration when available
- Implement face detection throttling for battery efficiency
- Cache model loading for faster subsequent operations
- Optimize image preprocessing pipeline

## 🛠️ Development

### **Available Scripts**

```bash
# Development
npm start          # Start Expo dev server
npm run dev        # Start with dev client
npm run clean      # Clean cache and reinstall

# Platform-specific
npm run ios        # Run on iOS
npm run android    # Run on Android
npm run web        # Run on web

# Code Quality
npm run lint       # ESLint
npm run type-check # TypeScript check
npm test           # Jest tests

# Performance Testing
# See BENCHMARKING.md for detailed instructions
# Built-in performance monitoring available in-app

# Build
npm run build      # Development build
npm run prebuild   # Expo prebuild
```

### **Adding New Features**

1. **New Screen**: Add to `src/screens/` and update navigation in `App.tsx`
2. **Face Storage**: Extend `faceStorage.ts` service
3. **AI Models**: Add new ONNX models to `assets/models/`
4. **Styling**: Follow existing StyleSheet patterns

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request

### **Code Style**
- Use TypeScript for all new code
- Follow ESLint configuration
- Add proper error handling
- Include JSDoc comments for public APIs
- Write tests for new features

## 🚨 Known Issues

- **iOS Simulator**: Face detection may not work on simulator (use physical device)
- **Android Permissions**: Ensure camera permissions are granted
- **Model Loading**: First-time model load may take longer
- **Memory Management**: Large face databases may require optimization

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

### Inspiration & Learning Resources
- **Yosuke Hanaoka** ([@yoshan0921](https://github.com/yoshan0921)): Special thanks for the excellent [face detection tutorial](https://dev.to/yoshan0921/implement-face-detection-app-with-react-native-expo-in-10-minutes-bep) that provided foundational guidance for implementing React Native + Expo face detection

### Core Technologies
- **ArcFace**: Face recognition model by Deng et al.
- **ONNX Runtime**: Cross-platform ML inference
- **React Native Vision Camera**: Camera functionality and face detection
- **Expo**: Development platform and tools

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/maateusx/react-native-facial-recognition/wiki)
- **Issues**: [GitHub Issues](https://github.com/maateusx/react-native-facial-recognition/issues)
- **Discussions**: [GitHub Discussions](https://github.com/maateusx/react-native-facial-recognition/discussions)

---

**Made with ❤️ by [Mateus](https://github.com/maateusx)**

*If this project helped you, please consider giving it a ⭐ on GitHub!*
