import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown, Search, ArrowLeft, ArrowRight, Download, Filter, Info, SlidersHorizontal, X } from 'lucide-react';
import { useTextChecker } from '../context/TextCheckerContext';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { normalizeAddress, maskAddress } from '../utils/textAnalysis';

// Add CSS utility for extra small text
// This can be done in tailwind.config.js in a real project, but for this example
// we'll just add the style directly
const textXsStyle = document.createElement('style');
textXsStyle.textContent = `
  .text-2xs {
    font-size: 0.65rem;
    line-height: 1rem;
  }
`;
document.head.appendChild(textXsStyle);

type SortDirection = 'asc' | 'desc' | null;
type SortableColumn = 'address' | 'value' | 'token' | 'status';
type FilterType = 'all' | 'success' | 'failure';
type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface TableRow {
  address: string;
  value: number;
  token: string;
  status: 'success' | 'failure';
  isDuplicate: boolean;
  isReferrer: boolean;
}

const DataTableDemo: React.FC = () => {
  // Get analysis results from context
  const { analysisResults, referrerText } = useTextChecker();
  
  // State for sorting, filtering and UI
  const [sortColumn, setSortColumn] = useState<SortableColumn>('address');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [screenSize, setScreenSize] = useState<ScreenSize>('lg');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [valueFilter, setValueFilter] = useState<number | null>(null);
  const [showReferrersOnly, setShowReferrersOnly] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Compute items per page based on screen size
  const getItemsPerPage = () => {
    switch (screenSize) {
      case 'xs': return 3;
      case 'sm': return 5;
      case 'md': return 8;
      case 'lg': 
      case 'xl': return 10;
      default: return 10;
    }
  };
  
  const itemsPerPage = getItemsPerPage();
  
  // Check if we're in mobile view (xs or sm)
  const isMobileView = screenSize === 'xs' || screenSize === 'sm';

  // Monitor screen size for responsive adjustments
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setScreenSize('xs');
      } else if (width < 768) {
        setScreenSize('sm');
      } else if (width < 1024) {
        setScreenSize('md');
      } else if (width < 1280) {
        setScreenSize('lg');
      } else {
        setScreenSize('xl');
      }
    };
    
    // Check on mount
    checkScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Parse referrer addresses from the text input
  const parseReferrerAddresses = useMemo(() => {
    if (!referrerText) return [];
    return referrerText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, [referrerText]);

  // Convert analysis results to table data format
  const tableData = useMemo<TableRow[]>(() => {
    if (!analysisResults) return [];
    
    const rows: TableRow[] = [];
    const duplicateAddresses = new Set<string>();
    const processedAddresses = new Set<string>();
    
    // Collect all duplicate addresses
    analysisResults.duplicates.forEach(duplicate => {
      duplicate.addresses.forEach(address => {
        duplicateAddresses.add(normalizeAddress(address));
      });
    });
    
    // Process all addresses from amount groups
    analysisResults.amountGroups.forEach((addresses, amount) => {
      addresses.forEach(address => {
        const normalizedAddress = normalizeAddress(address);
        const isDuplicate = duplicateAddresses.has(normalizedAddress);
        
        // Check if this address is in the referrer list
        const isReferrer = parseReferrerAddresses.some(
          refAddr => normalizeAddress(refAddr) === normalizedAddress
        );
        
        rows.push({
          address,
          value: amount,
          token: 'UXUY',
          status: isDuplicate || amount === 0 ? 'failure' : 'success',
          isDuplicate,
          isReferrer
        });
        
        processedAddresses.add(normalizedAddress);
      });
    });
    
    // Add any referrer addresses that weren't in the amount groups
    parseReferrerAddresses.forEach(address => {
      const normalizedAddress = normalizeAddress(address);
      if (!processedAddresses.has(normalizedAddress)) {
        const isDuplicate = duplicateAddresses.has(normalizedAddress);
        rows.push({
          address,
          value: 0, // No value assigned
          token: 'UXUY',
          status: 'failure', // Not found in invites = failure
          isDuplicate,
          isReferrer: true
        });
      }
    });
    
    return rows;
  }, [analysisResults, parseReferrerAddresses]);

  // Handle column header click for sorting
  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      // Toggle direction or reset if already sorted by this column
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') setSortDirection('asc');
    } else {
      // New column, sort ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    // First filter by referrer flag if needed
    let result = tableData;
    
    if (showReferrersOnly) {
      result = result.filter(item => item.isReferrer);
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }
    
    // Filter by value if necessary
    if (valueFilter !== null) {
      result = result.filter(item => item.value === valueFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const searchTermLower = searchQuery.toLowerCase().trim();
      
      // Special handling for address searching
      const isAddressSearch = searchTermLower.startsWith('0x') || /^[a-f0-9]{4,}$/i.test(searchTermLower);
      
      result = result.filter(item => {
        // Use our normalizeAddress function for address matching
        const normalizedItemAddress = normalizeAddress(item.address);
        const normalizedSearchTerm = normalizeAddress(searchTermLower);
        
        // Enhanced address matching with special priority for address-like inputs
        const addressMatch = isAddressSearch ? 
          normalizedItemAddress.includes(normalizedSearchTerm) :
          normalizedItemAddress.includes(normalizedSearchTerm);
        
        // Check token match
        const tokenMatch = !isAddressSearch && 
          item.token.toLowerCase().includes(searchTermLower);
        
        // Check status match
        const statusMatch = !isAddressSearch && 
          ((searchTermLower === 'success' && item.status === 'success') || 
           (searchTermLower === 'failure' && item.status === 'failure') ||
           item.status.toLowerCase().includes(searchTermLower));
        
        // Check value match
        const valueMatch = !isAddressSearch && item.value.toString() === searchTermLower;
        
        return addressMatch || tokenMatch || statusMatch || valueMatch;
      });
    }

    // Then sort
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        const valueA = a[sortColumn];
        const valueB = b[sortColumn];
        
        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [tableData, searchQuery, sortColumn, sortDirection, statusFilter, valueFilter, showReferrersOnly]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedData.length / itemsPerPage));

  // Reset pagination when filtered data changes or screen size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, isMobileView, statusFilter, valueFilter]);

  // Render sort indicator
  const renderSortIndicator = (column: SortableColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4 ml-1" />;
    }
    
    if (sortDirection === 'desc') {
      return <ChevronDown className="w-4 h-4 ml-1" />;
    }
    
    return null;
  };

  // Truncate address function with more aggressive truncation for smaller screens
  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    
    let prefixLength = 8;
    let suffixLength = 6;
    
    // Adjust truncation based on screen size
    if (screenSize === 'xs') {
      prefixLength = 4;
      suffixLength = 3;
    } else if (screenSize === 'sm') {
      prefixLength = 5;
      suffixLength = 4;
    } else if (screenSize === 'md') {
      prefixLength = 6;
      suffixLength = 5;
    }
    
    return `${address.substring(0, prefixLength)}...${address.substring(address.length - suffixLength)}`;
  };

  // Search input handling
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Debounce search by using setTimeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300); // 300ms delay for better performance
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter('all');
    setValueFilter(null);
    setShowReferrersOnly(false);
    clearSearch();
    setShowFilterPanel(false);
  };

  // Add a ref for the search timeout
  const searchTimeoutRef = useRef<number | null>(null);
  
  // Get unique values for filter options
  const uniqueValues = useMemo(() => {
    const values = new Set<number>();
    tableData.forEach(row => values.add(row.value));
    return Array.from(values).sort((a, b) => a - b);
  }, [tableData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Function to download data as Excel
  const downloadExcel = () => {
    // Create a worksheet with the filtered data
    const worksheet = XLSX.utils.json_to_sheet(
      filteredAndSortedData.map(row => ({
        Address: row.address,
        Value: row.value,
        Token: row.token,
        Status: row.status.toUpperCase(),
        Duplicate: row.isDuplicate ? "YES" : "NO",
        Referrer: row.isReferrer ? "YES" : "NO"
      }))
    );
    
    // Set column widths
    const columnWidths = [
      { wch: 45 }, // Address column
      { wch: 10 }, // Value column
      { wch: 10 }, // Token column
      { wch: 15 }, // Status column
      { wch: 12 }, // Duplicate column
      { wch: 12 }  // Referrer column
    ];
    worksheet['!cols'] = columnWidths;
    
    // Create a workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'UXUY Transactions');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    
    // Save the file
    saveAs(blob, 'UXUY_Transactions.xlsx');
  };

  // Mobile-optimized table view
  const renderMobileTable = () => {
    if (paginatedData.length === 0) {
      return (
        <div className="py-8 text-center text-gray-400 bg-gray-800/40 rounded-lg border border-gray-700">
          No results found
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {paginatedData.map((row, index) => (
          <div 
            key={index} 
            className={`bg-gray-800 border ${row.status === 'success' ? 'border-emerald-900/30' : 'border-red-900/30'} 
                       rounded-lg overflow-hidden shadow-md transition-all hover:shadow-lg`}
          >
            <div className={`px-2 sm:px-3 py-1.5 sm:py-2 flex justify-between items-center ${row.status === 'success' ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
              <div className="font-mono text-xs sm:text-sm text-white overflow-hidden text-ellipsis">
                {screenSize === 'xs' ? maskAddress(row.address) : truncateAddress(row.address)}
              </div>
              <div className="flex items-center gap-1">
                {row.isReferrer && (
                  <span className="bg-blue-500/20 text-blue-300 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                    {screenSize === 'xs' ? 'Ref' : 'Referrer'}
                  </span>
                )}
                <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap
                             ${row.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                  {row.status === 'success' ? 'VALID' : 'INVALID'}
                </div>
              </div>
            </div>
            <div className="px-2 sm:px-3 py-1.5 sm:py-2 flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-400 text-xs mr-1 sm:mr-2">{screenSize === 'xs' ? 'Amt:' : 'Amount:'}</span>
                <span className="text-white font-medium text-xs sm:text-sm">
                  {row.value} {row.token}
                </span>
              </div>
              {row.isDuplicate && (
                <span className="bg-amber-500/20 text-amber-300 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                  {screenSize === 'xs' ? 'Dup' : 'Duplicate'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Desktop-optimized table view
  const renderDesktopTable = () => {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-700 shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
                <th 
                  className="py-2 md:py-3 px-2 md:px-4 text-left font-medium cursor-pointer select-none whitespace-nowrap text-xs md:text-sm transition-colors hover:bg-blue-800/50"
                  onClick={() => handleSort('address')}
                >
                  <div className="flex items-center">
                    <span className="mr-1">ADDRESS</span> {renderSortIndicator('address')}
                  </div>
                </th>
                <th 
                  className="py-2 md:py-3 px-2 md:px-4 text-left font-medium cursor-pointer select-none whitespace-nowrap text-xs md:text-sm transition-colors hover:bg-blue-800/50"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center">
                    <span className="mr-1">VALUE</span> {renderSortIndicator('value')}
                  </div>
                </th>
                <th 
                  className="py-2 md:py-3 px-2 md:px-4 text-left font-medium cursor-pointer select-none whitespace-nowrap text-xs md:text-sm transition-colors hover:bg-blue-800/50"
                  onClick={() => handleSort('token')}
                >
                  <div className="flex items-center">
                    <span className="mr-1">TOKEN</span> {renderSortIndicator('token')}
                  </div>
                </th>
                <th 
                  className="py-2 md:py-3 px-2 md:px-4 text-left font-medium cursor-pointer select-none whitespace-nowrap text-xs md:text-sm transition-colors hover:bg-blue-800/50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    <span className="mr-1">STATUS</span> {renderSortIndicator('status')}
                  </div>
                </th>
                <th className="py-2 md:py-3 px-2 md:px-4 text-left font-medium whitespace-nowrap text-xs md:text-sm">
                  DUPLICATE
                </th>
                <th className="py-2 md:py-3 px-2 md:px-4 text-left font-medium whitespace-nowrap text-xs md:text-sm">
                  REFERRER
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 bg-gray-800">
                    No results found
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr 
                    key={index} 
                    className={`${row.status === 'success' ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-800/90 hover:bg-gray-750'} 
                                transition-colors`}
                  >
                    <td className="py-2 md:py-3 px-2 md:px-4 font-mono text-gray-300 text-xs md:text-sm">{truncateAddress(row.address)}</td>
                    <td className="py-2 md:py-3 px-2 md:px-4 text-gray-300 text-xs md:text-sm">{row.value}</td>
                    <td className="py-2 md:py-3 px-2 md:px-4 text-gray-300 text-xs md:text-sm">{row.token}</td>
                    <td className="py-2 md:py-3 px-2 md:px-4">
                      <span className={`inline-flex items-center px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-medium
                                      ${row.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                        {row.status === 'success' ? (
                          <>
                            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            VALID
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            INVALID
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm">
                      {row.isDuplicate ? (
                        <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
                          <Info className="w-3 h-3 mr-1" />
                          YES
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm">
                      {row.isReferrer ? (
                        <span className="inline-flex items-center px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                          YES
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Filter panel component
  const renderFilterPanel = () => {
    return (
      <div className={`${showFilterPanel ? 'block' : 'hidden'} mb-4 bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4 shadow-lg`}>
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          <h3 className="text-xs sm:text-sm font-medium text-white">Filters</h3>
          <button 
            onClick={() => setShowFilterPanel(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Status</label>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                  statusFilter === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('success')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                  statusFilter === 'success' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Valid
              </button>
              <button
                onClick={() => setStatusFilter('failure')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                  statusFilter === 'failure' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Invalid
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Value (UXUY)</label>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button
                onClick={() => setValueFilter(null)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                  valueFilter === null 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {uniqueValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setValueFilter(value)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                    valueFilter === value 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showReferrersOnly}
                onChange={() => setShowReferrersOnly(!showReferrersOnly)}
                className="mr-2 h-3 w-3 sm:h-4 sm:w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs sm:text-sm text-gray-300">Show referrers only</span>
            </label>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-700 hover:bg-gray-600 text-xs sm:text-sm text-white rounded-md transition-colors"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!analysisResults) {
    return null; // Don't show the component if there are no analysis results
  }

  // Calculate stats
  const totalValid = tableData.filter(row => row.status === 'success').length;
  const totalInvalid = tableData.filter(row => row.status === 'failure').length;
  const totalDuplicates = tableData.filter(row => row.isDuplicate).length;
  const totalReferrers = tableData.filter(row => row.isReferrer).length;

  return (
    <div className="space-y-4 mt-8">
      {/* Header with title, search and export */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center">
              Analysis Results
              <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs sm:text-sm rounded-full">
                {tableData.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
              Manage and export transaction details
            </p>
          </div>
          
          {/* Search box and buttons */}
          <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:min-w-[200px] md:min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <Search className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
              </div>
              {searchQuery && (
                <button 
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              )}
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                defaultValue={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-7 sm:pl-10 pr-7 sm:pr-10 py-1.5 sm:py-2 bg-gray-700/80 border border-gray-600 rounded-md text-xs sm:text-sm text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            
            <button 
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition-colors ${
                statusFilter !== 'all' || valueFilter !== null || showReferrersOnly
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title="Filter options"
            >
              <SlidersHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            
            <button 
              onClick={downloadExcel}
              className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-xs sm:text-sm transition-colors"
              title="Export to Excel"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
        
        {/* Filter panel */}
        {renderFilterPanel()}
        
        {/* Summary stats - responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mt-3 sm:mt-4">
          <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/70 rounded-lg p-2 sm:p-3 border border-gray-700 shadow-sm">
            <h3 className="text-gray-400 text-2xs xs:text-xs uppercase tracking-wider">Total Transactions</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-white mt-0.5 sm:mt-1">{tableData.length}</p>
            <div className="flex items-center mt-0.5 sm:mt-1">
              <span className="text-2xs xs:text-xs text-gray-400">
                {filteredAndSortedData.length} shown
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 rounded-lg p-2 sm:p-3 border border-blue-900/30 shadow-sm">
            <h3 className="text-blue-300/80 text-2xs xs:text-xs uppercase tracking-wider">Referrers</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-300 mt-0.5 sm:mt-1">{totalReferrers}</p>
            <div className="flex items-center mt-0.5 sm:mt-1">
              <span className="text-2xs xs:text-xs text-blue-300/60">
                {Math.round((totalReferrers / tableData.length) * 100)}% of total
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 rounded-lg p-2 sm:p-3 border border-emerald-900/30 shadow-sm">
            <h3 className="text-emerald-300/80 text-2xs xs:text-xs uppercase tracking-wider">Valid</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-300 mt-0.5 sm:mt-1">{totalValid}</p>
            <div className="flex items-center mt-0.5 sm:mt-1">
              <span className="text-2xs xs:text-xs text-emerald-300/60">
                {Math.round((totalValid / tableData.length) * 100)}% success rate
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-900/30 to-red-800/10 rounded-lg p-2 sm:p-3 border border-red-900/30 shadow-sm">
            <h3 className="text-red-300/80 text-2xs xs:text-xs uppercase tracking-wider">Invalid</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-300 mt-0.5 sm:mt-1">{totalInvalid}</p>
            <div className="flex items-center mt-0.5 sm:mt-1">
              <span className="text-2xs xs:text-xs text-red-300/60">
                Issues need attention
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/10 rounded-lg p-2 sm:p-3 border border-amber-900/30 shadow-sm">
            <h3 className="text-amber-300/80 text-2xs xs:text-xs uppercase tracking-wider">Duplicates</h3>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-amber-300 mt-0.5 sm:mt-1">{totalDuplicates}</p>
            <div className="flex items-center mt-0.5 sm:mt-1">
              <span className="text-2xs xs:text-xs text-amber-300/60">
                {Math.round((totalDuplicates / tableData.length) * 100)}% duplicate rate
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Active filters display */}
      {(statusFilter !== 'all' || valueFilter !== null || searchQuery || showReferrersOnly) && (
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-300">
          <span className="text-gray-400">Active filters:</span>
          
          {statusFilter !== 'all' && (
            <div className="bg-gray-700 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 flex items-center">
              <span className="mr-1">Status: {statusFilter === 'success' ? 'Valid' : 'Invalid'}</span>
              <button 
                onClick={() => setStatusFilter('all')}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}
          
          {valueFilter !== null && (
            <div className="bg-gray-700 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 flex items-center">
              <span className="mr-1">Value: {valueFilter}</span>
              <button 
                onClick={() => setValueFilter(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}
          
          {showReferrersOnly && (
            <div className="bg-gray-700 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 flex items-center">
              <span className="mr-1">Referrers only</span>
              <button 
                onClick={() => setShowReferrersOnly(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}
          
          {searchQuery && (
            <div className="bg-gray-700 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 flex items-center">
              <span className="mr-1">Search: {searchQuery.length > 10 && screenSize === 'xs' ? searchQuery.substring(0, 10) + '...' : searchQuery}</span>
              <button 
                onClick={clearSearch}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}
          
          <button 
            onClick={resetFilters}
            className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm ml-1 sm:ml-2"
          >
            Clear all
          </button>
        </div>
      )}
      
      {/* Show appropriate table view based on screen size */}
      {isMobileView ? renderMobileTable() : renderDesktopTable()}
      
      {/* Pagination controls - responsive */}
      {filteredAndSortedData.length > itemsPerPage && (
        <div className="flex flex-col xs:flex-row justify-between items-center gap-2 xs:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700">
          <div className="text-2xs xs:text-xs sm:text-sm text-gray-400 text-center xs:text-left">
            {screenSize === 'xs' ? 
              `${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of ${filteredAndSortedData.length}` :
              `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of ${filteredAndSortedData.length} results`
            }
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {screenSize !== 'xs' && (
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-800 border border-gray-700 rounded text-xs sm:text-sm text-white disabled:opacity-50 flex items-center"
              >
                <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                First
              </button>
            )}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-800 border border-gray-700 rounded text-xs sm:text-sm text-white disabled:opacity-50 flex items-center"
            >
              <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-700 border border-gray-600 rounded text-xs sm:text-sm text-white">
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-800 border border-gray-700 rounded text-xs sm:text-sm text-white disabled:opacity-50 flex items-center"
            >
              <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            
            {screenSize !== 'xs' && (
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-800 border border-gray-700 rounded text-xs sm:text-sm text-white disabled:opacity-50 flex items-center"
              >
                Last
                <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5 sm:ml-1" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTableDemo; 