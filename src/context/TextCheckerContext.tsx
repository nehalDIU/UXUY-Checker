import React, { createContext, useContext, useState, ReactNode } from 'react';
import { analyzeText, maskAddress, normalizeAddress } from '../utils/textAnalysis';
import { AnalysisResults, UXUYAmount } from '../types';

interface TextCheckerContextType {
  inviteText: string;
  setInviteText: (text: string) => void;
  referrerText: string;
  setReferrerText: (text: string) => void;
  isChecked: boolean;
  setIsChecked: (checked: boolean) => void;
  analysisResults: AnalysisResults | null;
  selectedAmount: UXUYAmount | null;
  setSelectedAmount: (amount: UXUYAmount | null) => void;
  checkText: () => void;
  copyResults: () => void;
}

const TextCheckerContext = createContext<TextCheckerContextType | undefined>(undefined);

export const TextCheckerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [inviteText, setInviteText] = useState<string>('');
  const [referrerText, setReferrerText] = useState<string>('');
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<UXUYAmount | null>(null);

  const checkText = () => {
    if (!inviteText.trim() || !referrerText.trim()) return;
    
    const results = analyzeText(inviteText, referrerText);
    setAnalysisResults(results);
    setIsChecked(true);
  };

  const copyResults = () => {
    if (!analysisResults) return;

    let formattedResults = '';
    
    // Calculate totals and mismatch similar to CheckResults component
    let totalMatched = 0;
    let uniqueReferrersCount = analysisResults.totalReferrers;
    
    // Find which addresses are duplicates and how many times they occur
    const exactDuplicateAddresses = new Map<string, number>();
    
    // Process duplicates
    analysisResults.duplicates.forEach(duplicate => {
      if (duplicate.addresses.length === 1) {
        // This is an exact duplicate (same address multiple times)
        exactDuplicateAddresses.set(duplicate.addresses[0], duplicate.count);
        // For exact duplicates, subtract (count - 1) to keep only one occurrence
        uniqueReferrersCount -= (duplicate.count - 1);
      } else {
        // For different format addresses with same pattern, subtract (count - 1) to keep only one occurrence
        uniqueReferrersCount -= (duplicate.addresses.length - 1);
      }
    });
    
    // Count matched addresses (only count duplicates once)
    Array.from(analysisResults.amountGroups.entries()).forEach(([_, addresses]) => {
      addresses.forEach(address => {
        totalMatched += 1; // Each address counts as one match
      });
    });
    
    // Calculate mismatch
    const totalMismatch = uniqueReferrersCount - totalMatched;
    
    // Add summary section
    formattedResults += '=== Summary ===\n';
    formattedResults += `Total Referrers: ${analysisResults.totalReferrers} (${uniqueReferrersCount} unique)\n`;
    formattedResults += `Matched: ${totalMatched}\n`;
    formattedResults += `Mismatch (No Dupes): ${totalMismatch}\n\n`;
    
    // Add duplicate addresses first
    if (analysisResults.duplicates.length > 0) {
      formattedResults += '=== Duplicate Addresses ===\n';
      analysisResults.duplicates.forEach((duplicate, index) => {
        formattedResults += `\nDuplicate Group #${index + 1}:\n`;
        if (duplicate.addresses.length > 1) {
          formattedResults += `Pattern match (first 5 + last 4): ${duplicate.pattern}\n`;
          duplicate.addresses.forEach(address => {
            formattedResults += `${maskAddress(address)} ⛔ (pattern match)\n`;
          });
        } else {
          formattedResults += `${maskAddress(duplicate.addresses[0])} ⛔ (${duplicate.count}x exact duplicates)\n`;
        }
      });
      formattedResults += '\n';
    }

    // Add amount groups
    formattedResults += '=== UXUY Amounts ===\n';
    analysisResults.amountGroups.forEach((addresses, amount) => {
      if (!selectedAmount || amount === selectedAmount) {
        addresses.forEach(address => {
          // Check if this address is in any of the duplicate groups
          const isDuplicate = analysisResults.duplicates.some(dup => 
            dup.addresses.some(dupAddress => 
              // Compare normalized addresses to ensure accurate matching
              normalizeAddress(dupAddress) === normalizeAddress(address)
            )
          );
          
          formattedResults += `${maskAddress(address)} ${isDuplicate ? '⛔' : '✓'} (${amount} UXUY)\n`;
        });
      }
    });
    
    // Add Final Unique Addresses section
    formattedResults += '\n=== Final Unique Addresses ===\n';
    
    // Collect all duplicate addresses
    const duplicateAddresses = new Set<string>();
    analysisResults.duplicates.forEach(duplicate => {
      duplicate.addresses.forEach(address => {
        duplicateAddresses.add(address);
      });
    });
    
    // Get unique addresses with non-zero UXUY
    const uniqueAddressesWithNonZeroUXUY = new Set<string>();
    Array.from(analysisResults.amountGroups.entries())
      .filter(([amount]) => amount > 0)
      .forEach(([amount, addresses]) => {
        addresses.forEach(address => {
          if (!duplicateAddresses.has(address)) {
            uniqueAddressesWithNonZeroUXUY.add(address);
          }
        });
      });
    
    // Add unique non-zero addresses to formatted results
    Array.from(uniqueAddressesWithNonZeroUXUY).forEach(address => {
      formattedResults += `${maskAddress(address)} ✓\n`;
    });

    navigator.clipboard.writeText(formattedResults).then(() => {
      alert('Results copied to clipboard!');
    });
  };

  return (
    <TextCheckerContext.Provider
      value={{
        inviteText,
        setInviteText,
        referrerText,
        setReferrerText,
        isChecked,
        setIsChecked,
        analysisResults,
        selectedAmount,
        setSelectedAmount,
        checkText,
        copyResults,
      }}
    >
      {children}
    </TextCheckerContext.Provider>
  );
};

export const useTextChecker = (): TextCheckerContextType => {
  const context = useContext(TextCheckerContext);
  if (context === undefined) {
    throw new Error('useTextChecker must be used within a TextCheckerProvider');
  }
  return context;
};