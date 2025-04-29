import React, { useState, useMemo } from 'react';
import { useTextChecker } from '../context/TextCheckerContext';
import { BarChart3, ClipboardList, Users, Ban, AlertTriangle, CheckCircle2, Star, Info, Download, XCircle } from 'lucide-react';
import { maskAddress, normalizeAddress, getAddressMatchPattern } from '../utils/textAnalysis';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DataAnalysisReport: React.FC = () => {
  const { analysisResults, referrerText } = useTextChecker();
  const [activeTab, setActiveTab] = useState<'summary' | 'matches' | 'duplicates' | 'uxuy' | 'chart'>('summary');
  const [showDuplicateList, setShowDuplicateList] = useState<boolean>(false);
  const [showZeroUXUY, setShowZeroUXUY] = useState<boolean>(false);
  const [showTenUXUY, setShowTenUXUY] = useState<boolean>(false);
  const [showTwentyUXUY, setShowTwentyUXUY] = useState<boolean>(false);
  const [showThirtyUXUY, setShowThirtyUXUY] = useState<boolean>(false);
  const [showFiftyUXUY, setShowFiftyUXUY] = useState<boolean>(false);

  // Parse referrer addresses directly from the text
  const referrerAddresses = useMemo(() => {
    return referrerText
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim());
  }, [referrerText]);

  // Group addresses by their pattern (first 5 chars + last 4 chars)
  const addressPatternGroups = useMemo(() => {
    const patternMap = new Map<string, string[]>();
    
    referrerAddresses.forEach(address => {
      // Skip invalid addresses
      if (!address || !address.trim().startsWith('0x') || address.trim().length < 9) {
        return;
      }
      
      // Get pattern using first 5 and last 4 chars
      const pattern = getAddressMatchPattern(address);
      
      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, []);
      }
      
      patternMap.get(pattern)?.push(address);
    });
    
    // Convert to array of groups
    const groups = Array.from(patternMap.entries())
      .map(([pattern, addresses]) => ({
        pattern,
        addresses,
        count: addresses.length
      }))
      .filter(group => group.count > 1); // Only keep groups with duplicates
    
    return groups;
  }, [referrerAddresses]);

  // Calculate total number of duplicate addresses
  const totalDuplicateCount = useMemo(() => {
    // Count all addresses in pattern groups with more than one address
    return addressPatternGroups.reduce((sum, group) => {
      // Count ALL addresses in duplicate groups, not just the extras
      return sum + group.count;
    }, 0);
  }, [addressPatternGroups]);

  // Calculate total number of unique patterns
  const uniquePatternCount = useMemo(() => {
    // Count unique patterns (one address per pattern)
    return addressPatternGroups.length + 
      // Add addresses that aren't in any pattern group
      (referrerAddresses.length - addressPatternGroups.reduce((sum, group) => sum + group.count, 0));
  }, [addressPatternGroups, referrerAddresses]);

  // Calculate if an address is a duplicate (for use in multiple places)
  const isDuplicateAddress = (address: string): boolean => {
    if (!address) return false;
    // Get the pattern for this address
    const pattern = getAddressMatchPattern(address);
    // Check if this pattern appears in any group with multiple addresses
    return addressPatternGroups.some(group => group.pattern === pattern);
  };

  // Make sure matched addresses section includes ALL referrer addresses
  const enhancedAmountGroups = useMemo(() => {
    // Start with a copy of the original amount groups
    const result = new Map(analysisResults?.amountGroups || new Map());
    
    // Make sure all referrer addresses are included
    referrerAddresses.forEach(address => {
      // Check if this address already exists in any group
      const existsInGroups = Array.from(result.values()).some(addresses => 
        addresses.some((addr: string) => getAddressMatchPattern(addr) === getAddressMatchPattern(address))
      );
      
      // If it doesn't exist, add it to the 0 group (mismatched)
      if (!existsInGroups) {
        const zeroGroup = result.get(0) || [];
        if (!zeroGroup.includes(address)) {
          zeroGroup.push(address);
          result.set(0, zeroGroup);
        }
      }
    });
    
    return result;
  }, [analysisResults?.amountGroups, referrerAddresses]);

  // Calculate if an address is in amountGroups with non-zero amount
  const isMatchedAddress = (address: string): boolean => {
    if (!address) return false;
    const addressPattern = getAddressMatchPattern(address);
    
    // Check if this pattern is in any amount group with amount > 0
    for (const [amount, addresses] of enhancedAmountGroups.entries()) {
      if (amount > 0) {
        if (addresses.some((addr: string) => getAddressMatchPattern(addr) === addressPattern)) {
          return true;
        }
      }
    }
    return false;
  };

  // Get all matched addresses (with amount > 0)
  const allMatchedAddresses = useMemo(() => {
    const result: string[] = [];
    
    // Include all referrer addresses that match a pattern in any amount group > 0
    referrerAddresses.forEach(address => {
      if (isMatchedAddress(address)) {
        result.push(address);
      }
    });
    
    return result;
  }, [referrerAddresses, enhancedAmountGroups]);

  // Update match and mismatch counts
  const matchCount = allMatchedAddresses.length;
  const mismatchCount = referrerAddresses.length - matchCount;

  if (!analysisResults || !analysisResults.dataAnalysisReport) return null;

  const { 
    matchCount: oldMatchCount, 
    mismatchCount: oldMismatchCount, 
    duplicates, 
    uxuy0Addresses, 
    uxuy10Addresses,
    finalAddressCount 
  } = analysisResults.dataAnalysisReport;

  // Prepare chart data
  const chartData = {
    labels: ['Matches (incl. dupes)', 'Mismatch Count', 'Duplicate Count', '0 UXUY Count', 'Success (10 UXUY)', 'Duplicate Count'],
    datasets: [
      {
        label: 'Counts',
        data: [
          matchCount, 
          mismatchCount, 
          totalDuplicateCount,
          uxuy0Addresses.length,
          finalAddressCount.uxuy10,
          totalDuplicateCount
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',   // Match Count - Teal
          'rgba(255, 99, 132, 0.6)',   // Mismatch Count - Red
          'rgba(255, 159, 64, 0.6)',   // Duplicate Count - Orange
          'rgba(255, 205, 86, 0.6)',   // 0 UXUY Count - Yellow
          'rgba(54, 162, 235, 0.6)',   // Success - Blue
          'rgba(255, 159, 64, 0.6)',   // Duplicate Count - Orange (same as above)
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)',
          'rgb(54, 162, 235)',
          'rgb(255, 159, 64)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Data Analysis Results',
        color: 'white',
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        }
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        }
      }
    },
  };

  // Function to export data as CSV
  const exportDataToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add summary
    csvContent += "Summary\n";
    csvContent += "Total Records," + referrerAddresses.length + "\n";
    csvContent += "Unique Patterns," + uniquePatternCount + "\n";
    csvContent += "Match Count (including duplicates)," + matchCount + "\n";
    csvContent += "Mismatch Count," + mismatchCount + "\n";
    csvContent += "Duplicate Count," + totalDuplicateCount + "\n\n";
    
    // Add duplicate addresses
    csvContent += "Duplicate Addresses\nPattern,Count\n";
    addressPatternGroups.forEach(group => {
      csvContent += `"${group.pattern.slice(0, 5)}******${group.pattern.slice(-4)}",${group.count}\n`;
    });
    
    // Add UXUY classifications
    csvContent += "\nUXUY Classifications\n";
    
    // 0 UXUY addresses
    csvContent += "\n0 UXUY Addresses\nAddress\n";
    uxuy0Addresses.forEach(address => {
      csvContent += `"${address}"\n`;
    });
    
    // 10 UXUY addresses
    csvContent += "\n10 UXUY Addresses\nAddress\n";
    uxuy10Addresses.forEach(address => {
      csvContent += `"${address}"\n`;
    });
    
    // Final Address Count
    csvContent += "\nFinal Address Count\n";
    csvContent += "Total," + finalAddressCount.total + "\n";
    csvContent += "10 UXUY," + finalAddressCount.uxuy10 + "\n";
    csvContent += "20 UXUY," + finalAddressCount.uxuy20 + "\n";
    csvContent += "30 UXUY," + finalAddressCount.uxuy30 + "\n";
    
    // Create and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data_analysis_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-8 bg-gray-900 rounded-lg border border-gray-800 shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-white">Data Analysis Report</h2>
        <p className="text-gray-400 text-sm mt-1">Comparing user data with Invite Details sheet</p>
      </div>
      
      {/* Tabs navigation */}
      <div className="flex border-b border-gray-800 bg-gray-950">
        <button 
          onClick={() => setActiveTab('summary')} 
          className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'summary' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <ClipboardList className="w-4 h-4 mr-2" /> Summary
        </button>
        <button 
          onClick={() => setActiveTab('matches')} 
          className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'matches' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Users className="w-4 h-4 mr-2" /> Matches
        </button>
        <button 
          onClick={() => setActiveTab('duplicates')} 
          className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'duplicates' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Ban className="w-4 h-4 mr-2" /> Duplicates
        </button>
        <button 
          onClick={() => setActiveTab('uxuy')} 
          className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'uxuy' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <Star className="w-4 h-4 mr-2" /> UXUY
        </button>
        <button 
          onClick={() => setActiveTab('chart')} 
          className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'chart' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          <BarChart3 className="w-4 h-4 mr-2" /> Visualization
        </button>
      </div>
      
      {/* Tab content */}
      <div className="p-5">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">Matching Analysis</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Records:</span>
                    <span className="text-white font-medium">{referrerAddresses.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Unique Patterns:</span>
                    <span className="text-white font-medium">{uniquePatternCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Match Count (incl. duplicates):</span>
                    <span className="text-green-400 font-medium">{matchCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Mismatch Count:</span>
                    <span className="text-red-400 font-medium">{mismatchCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Duplicate Count:</span>
                    <span className="text-yellow-400 font-medium">{totalDuplicateCount}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">Final Address Count</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Non-Duplicate Patterns:</span>
                    <span className="text-white font-medium">{finalAddressCount.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">10 UXUY Addresses:</span>
                    <span className="text-blue-400 font-medium">{finalAddressCount.uxuy10}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">20 UXUY Addresses:</span>
                    <span className="text-blue-400 font-medium">{finalAddressCount.uxuy20}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">30 UXUY Addresses:</span>
                    <span className="text-blue-400 font-medium">{finalAddressCount.uxuy30}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={exportDataToCSV}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                <Download className="w-4 h-4 mr-2" /> Export Report
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'matches' && (
          <div>
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-400 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-blue-400 font-medium">Address Matching Rules</h4>
                  <p className="text-gray-300 text-sm mt-1">
                    Addresses are matched by comparing the first 5 digits and last 4 digits, 
                    ignoring formatting differences. All addresses with matching patterns are considered matches.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-white">Matched Addresses</h3>
                  <div className="flex items-center">
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">
                      {matchCount} matches
                    </span>
                    <span className="ml-2 text-xs text-gray-400">(including duplicates)</span>
                  </div>
                </div>
                
                {matchCount > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allMatchedAddresses.map((address: string, index: number) => {
                      // Check if address is a duplicate
                      const duplicate = isDuplicateAddress(address);
                      // Find the UXUY amount for this address pattern
                      let amount = 0;
                      const pattern = getAddressMatchPattern(address);
                      for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                        if (amt > 0 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                          amount = amt;
                          break;
                        }
                      }
                      
                      return (
                        <div key={`${address}-${index}`} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                          <div className="flex items-center overflow-hidden">
                            <div className="font-mono text-sm text-gray-300 truncate">{address}</div>
                            {duplicate && (
                              <span className="ml-2 text-xs bg-yellow-500/30 text-yellow-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                Duplicate
                              </span>
                            )}
                          </div>
                          <span className="text-green-400 text-xs font-medium">{amount} UXUY</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">No matched addresses found.</p>
                )}
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-white">Mismatched Addresses</h3>
                  <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-medium">
                    {mismatchCount} mismatches
                  </span>
                </div>
                
                {mismatchCount > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {referrerAddresses
                      .filter(address => !isMatchedAddress(address))
                      .map((address: string, index: number) => (
                        <div key={`${address}-${index}`} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                          <div className="font-mono text-sm text-gray-300 truncate overflow-hidden">{address}</div>
                          <span className="text-red-400 text-xs font-medium flex-shrink-0">No match</span>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">No mismatched addresses found.</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'duplicates' && (
          <div>
            <div className="bg-amber-900/30 border border-amber-800/50 rounded-lg p-4 mb-4 flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-400 mr-2 mt-0.5" />
              <div>
                <h4 className="text-amber-400 font-medium">Duplicate Analysis</h4>
                <p className="text-gray-300 text-sm mt-1">
                  System found {totalDuplicateCount} duplicate addresses out of {referrerAddresses.length} total addresses. 
                  Addresses are matched by comparing the first 5 digits and last 4 digits. All addresses with the same pattern are counted as duplicates.
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => setShowDuplicateList(!showDuplicateList)}
                    className="text-xs bg-amber-800/40 hover:bg-amber-800/60 text-amber-300 px-3 py-1 rounded-full transition"
                  >
                    {showDuplicateList ? 'Hide Duplicate List' : 'Show Duplicate List'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Duplicate Addresses</h3>
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-medium">
                  {totalDuplicateCount} duplicates in {addressPatternGroups.length} groups
                </span>
              </div>
              
              {addressPatternGroups.length > 0 && showDuplicateList ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {addressPatternGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-gray-700/50 rounded-lg overflow-hidden">
                      <div className="bg-gray-700 p-3 flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-gray-400">Pattern #{groupIndex + 1}:</span>
                          <span className="text-white font-mono ml-2">
                            {group.pattern.slice(0, 5)}******{group.pattern.slice(-4)}
                          </span>
                        </div>
                        <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                          {group.count} addresses
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        {group.addresses.map((address, addrIndex) => (
                          <div key={addrIndex} className="flex items-center">
                            <Ban className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" />
                            <span className="font-mono text-sm text-gray-300 truncate">{address}</span>
                            {addrIndex === 0 ? (
                              <span className="ml-auto text-xs bg-yellow-600/25 text-yellow-400 px-2 py-0.5 rounded-full flex-shrink-0">Duplicate (Kept)</span>
                            ) : (
                              <span className="ml-auto text-xs bg-red-600/25 text-red-400 px-2 py-0.5 rounded-full flex-shrink-0">Duplicate (Removed)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-10">
                  {addressPatternGroups.length === 0 
                    ? "No duplicate addresses found." 
                    : "Click 'Show Duplicate List' to view all duplicates."}
                </p>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'uxuy' && (
          <div className="space-y-4">
            {/* Determine which UXUY values exist in the data */}
            {/* Only render sections for UXUY values that have at least one address */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dynamically show only UXUY values that exist */}
              {uxuy0Addresses.length > 0 && (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="bg-gray-700 p-3 flex justify-between items-center">
                    <h3 className="text-white font-medium">0 UXUY Addresses</h3>
                    <div className="flex items-center">
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-medium mr-2">
                        {uxuy0Addresses.length} addresses
                      </span>
                      <button
                        onClick={() => setShowZeroUXUY(!showZeroUXUY)}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition"
                      >
                        {showZeroUXUY ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  
                  {showZeroUXUY && (
                    <div className="p-3 max-h-72 overflow-y-auto">
                      {uxuy0Addresses.length > 0 ? (
                        <div className="space-y-2">
                          {uxuy0Addresses.map((address, index) => (
                            <div key={index} className="flex items-center bg-gray-700/50 p-2 rounded">
                              <XCircle className="w-4 h-4 text-yellow-400 mr-2" />
                              <span className="font-mono text-sm text-gray-300 truncate overflow-hidden">{address}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-center py-4">No addresses with 0 UXUY.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {uxuy10Addresses.length > 0 && (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="bg-gray-700 p-3 flex justify-between items-center">
                    <h3 className="text-white font-medium">10 UXUY Addresses</h3>
                    <div className="flex items-center">
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-medium mr-2">
                        {uxuy10Addresses.length} addresses
                      </span>
                      <button
                        onClick={() => setShowTenUXUY(!showTenUXUY)}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition"
                      >
                        {showTenUXUY ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  
                  {showTenUXUY && (
                    <div className="p-3 max-h-72 overflow-y-auto">
                      {uxuy10Addresses.length > 0 ? (
                        <div className="space-y-2">
                          {uxuy10Addresses.map((address, index) => (
                            <div key={index} className="flex items-center bg-gray-700/50 p-2 rounded">
                              <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2" />
                              <span className="font-mono text-sm text-gray-300 truncate overflow-hidden">{address}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-center py-4">No addresses with 10 UXUY.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 20 UXUY - Only show if there are addresses with 20 UXUY */}
              {finalAddressCount.uxuy20 > 0 && (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="bg-gray-700 p-3 flex justify-between items-center">
                    <h3 className="text-white font-medium">20 UXUY Addresses</h3>
                    <div className="flex items-center">
                      <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-medium mr-2">
                        {finalAddressCount.uxuy20} addresses
                      </span>
                      <button
                        onClick={() => setShowTwentyUXUY(!showTwentyUXUY)}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition"
                      >
                        {showTwentyUXUY ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  
                  {showTwentyUXUY && (
                    <div className="p-3 max-h-72 overflow-y-auto">
                      <div className="space-y-2">
                        {/* Find addresses with 20 UXUY from amountGroups */}
                        {Array.from(allMatchedAddresses)
                          .filter(address => {
                            // Get the UXUY amount for this address
                            const pattern = getAddressMatchPattern(address);
                            for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                              if (amt === 20 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                                return true;
                              }
                            }
                            return false;
                          })
                          .map((address, index) => (
                            <div key={index} className="flex items-center bg-gray-700/50 p-2 rounded">
                              <CheckCircle2 className="w-4 h-4 text-purple-400 mr-2" />
                              <span className="font-mono text-sm text-gray-300 truncate overflow-hidden">{address}</span>
                            </div>
                          ))
                        }
                      </div>
                      {finalAddressCount.uxuy20 === 0 && (
                        <p className="text-gray-400 text-center py-4">No addresses with 20 UXUY.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* 30 UXUY - Only show if there are addresses with 30 UXUY */}
              {finalAddressCount.uxuy30 > 0 && (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="bg-gray-700 p-3 flex justify-between items-center">
                    <h3 className="text-white font-medium">30 UXUY Addresses</h3>
                    <div className="flex items-center">
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium mr-2">
                        {finalAddressCount.uxuy30} addresses
                      </span>
                      <button
                        onClick={() => setShowThirtyUXUY(!showThirtyUXUY)}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition"
                      >
                        {showThirtyUXUY ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  
                  {showThirtyUXUY && (
                    <div className="p-3 max-h-72 overflow-y-auto">
                      <div className="space-y-2">
                        {/* Find addresses with 30 UXUY from amountGroups */}
                        {Array.from(allMatchedAddresses)
                          .filter(address => {
                            // Get the UXUY amount for this address
                            const pattern = getAddressMatchPattern(address);
                            for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                              if (amt === 30 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                                return true;
                              }
                            }
                            return false;
                          })
                          .map((address, index) => (
                            <div key={index} className="flex items-center bg-gray-700/50 p-2 rounded">
                              <CheckCircle2 className="w-4 h-4 text-green-400 mr-2" />
                              <span className="font-mono text-sm text-gray-300 truncate overflow-hidden">{address}</span>
                            </div>
                          ))
                        }
                      </div>
                      {finalAddressCount.uxuy30 === 0 && (
                        <p className="text-gray-400 text-center py-4">No addresses with 30 UXUY.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              {/* 50 UXUY - Only show if there are addresses with 50 UXUY */}
              {(() => {
                // Check if there are any addresses with 50 UXUY
                const has50UXUYAddresses = Array.from(allMatchedAddresses).some(address => {
                  const pattern = getAddressMatchPattern(address);
                  for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                    if (amt === 50 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                      return true;
                    }
                  }
                  return false;
                });
                
                // Only render if there are 50 UXUY addresses
                return has50UXUYAddresses && (
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="bg-gray-700 p-3 flex justify-between items-center">
                      <h3 className="text-white font-medium">50 UXUY Addresses</h3>
                      <div className="flex items-center">
                        <span className="bg-pink-500/20 text-pink-400 px-2 py-1 rounded text-xs font-medium mr-2">
                          {/* Count 50 UXUY addresses */}
                          {Array.from(allMatchedAddresses).filter(address => {
                            const pattern = getAddressMatchPattern(address);
                            for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                              if (amt === 50 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                                return true;
                              }
                            }
                            return false;
                          }).length} addresses
                        </span>
                        <button
                          onClick={() => setShowFiftyUXUY(!showFiftyUXUY)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition"
                        >
                          {showFiftyUXUY ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    
                    {showFiftyUXUY && (
                      <div className="p-3 max-h-72 overflow-y-auto">
                        <div className="space-y-2">
                          {/* Find addresses with 50 UXUY from amountGroups */}
                          {Array.from(allMatchedAddresses)
                            .filter(address => {
                              // Get the UXUY amount for this address
                              const pattern = getAddressMatchPattern(address);
                              for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                                if (amt === 50 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                                  return true;
                                }
                              }
                              return false;
                            })
                            .map((address, index) => (
                              <div key={index} className="flex items-center bg-gray-700/50 p-2 rounded">
                                <CheckCircle2 className="w-4 h-4 text-pink-400 mr-2" />
                                <span className="font-mono text-sm text-gray-300 truncate overflow-hidden">{address}</span>
                              </div>
                            ))
                          }
                        </div>
                        {Array.from(allMatchedAddresses).filter(address => {
                          const pattern = getAddressMatchPattern(address);
                          for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                            if (amt === 50 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                              return true;
                            }
                          }
                          return false;
                        }).length === 0 && (
                          <p className="text-gray-400 text-center py-4">No addresses with 50 UXUY.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-3">Final UXUY Distribution</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <div className="bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Non-Duplicates</div>
                  <div className="text-xl font-bold text-white">{finalAddressCount.total}</div>
                </div>
                
                {/* Only show UXUY amounts that have at least one address */}
                {finalAddressCount.uxuy10 > 0 && (
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">10 UXUY</div>
                    <div className="text-xl font-bold text-blue-400">{finalAddressCount.uxuy10}</div>
                  </div>
                )}
                {finalAddressCount.uxuy20 > 0 && (
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">20 UXUY</div>
                    <div className="text-xl font-bold text-purple-400">{finalAddressCount.uxuy20}</div>
                  </div>
                )}
                {finalAddressCount.uxuy30 > 0 && (
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">30 UXUY</div>
                    <div className="text-xl font-bold text-green-400">{finalAddressCount.uxuy30}</div>
                  </div>
                )}
                
                {/* Only show 50 UXUY if there are addresses with 50 UXUY */}
                {(() => {
                  // Check if there are any addresses with 50 UXUY
                  const has50UXUYAddresses = Array.from(allMatchedAddresses).some(address => {
                    const pattern = getAddressMatchPattern(address);
                    for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                      if (amt === 50 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                        return true;
                      }
                    }
                    return false;
                  });
                  
                  return has50UXUYAddresses && (
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">50 UXUY</div>
                      <div className="text-xl font-bold text-pink-400">
                        {Array.from(allMatchedAddresses).filter(address => {
                          const pattern = getAddressMatchPattern(address);
                          for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                            if (amt === 50 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                              return true;
                            }
                          }
                          return false;
                        }).length}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'chart' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">Data Visualization</h3>
            <div className="h-80">
              <Bar data={chartData} options={chartOptions} />
            </div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[rgba(75,192,192,0.6)] mr-2"></div>
                <span className="text-gray-300">Matches (incl. dupes): {matchCount}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[rgba(255,99,132,0.6)] mr-2"></div>
                <span className="text-gray-300">Mismatch Count: {mismatchCount}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[rgba(255,159,64,0.6)] mr-2"></div>
                <span className="text-gray-300">Duplicate Count: {totalDuplicateCount}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[rgba(255,205,86,0.6)] mr-2"></div>
                <span className="text-gray-300">0 UXUY Count: {uxuy0Addresses.length}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[rgba(54,162,235,0.6)] mr-2"></div>
                <span className="text-gray-300">Success (10 UXUY): {finalAddressCount.uxuy10}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[rgba(255,159,64,0.6)] mr-2"></div>
                <span className="text-gray-300">Duplicate Data: {totalDuplicateCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataAnalysisReport; 