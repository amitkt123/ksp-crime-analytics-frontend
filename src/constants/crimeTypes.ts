export interface CrimeTypeOption {
  crimeSubHeadId: number;
  crimeSubHeadName: string;
}

export const CRIME_TYPE_OPTIONS: CrimeTypeOption[] = [
  { crimeSubHeadId: 101, crimeSubHeadName: 'Theft of Motor Vehicle' },
  { crimeSubHeadId: 102, crimeSubHeadName: 'House Break-in' },
  { crimeSubHeadId: 103, crimeSubHeadName: 'Chain Snatching' },
  { crimeSubHeadId: 104, crimeSubHeadName: 'Cyber Financial Fraud' },
  { crimeSubHeadId: 105, crimeSubHeadName: 'Assault' },
  { crimeSubHeadId: 106, crimeSubHeadName: 'Cattle Theft' },
];
