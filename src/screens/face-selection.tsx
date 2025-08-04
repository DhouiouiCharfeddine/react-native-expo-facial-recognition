// FaceSelectionScreen.tsx
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { faceStorage, RegisteredFace } from '../services/faceStorage';

interface FaceSelectionScreenProps {
  onBack: () => void;
  onFaceSelected: (face: RegisteredFace) => void;
  refreshTrigger?: number; // Used to trigger refresh when new faces are registered
}

export default function FaceSelectionScreen({ onBack, onFaceSelected, refreshTrigger }: FaceSelectionScreenProps) {
  const [registeredFaces, setRegisteredFaces] = useState<RegisteredFace[]>([]);
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRegisteredFaces();
  }, [refreshTrigger]); // Reload when refreshTrigger changes

  const loadRegisteredFaces = async () => {
    try {
      setIsLoading(true);
      const faces = await faceStorage.getRegisteredFaces();
      setRegisteredFaces(faces);
      console.log(`Loaded ${faces.length} registered faces`);
    } catch (error) {
      console.error('Error loading registered faces:', error);
      Alert.alert('Error', 'Failed to load registered faces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFace = (face: RegisteredFace) => {
    setSelectedFaceId(face.id);
  };

  const handleVerifyFace = () => {
    const selectedFace = registeredFaces.find((face) => face.id === selectedFaceId);
    if (selectedFace) {
      console.log('🎯 FACE SELECTION DEBUG:');
      console.log(`Selected Face ID: ${selectedFace.id}`);
      console.log(`Selected Face Name: ${selectedFace.name}`);
      console.log(`Selected Face Timestamp: ${new Date(selectedFace.timestamp).toLocaleString()}`);
      console.log(`Total registered faces: ${registeredFaces.length}`);
      console.log('All face names:', registeredFaces.map(f => f.name).join(', '));
      onFaceSelected(selectedFace);
    } else {
      Alert.alert('No Selection', 'Please select a face to verify');
    }
  };

  const handleDeleteFace = (face: RegisteredFace) => {
    Alert.alert(
      'Delete Face',
      `Are you sure you want to delete "${face.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await faceStorage.deleteRegisteredFace(face.id);
              console.log(`Face deleted: ${face.name} (ID: ${face.id})`);

              // If the deleted face was selected, clear the selection
              if (selectedFaceId === face.id) {
                setSelectedFaceId(null);
              }

              // Reload the faces list
              await loadRegisteredFaces();

              Alert.alert('Success', `"${face.name}" has been deleted successfully.`);
            } catch (error) {
              console.error('Error deleting face:', error);
              Alert.alert('Error', 'Failed to delete face. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const renderFaceItem = ({ item }: { item: RegisteredFace }) => (
    <TouchableOpacity
      style={[styles.faceItem, selectedFaceId === item.id && styles.selectedFaceItem]}
      onPress={() => handleSelectFace(item)}
    >
      <View style={styles.faceImageContainer}>
        {item.photoPath ? (
          <Image source={{ uri: item.photoPath }} style={styles.faceImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>👤</Text>
          </View>
        )}
      </View>

      <View style={styles.faceInfo}>
        <Text style={styles.faceName}>{item.name}</Text>
        <Text style={styles.faceDate}>Registered: {formatDate(item.timestamp)}</Text>
        <Text style={styles.faceEmbedding}>Embedding: {item.embedding.length} dimensions</Text>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteFace(item)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>

        <View style={styles.selectionIndicator}>
          {selectedFaceId === item.id && <View style={styles.selectedDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Select Face to Verify</Text>
          <Text style={styles.subtitle}>Choose a registered face for verification</Text>
        </View>
      </View>

      {/* Face List */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading registered faces...</Text>
          </View>
        ) : registeredFaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>👤</Text>
            <Text style={styles.emptyStateTitle}>No Registered Faces</Text>
            <Text style={styles.emptyStateText}>
              You haven't registered any faces yet. Register your first face to start using face verification.
            </Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={onBack}>
              <Text style={styles.emptyStateButtonText}>Register Your First Face</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={registeredFaces}
            keyExtractor={(item) => item.id}
            renderItem={renderFaceItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Verify Button */}
      {registeredFaces.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.verifyButton, { backgroundColor: selectedFaceId ? '#4CAF50' : '#666' }]}
            onPress={handleVerifyFace}
            disabled={!selectedFaceId}
          >
            <Text style={styles.verifyButtonText}>{selectedFaceId ? 'Start Verification' : 'Select a Face First'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    paddingVertical: 20,
  },
  faceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedFaceItem: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a4a1a',
  },
  faceImageContainer: {
    marginRight: 15,
  },
  faceImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#666',
  },
  faceInfo: {
    flex: 1,
  },
  faceName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  faceDate: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 3,
  },
  faceEmbedding: {
    color: '#666',
    fontSize: 12,
  },
  rightSection: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    paddingTop: 20,
  },
  verifyButton: {
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  emptyStateText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  emptyStateButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
