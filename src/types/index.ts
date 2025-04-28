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
}

export interface DuplicateAddressResult {
  addresses: string[];
  pattern: string;
  count: number;
}

export type UXUYAmount = 10 | 15 | 20 | 30 | 50;