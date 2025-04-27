import { UXUYEntry, AnalysisResults, DuplicateAddressResult } from '../types';

const getAddressPattern = (address: string): string => {
  if (address.length < 10) return address;
  const start = address.slice(0, 4);
  const end = address.slice(-4);
  return `${start}${end}`;
};

const findDuplicatePatterns = (addresses: string[]): DuplicateAddressResult[] => {
  const patternMap = new Map<string, string[]>();
  
  // First, group addresses by their pattern
  addresses.forEach(address => {
    const pattern = getAddressPattern(address);
    if (!patternMap.has(pattern)) {
      patternMap.set(pattern, []);
    }
    patternMap.get(pattern)?.push(address);
  });

  // Filter out groups with more than one address (duplicates)
  return Array.from(patternMap.entries())
    .filter(([_, addresses]) => addresses.length > 1)
    .map(([pattern, addresses]) => ({
      pattern,
      addresses: [...new Set(addresses)] // Remove any duplicate addresses within the group
    }));
};

export const analyzeText = (inviteText: string, referrerText: string): AnalysisResults => {
  const inviteEntries = parseInviteText(inviteText);
  const referrerAddresses = parseReferrerText(referrerText);
  
  // Combine all addresses for duplicate checking
  const allAddresses = [...referrerAddresses, ...inviteEntries.map(entry => entry.address)];
  const duplicates = findDuplicatePatterns(allAddresses);
  
  // Group addresses by UXUY amount
  const amountGroups = new Map<number, string[]>();
  
  inviteEntries.forEach(entry => {
    if (!amountGroups.has(entry.amount)) {
      amountGroups.set(entry.amount, []);
    }
    amountGroups.get(entry.amount)?.push(entry.address);
  });

  return {
    totalReferrers: referrerAddresses.length,
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
      return {
        address: address.trim(),
        amount: parseInt(amountStr) || 0
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