import React, { useState, useRef } from 'react';
import { Upload, Scan, Loader2, Download, Trash2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { decodeQRFromImage } from './utils/qrDecoder';
import { parseWithGemini } from './services/geminiService';
import { exportToExcel } from './utils/excelUtils';
import { ResultCard } from './components/ResultCard';
import { LiveScanner } from './components/LiveScanner';
import { ParsingStatus, QRDataField } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<ParsingStatus>(ParsingStatus.IDLE);
  const [scannedResults, setScannedResults] = useState<QRDataField[][]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [processingCount, setProcessingCount] = useState({ current: 0, total: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Process a single raw string from QR ---
  const processQRData = async (rawText: string) => {
    try {
      setStatus(ParsingStatus.PROCESSING);
      const parsedResult = await parseWithGemini(rawText);
      const uiData = parsedResult.fields.map(f => ({ label: f.key, value: f.value }));
      
      setScannedResults(prev => [uiData, ...prev]); // Add new result to top
    } catch (error) {
      console.error(error);
    } finally {
      setStatus(ParsingStatus.IDLE);
    }
  };

  // --- Handle File Upload (Multiple) ---
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setStatus(ParsingStatus.PROCESSING);
    setProcessingCount({ current: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      setProcessingCount(prev => ({ ...prev, current: i + 1 }));
      try {
        const rawText = await decodeQRFromImage(files[i]);
        await processQRData(rawText);
      } catch (error) {
        console.warn(`Skipping file ${i}:`, error);
      }
    }
    
    setStatus(ParsingStatus.SUCCESS);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
  };

  // --- Handle Camera Scan ---
  const handleCameraScan = async (rawText: string) => {
    await processQRData(rawText);
  };

  const confirmDelete = () => {
    setScannedResults([]);
    setStatus(ParsingStatus.IDLE);
    setProcessingCount({ current: 0, total: 0 });
    setShowDeleteConfirm(false);
  };

  return (
    <div className="min-h-screen bg-[#8B0000] flex flex-col items-center p-4 font-sans">
      {/* Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
         <svg className="absolute top-0 right-0 w-96 h-96 text-white/10" viewBox="0 0 200 200">
            <path fill="currentColor" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.3,82.1,22.9,71.3,34.6C60.5,46.4,50.3,56.3,38.6,63.6C26.9,70.9,13.7,75.6,-0.6,76.6C-14.9,77.6,-28.5,74.9,-40.8,67.8C-53.1,60.7,-64.1,49.2,-72.1,35.9C-80.1,22.6,-85.1,7.5,-83.4,-6.9C-81.7,-21.3,-73.3,-35,-62.4,-45.5C-51.5,-56,-38.1,-63.3,-24.6,-70.9C-11.1,-78.5,2.5,-86.4,15.9,-86.2C29.3,-86,42.4,-77.7,44.7,-76.4Z" transform="translate(100 100)" />
         </svg>
      </div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-2 drop-shadow-md">
            Quét QR Căn Cước
          </h1>
          <p className="text-white/80 text-sm">Trích xuất thông tin nhanh chóng bằng AI</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group relative overflow-hidden bg-white hover:bg-gray-50 text-[#8B0000] rounded-2xl p-6 shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
          >
            <div className="bg-[#8B0000]/10 p-4 rounded-full group-hover:bg-[#8B0000]/20 transition-colors">
              <ImageIcon className="w-8 h-8 text-[#8B0000]" />
            </div>
            <span className="font-bold text-lg">Tải Ảnh Lên</span>
            <span className="text-xs text-gray-500 text-center">Hỗ trợ chọn nhiều ảnh</span>
          </button>

          <button 
            onClick={() => setIsCameraOpen(true)}
            className="group relative overflow-hidden bg-[#c99a2c] hover:bg-[#d4a535] text-white rounded-2xl p-6 shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
          >
             <div className="bg-white/20 p-4 rounded-full group-hover:bg-white/30 transition-colors">
              <Scan className="w-8 h-8 text-white" />
            </div>
            <span className="font-bold text-lg">Quét Camera</span>
            <span className="text-xs text-white/80 text-center">Quét liên tục</span>
          </button>
        </div>

        {/* Hidden Input */}
        <input 
          type="file" 
          accept="image/*" 
          multiple
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange} 
        />

        {/* Processing Indicator */}
        {status === ParsingStatus.PROCESSING && (
          <div className="bg-white/90 backdrop-blur rounded-xl p-4 mb-6 shadow-lg flex items-center gap-4 animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-[#c99a2c]" />
            <div className="flex-1">
              <p className="font-semibold text-gray-800">Đang xử lý dữ liệu...</p>
              {processingCount.total > 1 ? (
                <p className="text-xs text-gray-500">Đang xử lý ảnh {processingCount.current} / {processingCount.total}</p>
              ) : (
                <p className="text-xs text-gray-500">Đang phân tích thông tin từ AI...</p>
              )}
            </div>
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 flex flex-col">
          {scannedResults.length > 0 && (
            <div className="flex items-center justify-between mb-4 text-white">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <span className="bg-white text-[#8B0000] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {scannedResults.length}
                </span>
                Danh sách đã quét
              </h2>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-white/70 hover:text-white text-sm flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Xóa tất cả
              </button>
            </div>
          )}

          <div className="space-y-4 pb-24">
            {scannedResults.map((result, index) => (
              <ResultCard key={index} index={scannedResults.length - 1 - index} data={result} />
            ))}
            
            {scannedResults.length === 0 && status !== ParsingStatus.PROCESSING && (
              <div className="text-center text-white/40 py-10 border-2 border-dashed border-white/20 rounded-2xl">
                <p>Chưa có dữ liệu nào.</p>
                <p className="text-sm">Hãy chọn ảnh hoặc quét camera để bắt đầu.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Action Bar for Export */}
        {scannedResults.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
            <button
              onClick={() => exportToExcel(scannedResults)}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold py-4 rounded-xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 hover:from-emerald-500 hover:to-green-500 active:scale-95 transition-all transform hover:-translate-y-1 border border-white/10"
            >
              <Download className="w-6 h-6" />
              Xuất Excel ({scannedResults.length})
            </button>
          </div>
        )}
      </div>

      {/* Live Scanner Modal */}
      {isCameraOpen && (
        <LiveScanner 
          onScan={handleCameraScan} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Xác nhận xóa</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa toàn bộ <b>{scannedResults.length} bản ghi</b> đã quét? <br/>
              Hành động này không thể hoàn tác.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;