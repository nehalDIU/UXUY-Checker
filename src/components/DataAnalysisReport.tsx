import React, { useState, useMemo } from 'react';
import { useTextChecker } from '../context/TextCheckerContext';
import { BarChart3, ClipboardList, Users, Ban, AlertTriangle, CheckCircle2, Star, Info, Download, XCircle } from 'lucide-react';
import { maskAddress, normalizeAddress, getAddressMatchPattern } from '../utils/textAnalysis';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Add no-scrollbar utility class
const noScrollbarStyles = `
  /* Hide scrollbar for Chrome, Safari and Opera */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  .no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
`;

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
    labels: ['Matches', 'Mismatches', 'Duplicates', '0 UXUY', '10 UXUY', 'Dupe Data'],
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
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Data Analysis Results',
        color: 'white',
        font: {
          size: 14,
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
          font: {
            size: 10,
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        }
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10,
          },
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

  // Example for 0 UXUY section in the UXUY tab
  const UXUYSection = ({ 
    amount, 
    addresses, 
    color, 
    isVisible, 
    toggleVisibility 
  }: { 
    amount: number, 
    addresses: string[], 
    color: string, 
    isVisible: boolean, 
    toggleVisibility: () => void 
  }) => (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-gray-700 p-2 sm:p-3 flex justify-between items-center">
        <h3 className="text-sm text-white font-medium">{amount} UXUY Addresses</h3>
        <div className="flex items-center">
          <span className={`bg-${color}-500/20 text-${color}-400 px-1.5 py-0.5 rounded text-xs font-medium mr-1.5 sm:mr-2`}>
            {addresses.length} addresses
          </span>
          <button
            onClick={toggleVisibility}
            className="text-[10px] sm:text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded transition"
          >
            {isVisible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      
      {isVisible && (
        <div className="p-2 sm:p-3 max-h-40 sm:max-h-60 overflow-y-auto no-scrollbar">
          {addresses.length > 0 ? (
            <div className="space-y-1.5">
              {addresses.map((address, index) => (
                <div key={index} className="flex items-center bg-gray-700/50 p-1.5 sm:p-2 rounded">
                  {amount === 0 ? (
                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 mr-1.5" />
                  ) : (
                    <CheckCircle2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-${color}-400 mr-1.5`} />
                  )}
                  <span className="font-mono text-xs text-gray-300 truncate overflow-hidden">
                    {address.slice(0, 8)}...{address.slice(-8)}
                    <span className="hidden sm:inline">{address.slice(8, -8)}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-3 text-xs">No addresses with {amount} UXUY.</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Add the no-scrollbar styles */}
      <style dangerouslySetInnerHTML={{ __html: noScrollbarStyles }} />
      
      <div className="mt-3 sm:mt-8 bg-gray-900 rounded-lg border border-gray-800 shadow-lg overflow-hidden w-full">
        <div className="p-3 sm:p-4 border-b border-gray-800">
          <h2 className="text-lg sm:text-xl font-bold text-white">Data Analysis Report</h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Comparing user data with Invite Details sheet</p>
        </div>
        
        {/* Tabs navigation */}
        <div className="flex flex-wrap border-b border-gray-800 bg-gray-950 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('summary')} 
            className={`flex items-center px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors duration-150 ${activeTab === 'summary' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/20'}`}
          >
            <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="whitespace-nowrap">Summary</span>
          </button>
          <button 
            onClick={() => setActiveTab('matches')} 
            className={`flex items-center px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors duration-150 ${activeTab === 'matches' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/20'}`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="whitespace-nowrap">Matches</span>
          </button>
          <button 
            onClick={() => setActiveTab('duplicates')} 
            className={`flex items-center px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors duration-150 ${activeTab === 'duplicates' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/20'}`}
          >
            <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="whitespace-nowrap">Duplicates</span>
          </button>
          <button 
            onClick={() => setActiveTab('uxuy')} 
            className={`flex items-center px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors duration-150 ${activeTab === 'uxuy' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/20'}`}
          >
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="whitespace-nowrap">UXUY</span>
          </button>
          <button 
            onClick={() => setActiveTab('chart')} 
            className={`flex items-center px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors duration-150 ${activeTab === 'chart' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/20'}`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="whitespace-nowrap">Visualization</span>
          </button>
        </div>
        
        {/* Tab content */}
        <div className="p-3 sm:p-5">
          {activeTab === 'summary' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm">
                  <h3 className="text-sm sm:text-base md:text-lg font-medium text-white flex items-center mb-2 sm:mb-3">
                    <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-blue-400" />
                    Matching Analysis
                  </h3>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                      <span className="text-xs sm:text-sm text-gray-400">Total Records:</span>
                      <span className="text-xs sm:text-sm text-white font-medium">{referrerAddresses.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                      <span className="text-xs sm:text-sm text-gray-400">Unique Patterns:</span>
                      <span className="text-xs sm:text-sm text-white font-medium">{uniquePatternCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                      <span className="text-xs sm:text-sm text-gray-400">Match Count:</span>
                      <span className="text-xs sm:text-sm text-green-400 font-medium">{matchCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                      <span className="text-xs sm:text-sm text-gray-400">Mismatch Count:</span>
                      <span className="text-xs sm:text-sm text-red-400 font-medium">{mismatchCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs sm:text-sm text-gray-400">Duplicate Count:</span>
                      <span className="text-xs sm:text-sm text-yellow-400 font-medium">{totalDuplicateCount}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm">
                  <h3 className="text-sm sm:text-base md:text-lg font-medium text-white flex items-center mb-2 sm:mb-3">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-blue-400" />
                    Final Address Count
                  </h3>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                      <span className="text-xs sm:text-sm text-gray-400">Total Non-Duplicate Patterns:</span>
                      <span className="text-xs sm:text-sm text-white font-medium">{finalAddressCount.total}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                      <span className="text-xs sm:text-sm text-gray-400">10 UXUY Addresses:</span>
                      <span className="text-xs sm:text-sm text-blue-400 font-medium">{finalAddressCount.uxuy10}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-700/50">
                      <span className="text-xs sm:text-sm text-gray-400">20 UXUY Addresses:</span>
                      <span className="text-xs sm:text-sm text-purple-400 font-medium">{finalAddressCount.uxuy20}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs sm:text-sm text-gray-400">30 UXUY Addresses:</span>
                      <span className="text-xs sm:text-sm text-green-400 font-medium">{finalAddressCount.uxuy30}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={exportDataToCSV}
                  className="flex items-center px-3 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-md hover:bg-blue-700 active:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Export Report
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'matches' && (
            <div>
              <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-2.5 sm:p-4 mb-3 sm:mb-4">
                <div className="flex items-start">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-blue-400 font-medium text-xs sm:text-sm">Address Matching Rules</h4>
                    <p className="text-gray-300 text-xs mt-0.5 sm:mt-1">
                      Addresses are matched by first 5 and last 4 digits, 
                      ignoring formatting. Matching patterns are considered matches.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-gray-800 rounded-lg p-2.5 sm:p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3 space-y-1 sm:space-y-0">
                    <h3 className="text-sm sm:text-base font-medium text-white flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 text-green-400" />
                      Matched Addresses
                    </h3>
                    <div className="flex items-center">
                      <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                        {matchCount} matches
                      </span>
                      <span className="ml-2 text-xs text-gray-400">(incl. dupes)</span>
                    </div>
                  </div>
                  
                  {matchCount > 0 ? (
                    <div className="space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-60 overflow-y-auto touch-auto rounded-md">
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
                          <div key={`${address}-${index}`} className="flex justify-between items-center bg-gray-700/50 p-1.5 sm:p-2 rounded">
                            <div className="flex items-center overflow-hidden">
                              <div className="font-mono text-xs text-gray-300 truncate max-w-[180px] sm:max-w-none">
                                {address.slice(0, 8)}...{address.slice(-8)}
                                <span className="hidden sm:inline">{address.slice(8, -8)}</span>
                              </div>
                              {duplicate && (
                                <span className="ml-1.5 text-[10px] sm:text-xs bg-yellow-500/30 text-yellow-400 px-1 py-0.5 rounded-full flex-shrink-0">
                                  Dupe
                                </span>
                              )}
                            </div>
                            <span className="text-green-400 text-xs font-medium ml-1">{amount} UXUY</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4 text-xs sm:text-sm">No matched addresses found.</p>
                  )}
                </div>
                
                <div className="bg-gray-800 rounded-lg p-2.5 sm:p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3 space-y-1 sm:space-y-0">
                    <h3 className="text-sm sm:text-base font-medium text-white flex items-center">
                      <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 text-red-400" />
                      Mismatched Addresses
                    </h3>
                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-medium self-start sm:self-auto">
                      {mismatchCount} mismatches
                    </span>
                  </div>
                  
                  {mismatchCount > 0 ? (
                    <div className="space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-60 overflow-y-auto touch-auto rounded-md">
                      {referrerAddresses
                        .filter(address => !isMatchedAddress(address))
                        .map((address: string, index: number) => (
                          <div key={`${address}-${index}`} className="flex justify-between items-center bg-gray-700/50 p-1.5 sm:p-2 rounded">
                            <div className="font-mono text-xs text-gray-300 truncate max-w-[180px] sm:max-w-none">
                              {address.slice(0, 8)}...{address.slice(-8)}
                              <span className="hidden sm:inline">{address.slice(8, -8)}</span>
                            </div>
                            <span className="text-red-400 text-xs font-medium flex-shrink-0 ml-1.5">No match</span>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4 text-xs sm:text-sm">No mismatched addresses found.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'duplicates' && (
            <div>
              <div className="bg-amber-900/30 border border-amber-800/50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 flex flex-col sm:flex-row items-start">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-amber-400 font-medium text-sm sm:text-base">Duplicate Analysis</h4>
                  <p className="text-gray-300 text-xs sm:text-sm mt-1">
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
              
              <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                  <h3 className="text-base sm:text-lg font-medium text-white">Duplicate Addresses</h3>
                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-medium">
                    {totalDuplicateCount} duplicates in {addressPatternGroups.length} groups
                  </span>
                </div>
                
                {addressPatternGroups.length > 0 && showDuplicateList ? (
                  <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                    {addressPatternGroups.map((group, groupIndex) => (
                      <div key={groupIndex} className="bg-gray-700/50 rounded-lg overflow-hidden">
                        <div className="bg-gray-700 p-2 sm:p-3 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-400">Pattern #{groupIndex + 1}:</span>
                            <span className="text-white font-mono ml-2">
                              {group.pattern.slice(0, 5)}******{group.pattern.slice(-4)}
                            </span>
                          </div>
                          <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs self-start sm:self-auto">
                            {group.count} addresses
                          </span>
                        </div>
                        <div className="p-2 sm:p-3 space-y-2">
                          {group.addresses.map((address, addrIndex) => (
                            <div key={addrIndex} className="flex items-center">
                              <Ban className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" />
                              <span className="font-mono text-xs sm:text-sm text-gray-300 truncate">{address}</span>
                              {addrIndex === 0 ? (
                                <span className="ml-auto text-xs bg-yellow-600/25 text-yellow-400 px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block">Duplicate (Kept)</span>
                              ) : (
                                <span className="ml-auto text-xs bg-red-600/25 text-red-400 px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block">Duplicate (Removed)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8 sm:py-10 text-sm">
                    {addressPatternGroups.length === 0 
                      ? "No duplicate addresses found." 
                      : "Click 'Show Duplicate List' to view all duplicates."}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'uxuy' && (
            <div className="space-y-3 sm:space-y-4">            
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Use the new UXUYSection component */}
                {uxuy0Addresses.length > 0 && (
                  <UXUYSection 
                    amount={0} 
                    addresses={uxuy0Addresses} 
                    color="yellow" 
                    isVisible={showZeroUXUY} 
                    toggleVisibility={() => setShowZeroUXUY(!showZeroUXUY)} 
                  />
                )}
                
                {uxuy10Addresses.length > 0 && (
                  <UXUYSection 
                    amount={10} 
                    addresses={uxuy10Addresses} 
                    color="blue" 
                    isVisible={showTenUXUY} 
                    toggleVisibility={() => setShowTenUXUY(!showTenUXUY)} 
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* 20 UXUY */}
                {finalAddressCount.uxuy20 > 0 && (
                  <UXUYSection 
                    amount={20} 
                    addresses={Array.from(allMatchedAddresses).filter(address => {
                      const pattern = getAddressMatchPattern(address);
                      for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                        if (amt === 20 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                          return true;
                        }
                      }
                      return false;
                    })} 
                    color="purple" 
                    isVisible={showTwentyUXUY} 
                    toggleVisibility={() => setShowTwentyUXUY(!showTwentyUXUY)} 
                  />
                )}
                
                {/* 30 UXUY */}
                {finalAddressCount.uxuy30 > 0 && (
                  <UXUYSection 
                    amount={30} 
                    addresses={Array.from(allMatchedAddresses).filter(address => {
                      const pattern = getAddressMatchPattern(address);
                      for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                        if (amt === 30 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                          return true;
                        }
                      }
                      return false;
                    })} 
                    color="green" 
                    isVisible={showThirtyUXUY} 
                    toggleVisibility={() => setShowThirtyUXUY(!showThirtyUXUY)} 
                  />
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {/* 50 UXUY */}
                {(() => {
                  const addresses50UXUY = Array.from(allMatchedAddresses).filter(address => {
                    const pattern = getAddressMatchPattern(address);
                    for (const [amt, addrs] of enhancedAmountGroups.entries()) {
                      if (amt === 50 && addrs.some((a: string) => getAddressMatchPattern(a) === pattern)) {
                        return true;
                      }
                    }
                    return false;
                  });
                  
                  return addresses50UXUY.length > 0 && (
                    <UXUYSection 
                      amount={50} 
                      addresses={addresses50UXUY} 
                      color="pink" 
                      isVisible={showFiftyUXUY} 
                      toggleVisibility={() => setShowFiftyUXUY(!showFiftyUXUY)} 
                    />
                  );
                })()}
              </div>
              
              <div className="bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm">
                <h3 className="text-sm sm:text-base font-medium text-white flex items-center mb-2 sm:mb-3">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-yellow-400" />
                  Final UXUY Distribution
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                  <div className="bg-gray-700/50 p-2 sm:p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Total Non-Duplicates</div>
                    <div className="text-base sm:text-lg md:text-xl font-bold text-white">{finalAddressCount.total}</div>
                  </div>
                  
                  {/* Only show UXUY amounts that have at least one address */}
                  {finalAddressCount.uxuy10 > 0 && (
                    <div className="bg-gray-700/50 p-2 sm:p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">10 UXUY</div>
                      <div className="text-base sm:text-lg md:text-xl font-bold text-blue-400">{finalAddressCount.uxuy10}</div>
                    </div>
                  )}
                  {finalAddressCount.uxuy20 > 0 && (
                    <div className="bg-gray-700/50 p-2 sm:p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">20 UXUY</div>
                      <div className="text-base sm:text-lg md:text-xl font-bold text-purple-400">{finalAddressCount.uxuy20}</div>
                    </div>
                  )}
                  {finalAddressCount.uxuy30 > 0 && (
                    <div className="bg-gray-700/50 p-2 sm:p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">30 UXUY</div>
                      <div className="text-base sm:text-lg md:text-xl font-bold text-green-400">{finalAddressCount.uxuy30}</div>
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
                      <div className="bg-gray-700/50 p-2 sm:p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">50 UXUY</div>
                        <div className="text-base sm:text-lg md:text-xl font-bold text-pink-400">
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
            <div className="bg-gray-800 rounded-lg p-2.5 sm:p-4 shadow-sm">
              <h3 className="text-sm sm:text-base md:text-lg font-medium text-white flex items-center mb-2 sm:mb-4">
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-blue-400" />
                Data Visualization
              </h3>
              <div className="h-48 sm:h-56 md:h-64 lg:h-80 mb-2">
                <Bar data={chartData} options={chartOptions} />
              </div>
              <div className="mt-3 sm:mt-4 md:mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 text-xs sm:text-sm">
                <div className="flex items-center bg-gray-900/30 p-1.5 rounded-md">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[rgba(75,192,192,0.6)] mr-1.5 rounded-sm"></div>
                  <span className="text-gray-300">Matches: {matchCount}</span>
                </div>
                <div className="flex items-center bg-gray-900/30 p-1.5 rounded-md">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[rgba(255,99,132,0.6)] mr-1.5 rounded-sm"></div>
                  <span className="text-gray-300">Mismatches: {mismatchCount}</span>
                </div>
                <div className="flex items-center bg-gray-900/30 p-1.5 rounded-md">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[rgba(255,159,64,0.6)] mr-1.5 rounded-sm"></div>
                  <span className="text-gray-300">Duplicates: {totalDuplicateCount}</span>
                </div>
                <div className="flex items-center bg-gray-900/30 p-1.5 rounded-md">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[rgba(255,205,86,0.6)] mr-1.5 rounded-sm"></div>
                  <span className="text-gray-300">0 UXUY: {uxuy0Addresses.length}</span>
                </div>
                <div className="flex items-center bg-gray-900/30 p-1.5 rounded-md">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[rgba(54,162,235,0.6)] mr-1.5 rounded-sm"></div>
                  <span className="text-gray-300">10 UXUY: {finalAddressCount.uxuy10}</span>
                </div>
                <div className="flex items-center bg-gray-900/30 p-1.5 rounded-md">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[rgba(255,159,64,0.6)] mr-1.5 rounded-sm"></div>
                  <span className="text-gray-300">Dupe Data: {totalDuplicateCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DataAnalysisReport; 