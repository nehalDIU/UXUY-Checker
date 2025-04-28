import React from 'react';
import { useTextChecker } from '../context/TextCheckerContext';
import { Users, ArrowRight, Copy, AlertTriangle, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { UXUYAmount } from '../types';

const UXUY_AMOUNTS: UXUYAmount[] = [10, 15, 20, 30, 50];

const CheckResults: React.FC = () => {
  const { analysisResults, copyResults, selectedAmount, setSelectedAmount } = useTextChecker();

  if (!analysisResults) return null;

  const { amountGroups, duplicates, totalReferrers } = analysisResults;
  
  // Calculate total matched addresses
  const totalMatched = Array.from(amountGroups.values())
    .reduce((total, addresses) => total + addresses.length, 0);

  // Calculate mismatched addresses
  const totalMismatch = totalReferrers - totalMatched;

  // Get unique addresses with non-zero UXUY
  const uniqueAddressesWithNonZeroUXUY = new Set<string>();
  const duplicateAddresses = new Set<string>();

  // Collect all duplicate addresses in a set
  duplicates.forEach(duplicate => {
    duplicate.addresses.forEach(address => {
      duplicateAddresses.add(address);
    });
  });

  // Collect unique addresses with non-zero UXUY
  Array.from(amountGroups.entries())
    .filter(([amount]) => amount > 0)
    .forEach(([_, addresses]) => {
      addresses.forEach(address => {
        if (!duplicateAddresses.has(address)) {
          uniqueAddressesWithNonZeroUXUY.add(address);
        }
      });
    });

  // Convert to array for display
  const uniqueNonZeroAddresses = Array.from(uniqueAddressesWithNonZeroUXUY);

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold gradient-text">Analysis Results</h2>
            <div className="flex gap-2">
              <select
                value={selectedAmount || ''}
                onChange={(e) => setSelectedAmount(e.target.value ? Number(e.target.value) as UXUYAmount : null)}
                className="text-xs sm:text-sm bg-white/5 text-white rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-white/20"
              >
                <option value="">All UXUY</option>
                {UXUY_AMOUNTS.map((amount) => (
                  <option key={amount} value={amount}>{amount} UXUY</option>
                ))}
              </select>
              <button 
                onClick={copyResults}
                className="px-2 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white hover:bg-white/10"
                aria-label="Copy results"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-2 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-medium text-white">Total Input</h3>
                </div>
                <span className="px-2 py-0.5 bg-indigo-500/20 rounded text-sm text-white font-medium">
                  {totalReferrers}
                </span>
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-medium text-white">Matched</h3>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 rounded text-sm text-white font-medium">
                  {totalMatched}
                </span>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <h3 className="text-sm font-medium text-white">Mismatch</h3>
                </div>
                <span className="px-2 py-0.5 bg-red-500/20 rounded text-sm text-white font-medium">
                  {totalMismatch}
                </span>
              </div>
            </div>
          </div>
        </div>

        {duplicates.length > 0 && (
          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-1.5 text-red-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-sm font-medium">
                Duplicates Found
              </h3>
            </div>
            <div className="space-y-1.5">
              {duplicates.map((duplicate, groupIndex) => (
                <div key={groupIndex} className="space-y-1">
                  {duplicate.addresses.map((address, addressIndex) => (
                    <div 
                      key={`${groupIndex}-${addressIndex}`} 
                      className="flex justify-between items-center font-mono text-xs text-red-400 bg-red-500/10 rounded p-1.5"
                    >
                      <span className="truncate mr-2">{address}</span>
                      <span>⛔ ({duplicate.count}x)</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 p-3">
          <div className="space-y-3">
            {Array.from(amountGroups.entries())
              .filter(([amount]) => !selectedAmount || amount === selectedAmount)
              .map(([amount, addresses]) => (
                <div key={amount} className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-medium text-white">
                      {amount} UXUY • {addresses.length}
                    </h3>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                      {addresses.map((address, index) => {
                        const duplicate = duplicates.find(dup => 
                          dup.addresses.includes(address)
                        );
                        return (
                          <div 
                            key={index} 
                            className={`font-mono text-xs ${duplicate ? 'text-red-400 bg-red-500/10' : 'text-gray-400 bg-white/5'} 
                                      p-1.5 rounded flex justify-between items-center`}
                          >
                            <span className="truncate mr-2">{address}</span>
                            {duplicate && <span>⛔ ({duplicate.count}x)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Final Unique Addresses Section */}
        <div className="border-t border-white/10 p-3">
          <div className="space-y-3">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Filter className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-medium text-white">
                  Final Unique Addresses • {uniqueNonZeroAddresses.length}
                </h3>
              </div>
              <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  {uniqueNonZeroAddresses.map((address, index) => (
                    <div 
                      key={index} 
                      className="font-mono text-xs text-emerald-400 bg-emerald-500/10 p-1.5 rounded flex justify-between items-center"
                    >
                      <span className="truncate mr-2">{address}</span>
                      <span>✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckResults;