// Structured Crime Number format per docs/Police_FIR_ER_Diagram.md (CaseMaster.CrimeNo):
// 1-digit CaseCategoryCode + 4-digit DistrictID + 4-digit PoliceStationID(UnitID)
// + 4-digit Year + 5-digit RunningSerialNumber = 18 characters.
export const CASE_CATEGORY_CODES = {
  FIR: 1,
  UDR: 3,
  PAR: 4,
  ZERO_FIR: 8,
} as const;

export type CaseCategoryCode = (typeof CASE_CATEGORY_CODES)[keyof typeof CASE_CATEGORY_CODES];

export function formatCrimeNo(
  categoryCode: CaseCategoryCode,
  districtId: number,
  unitId: number,
  year: number,
  serial: number,
): string {
  return [
    String(categoryCode),
    String(districtId).padStart(4, '0'),
    String(unitId).padStart(4, '0'),
    String(year),
    String(serial).padStart(5, '0'),
  ].join('');
}

// CaseNo is the last 9 digits of CrimeNo: 4-digit year + 5-digit serial.
export function formatCaseNo(year: number, serial: number): string {
  return `${year}${String(serial).padStart(5, '0')}`;
}
