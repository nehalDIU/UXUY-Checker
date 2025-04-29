import React, { useState } from 'react';
import { useTextChecker } from '../context/TextCheckerContext';
import { Users, ArrowRight, Copy, AlertTriangle, CheckCircle2, XCircle, Filter, Eye, EyeOff, Info, Download } from 'lucide-react';
import { UXUYAmount } from '../types';
import { maskAddress, normalizeAddress, extractPatternParts, isPatternAddress } from '../utils/textAnalysis';

// Updated to include 0 as a valid UXUY amount
const UXUY_AMOUNTS: (UXUYAmount | 0)[] = [0, 10, 15, 20, 30, 50];

const CheckResults: React.FC = () => {
  const { analysisResults, copyResults, selectedAmount, setSelectedAmount } = useTextChecker();
  const [showDuplicates, setShowDuplicates] = useState<boolean>(true);
  const [duplicateFilter, setDuplicateFilter] = useState<'all' | 'exact' | 'similar'>('all');
  const [showDuplicateInfo, setShowDuplicateInfo] = useState<boolean>(false);
  const [showZeroAmount, setShowZeroAmount] = useState<boolean>(true);

  // Enhanced function to highlight matching pattern parts
  const renderPatternAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    
    // Extract the pattern parts
    const parts = extractPatternParts(address);
    
    if (!parts) {
      return address; // Fallback for addresses that don't match expected pattern
    }
    
    // Highlight first 5 chars and last 4 chars
    const firstPart = parts.firstPart;
    const middlePart = address.substring(5, address.length - 4);
    const lastPart = parts.lastPart;
    
    // Determine if this is a masked address with wildcards
    const hasMaskingChars = address.includes('*') || address.includes('&');
    
    return (
      <span className="font-mono">
        <span className="text-red-300 font-semibold">{firstPart}</span>
        <span className={hasMaskingChars ? "text-gray-500" : ""}>{middlePart}</span>
        <span className="text-red-300 font-semibold">{lastPart}</span>
      </span>
    );
  };

  // Enhanced function to explain pattern matching logic
  const renderPatternInfo = () => {
    return (
      <div className="mb-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-white">
        <p className="font-medium mb-2 text-blue-200">How Address Pattern Matching Works:</p>
        <div className="flex flex-col gap-2">
          <div>
            <p className="font-medium text-blue-300">1. Exact Duplicates</p>
            <p>Identical addresses that appear multiple times in the referrer list.</p>
          </div>
          <div>
            <p className="font-medium text-blue-300">2. Pattern Duplicates (Treated as Exact)</p>
            <p>Addresses that share the same <span className="text-yellow-300 font-medium">first 5 characters</span> and <span className="text-yellow-300 font-medium">last 4 characters</span>, regardless of what's in between. These are now treated as exact duplicates.</p>
          </div>
        </div>

        <div className="mt-3 font-mono bg-blue-500/20 p-2 rounded border border-blue-400/30">
          <p className="text-sm font-medium text-blue-200 mb-1.5">Pattern Examples:</p>
          <div className="flex items-center mb-1.5">
            <div className="w-24 text-gray-400">Format 1:</div>
            <div><span className="text-yellow-300">0x11E</span>******<span className="text-yellow-300">393F</span></div>
          </div>
          <div className="flex items-center mb-1.5">
            <div className="w-24 text-gray-400">Format 2:</div>
            <div><span className="text-yellow-300">0x11E</span>**<span className="text-yellow-300">393F</span></div>
          </div>
          <div className="flex items-center mb-1.5">
            <div className="w-24 text-gray-400">Format 3:</div>
            <div><span className="text-yellow-300">0x11E</span>******************<span className="text-yellow-300">393F</span></div>
          </div>
          <div className="flex items-center mb-1.5">
            <div className="w-24 text-gray-400">Format 4:</div>
            <div><span className="text-yellow-300">0x11E</span>bhdhG&TfvgbFVVtfBF<span className="text-yellow-300">393F</span></div>
          </div>
          <div className="flex items-center mb-1.5">
            <div className="w-24 text-gray-400">Format 5:</div>
            <div><span className="text-yellow-300">0x11E</span>bhdhG&87642TfvgbFVVtfBF<span className="text-yellow-300">393F</span></div>
          </div>
          <div className="flex items-center pt-1.5 border-t border-blue-400/30">
            <div className="w-24 text-gray-400">Pattern:</div>
            <div className="text-green-300 font-medium">0x11E393F</div>
          </div>
        </div>
        
        <p className="mt-3 text-gray-300">All these address formats match the same pattern and are now counted as exact duplicates despite having different characters in the middle.</p>
      </div>
    );
  };

  // Function to generate a downloadable CSV of duplicate addresses
  const exportDuplicatesToCSV = () => {
    if (!analysisResults || !duplicates.length) return;
    
    // Prepare CSV content
    let csvContent = "Type,Group,Address,Pattern\n";
    
    duplicates.forEach((duplicate, groupIndex) => {
      if (duplicate.addresses.length > 1 && !duplicate.isExactDuplicate) {
        // Pattern matches (not treated as exact)
        duplicate.addresses.forEach((address) => {
          csvContent += `Pattern,${groupIndex + 1},"${address}","${duplicate.pattern}"\n`;
        });
      } else {
        // Exact duplicates - including pattern matches marked as exact
        if (duplicate.addresses.length === 1) {
          csvContent += `Exact,${groupIndex + 1},"${duplicate.addresses[0]}","${duplicate.pattern}"\n`;
        } else {
          duplicate.addresses.forEach((address) => {
            csvContent += `Exact (Pattern),${groupIndex + 1},"${address}","${duplicate.pattern}"\n`;
          });
        }
      }
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'duplicate_addresses.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!analysisResults) return null;

  const { amountGroups, duplicates, totalReferrers } = analysisResults;
  
  // Calculate total matched addresses - counting all addresses in the referrer list that match with invite entries
  let totalMatched = 0;
  
  // Count by iterating through all amount groups
  Array.from(amountGroups.entries()).forEach(([_, addresses]) => {
    // Each address in the amount groups has matched with an invite entry
    totalMatched += addresses.length;
  });

  // Calculate total unique referrer addresses (excluding duplicates)
  let uniqueReferrersCount = totalReferrers;
  const countedReferrers = new Set<string>();
  
  // Adjust the unique referrer count by removing duplicates
  duplicates.forEach(duplicate => {
    if (duplicate.addresses.length === 1) {
      // For exact duplicates, subtract (count - 1) to keep only one occurrence
      uniqueReferrersCount -= (duplicate.count - 1);
    } else {
      // For pattern duplicates, subtract (count - 1) to keep only one occurrence
      uniqueReferrersCount -= (duplicate.addresses.length - 1);
    }
  });
  
  // Calculate mismatched addresses - referrers that didn't match any invite entry
  const totalMismatch = totalReferrers - totalMatched;

  // Collect all duplicate addresses in a set for easier checking
  const duplicateAddressesSet = new Set<string>();
  duplicates.forEach(duplicate => {
    duplicate.addresses.forEach(address => {
      duplicateAddressesSet.add(normalizeAddress(address));
    });
  });
  
  // Collect unique addresses with non-zero UXUY
  const uniqueAddressesWithNonZeroUXUY = new Set<string>();
  Array.from(amountGroups.entries())
    .filter(([amount]) => amount > 0)
    .forEach(([_, addresses]) => {
      addresses.forEach(address => {
        if (!duplicateAddressesSet.has(normalizeAddress(address))) {
          uniqueAddressesWithNonZeroUXUY.add(address);
        }
      });
    });

  // Convert to array for display
  const uniqueNonZeroAddresses = Array.from(uniqueAddressesWithNonZeroUXUY);

  // Filter duplicates based on selection
  const filteredDuplicates = duplicates.filter(duplicate => {
    if (duplicateFilter === 'all') return true;
    if (duplicateFilter === 'exact') {
      // Include both exact duplicates and pattern duplicates marked as exact
      return duplicate.addresses.length === 1 || duplicate.isExactDuplicate === true;
    }
    if (duplicateFilter === 'similar') {
      // Only include pattern duplicates that are not marked as exact
      return duplicate.addresses.length > 1 && duplicate.isExactDuplicate !== true;
    }
    return true;
  });

  // For tracking unique addresses across all patterns
  const addressesInPatternGroups = new Set<string>();
  
  // Collect all normalized addresses that are in pattern groups
  duplicates.forEach(duplicate => {
    if (duplicate.addresses.length > 1) {
      duplicate.addresses.forEach(address => {
        addressesInPatternGroups.add(normalizeAddress(address));
      });
    }
  });

  // Calculate total duplicates more accurately - separating exact from pattern matches
  const totalExactDuplicateGroups = duplicates.filter(dup => 
    dup.addresses.length === 1 || dup.isExactDuplicate === true
  ).length;
  
  const totalExactDuplicates = duplicates
    .filter(dup => dup.addresses.length === 1 || dup.isExactDuplicate === true)
    .reduce((total, dup) => total + dup.count, 0);
    
  // Calculate total similar addresses (with first5+last4 pattern matches that are not exact)
  const totalPatternGroups = duplicates.filter(dup => 
    dup.addresses.length > 1 && dup.isExactDuplicate !== true
  ).length;
  
  const totalSimilarAddresses = duplicates
    .filter(dup => dup.addresses.length > 1 && dup.isExactDuplicate !== true)
    .reduce((total, dup) => total + dup.addresses.length, 0);
  
  // Total duplicates is the sum of exact and pattern matches
  const totalDuplicateAddresses = totalExactDuplicates + totalSimilarAddresses;

  // Update badge counts for the info panel
  const uniqueDuplicateCounts = {
    exact: 0,
    pattern: 0,
    total: 0
  };

  // Count unique addresses in each category
  duplicates.forEach(duplicate => {
    if (duplicate.addresses.length === 1) {
      // This is an exact duplicate
      uniqueDuplicateCounts.exact += 1;
      uniqueDuplicateCounts.total += 1;
    } else {
      // This is a pattern group
      uniqueDuplicateCounts.pattern += duplicate.addresses.length;
      uniqueDuplicateCounts.total += duplicate.addresses.length;
    }
  });

  // Copy duplicates to clipboard
  const copyDuplicates = () => {
    if (!analysisResults || !duplicates.length) return;

    let formattedDuplicates = 'DUPLICATE ADDRESSES SUMMARY\n';
    formattedDuplicates += '----------------------------\n\n';
    
    // Add summary information
    formattedDuplicates += `Total Duplicates: ${totalDuplicateAddresses}\n`;
    formattedDuplicates += `Exact Duplicates: ${totalExactDuplicateGroups} groups (${totalExactDuplicates} total)\n`;
    formattedDuplicates += `Pattern Matches: ${totalPatternGroups} groups (${totalSimilarAddresses} addresses)\n\n`;
    
    if (filteredDuplicates.length === 0) {
      formattedDuplicates += 'No duplicates found with current filter.\n';
    } else {
      filteredDuplicates.forEach((duplicate, index) => {
        formattedDuplicates += `Group #${index + 1}:\n`;
        
        if (duplicate.addresses.length > 1 && !duplicate.isExactDuplicate) {
          // Pattern matches that are not exact
          formattedDuplicates += `[PATTERN MATCH] - First 5 + last 4 characters: ${duplicate.pattern}\n`;
          formattedDuplicates += `Total addresses in this pattern: ${duplicate.addresses.length}\n`;
          duplicate.addresses.forEach((address, idx) => {
            formattedDuplicates += `• ${idx + 1}. ${address}\n`;
          });
        } else if (duplicate.addresses.length > 1 && duplicate.isExactDuplicate) {
          // Pattern matches treated as exact duplicates
          formattedDuplicates += `[EXACT DUPLICATE - PATTERN GROUP] - First 5 + last 4 characters: ${duplicate.pattern}\n`;
          formattedDuplicates += `Total addresses in this group: ${duplicate.addresses.length}\n`;
          duplicate.addresses.forEach((address, idx) => {
            formattedDuplicates += `• ${idx + 1}. ${address}\n`;
          });
        } else {
          // Traditional exact duplicates
          formattedDuplicates += `[EXACT DUPLICATE] - Appears ${duplicate.count} times\n`;
          formattedDuplicates += `• ${duplicate.addresses[0]}\n`;
        }
        formattedDuplicates += '\n';
      });
    }

    navigator.clipboard.writeText(formattedDuplicates).then(() => {
      alert('Duplicates copied to clipboard!');
    });
  };

  return (
    <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg mt-4 shadow-xl overflow-hidden">
      <div className="text-white">
      
        <div className="p-3">
          <h2 className="text-lg font-medium mb-3 flex items-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-2" />
            Analysis Results
          </h2>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-2 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-violet-400" />
                  <h3 className="text-sm font-medium text-white">Total Referrers</h3>
                </div>
                <span className="px-2 py-0.5 bg-violet-500/20 rounded text-sm text-white font-medium">
                  {totalReferrers}
                  {totalReferrers > uniqueReferrersCount && (
                    <span className="text-xs ml-1 opacity-80">({uniqueReferrersCount} unique)</span>
                  )}
                </span>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-medium text-white">Unique Referrers</h3>
                </div>
                <span className="px-2 py-0.5 bg-blue-500/20 rounded text-sm text-white font-medium">
                  {uniqueReferrersCount}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-medium text-white flex items-center">
                    Matched (Incl. Dupes)
                    <span title="Includes all duplicates and addresses with matching first 5 chars (incl. 0x) and last 4 chars">
                      <Info className="w-3 h-3 ml-0.5 cursor-help" />
                    </span>
                  </h3>
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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-sm font-medium flex items-center">
                  <span>Duplicate Referrer Addresses</span>
                  <span className="ml-1.5 bg-red-500/30 text-white px-2 py-0.5 rounded-full text-xs">
                    {totalDuplicateAddresses}
                  </span>
                </h3>
                <button 
                  onClick={() => setShowDuplicateInfo(!showDuplicateInfo)}
                  className="ml-1 text-red-300 hover:text-red-200"
                  title="What are duplicates?"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowDuplicates(!showDuplicates)}
                  className="px-2 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center"
                  title={showDuplicates ? "Hide duplicates" : "Show duplicates"}
                >
                  {showDuplicates ? <><EyeOff className="w-3 h-3 mr-1" /> Hide</> : <><Eye className="w-3 h-3 mr-1" /> Show</>}
                </button>
                <button 
                  onClick={copyDuplicates}
                  className="px-2 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center"
                  title="Copy duplicates to clipboard"
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </button>
                <button 
                  onClick={exportDuplicatesToCSV}
                  className="px-2 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white hover:bg-white/10 flex items-center"
                  title="Export duplicates as CSV"
                >
                  <Download className="w-3 h-3 mr-1" /> Export
                </button>
              </div>
            </div>

            {showDuplicateInfo && (
              <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-white">
                <div className="mb-1">Duplicate Address Types:</div>
                <ul className="space-y-1">
                  <li className="flex items-center">
                    <span className="text-orange-300 font-medium mr-1.5">Exact:</span>
                    <span>Same address appears multiple times</span>
                    <span className="ml-auto bg-orange-500/30 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                      {totalExactDuplicateGroups} groups ({totalExactDuplicates} total)
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-red-300 font-medium mr-1.5">Pattern:</span>
                    <span>Addresses with same first 5 and last 4 characters</span>
                    <span className="ml-auto bg-red-500/30 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                      {totalPatternGroups} groups ({totalSimilarAddresses} addresses)
                    </span>
                  </li>
                  <li className="flex items-center mt-1 pt-1 border-t border-red-500/20">
                    <span className="font-medium mr-1.5">Total:</span>
                    <span>All duplicated addresses</span>
                    <span className="ml-auto bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                      {totalDuplicateAddresses}
                    </span>
                  </li>
                </ul>
                
                {renderPatternInfo()}
              </div>
            )}

            {showDuplicates && (
              <>
                <div className="mb-2 flex gap-2">
                  <select
                    value={duplicateFilter}
                    onChange={(e) => setDuplicateFilter(e.target.value as 'all' | 'exact' | 'similar')}
                    className="text-xs bg-white/5 text-white rounded-lg px-2 py-1 border border-white/10 focus:outline-none focus:border-white/20"
                  >
                    <option value="all">All Duplicates ({totalDuplicateAddresses})</option>
                    <option value="exact">Exact Duplicates ({totalExactDuplicateGroups} groups, {totalExactDuplicates} total)</option>
                    <option value="similar">Pattern Matches ({totalPatternGroups} groups, {totalSimilarAddresses} addresses)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  {filteredDuplicates.map((duplicate, groupIndex) => (
                    <div 
                      key={groupIndex}
                      className="bg-red-500/10 rounded p-2 mb-2"
                    >
                      {duplicate.addresses.length > 1 && !duplicate.isExactDuplicate ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-red-300 font-medium flex items-center">
                              <span>Pattern Group</span>
                              <span className="ml-1 bg-red-500/40 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                                {duplicate.addresses.length}
                              </span>
                            </span>
                            <span className="text-xs bg-red-500/20 px-1.5 py-0.5 rounded-full">First5+Last4</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mb-1 font-mono">
                            Pattern: <span className="text-yellow-300">{duplicate.pattern}</span>
                          </div>
                          <div className="space-y-1">
                            {duplicate.addresses.map((address, addrIndex) => (
                              <div 
                                key={`${groupIndex}-${addrIndex}`} 
                                className="font-mono text-xs text-red-400 bg-red-500/20 rounded p-1.5 flex justify-between items-center"
                              >
                                <span>{renderPatternAddress(address)}</span>
                                <span className="ml-2 bg-red-500/30 text-white px-1.5 py-0.5 rounded-full text-[10px] whitespace-nowrap">
                                  {addrIndex + 1} of {duplicate.addresses.length}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : duplicate.addresses.length > 1 && duplicate.isExactDuplicate ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-red-300 font-medium flex items-center">
                              <span>Pattern Group (Exact)</span>
                              <span className="mx-1 bg-red-500/40 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                                {duplicate.addresses.length}
                              </span>
                              <span>addresses</span>
                            </span>
                            <span className="text-xs bg-orange-500/20 px-1.5 py-0.5 rounded-full">Exact</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mb-1 font-mono">
                            Pattern: <span className="text-yellow-300">{duplicate.pattern}</span>
                          </div>
                          <div className="space-y-1">
                            {duplicate.addresses.map((address, addrIndex) => (
                              <div 
                                key={`${groupIndex}-${addrIndex}`} 
                                className="font-mono text-xs text-orange-400 bg-orange-500/20 rounded p-1.5 flex justify-between items-center"
                              >
                                <span>{renderPatternAddress(address)}</span>
                                <span className="ml-2 bg-orange-500/30 text-white px-1.5 py-0.5 rounded-full text-[10px] whitespace-nowrap">
                                  Exact {addrIndex + 1}/{duplicate.addresses.length}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-red-300 font-medium flex items-center">
                              <span>Appears</span>
                              <span className="mx-1 bg-red-500/40 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                                {duplicate.count}
                              </span>
                              <span>times</span>
                            </span>
                            <span className="text-xs bg-orange-500/20 px-1.5 py-0.5 rounded-full">Exact</span>
                          </div>
                          <div className="font-mono text-xs text-red-400 bg-red-500/20 rounded p-1.5 flex justify-between items-center">
                            <span>{duplicate.addresses[0]}</span>
                            <span className="ml-2 bg-red-500/30 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                              {duplicate.count}x
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white">UXUY Amounts</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowZeroAmount(!showZeroAmount)}
                className="px-2 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10"
              >
                {showZeroAmount ? "Hide 0 UXUY" : "Show 0 UXUY"}
              </button>
              <select
                value={selectedAmount || ''}
                onChange={(e) => setSelectedAmount(e.target.value ? parseInt(e.target.value) as UXUYAmount : null)}
                className="text-xs bg-white/5 text-white rounded-lg px-2 py-1 border border-white/10 focus:outline-none focus:border-white/20"
              >
                <option value="">All Amounts</option>
                {UXUY_AMOUNTS.map(amount => (
                  <option key={amount} value={amount}>{amount} UXUY</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {Array.from(amountGroups.entries())
              .filter(([amount]) => (!selectedAmount || amount === selectedAmount) && (showZeroAmount || amount > 0))
              .map(([amount, addresses]) => {
                // Remove duplicate addresses within the same amount group
                const uniqueAddresses = new Set<string>();
                const addressesWithDuplicateInfo = addresses.filter(address => {
                  const normalizedAddr = normalizeAddress(address);
                  // If we've already seen this address pattern, skip it
                  if (uniqueAddresses.has(normalizedAddr)) {
                    return false;
                  }
                  uniqueAddresses.add(normalizedAddr);
                  return true;
                });
                
                return (
                  <div key={amount} className={`${amount === 0 ? "bg-gray-500/5 border-gray-500/20" : "bg-cyan-500/5 border-cyan-500/20"} border rounded-lg p-2`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ArrowRight className={`w-4 h-4 ${amount === 0 ? "text-gray-400" : "text-cyan-400"}`} />
                      <h3 className="text-sm font-medium text-white">
                        {amount} UXUY • {addressesWithDuplicateInfo.length}
                      </h3>
                    </div>
                    {addressesWithDuplicateInfo.length > 0 && (
                      <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                        <div className="space-y-1">
                          {addressesWithDuplicateInfo.map((address, index) => {
                            const normalizedAddr = normalizeAddress(address);
                            
                            // First check for exact duplicates (same address multiple times)
                            const exactDuplicate = duplicates.find(dup => 
                              dup.addresses.length === 1 && 
                              normalizeAddress(dup.addresses[0]) === normalizedAddr
                            );
                            
                            // Then check for pattern matches (different addresses with same first5+last4)
                            // Only if not already an exact duplicate
                            const patternDuplicate = exactDuplicate ? null : duplicates.find(dup => 
                              dup.addresses.length > 1 && 
                              dup.addresses.some(dupAddr => 
                                normalizeAddress(dupAddr) === normalizedAddr
                              )
                            );
                            
                            const isDuplicate = !!exactDuplicate || !!patternDuplicate;
                            
                            // Count how many duplicates exist
                            let duplicateCount = 0;
                            let patternGroupSize = 0;
                            if (exactDuplicate) {
                              duplicateCount = exactDuplicate.count;
                            } else if (patternDuplicate) {
                              duplicateCount = 1; // This specific address appears once
                              patternGroupSize = patternDuplicate.addresses.length; // Size of the pattern group
                            }
                              
                            return (
                              <div 
                                key={index} 
                                className={`font-mono text-xs ${isDuplicate ? 'text-red-400 bg-red-500/10' : 'text-gray-400 bg-white/5'} 
                                          p-1.5 rounded flex justify-between items-center`}
                              >
                                <span className="truncate mr-2">{maskAddress(address)}</span>
                                {isDuplicate && (
                                  <div className="flex items-center">
                                    <span className="mr-1">
                                      {exactDuplicate ? 
                                        `Exact` : 
                                        `Pattern`}
                                    </span>
                                    <span className="bg-red-500/30 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap">
                                      {exactDuplicate ? 
                                        `${duplicateCount}x` : 
                                        `1 of ${patternGroupSize}`}
                                    </span>
                                    <span className="ml-1">⛔</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
                      <span className="truncate mr-2">{maskAddress(address)}</span>
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