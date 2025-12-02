import jsQR from 'jsqr';

// Helper to scan a specific region of the canvas context
const scanRegion = (
  ctx: CanvasRenderingContext2D, 
  sx: number, sy: number, sw: number, sh: number
): string | null => {
  try {
    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    return code ? code.data : null;
  } catch (e) {
    return null;
  }
};

export const decodeQRFromImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!context) {
          reject(new Error("Cannot get canvas context"));
          return;
        }

        const width = image.width;
        const height = image.height;
        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0);

        // --- STRATEGY 1: Full Image Scan ---
        let result = scanRegion(context, 0, 0, width, height);
        if (result) {
          resolve(result);
          return;
        }

        // --- STRATEGY 2: Smart Crops for ID Cards ---
        // VN ID Cards have QR codes in the top-right corner.
        // Small QRs often fail in full scans because they are downscaled or lost in noise.
        
        // 2a. Top-Right Quadrant (Most likely for CCCD)
        result = scanRegion(context, width * 0.5, 0, width * 0.5, height * 0.5);
        if (result) {
          resolve(result);
          return;
        }

        // 2b. Center Crop (If user took a close up but centered it)
        // Crop 60% of the center
        const cx = width * 0.2;
        const cy = height * 0.2;
        const cw = width * 0.6;
        const ch = height * 0.6;
        result = scanRegion(context, cx, cy, cw, ch);
        if (result) {
          resolve(result);
          return;
        }

        // 2c. Top-Left (Rare, but possible if rotated)
        result = scanRegion(context, 0, 0, width * 0.5, height * 0.5);
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error("Không tìm thấy mã QR. Vui lòng thử ảnh rõ nét hơn hoặc cắt sát vào mã QR."));
      };
      
      image.onerror = () => reject(new Error("Lỗi tải ảnh"));
      
      if (event.target?.result) {
        image.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  });
};