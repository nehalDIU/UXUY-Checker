import { UXUYEntry, AnalysisResults, DuplicateAddressResult } from '../types';

const getAddressPattern = (address: string): string => {
  if (address.length < 10) return address;
  const start = address.slice(0, 4);
  const end = address.slice(-4);
  return `${start}${end}`;
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
    const pattern = getAddressPattern(address);
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
  
  // Create a map to count referrer occurrences
  const referrerCount = new Map<string, number>();
  referrerAddresses.forEach(address => {
    referrerCount.set(address, (referrerCount.get(address) || 0) + 1);
  });
  
  inviteEntries.forEach(entry => {
    if (referrerCount.has(entry.address)) {
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