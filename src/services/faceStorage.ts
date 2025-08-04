// faceStorage.ts - Service for storing and retrieving registered faces
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RegisteredFace {
  id: string;
  name: string;
  embedding: number[];
  photoPath?: string;
  timestamp: number;
}

const STORAGE_KEY = 'registered_faces';

class FaceStorageService {
  // Save a new registered face
  async saveRegisteredFace(face: RegisteredFace): Promise<void> {
    try {
      const existingFaces = await this.getRegisteredFaces();
      const updatedFaces = [...existingFaces, face];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFaces));
      console.log(`Face registered and saved locally: ${face.name}`);
    } catch (error) {
      console.error('Error saving registered face:', error);
      throw new Error('Failed to save face data');
    }
  }

  // Get all registered faces
  async getRegisteredFaces(): Promise<RegisteredFace[]> {
    try {
      const facesJson = await AsyncStorage.getItem(STORAGE_KEY);

      if (!facesJson) {
        return [];
      }

      const faces = JSON.parse(facesJson) as RegisteredFace[];
      console.log(`Loaded ${faces.length} registered faces from storage`);
      return faces;
    } catch (error) {
      console.error('Error loading registered faces:', error);
      return [];
    }
  }

  // Delete a registered face
  async deleteRegisteredFace(faceId: string): Promise<void> {
    try {
      const existingFaces = await this.getRegisteredFaces();
      const updatedFaces = existingFaces.filter((face) => face.id !== faceId);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFaces));
      console.log(`Face deleted: ${faceId}`);
    } catch (error) {
      console.error('Error deleting registered face:', error);
      throw new Error('Failed to delete face data');
    }
  }

  // Clear all registered faces (for testing/reset)
  async clearAllFaces(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('All registered faces cleared from storage');
    } catch (error) {
      console.error('Error clearing registered faces:', error);
      throw new Error('Failed to clear face data');
    }
  }

  // Update an existing face
  async updateRegisteredFace(updatedFace: RegisteredFace): Promise<void> {
    try {
      const existingFaces = await this.getRegisteredFaces();
      const faceIndex = existingFaces.findIndex((face) => face.id === updatedFace.id);

      if (faceIndex === -1) {
        throw new Error('Face not found');
      }

      existingFaces[faceIndex] = updatedFace;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existingFaces));
      console.log(`Face updated: ${updatedFace.name}`);
    } catch (error) {
      console.error('Error updating registered face:', error);
      throw new Error('Failed to update face data');
    }
  }

  // Generate a unique ID for a new face
  generateFaceId(): string {
    return `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get count of registered faces
  async getRegisteredFacesCount(): Promise<number> {
    try {
      const faces = await this.getRegisteredFaces();
      return faces.length;
    } catch (error) {
      console.error('Error getting face count:', error);
      return 0;
    }
  }

  // Check if a face name already exists
  async isFaceNameTaken(name: string): Promise<boolean> {
    try {
      const faces = await this.getRegisteredFaces();
      return faces.some((face) => face.name.toLowerCase() === name.toLowerCase());
    } catch (error) {
      console.error('Error checking face name:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const faceStorage = new FaceStorageService();
