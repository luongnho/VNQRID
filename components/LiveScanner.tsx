import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Check } from 'lucide-react';
import { playScanSound } from '../utils/soundUtils';

interface LiveScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const LiveScanner: React.FC<LiveScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastCodeRef = useRef<string | null>(null);
  const cooldownRef = useRef<boolean>(false);
  
  const [error, setError] = useState<string>('');
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera error", err);
        setError("Không thể truy cập camera. Vui lòng cấp quyền và thử lại.");
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Use stricter options for cleaner detection
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            // Logic for continuous scanning with cooldown
            if (!cooldownRef.current && code.data !== lastCodeRef.current) {
              cooldownRef.current = true;
              lastCodeRef.current = code.data;
              
              // Actions
              playScanSound();
              onScan(code.data);
              setLastScannedText("Đã quét thành công!");

              // Reset visual feedback after 1.5s
              setTimeout(() => {
                setLastScannedText(null);
              }, 1500);

              // Allow scanning again (even the same code) after 3 seconds
              // Or allow scanning a DIFFERENT code immediately? 
              // Usually for IDs, we want a delay to prevent spamming the API.
              setTimeout(() => {
                cooldownRef.current = false;
                // We clear lastCodeRef if we want to allow re-scanning the same card immediately after cooldown.
                // Keeping it set prevents accidental double-scanning if user holds phone still.
                // Let's clear it to allow re-scan after 3s.
                lastCodeRef.current = null;
              }, 3000);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white">
          <h3 className="font-bold text-lg">Quét liên tục</h3>
          <p className="text-xs text-white/80">Di chuyển camera đến mã QR tiếp theo</p>
        </div>
        <button 
          onClick={onClose}
          className="bg-white/20 p-2 rounded-full hover:bg-white/30 backdrop-blur-sm"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Main Camera View */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Scanning Overlay */}
        <div className="absolute inset-0 border-[40px] border-black/50 z-10 flex items-center justify-center">
            <div className={`w-72 h-48 rounded-lg border-2 relative transition-colors duration-300 ${lastScannedText ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'border-[#c99a2c]'}`}>
                {!lastScannedText && (
                  <>
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#c99a2c] -mt-1 -ml-1 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#c99a2c] -mt-1 -mr-1 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#c99a2c] -mb-1 -ml-1 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#c99a2c] -mb-1 -mr-1 rounded-br-lg"></div>
                    <div className="absolute w-full h-0.5 bg-red-500 top-1/2 left-0 animate-scan-line shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                  </>
                )}
                
                {lastScannedText && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm">
                    <Check className="w-16 h-16 text-green-400 drop-shadow-lg" />
                  </div>
                )}
            </div>
        </div>

        {/* Success Toast / Error Message */}
        <div className="absolute bottom-20 left-0 right-0 flex justify-center z-20 px-4">
           {lastScannedText && (
             <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 animate-bounce">
               <Check className="w-5 h-5" /> {lastScannedText}
             </div>
           )}
           {error && (
             <div className="bg-red-600 text-white px-4 py-2 rounded shadow-lg text-sm text-center">
               {error}
             </div>
           )}
        </div>
      </div>
      
      {/* Footer Instruction */}
      <div className="bg-black text-center py-6 text-white/60 text-sm">
         Đặt mã QR CCCD vào trong khung hình chữ nhật
      </div>
    </div>
  );
};