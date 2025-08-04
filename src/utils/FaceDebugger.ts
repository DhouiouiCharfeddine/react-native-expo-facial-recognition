/**
 * Face Recognition Debugging Utilities
 * Helps identify issues with face matching and similarity
 */

import { faceStorage, RegisteredFace } from '../services/faceStorage';

export interface FaceSimilarityResult {
  face1: RegisteredFace;
  face2: RegisteredFace;
  similarity: number;
  isProblematic: boolean; // High similarity between different people
}

/**
 * Calculate cosine similarity between two embeddings
 */
function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

export class FaceDebugger {

  /**
   * Analyze all registered faces for potential similarity issues
   */
  static async analyzeFaceSimilarities(): Promise<FaceSimilarityResult[]> {
    try {
      const faces = await faceStorage.getRegisteredFaces();
      const results: FaceSimilarityResult[] = [];

      console.log(`🔍 Analyzing similarities between ${faces.length} registered faces...`);

      // Compare each face with every other face
      for (let i = 0; i < faces.length; i++) {
        for (let j = i + 1; j < faces.length; j++) {
          const face1 = faces[i];
          const face2 = faces[j];

          const similarity = calculateCosineSimilarity(face1.embedding, face2.embedding);

          // Flag as problematic if similarity is high (>0.7) between different people
          const isProblematic = similarity > 0.7;

          results.push({
            face1,
            face2,
            similarity,
            isProblematic,
          });
        }
      }

      // Sort by similarity (highest first)
      results.sort((a, b) => b.similarity - a.similarity);

      return results;
    } catch (error) {
      console.error('Error analyzing face similarities:', error);
      return [];
    }
  }

  /**
   * Log detailed similarity analysis
   */
  static async logSimilarityAnalysis(): Promise<void> {
    const results = await this.analyzeFaceSimilarities();

    console.log('\n🧠 FACE SIMILARITY ANALYSIS');
    console.log('===========================');

    if (results.length === 0) {
      console.log('No faces to compare (need at least 2 registered faces)');
      return;
    }

    console.log(`Comparing ${results.length} face pairs:\n`);

    let problemCount = 0;

    results.forEach((result, index) => {
      const { face1, face2, similarity, isProblematic } = result;

      const icon = isProblematic ? '⚠️' : similarity > 0.6 ? '⚡' : '✅';
      const status = isProblematic ? 'PROBLEMATIC' : similarity > 0.6 ? 'MODERATE' : 'SAFE';

      console.log(`${icon} ${face1.name} vs ${face2.name}`);
      console.log(`   Similarity: ${(similarity * 100).toFixed(1)}% (${status})`);
      console.log(`   Face 1 ID: ${face1.id} (${new Date(face1.timestamp).toLocaleDateString()})`);
      console.log(`   Face 2 ID: ${face2.id} (${new Date(face2.timestamp).toLocaleDateString()})`);

      if (isProblematic) {
        console.log(`   🚨 HIGH SIMILARITY - May cause false matches!`);
        problemCount++;
      }

      console.log('');
    });

    console.log('SUMMARY:');
    console.log(`📊 Total comparisons: ${results.length}`);
    console.log(`⚠️ Problematic pairs (>70%): ${problemCount}`);
    console.log(`⚡ Moderate pairs (60-70%): ${results.filter(r => r.similarity > 0.6 && !r.isProblematic).length}`);
    console.log(`✅ Safe pairs (<60%): ${results.filter(r => r.similarity <= 0.6).length}`);

    if (problemCount > 0) {
      console.log('\n🚨 RECOMMENDATIONS:');
      console.log('- Consider re-registering faces with better lighting/angles');
      console.log('- Increase verification threshold to 0.8 for better security');
      console.log('- Remove and re-register problematic faces');
    }

    console.log('===========================\n');
  }

  /**
   * Find which registered face is most similar to a given embedding
   */
  static async findMostSimilarFace(targetEmbedding: number[]): Promise<{
    face: RegisteredFace;
    similarity: number;
  } | null> {
    try {
      const faces = await faceStorage.getRegisteredFaces();

      if (faces.length === 0) {
        return null;
      }

      let bestMatch = faces[0];
      let bestSimilarity = calculateCosineSimilarity(targetEmbedding, faces[0].embedding);

      for (let i = 1; i < faces.length; i++) {
        const similarity = calculateCosineSimilarity(targetEmbedding, faces[i].embedding);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = faces[i];
        }
      }

      return {
        face: bestMatch,
        similarity: bestSimilarity,
      };
    } catch (error) {
      console.error('Error finding most similar face:', error);
      return null;
    }
  }

  /**
   * Log face database overview
   */
  static async logFaceDatabase(): Promise<void> {
    try {
      const faces = await faceStorage.getRegisteredFaces();

      console.log('\n📋 FACE DATABASE OVERVIEW');
      console.log('==========================');
      console.log(`Total registered faces: ${faces.length}\n`);

      faces.forEach((face, index) => {
        console.log(`${index + 1}. ${face.name}`);
        console.log(`   ID: ${face.id}`);
        console.log(`   Registered: ${new Date(face.timestamp).toLocaleString()}`);
        console.log(`   Embedding length: ${face.embedding.length}`);
        console.log(`   Embedding: ${face.embedding}`);
        console.log(`   Photo path: ${face.photoPath || 'N/A'}`);
        console.log('');
      });

      console.log('==========================\n');
    } catch (error) {
      console.error('Error logging face database:', error);
    }
  }

  /**
   * Quick debug command - run all analyses
   */
  static async runFullAnalysis(): Promise<void> {
    console.log('🔬 Starting comprehensive face debugging analysis...\n');

    await this.logFaceDatabase();
    await this.logSimilarityAnalysis();

    console.log('✅ Analysis complete! Check logs above for details.\n');
  }
}

// Export for easy console access
export const faceDebugger = FaceDebugger;
