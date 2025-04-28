import { UXUYEntry, AnalysisResults, DuplicateAddressResult } from '../types';

/**
 * Masks an Ethereum address to show only first 5 characters after 0x and last 4 characters
 * Example: 0x588******Bb79
 */
export const maskAddress = (address: string): string => {
  if (!address || address.length < 11) return address;
  
  // We don't fully normalize here since we want to preserve case for display
  // but we do trim and handle 0x prefix consistently
  let cleanedAddress = address.trim();
  
  // Check if address starts with 0x
  const prefix = cleanedAddress.startsWith('0x') ? '0x' : '';
  const cleanAddress = cleanedAddress.startsWith('0x') ? cleanedAddress.slice(2) : cleanedAddress;
  
  // Get first 5 and last 4 characters
  const firstFive = cleanAddress.slice(0, 5);
  const lastFour = cleanAddress.slice(-4);
  
  return `${prefix}${firstFive}******${lastFour}`;
};

/**
 * Normalizes an Ethereum address:
 * - Removes whitespace
 * - Converts to lowercase
 * - Ensures consistent 0x prefix
 */
export const normalizeAddress = (address: string): string => {
  if (!address) return address;
  
  let normalized = address.trim().toLowerCase();
  
  // Add 0x prefix if missing but only if it's an Ethereum address
  if (!normalized.startsWith('0x') && /^[0-9a-f]{40}$/i.test(normalized)) {
    normalized = '0x' + normalized;
  }
  
  return normalized;
};

/**
 * Returns a pattern for address matching using first 5 characters after 0x and last 4 characters
 * Used for address comparisons rather than display
 */
export const getAddressMatchPattern = (address: string): string => {
  // First normalize the address
  const normalized = normalizeAddress(address);
  
  if (!normalized || normalized.length < 11) return normalized; // Minimum length: 0x + 5 + 4
  
  // Get prefix and handle addresses with or without 0x
  const hasPrefix = normalized.startsWith('0x');
  const prefix = hasPrefix ? '0x' : '';
  const cleanAddress = hasPrefix ? normalized.slice(2) : normalized;
  
  // Get first 5 characters after 0x and last 4 characters
  const firstFive = cleanAddress.slice(0, 5);
  const lastFour = cleanAddress.slice(-4);
  
  return `${prefix}${firstFive}${lastFour}`;
};

const findDuplicatePatterns = (addresses: string[]): DuplicateAddressResult[] => {
  // First, normalize all addresses
  const normalizedAddresses = addresses.map(normalizeAddress);
  
  // Count occurrences of each normalized address
  const addressCount = new Map<string, number>();
  normalizedAddresses.forEach(address => {
    addressCount.set(address, (addressCount.get(address) || 0) + 1);
  });

  // Group addresses by pattern for similar address detection
  const patternMap = new Map<string, string[]>();
  normalizedAddresses.forEach((address, i) => {
    const pattern = getAddressMatchPattern(address);
    if (!patternMap.has(pattern)) {
      patternMap.set(pattern, []);
    }
    // Use original address for display
    patternMap.get(pattern)?.push(addresses[i]);
  });

  const duplicates: DuplicateAddressResult[] = [];

  // Add duplicate exact addresses (showing only one instance with count)
  addressCount.forEach((count, normalizedAddress) => {
    if (count > 1) {
      // Find original addresses that normalize to this value
      const originalAddresses = normalizedAddresses
        .map((addr, i) => addr === normalizedAddress ? addresses[i] : null)
        .filter(Boolean) as string[];
      
      duplicates.push({
        pattern: normalizedAddress,
        addresses: [originalAddresses[0]], // Only include one instance
        count // Add count information
      });
    }
  });

  // Add similar addresses (different addresses with same pattern)
  patternMap.forEach((addrs, pattern) => {
    const uniqueAddresses = [...new Set(addrs)];
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
  
  // Normalize referrer addresses for consistent matching
  const normalizedReferrerAddresses = referrerAddresses.map(normalizeAddress);
  
  // Process referrer addresses and store their patterns
  normalizedReferrerAddresses.forEach((normalizedAddress, i) => {
    const pattern = getAddressMatchPattern(normalizedAddress);
    referrerPatterns.set(pattern, referrerAddresses[i]); // Store original address
    // Count by pattern instead of exact address
    referrerCount.set(pattern, (referrerCount.get(pattern) || 0) + 1);
  });
  
  inviteEntries.forEach(entry => {
    // Normalize the entry address before matching
    const normalizedEntryAddress = normalizeAddress(entry.address);
    const entryPattern = getAddressMatchPattern(normalizedEntryAddress);
    
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
        address: address ? address.trim() : '', // Don't normalize here as we want to preserve original format for display
        amount
      };
    });
};

const parseReferrerText = (text: string): string[] => {
  return text
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.trim()); // Don't normalize here as we want to preserve original format for display
};