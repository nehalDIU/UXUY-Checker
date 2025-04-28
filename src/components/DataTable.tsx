import React from 'react';
import { Check, X } from 'lucide-react';

interface DataTableProps {
  data: {
    address: string;
    value: number;
    token: string;
    status: 'success' | 'failure';
  }[];
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  // Function to truncate address
  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full">
        <thead>
          <tr className="bg-[#4A90E2] text-white">
            <th className="py-3 px-4 text-left font-bold">ADDRESS</th>
            <th className="py-3 px-4 text-left font-bold">VALUE</th>
            <th className="py-3 px-4 text-left font-bold">TOKEN</th>
            <th className="py-3 px-4 text-left font-bold">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr 
              key={index} 
              className="bg-gray-800 border-b border-gray-700"
            >
              <td className="py-3 px-4 font-mono text-gray-300">
                {truncateAddress(row.address)}
              </td>
              <td className="py-3 px-4 text-gray-300">{row.value}</td>
              <td className="py-3 px-4 text-gray-300">{row.token}</td>
              <td className="py-3 px-4">
                <div className={`flex items-center ${row.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                  {row.status === 'success' ? (
                    <Check className="w-4 h-4 mr-1" />
                  ) : (
                    <X className="w-4 h-4 mr-1" />
                  )}
                  <span>{row.status.toUpperCase()}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable; 