/**
 * Analyzes a transparent image (post-background removal) to find the subject bounds
 * and calculates an optimal passport crop.
 */
export async function calculateAutoCrop(
  imageSrc: string,
  aspectRatio: number,
  targetHeadRatio: number = 0.6 // Head height should be ~60% of total height
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
      let foundPixels = false;

      // Scan for non-transparent pixels
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 10) { // Threshold for transparency
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            foundPixels = true;
          }
        }
      }

      if (!foundPixels) {
        resolve(null);
        return;
      }

      const subjectWidth = maxX - minX;
      const subjectHeight = maxY - minY;
      
      // Heuristic: The head is the top part of the subject.
      // In a passport photo, the "head" usually includes the face and hair.
      // We'll assume the top 1/2 of the detected subject is the head for sizing.
      const headHeightEstimate = subjectHeight * 0.5;
      
      // Desired photo height based on head size
      // targetHeadRatio * photoHeight = headHeightEstimate
      let cropHeight = headHeightEstimate / targetHeadRatio;
      let cropWidth = cropHeight * aspectRatio;

      // If the calculated crop is too small for the subject width, expand it
      if (cropWidth < subjectWidth * 1.2) {
        cropWidth = subjectWidth * 1.2;
        cropHeight = cropWidth / aspectRatio;
      }

      // If the crop is LARGER than the original image, cap it
      if (cropHeight > img.height) {
        cropHeight = img.height;
        cropWidth = cropHeight * aspectRatio;
      }
      if (cropWidth > img.width) {
        cropWidth = img.width;
        cropHeight = cropWidth / aspectRatio;
      }

      // Center horizontally on the subject
      let cropX = minX + (subjectWidth / 2) - (cropWidth / 2);
      
      // Position vertically: top of head (minY) should be ~15% from the top
      let cropY = minY - (cropHeight * 0.15);

      // Boundary checks
      if (cropX < 0) cropX = 0;
      if (cropY < 0) cropY = 0;
      if (cropX + cropWidth > img.width) cropX = img.width - cropWidth;
      if (cropY + cropHeight > img.height) cropY = img.height - cropHeight;

      // Convert to percentages for react-image-crop
      resolve({
        x: (cropX / img.width) * 100,
        y: (cropY / img.height) * 100,
        width: (cropWidth / img.width) * 100,
        height: (cropHeight / img.height) * 100
      });
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}
