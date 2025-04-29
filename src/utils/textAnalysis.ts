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
      console.log(`Found pattern match: ${patternKey} with ${uniqueAddresses.length} addresses:`);
      uniqueAddresses.forEach(addr => console.log(`- ${addr}`));
      
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

// Helper function to check if two addresses match by pattern
export const addressesMatchByPattern = (addr1: string, addr2: string): boolean => {
  if (!addr1 || !addr2 || addr1.length < 9 || addr2.length < 9) return false;
  
  // Extract first 5 and last 4 characters from both addresses
  const firstFive1 = addr1.substring(0, 5).toLowerCase();
  const lastFour1 = addr1.substring(addr1.length - 4).toLowerCase();
  
  const firstFive2 = addr2.substring(0, 5).toLowerCase();
  const lastFour2 = addr2.substring(addr2.length - 4).toLowerCase();
  
  // Compare the extracted parts
  return firstFive1 === firstFive2 && lastFour1 === lastFour2;
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

export const analyzeText = (inviteText: string, referrerText: string): AnalysisResults => {
  // Validate inputs
  if (!inviteText || !referrerText) {
    return {
      totalReferrers: 0,
      amountGroups: new Map(),
      duplicates: []
    };
  }
  
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