import React from 'react';
import { useTextChecker } from '../context/TextCheckerContext';
import { Users, ArrowRight, Filter, Copy, AlertTriangle } from 'lucide-react';
import { UXUYAmount } from '../types';

const UXUY_AMOUNTS: UXUYAmount[] = [10, 15, 20, 30, 50];

const CheckResults: React.FC = () => {
  const { analysisResults, copyResults, selectedAmount, setSelectedAmount } = useTextChecker();

  if (!analysisResults) return null;

  const { totalReferrers, amountGroups, duplicates } = analysisResults;

  return (
    <div className="mt-8 sm:mt-12 animate-fadeIn">
      <div className="rounded-2xl bg-white/[0.02] backdrop-blur-xl p-4 sm:p-8 ring-1 ring-white/10 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Analysis Results
            </span>
          </h2>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-slate-900/50 rounded-xl px-3 sm:px-4 py-2 ring-1 ring-white/10 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-indigo-400" />
              <select
                value={selectedAmount || ''}
                onChange={(e) => setSelectedAmount(e.target.value ? Number(e.target.value) as UXUYAmount : null)}
                className="bg-transparent text-white text-sm focus:outline-none cursor-pointer w-full"
              >
                <option value="">All UXUY</option>
                {UXUY_AMOUNTS.map((amount) => (
                  <option key={amount} value={amount}>{amount} UXUY</option>
                ))}
              </select>
            </div>
            <button 
              onClick={copyResults}
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-xl text-sm font-medium bg-slate-900/50 ring-1 ring-white/10 text-white hover:bg-slate-900/70 transition duration-200 w-full sm:w-auto"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Results
            </button>
          </div>
        </div>

        {duplicates.length > 0 && (
          <div className="bg-red-500/10 rounded-xl p-4 sm:p-6 ring-1 ring-red-500/20 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h3 className="text-lg sm:text-xl font-medium text-white">
                Found {duplicates.length} duplicate group{duplicates.length > 1 ? 's' : ''}
              </h3>
            </div>
            <div className="font-mono space-y-2 text-sm">
              {duplicates.map((duplicate, groupIndex) => (
                <div key={groupIndex} className="space-y-1">
                  {duplicate.addresses.map((address, addressIndex) => (
                    <div 
                      key={`${groupIndex}-${addressIndex}`} 
                      className="flex justify-between items-center text-red-400 bg-red-500/5 p-2 rounded-lg break-all"
                    >
                      <span className="mr-2">{address}</span>
                      <span className="flex-shrink-0">⛔</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-900/50 rounded-xl p-4 sm:p-6 ring-1 ring-white/10 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-lg sm:text-xl font-medium text-white flex items-center gap-3">
              <Users className="h-6 w-6 text-indigo-400" />
              Total Unique Referrers
            </h3>
            <span className="px-4 sm:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full text-white font-bold text-base sm:text-lg w-full sm:w-auto text-center">
              {totalReferrers}
            </span>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {Array.from(amountGroups.entries())
            .filter(([amount]) => !selectedAmount || amount === selectedAmount)
            .map(([amount, addresses]) => (
              <div key={amount} className="bg-slate-900/50 rounded-xl p-4 sm:p-6 ring-1 ring-white/10">
                <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-indigo-400" />
                  {amount} UXUY Group • {addresses.length} Addresses
                </h3>
                <div className="bg-slate-900/80 p-3 sm:p-4 rounded-xl max-h-[240px] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 gap-2">
                    {addresses.map((address, index) => {
                      const isDuplicate = duplicates.some(dup => 
                        dup.addresses.includes(address)
                      );
                      return (
                        <div 
                          key={index} 
                          className={`font-mono text-xs sm:text-sm ${isDuplicate ? 'text-red-400' : 'text-gray-400'} py-2 px-3 rounded bg-white/5 flex justify-between items-center break-all`}
                        >
                          <span className="mr-2">{address}</span>
                          {isDuplicate && <span className="flex-shrink-0">⛔</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CheckResults;