import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown, Search, ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { useTextChecker } from '../context/TextCheckerContext';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type SortDirection = 'asc' | 'desc' | null;
type SortableColumn = 'address' | 'value' | 'token' | 'status';

interface TableRow {
  address: string;
  value: number;
  token: string;
  status: 'success' | 'failure';
}

const DataTableDemo: React.FC = () => {
  // Get analysis results from context
  const { analysisResults } = useTextChecker();
  
  // State for sorting and filtering
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileView, setIsMobileView] = useState(false);
  const itemsPerPage = isMobileView ? 5 : 10;

  // Monitor screen size for responsive adjustments
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    
    // Check on mount
    checkScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Convert analysis results to table data format
  const tableData = useMemo<TableRow[]>(() => {
    if (!analysisResults) return [];
    
    const rows: TableRow[] = [];
    const duplicateAddresses = new Set<string>();
    
    // Collect all duplicate addresses
    analysisResults.duplicates.forEach(duplicate => {
      duplicate.addresses.forEach(address => {
        duplicateAddresses.add(address);
      });
    });
    
    // Process all addresses from amount groups
    analysisResults.amountGroups.forEach((addresses, amount) => {
      addresses.forEach(address => {
        const isDuplicate = duplicateAddresses.has(address);
        rows.push({
          address,
          value: amount,
          token: 'UXUY',
          status: isDuplicate || amount === 0 ? 'failure' : 'success'
        });
      });
    });
    
    return rows;
  }, [analysisResults]);

  // Handle column header click for sorting
  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      // Toggle direction or reset if already sorted by this column
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      // New column, sort ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    // First filter
    let result = tableData;
    
    if (searchQuery.trim() !== '') {
      const searchTermLower = searchQuery.toLowerCase().trim();
      
      // Special handling for address searching
      const isAddressSearch = searchTermLower.startsWith('0x') || /^[a-f0-9]{4,}$/i.test(searchTermLower);
      
      result = tableData.filter(item => {
        // Enhanced address matching with special priority for address-like inputs
        const addressMatch = isAddressSearch ? 
          // If it looks like an address search, prioritize this match
          item.address.toLowerCase().includes(searchTermLower) :
          // Otherwise include address in general search
          item.address.toLowerCase().includes(searchTermLower);
        
        // Normalize address for comparison - handle with/without 0x prefix
        const normalizedSearch = searchTermLower.startsWith('0x') ? 
          searchTermLower : 
          searchTermLower.replace(/^0x/, '');
        
        const normalizedAddress = item.address.toLowerCase().replace(/^0x/, '');
        const enhancedAddressMatch = normalizedAddress.includes(normalizedSearch);
        
        // Check token match (exact match)
        const tokenMatch = !isAddressSearch && 
          (item.token.toLowerCase() === searchTermLower || 
           item.token.toLowerCase().includes(searchTermLower));
        
        // Check status match (more specific matching for success/failure)
        const statusMatch = !isAddressSearch && 
          ((searchTermLower === 'success' && item.status === 'success') || 
           (searchTermLower === 'failure' && item.status === 'failure') ||
           item.status.toLowerCase().includes(searchTermLower));
        
        // Check value match (exact match)
        const valueMatch = !isAddressSearch && item.value.toString() === searchTermLower;
        
        // Return true if any field matches - with priority to address if it looks like an address search
        return addressMatch || enhancedAddressMatch || tokenMatch || statusMatch || valueMatch;
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
  }, [tableData, searchQuery, sortColumn, sortDirection]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  // Reset pagination when filtered data changes or screen size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, isMobileView]);

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

  // Truncate address function with more aggressive truncation for mobile
  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    const prefixLength = isMobileView ? 3 : 6;
    const suffixLength = isMobileView ? 3 : 4;
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

  // Add a ref for the search timeout
  const searchTimeoutRef = React.useRef<number | null>(null);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Function to download data as Excel
  const downloadExcel = () => {
    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(
      tableData.map(row => ({
        Address: row.address,
        Value: row.value,
        Token: row.token,
        Status: row.status.toUpperCase()
      }))
    );
    
    // Set column widths
    const columnWidths = [
      { wch: 45 }, // Address column
      { wch: 10 }, // Value column
      { wch: 10 }, // Token column
      { wch: 15 }  // Status column
    ];
    worksheet['!cols'] = columnWidths;
    
    // Create a workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    
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
        <div className="py-8 text-center text-gray-500">
          No results found
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-[#4A90E2] text-white">
              <th 
                className="py-2 px-2 text-left font-bold cursor-pointer select-none whitespace-nowrap text-xs"
                onClick={() => handleSort('address')}
              >
                <div className="flex items-center">
                  <span>ADDRESS</span>
                </div>
              </th>
              <th 
                className="py-2 px-2 text-center font-bold cursor-pointer select-none whitespace-nowrap text-xs"
                onClick={() => handleSort('value')}
              >
                <div className="flex items-center justify-center">
                  <span>VALUE</span>
                </div>
              </th>
              <th 
                className="py-2 px-2 text-right font-bold cursor-pointer select-none whitespace-nowrap text-xs"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center justify-end">
                  <span>STATUS</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr 
                key={index} 
                className="bg-gray-800 border-b border-gray-700"
              >
                <td className="py-2 px-2 font-mono text-gray-300 text-xs">
                  {truncateAddress(row.address)}
                </td>
                <td className="py-2 px-2 text-center text-gray-300 text-xs">
                  <span className="bg-gray-700 rounded px-1.5 py-0.5">
                    {row.value} {row.token}
                  </span>
                </td>
                <td className="py-2 px-2 text-right">
                  <div className={`flex items-center justify-end ${row.status === 'success' ? 'text-green-500' : 'text-red-500'} text-xs`}>
                    {row.status === 'success' ? (
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        OK
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        FAIL
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Desktop-optimized table view
  const renderDesktopTable = () => {
    return (
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-[#4A90E2] text-white">
              <th 
                className="py-3 px-4 text-left font-bold cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort('address')}
              >
                <div className="flex items-center">
                  <span className="mr-1">ADDRESS</span> {renderSortIndicator('address')}
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-bold cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort('value')}
              >
                <div className="flex items-center">
                  <span className="mr-1">VALUE</span> {renderSortIndicator('value')}
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-bold cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort('token')}
              >
                <div className="flex items-center">
                  <span className="mr-1">TOKEN</span> {renderSortIndicator('token')}
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-bold cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  <span className="mr-1">STATUS</span> {renderSortIndicator('status')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  No results found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr 
                  key={index} 
                  className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-gray-300">{truncateAddress(row.address)}</td>
                  <td className="py-3 px-4 text-gray-300">{row.value}</td>
                  <td className="py-3 px-4 text-gray-300">{row.token}</td>
                  <td className="py-3 px-4">
                    <div className={`flex items-center ${row.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {row.status === 'success' ? (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          SUCCESS
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          FAILURE
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (!analysisResults) {
    return null; // Don't show the component if there are no analysis results
  }

  return (
    <div className="space-y-4 mt-8">
      {/* Header and search - responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          Analysis Results
        </h2>
        
        {/* Search box and download button */}
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search transactions..."
              defaultValue={searchQuery}
              onChange={handleSearchChange}
              className="w-full sm:w-auto pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button 
            onClick={downloadExcel}
            className="flex items-center justify-center min-w-[36px] sm:min-w-[80px] px-2 sm:px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            title="Download Excel"
            aria-label="Export to Excel"
          >
            <Download className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
      
      {/* Summary stats - responsive grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-800 p-2 rounded-lg">
          <h3 className="text-gray-400 text-xs">Total</h3>
          <p className="text-lg sm:text-xl font-bold text-white">{tableData.length}</p>
        </div>
        <div className="bg-gray-800 p-2 rounded-lg">
          <h3 className="text-gray-400 text-xs">Valid</h3>
          <p className="text-lg sm:text-xl font-bold text-green-500">
            {tableData.filter(row => row.status === 'success').length}
          </p>
        </div>
        <div className="bg-gray-800 p-2 rounded-lg">
          <h3 className="text-gray-400 text-xs">Invalid</h3>
          <p className="text-lg sm:text-xl font-bold text-red-500">
            {tableData.filter(row => row.status === 'failure').length}
          </p>
        </div>
      </div>
      
      {/* Show appropriate table view based on screen size */}
      {isMobileView ? renderMobileTable() : renderDesktopTable()}
      
      {/* Pagination controls - responsive */}
      {filteredAndSortedData.length > itemsPerPage && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 pt-4">
          <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
            {currentPage * itemsPerPage > filteredAndSortedData.length ? 
              filteredAndSortedData.length : 
              currentPage * itemsPerPage} of {filteredAndSortedData.length}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white disabled:opacity-50 flex items-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white disabled:opacity-50 flex items-center"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTableDemo; 