import { FlipType, SaveFormat, manipulateAsync } from 'expo-image-manipulator';

export interface PhotoProcessingOptions {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  previewDimensions: {
    width: number;
    height: number;
  };
  isMirrored?: boolean;
  finalSize?: number;
}

export interface ProcessedPhoto {
  base64: string;
  uri: string;
}

class PhotoProcessingService {
  /**
   * Process a photo by resizing to screen size, cropping the face, and resizing to final size
   */
  async processFacePhoto(
    photoPath: string,
    photoDimensions: { width: number; height: number },
    options: PhotoProcessingOptions
  ): Promise<ProcessedPhoto> {
    const { bounds, previewDimensions, isMirrored = false, finalSize = 112 } = options;
    const { width: photoWidth, height: photoHeight } = photoDimensions;

    console.log('Processing face photo with enhanced logic...');
    console.log('Photo dimensions:', { photoWidth, photoHeight });
    console.log('Preview dimensions:', previewDimensions);
    console.log('Original face bounds:', bounds);

    // Step 1: Resize photo to screen/preview size for consistent coordinate mapping
    const resized = await manipulateAsync(
      photoPath,
      [{ resize: { width: previewDimensions.width, height: previewDimensions.height } }],
      {
        compress: 1,
        format: SaveFormat.JPEG,
      }
    );

    console.log('Step 1 - Resized to screen size:', resized.uri);

    // Step 2: Calculate crop region using the original bounds (now coordinates match)
    const cropRegion = this.calculateCropRegion(bounds, previewDimensions);

    console.log('Step 2 - Calculated crop region:', cropRegion);

    // Step 3: Crop the face and resize to final size
    const actions: any[] = [{ crop: cropRegion }, { resize: { width: finalSize, height: finalSize } }];

    if (isMirrored) {
      actions.push({ flip: FlipType.Horizontal });
    }

    const manipResult = await manipulateAsync(resized.uri, actions, {
      base64: true,
      compress: 1,
      format: SaveFormat.JPEG,
    });

    console.log('Step 3 - Final processing complete');

    if (!manipResult.base64) {
      throw new Error('Failed to generate base64');
    }

    return {
      base64: manipResult.base64,
      uri: manipResult.uri,
    };
  }

  /**
   * Calculate crop region with padding and safety checks
   */
  private calculateCropRegion(
    bounds: { x: number; y: number; width: number; height: number },
    dimensions: { width: number; height: number }
  ) {
    const { width: imgWidth, height: imgHeight } = dimensions;

    // Add padding to the bounds
    const padding = 0.2; // 20% padding on each side
    const paddingX = bounds.width * padding;
    const paddingY = bounds.height * padding;

    // Calculate padded bounds
    let paddedX = bounds.x - paddingX;
    let paddedY = bounds.y - paddingY;
    let paddedWidth = bounds.width + 2 * paddingX;
    let paddedHeight = bounds.height + 2 * paddingY;

    // Ensure the crop region stays within image boundaries
    // Clamp the origin coordinates
    const clampedX = Math.max(0, paddedX);
    const clampedY = Math.max(0, paddedY);

    // Adjust width and height based on clamped coordinates
    paddedWidth = paddedWidth - (clampedX - paddedX);
    paddedHeight = paddedHeight - (clampedY - paddedY);

    // Ensure the crop region doesn't exceed image dimensions
    const maxWidth = imgWidth - clampedX;
    const maxHeight = imgHeight - clampedY;

    const finalWidth = Math.min(paddedWidth, maxWidth);
    const finalHeight = Math.min(paddedHeight, maxHeight);

    // Ensure minimum crop size (at least 50x50 pixels) but respect image boundaries
    const minSize = 50;
    const safeWidth = Math.min(Math.max(finalWidth, minSize), maxWidth);
    const safeHeight = Math.min(Math.max(finalHeight, minSize), maxHeight);

    if (finalWidth < minSize || finalHeight < minSize) {
      console.warn('Crop region too small, using minimum size with bounds respect');
    }

    const cropRegion = {
      originX: Math.round(clampedX),
      originY: Math.round(clampedY),
      width: Math.round(safeWidth),
      height: Math.round(safeHeight),
    };

    // Add conservative margin to prevent edge cases (5 pixels buffer)
    const safetyMargin = 5;
    const maxAllowedWidth = imgWidth - safetyMargin;
    const maxAllowedHeight = imgHeight - safetyMargin;

    // Ensure crop region has safety margins
    const maxCropDim = Math.min(imgWidth, imgHeight) - safetyMargin;
    if (cropRegion.width > maxCropDim) {
      cropRegion.width = maxCropDim;
    }
    if (cropRegion.height > maxCropDim) {
      cropRegion.height = maxCropDim;
    }

    if (
      cropRegion.originX + cropRegion.width > maxAllowedWidth ||
      cropRegion.originY + cropRegion.height > maxAllowedHeight
    ) {
      console.warn('Crop region too close to edges, applying safety margins');

      // Adjust to fit within safety margins
      const availableWidth = maxAllowedWidth - cropRegion.originX;
      const availableHeight = maxAllowedHeight - cropRegion.originY;

      cropRegion.width = Math.min(cropRegion.width, availableWidth);
      cropRegion.height = Math.min(cropRegion.height, availableHeight);
    }

    // Validate crop region with extra safety checks
    const rightEdge = cropRegion.originX + cropRegion.width;
    const bottomEdge = cropRegion.originY + cropRegion.height;

    const isValidCrop =
      cropRegion.originX >= 0 &&
      cropRegion.originY >= 0 &&
      cropRegion.width > 0 &&
      cropRegion.height > 0 &&
      rightEdge < imgWidth &&
      bottomEdge < imgHeight;

    console.log('Validating crop region:', {
      cropRegion,
      imageDimensions: { imgWidth, imgHeight },
      isValid: isValidCrop,
      rightEdge,
      bottomEdge,
      safetyCheck: {
        rightMargin: imgWidth - rightEdge,
        bottomMargin: imgHeight - bottomEdge,
      },
    });

    if (!isValidCrop) {
      console.error('Invalid crop region detected, using conservative fallback crop');
      // Use a very conservative center crop
      const maxSize = Math.min(imgWidth, imgHeight);
      const size = Math.floor(maxSize * 0.5); // Use 50% for maximum safety
      const centerX = Math.floor(imgWidth / 2);
      const centerY = Math.floor(imgHeight / 2);

      cropRegion.originX = Math.floor(centerX - size / 2);
      cropRegion.originY = Math.floor(centerY - size / 2);
      cropRegion.width = size;
      cropRegion.height = size;

      // Ensure even the fallback is safe
      if (cropRegion.originX + cropRegion.width >= imgWidth) {
        cropRegion.width = imgWidth - cropRegion.originX - safetyMargin;
      }
      if (cropRegion.originY + cropRegion.height >= imgHeight) {
        cropRegion.height = imgHeight - cropRegion.originY - safetyMargin;
      }

      console.log('Conservative fallback crop:', cropRegion);
    }

    return cropRegion;
  }

  /**
   * Process gallery photo (simpler processing since no face bounds)
   */
  async processGalleryPhoto(photoUri: string, finalSize: number = 112): Promise<ProcessedPhoto> {
    console.log('Processing gallery photo:', photoUri);

    const manipResult = await manipulateAsync(photoUri, [{ resize: { width: finalSize, height: finalSize } }], {
      base64: true,
      compress: 1,
      format: SaveFormat.JPEG,
    });

    if (!manipResult.base64) {
      throw new Error('Failed to generate base64');
    }

    return {
      base64: manipResult.base64,
      uri: manipResult.uri,
    };
  }
}

export const photoProcessingService = new PhotoProcessingService();
