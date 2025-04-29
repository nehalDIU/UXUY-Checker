export interface ComplexWordResult {
  word: string;
  alternatives: string[];
}

export interface UXUYEntry {
  address: string;
  amount: number;
}

export interface AnalysisResults {
  totalReferrers: number;
  amountGroups: Map<number, string[]>;
  duplicates: DuplicateAddressResult[];
  dataAnalysisReport?: {
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
  };
}

export interface DuplicateAddressResult {
  addresses: string[];
  pattern: string;
  count: number;
  isExactDuplicate?: boolean;
}

export type UXUYAmount = 0 | 10 | 15 | 20 | 30 | 50;