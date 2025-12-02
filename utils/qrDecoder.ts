import jsQR from 'jsqr';

export const decodeQRFromImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error("Cannot get canvas context"));
          return;
        }

        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          resolve(code.data);
        } else {
          reject(new Error("Không tìm thấy mã QR trong ảnh. Vui lòng thử ảnh rõ nét hơn."));
        }
      };
      image.onerror = () => reject(new Error("Lỗi tải ảnh"));
      if (event.target?.result) {
        image.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  });
};