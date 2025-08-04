// App.tsx - Main navigation component
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RegisteredFace } from '../services/faceStorage';
import CameraScreen from './camera';
import FaceRegistrationScreen from './face-registration';
import FaceSelectionScreen from './face-selection';
import FaceVerificationScreen from './face-verification';

type Screen = 'home' | 'camera' | 'register' | 'face-selection' | 'face-verification';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedFace, setSelectedFace] = useState<RegisteredFace | null>(null);
  const [faceListRefreshTrigger, setFaceListRefreshTrigger] = useState(0);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'camera':
        return <CameraScreen onBack={() => setCurrentScreen('home')} />;
      case 'register':
        return (
          <FaceRegistrationScreen
            onBack={() => {
              setFaceListRefreshTrigger((prev) => prev + 1); // Trigger refresh
              setCurrentScreen('home');
            }}
          />
        );
      case 'face-selection':
        return (
          <FaceSelectionScreen
            onBack={() => setCurrentScreen('home')}
            onFaceSelected={(face) => {
              setSelectedFace(face);
              setCurrentScreen('face-verification');
            }}
            refreshTrigger={faceListRefreshTrigger}
          />
        );
      case 'face-verification':
        return selectedFace ? (
          <FaceVerificationScreen
            onBack={() => {
              setSelectedFace(null);
              setCurrentScreen('face-selection');
            }}
            selectedFace={selectedFace}
          />
        ) : (
          <HomeScreen onNavigate={setCurrentScreen} />
        );
      default:
        return <HomeScreen onNavigate={setCurrentScreen} />;
    }
  };

  return <SafeAreaView style={styles.container}>{renderScreen()}</SafeAreaView>;
}

function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <View style={styles.homeContainer}>
      <Text style={styles.title}>Facial Recognition App</Text>
      <Text style={styles.subtitle}>Choose an option to get started</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => onNavigate('camera')}>
          <Text style={styles.buttonText}>📷 Open Camera</Text>
          <Text style={styles.buttonSubtext}>Scan and recognize faces</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.registerButton]} onPress={() => onNavigate('register')}>
          <Text style={styles.buttonText}>👤 Register Face</Text>
          <Text style={styles.buttonSubtext}>Enroll a new face for recognition</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.verifyButton]} onPress={() => onNavigate('face-selection')}>
          <Text style={styles.buttonText}>🔐 Verify Face</Text>
          <Text style={styles.buttonSubtext}>Select and verify against registered faces</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          This app uses ArcFace ONNX model for accurate face recognition and embedding generation.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  button: {
    backgroundColor: '#1a73e8',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  registerButton: {
    backgroundColor: '#34a853',
  },
  verifyButton: {
    backgroundColor: '#ea4335',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonSubtext: {
    color: '#e8f0fe',
    fontSize: 14,
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
