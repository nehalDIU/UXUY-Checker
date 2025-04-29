import { UXUYEntry, AnalysisResults, DuplicateAddressResult } from '../types';

/**
 * Masks an Ethereum address to show only first 5 characters (including 0x) and last 4 characters
 * Example: 0xE8D******dDd4
 */
export const maskAddress = (address: string): string => {
  if (!address || address.length < 9) return address;
  
  // We don't fully normalize here since we want to preserve case for display
  let cleanedAddress = address.trim();
  
  // Get first 5 characters (including 0x if present) and last 4 characters
  const firstFive = cleanedAddress.slice(0, 5);
  const lastFour = cleanedAddress.slice(-4);
  
  return `${firstFive}******${lastFour}`;
};

/**
 * Normalizes an Ethereum address:
 * - Removes whitespace
 * - Converts to lowercase
 * - Ensures consistent 0x prefix
 * - Handles malformed addresses
 */
export const normalizeAddress = (address: string): string => {
  if (!address) return address;
  
  // Remove all whitespace and convert to lowercase
  let normalized = address.trim().toLowerCase();
  
  // Extract 0x prefix if present
  const hasPrefix = normalized.startsWith('0x');
  const prefix = hasPrefix ? '0x' : '';
  
  // Remove non-alphanumeric characters (except for 0x prefix)
  let cleanAddress = hasPrefix ? normalized.slice(2) : normalized;
  cleanAddress = cleanAddress.replace(/[^a-f0-9]/gi, '');
  
  // Add 0x prefix if missing but only if it has some hex characters
  if (!hasPrefix && cleanAddress.length > 0) {
    return '0x' + cleanAddress;
  }
  
  return prefix + cleanAddress;
};

/**
 * Returns a pattern for address matching using first 5 characters (including 0x) and last 4 characters
 * Used for address comparisons rather than display
 * 
 * Handles different address formats:
 * 1. 0x11E******393F
 * 2. 0x11E**393F
 * 3. 0x11E******************393F
 * 4. 0x11EbhdhG&TfvgbFVVtfBF393F
 * 5. 0x11EbhdhG&87642TfvgbFVVtfBF393F
 */
export const getAddressMatchPattern = (address: string): string => {
  // First normalize the address
  const normalized = normalizeAddress(address);
  
  if (!normalized || normalized.length < 9) return normalized; // Minimum length for matching
  
  // Get first 5 characters (including 0x) and last 4 characters
  const firstFive = normalized.slice(0, 5); // This includes "0x" and first 3 chars after 0x
  const lastFour = normalized.slice(-4);
  
  // Return pattern that concatenates first 5 chars and last 4 chars directly
  return `${firstFive}${lastFour}`;
};

/**
 * Enhanced pattern matching is now removed in favor of the more consistent getAddressMatchPattern
 * This function is deprecated but kept for backward compatibility
 */
export const getAddressFullPattern = (address: string): string => {
  // Now we just delegate to the more robust getAddressMatchPattern
  return getAddressMatchPattern(address);
};

/**
 * Checks if the address matches a pattern like the ones specified in requirements
 * 1. 0x11E******393F
 * 2. 0x11E**393F
 * 3. 0x11E******************393F
 * 4. 0x11EbhdhG&TfvgbFVVtfBF393F
 * 5. 0x11EbhdhG&87642TfvgbFVVtfBF393F
 */
export const isPatternAddress = (address: string): boolean => {
  // Remove whitespace
  const cleaned = address.trim();
  
  // Check if it has 0x prefix
  if (!cleaned.startsWith('0x')) return false;
  
  // Check if it has wildcards or special characters
  return cleaned.includes('*') || 
         cleaned.includes('&') || 
         /^0x[a-f0-9]{3}.*[a-f0-9]{4}$/i.test(cleaned);
};

/**
 * Advanced pattern matching that handles various masked address formats
 * This extracts the first 5 chars and last 4 chars for comparison
 */
export const extractPatternParts = (address: string): { firstPart: string, lastPart: string } | null => {
  // Handle null/undefined input
  if (!address) return null;
  
  // Clean up the address
  const cleaned = address.trim();
  
  // Check if it's a potentially valid address (starts with 0x and has reasonable length)
  if (!cleaned.startsWith('0x') || cleaned.length < 9) {
    return null;
  }
  
  // Extract the important parts
  const firstPart = cleaned.slice(0, 5);
  const lastPart = cleaned.slice(-4);
  
  return { firstPart, lastPart };
};

/**
 * Finds duplicate patterns in the list of addresses based on the first 5 and last 4 characters
 */
const findDuplicatePatterns = (addresses: string[]): DuplicateAddressResult[] => {
  // Filter out invalid addresses first
  const validAddresses = addresses.filter(address => 
    address && address.trim().startsWith('0x') && address.trim().length >= 9
  );
  
  // First, normalize all addresses
  const normalizedAddresses = validAddresses.map(normalizeAddress);
  
  // Count occurrences of each normalized address
  const addressCount = new Map<string, number>();
  normalizedAddresses.forEach(address => {
    addressCount.set(address, (addressCount.get(address) || 0) + 1);
  });

  // Create a map of normalized address to original address for reference
  const normalizedToOriginal = new Map<string, string[]>();
  validAddresses.forEach((addr, i) => {
    const normalized = normalizeAddress(addr);
    if (!normalizedToOriginal.has(normalized)) {
      normalizedToOriginal.set(normalized, []);
    }
    normalizedToOriginal.get(normalized)?.push(addr);
  });

  // Group addresses by pattern (first 5 chars + last 4 chars)
  const patternMap = new Map<string, string[]>();
  validAddresses.forEach((address) => {
    if (!address.trim()) return;
    
    // Extract first 5 and last 4 characters
    const firstFive = address.substring(0, 5).toLowerCase();
    const lastFour = address.substring(address.length - 4).toLowerCase();
    const pattern = `${firstFive}${lastFour}`;
    
    // Only process valid patterns
    if (pattern && pattern.length >= 9) {
      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, []);
      }
      // Use original address for display
      patternMap.get(pattern)?.push(address);
    }
  });

  const duplicates: DuplicateAddressResult[] = [];
  
  // Process exact duplicates first
  const processedExactDuplicates = new Set<string>();
  addressCount.forEach((count, normalizedAddress) => {
    if (count > 1) {
      // Find original addresses that normalize to this value
      const originalAddresses = normalizedToOriginal.get(normalizedAddress) || [];
      
      if (originalAddresses.length > 0) {
        duplicates.push({
          pattern: maskAddress(normalizedAddress),
          addresses: [originalAddresses[0]], // Only include one instance
          count, // Add count information
          isExactDuplicate: true // Mark as exact duplicate
        });
        
        // Mark this normalized address as processed
        processedExactDuplicates.add(normalizedAddress);
      }
    }
  });

  // Now handle pattern matches - these are also treated as exact duplicates
  patternMap.forEach((addrs, patternKey) => {
    // Skip patterns with only one address
    if (addrs.length <= 1) return;
    
    // Collect unique addresses for this pattern (by normalized form)
    const uniqueAddressesByNormalized = new Map<string, string>();
    
    addrs.forEach(addr => {
      const normalized = normalizeAddress(addr);
      // Only include if not already an exact duplicate
      if (!processedExactDuplicates.has(normalized) && !uniqueAddressesByNormalized.has(normalized)) {
        uniqueAddressesByNormalized.set(normalized, addr);
      }
    });
    
    const uniqueAddresses = Array.from(uniqueAddressesByNormalized.values());
    
    // Only create a pattern group if we have at least 2 unique addresses
    if (uniqueAddresses.length > 1) {
      // Create the display pattern using first 5 and last 4 chars
      const displayPattern = `${patternKey.substring(0, 5)}******${patternKey.substring(patternKey.length - 4)}`;
      
      duplicates.push({
        pattern: displayPattern,
        addresses: uniqueAddresses,
        count: uniqueAddresses.length,
        isExactDuplicate: true // Mark as exact duplicate
      });
    }
  });

  return duplicates;
};

/**
 * Compares two address patterns for an exact match
 * Handles edge cases and ignores case sensitivity
 */
const patternsMatch = (pattern1: string, pattern2: string): boolean => {
  if (!pattern1 || !pattern2) return false;
  
  // Normalize both patterns before comparing
  pattern1 = normalizeAddress(pattern1);
  pattern2 = normalizeAddress(pattern2);
  
  // Compare patterns - both should already be normalized
  const match = pattern1 === pattern2;
  
  if (match) {
    console.log(`Pattern match found! ${pattern1} = ${pattern2}`);
  }
  
  return match;
};

/**
 * Advanced pattern matching that handles different formats:
 * 1. 0x11E******393F
 * 2. 0x11E**393F
 * 3. 0x11E******************393F
 * 4. 0x11EbhdhG&TfvgbFVVtfBF393F
 * 5. 0x11EbhdhG&87642TfvgbFVVtfBF393F
 */
export const advancedPatternMatch = (addr1: string, addr2: string): boolean => {
  // Handle empty inputs
  if (!addr1 || !addr2) return false;
  
  // Extract pattern parts
  const parts1 = extractPatternParts(addr1);
  const parts2 = extractPatternParts(addr2);
  
  // If either pattern couldn't be extracted, fall back to basic pattern comparison
  // IMPORTANT: Don't call addressesMatchByPattern here to avoid infinite recursion
  if (!parts1 || !parts2) {
    // Use direct pattern comparison instead
    const pattern1 = getAddressMatchPattern(addr1);
    const pattern2 = getAddressMatchPattern(addr2);
    return pattern1 === pattern2 && pattern1 !== '';
  }
  
  // Convert to lowercase for case-insensitive comparison
  const firstPart1 = parts1.firstPart.toLowerCase();
  const lastPart1 = parts1.lastPart.toLowerCase();
  const firstPart2 = parts2.firstPart.toLowerCase();
  const lastPart2 = parts2.lastPart.toLowerCase();
  
  // Match based on first 5 chars and last 4 chars
  return firstPart1 === firstPart2 && lastPart1 === lastPart2;
};

/**
 * Compares address patterns with the updated rules
 * Only compares first 5 and last 4 digits of addresses
 */
export const addressesMatchByPattern = (addr1: string, addr2: string): boolean => {
  const pattern1 = getAddressMatchPattern(addr1);
  const pattern2 = getAddressMatchPattern(addr2);
  
  return pattern1 === pattern2;
};

const matchAddresses = (inviteEntries: UXUYEntry[], referrerAddresses: string[]): Map<number, string[]> => {
  const amountGroups = new Map<number, string[]>();
  
  // Initialize standard UXUY amounts including 0
  [0, 10, 15, 20, 30, 50].forEach(amount => {
    amountGroups.set(amount, []);
  });
  
  // Filter out invalid addresses before processing
  const validReferrerAddresses = referrerAddresses.filter(address => 
    address && address.trim().startsWith('0x') && address.trim().length >= 9
  );
  
  // Process each invite entry
  inviteEntries.forEach(entry => {
    if (!entry.address || !entry.address.trim()) return;
    
    // Extract first 5 and last 4 characters for matching
    const inviteFirstFive = entry.address.substring(0, 5).toLowerCase();
    const inviteLastFour = entry.address.substring(entry.address.length - 4).toLowerCase();
    
    console.log(`Checking invite: ${entry.address} with pattern ${inviteFirstFive}...${inviteLastFour}`);
    
    let matchCount = 0;
    
    // Try to match each referrer address against this invite pattern
    validReferrerAddresses.forEach(referrerAddress => {
      if (referrerAddress.length < 9) return;
      
      const referrerFirstFive = referrerAddress.substring(0, 5).toLowerCase();
      const referrerLastFour = referrerAddress.substring(referrerAddress.length - 4).toLowerCase();
      
      // Check for match on first 5 and last 4 characters
      if (inviteFirstFive === referrerFirstFive && inviteLastFour === referrerLastFour) {
        console.log(`Pattern match! Invite ${entry.address} matches referrer ${referrerAddress}`);
        
        matchCount++;
        
        // Ensure amount group exists
        if (!amountGroups.has(entry.amount)) {
          amountGroups.set(entry.amount, []);
        }
        
        // Add this referrer address to the amount group
        if (!amountGroups.get(entry.amount)?.includes(referrerAddress)) {
          amountGroups.get(entry.amount)?.push(referrerAddress);
        }
      }
    });
    
    if (matchCount === 0) {
      console.log(`No matches found for invite ${entry.address}`);
    } else {
      console.log(`Found ${matchCount} pattern matches for invite ${entry.address}`);
    }
  });

  return amountGroups;
};

// Extended analysis function to provide comprehensive data counts and matching
export const generateDataAnalysisReport = (
  inviteEntries: UXUYEntry[], 
  referrerAddresses: string[]
): {
  matchCount: number;
  mismatchCount: number;
  duplicates: DuplicateAddressResult[];
  uxuy0Addresses: string[];
  uxuy10Addresses: string[];
  finalAddressCount: {
    total: number;
    uxuy10: number;
    uxuy20: number;
    uxuy30: number;
  }
} => {
  // Find all duplicates in referrer addresses
  const duplicates = findDuplicatePatterns(referrerAddresses);
  
  // Create a set of normalized duplicate addresses for faster lookups
  const duplicateAddressesSet = new Set<string>();
  // Map to track duplicate count by normalized address
  const duplicateCountByAddress = new Map<string, number>();
  
  duplicates.forEach(duplicate => {
    if (duplicate.addresses.length === 1) {
      // For exact duplicates (same address multiple times)
      const normalizedAddr = normalizeAddress(duplicate.addresses[0]);
      duplicateAddressesSet.add(normalizedAddr);
      duplicateCountByAddress.set(normalizedAddr, duplicate.count);
    } else {
      // For pattern duplicates (different addresses with same pattern)
      duplicate.addresses.forEach(address => {
        const normalizedAddr = normalizeAddress(address);
        duplicateAddressesSet.add(normalizedAddr);
        // Each address in the pattern group counts as 1
        duplicateCountByAddress.set(normalizedAddr, 1);
      });
    }
  });
  
  // Group invite entries by amount
  const inviteByAmount = new Map<number, UXUYEntry[]>();
  inviteEntries.forEach(entry => {
    if (!inviteByAmount.has(entry.amount)) {
      inviteByAmount.set(entry.amount, []);
    }
    inviteByAmount.get(entry.amount)?.push(entry);
  });
  
  // Match referrer addresses with invite entries
  const amountGroups = new Map<number, string[]>();
  
  // Initialize amount groups for all possible UXUY values
  [0, 10, 15, 20, 30, 50].forEach(amount => {
    amountGroups.set(amount, []);
  });
  
  // Track matched referrer addresses along with their counts
  const matchedReferrers = new Map<string, number>();
  
  // For each referrer address, find matching invite entries
  referrerAddresses.forEach(referrerAddr => {
    let matched = false;
    const normalizedReferrerAddr = normalizeAddress(referrerAddr);
    
    // Try to match with each invite entry
    for (const [amount, entries] of inviteByAmount.entries()) {
      for (const entry of entries) {
        if (addressesMatchByPattern(referrerAddr, entry.address)) {
          amountGroups.get(amount)?.push(referrerAddr);
          
          // Count this match - for duplicates, count each occurrence
          if (duplicateAddressesSet.has(normalizedReferrerAddr)) {
            // For duplicates, increment by 1 (each duplicate counts)
            matchedReferrers.set(
              normalizedReferrerAddr, 
              (matchedReferrers.get(normalizedReferrerAddr) || 0) + 1
            );
          } else {
            // For non-duplicates, just count once
            matchedReferrers.set(normalizedReferrerAddr, 1);
          }
          
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    
    // If no match was found, add to 0 UXUY group
    if (!matched) {
      amountGroups.get(0)?.push(referrerAddr);
    }
  });
  
  // Count matches - include all duplicates
  let matchCount = 0;
  matchedReferrers.forEach((count, normalizedAddr) => {
    // For duplicates, use the actual duplicate count
    if (duplicateAddressesSet.has(normalizedAddr)) {
      matchCount += duplicateCountByAddress.get(normalizedAddr) || 1;
    } else {
      // For non-duplicates, count as 1
      matchCount += 1;
    }
  });
  
  // Calculate mismatch count using total referrers
  const mismatchCount = referrerAddresses.length - matchCount;
  
  // Extract non-duplicate addresses with specific UXUY values
  const nonDuplicateAddresses = referrerAddresses.filter(
    addr => !duplicateAddressesSet.has(normalizeAddress(addr))
  );
  
  // Group non-duplicate addresses by UXUY amount
  const uxuy0Addresses: string[] = [];
  const uxuy10Addresses: string[] = [];
  const uniqueAddressesByAmount = new Map<number, string[]>();
  
  [10, 20, 30].forEach(amount => {
    uniqueAddressesByAmount.set(amount, []);
  });
  
  nonDuplicateAddresses.forEach(address => {
    let hasAmount = false;
    
    // Check if address has a specific UXUY amount
    for (const [amount, addresses] of amountGroups.entries()) {
      if (addresses.some(addr => addressesMatchByPattern(addr, address))) {
        if (amount === 0) {
          uxuy0Addresses.push(address);
        } else if (amount === 10) {
          uxuy10Addresses.push(address);
          uniqueAddressesByAmount.get(10)?.push(address);
        } else if (amount === 20) {
          uniqueAddressesByAmount.get(20)?.push(address);
        } else if (amount === 30) {
          uniqueAddressesByAmount.get(30)?.push(address);
        }
        hasAmount = true;
        break;
      }
    }
    
    // If no amount was found, add to 0 UXUY group
    if (!hasAmount) {
      uxuy0Addresses.push(address);
    }
  });
  
  // Calculate final address count (non-duplicates only)
  const finalAddressCount = {
    total: nonDuplicateAddresses.length,
    uxuy10: uniqueAddressesByAmount.get(10)?.length || 0,
    uxuy20: uniqueAddressesByAmount.get(20)?.length || 0,
    uxuy30: uniqueAddressesByAmount.get(30)?.length || 0
  };
  
  return {
    matchCount,
    mismatchCount,
    duplicates,
    uxuy0Addresses,
    uxuy10Addresses,
    finalAddressCount
  };
};

export const analyzeText = (inviteText: string, referrerText: string): AnalysisResults => {
  const inviteEntries = parseInviteText(inviteText);
  const referrerAddresses = parseReferrerText(referrerText);
  
  // Match addresses and group by UXUY amount
  const amountGroups = matchAddresses(inviteEntries, referrerAddresses);
  
  // Find duplicate addresses in referrer list
  const duplicates = findDuplicatePatterns(referrerAddresses);
  
  // Generate comprehensive data analysis report
  const dataAnalysisReport = generateDataAnalysisReport(inviteEntries, referrerAddresses);
  
  return {
    totalReferrers: referrerAddresses.length,
    amountGroups,
    duplicates,
    dataAnalysisReport // Add the new data analysis report to the results
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