import { describe, it, expect } from 'vitest';
import { formatCrimeNo, formatCaseNo, CASE_CATEGORY_CODES } from './crimeNumber';

describe('formatCrimeNo', () => {
  it('matches the ER doc worked examples for every case category code', () => {
    expect(formatCrimeNo(CASE_CATEGORY_CODES.FIR, 443, 6, 2026, 1)).toBe('104430006202600001');
    expect(formatCrimeNo(CASE_CATEGORY_CODES.UDR, 443, 6, 2026, 1)).toBe('304430006202600001');
    expect(formatCrimeNo(CASE_CATEGORY_CODES.ZERO_FIR, 443, 6, 2026, 1)).toBe('804430006202600001');
    expect(formatCrimeNo(CASE_CATEGORY_CODES.PAR, 443, 6, 2026, 1)).toBe('404430006202600001');
  });

  it('pads district/unit/serial segments regardless of magnitude', () => {
    expect(formatCrimeNo(CASE_CATEGORY_CODES.FIR, 5, 176, 2026, 1)).toBe('100050176202600001');
  });
});

describe('formatCaseNo', () => {
  it('builds the 9-digit year + serial case number', () => {
    expect(formatCaseNo(2026, 1)).toBe('202600001');
  });
});
