import React from 'react';
import { QRDataField } from '../types';
import { CheckCircle2, User, CreditCard } from 'lucide-react';

interface ResultCardProps {
  data: QRDataField[];
  index: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, index }) => {
  if (data.length === 0) return null;

  // Find key fields for the header summary
  const name = data.find(f => f.label.toLowerCase().includes('tên'))?.value || `Người thứ ${index + 1}`;
  const id = data.find(f => f.label.toLowerCase().includes('số') || f.label.toLowerCase().includes('cccd'))?.value || '---';

  return (
    <div className="bg-white w-full rounded-xl shadow-md overflow-hidden animate-fade-in-up border border-gray-100 hover:shadow-lg transition-shadow duration-300">
      <div className="bg-gradient-to-r from-[#c99a2c] to-[#e0b145] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <div className="bg-white/20 p-1.5 rounded-full">
             <User className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm truncate max-w-[200px]">{name}</span>
        </div>
        <div className="text-white/90 text-xs font-mono bg-black/10 px-2 py-1 rounded">
          {id}
        </div>
      </div>
      
      <div className="p-4">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <tbody className="divide-y divide-gray-100">
              {data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-2 font-medium text-gray-500 w-1/3 text-xs uppercase tracking-wide">
                    {item.label}
                  </td>
                  <td className="py-2 px-2 text-gray-900 font-medium break-all">
                    {item.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};