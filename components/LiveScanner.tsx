import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';
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
  const trackRef = useRef<MediaStreamTrack | null>(null);
  
  const [error, setError] = useState<string>('');
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{min: number, max: number, step: number} | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        // Request high resolution (4K ideal, 1080p fallback) to resolve small QRs
        const constraints: MediaStreamConstraints = {
          video: { 
            facingMode: 'environment',
            width: { ideal: 3840 }, 
            height: { ideal: 2160 },
            focusMode: 'continuous'
          } as any // cast to any because focusMode isn't in standard TS lib yet
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();

          // Get Zoom Capabilities
          const videoTrack = stream.getVideoTracks()[0];
          trackRef.current = videoTrack;
          const capabilities = videoTrack.getCapabilities() as any;

          if (capabilities.zoom) {
            setZoomCapabilities({
              min: capabilities.zoom.min,
              max: capabilities.zoom.max,
              step: capabilities.zoom.step
            });
            // Set initial zoom slightly higher if possible to help with small codes
            const initialZoom = Math.min(capabilities.zoom.max, 2.0);
            if (initialZoom > 1) {
              setZoom(initialZoom, videoTrack);
            }
          }

          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera error", err);
        setError("Không thể truy cập camera hoặc độ phân giải không hỗ trợ.");
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          // Keep canvas at internal high resolution for processing
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw full frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Optimization: Crop the center region for scanning.
          // Small QRs are usually centered by the user. Scanning the whole 4K frame is slow.
          // We define a Scan Region of Interest (ROI) - e.g. center 60%
          const scanSize = Math.min(canvas.width, canvas.height) * 0.6;
          const sx = (canvas.width - scanSize) / 2;
          const sy = (canvas.height - scanSize) / 2;

          const imageData = ctx.getImageData(sx, sy, scanSize, scanSize);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            if (!cooldownRef.current && code.data !== lastCodeRef.current) {
              cooldownRef.current = true;
              lastCodeRef.current = code.data;
              
              playScanSound();
              onScan(code.data);
              setLastScannedText("Đã quét thành công!");

              setTimeout(() => {
                setLastScannedText(null);
              }, 1500);

              setTimeout(() => {
                cooldownRef.current = false;
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

  const setZoom = (value: number, track = trackRef.current) => {
    if (track) {
      try {
        track.applyConstraints({ advanced: [{ zoom: value }] } as any);
        setZoomLevel(value);
      } catch (e) {
        console.error("Zoom failed", e);
      }
    }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoom(val);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white">
          <h3 className="font-bold text-lg">Quét liên tục</h3>
          <p className="text-xs text-white/80">Di chuyển camera đến mã QR</p>
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
        <div className="absolute inset-0 border-[40px] border-black/50 z-10 flex items-center justify-center pointer-events-none">
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

        {/* Zoom Controls - Only show if supported */}
        {zoomCapabilities && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-black/40 backdrop-blur-md p-3 rounded-full flex flex-col items-center gap-4">
             <ZoomIn className="w-5 h-5 text-white" />
             <input 
                type="range" 
                orient="vertical" // Firefox specific, standard usually requires CSS rotation
                className="w-1 h-32 appearance-none bg-white/30 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                style={{ WebkitAppearance: 'slider-vertical' }}
                min={zoomCapabilities.min}
                max={zoomCapabilities.max}
                step={zoomCapabilities.step}
                value={zoomLevel}
                onChange={handleZoomChange}
             />
             <ZoomOut className="w-5 h-5 text-white" />
             <span className="text-white text-xs font-bold">{zoomLevel.toFixed(1)}x</span>
          </div>
        )}

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
         Đặt mã QR CCCD vào trong khung. <br/>
         Sử dụng thanh trượt bên phải để phóng to nếu mã QR quá nhỏ.
      </div>
    </div>
  );
};