import { UXUYEntry, AnalysisResults, DuplicateAddressResult } from '../types';

/**
 * Masks an Ethereum address to show only first 5 characters after 0x and last 4 characters
 * Example: 0x588******Bb79
 */
export const maskAddress = (address: string): string => {
  if (!address || address.length < 11) return address;
  
  // Check if address starts with 0x
  const prefix = address.startsWith('0x') ? '0x' : '';
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  
  // Get first 5 and last 4 characters
  const firstFive = cleanAddress.slice(0, 5);
  const lastFour = cleanAddress.slice(-4);
  
  return `${prefix}${firstFive}******${lastFour}`;
};

/**
 * Returns a pattern for address matching using first 5 and last 4 characters
 * Used for address comparisons rather than display
 */
export const getAddressMatchPattern = (address: string): string => {
  if (!address || address.length < 11) return address;
  
  // Clean the address (remove 0x prefix if exists)
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  
  // Get first 5 and last 4 characters
  const firstFive = cleanAddress.slice(0, 5);
  const lastFour = cleanAddress.slice(-4);
  
  return `${firstFive}${lastFour}`;
};

const findDuplicatePatterns = (addresses: string[]): DuplicateAddressResult[] => {
  // Count occurrences of each address
  const addressCount = new Map<string, number>();
  addresses.forEach(address => {
    addressCount.set(address, (addressCount.get(address) || 0) + 1);
  });

  // Group addresses by pattern for similar address detection
  const patternMap = new Map<string, string[]>();
  addresses.forEach(address => {
    const pattern = getAddressMatchPattern(address);
    if (!patternMap.has(pattern)) {
      patternMap.set(pattern, []);
    }
    patternMap.get(pattern)?.push(address);
  });

  const duplicates: DuplicateAddressResult[] = [];

  // Add duplicate exact addresses (showing only one instance with count)
  addressCount.forEach((count, address) => {
    if (count > 1) {
      duplicates.push({
        pattern: address,
        addresses: [address], // Only include one instance
        count // Add count information
      });
    }
  });

  // Add similar addresses (different addresses with same pattern)
  patternMap.forEach((addresses, pattern) => {
    const uniqueAddresses = [...new Set(addresses)];
    if (uniqueAddresses.length > 1) {
      duplicates.push({
        pattern,
        addresses: uniqueAddresses,
        count: uniqueAddresses.length
      });
    }
  });

  return duplicates;
};

const matchAddresses = (inviteEntries: UXUYEntry[], referrerAddresses: string[]): Map<number, string[]> => {
  const amountGroups = new Map<number, string[]>();
  
  // Create maps to store address patterns for matching
  const referrerPatterns = new Map<string, string>();
  const referrerCount = new Map<string, number>();
  
  // Process referrer addresses and store their patterns
  referrerAddresses.forEach(address => {
    const pattern = getAddressMatchPattern(address);
    referrerPatterns.set(pattern, address);
    // Count by pattern instead of exact address
    referrerCount.set(pattern, (referrerCount.get(pattern) || 0) + 1);
  });
  
  inviteEntries.forEach(entry => {
    const entryPattern = getAddressMatchPattern(entry.address);
    
    // Check if any referrer address matches this pattern
    const matchFound = referrerPatterns.has(entryPattern);
    
    if (matchFound) {
      // Use the original address from entry for consistency
      if (!amountGroups.has(entry.amount)) {
        amountGroups.set(entry.amount, []);
      }
      
      // Add the address only once
      if (!amountGroups.get(entry.amount)?.includes(entry.address)) {
        amountGroups.get(entry.amount)?.push(entry.address);
      }
    }
  });

  return amountGroups;
};

export const analyzeText = (inviteText: string, referrerText: string): AnalysisResults => {
  const inviteEntries = parseInviteText(inviteText);
  const referrerAddresses = parseReferrerText(referrerText);
  
  // Match addresses and group by UXUY amount
  const amountGroups = matchAddresses(inviteEntries, referrerAddresses);
  
  // Find duplicates among all referrer addresses
  const duplicates = findDuplicatePatterns(referrerAddresses);

  // Calculate total input (all addresses including duplicates)
  const totalReferrers = referrerAddresses.length;

  return {
    totalReferrers,
    amountGroups,
    duplicates
  };
};

const parseInviteText = (text: string): UXUYEntry[] => {
  return text
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [address, amountStr] = line.trim().split(/\s+/);
      const amount = parseInt(amountStr?.replace('UXUY', '').trim()) || 0;
      return {
        address: address.trim(),
        amount
      };
    });
};

const parseReferrerText = (text: string): string[] => {
  return text
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.trim());
};