// Static reference data for the mock dataset generator. District
// population/literacy/unemployment/urbanization/income figures reuse the exact
// deterministic formula already shipped in src/api/mockData.ts's MOCK_CORRELATION
// (not per-case randomness, per design spec section 1) -- kept here as plain
// values rather than recomputed per-case.
function districtSocioeconomics(districtId) {
  return {
    population: 400_000 + districtId * 137_000 + (districtId % 5) * 50_000,
    literacyRate: Number((68 + (districtId % 11) * 1.8).toFixed(1)),
    unemploymentRate: Number((2.5 + (districtId % 7) * 0.6).toFixed(1)),
    urbanizationRate: Number((20 + (districtId % 9) * 7.5).toFixed(1)),
    perCapitaIncome: 90_000 + (districtId % 13) * 18_000,
  };
}

// districtId/districtName/relativeWeight match src/api/mockData.ts's current
// MOCK_DISTRICTS exactly (districtId assignments match public/data/karnataka-districts.geojson's
// alphabetical ordering) -- relativeWeight is what that file currently calls caseCount,
// renamed here since it's now an input to scaling, not the final count.
const DISTRICT_BASE = [
  ['Bagalkote', 89], ['Ballari', 350], ['Belagavi', 586], ['Bengaluru Rural', 107],
  ['Bengaluru Urban', 1840], ['Bidar', 282], ['Chamarajanagara', 349], ['Chikkaballapura', 187],
  ['Chikkamagaluru', 80], ['Chitradurga', 289], ['Dakshina Kannada', 396], ['Davanagere', 327],
  ['Dharwad', 293], ['Gadag', 182], ['Hassan', 422], ['Haveri', 449], ['Kalaburagi', 526],
  ['Kodagu', 265], ['Kolar', 253], ['Koppal', 127], ['Mandya', 288], ['Mysuru', 687],
  ['Raichur', 269], ['Ramanagara', 458], ['Shivamogga', 406], ['Tumakuru', 678], ['Udupi', 401],
  ['Uttara Kannada', 185], ['Vijayapura', 451], ['Yadgir', 268],
];

export const DISTRICTS = DISTRICT_BASE.map(([districtName, relativeWeight], index) => {
  const districtId = index + 1;
  return { districtId, districtName, relativeWeight, ...districtSocioeconomics(districtId) };
});

// Matches src/constants/crimeTypes.ts's CRIME_TYPE_OPTIONS exactly, plus the
// crimeHeadId/crimeGroupName pairing src/api/mockData.ts's CASE_CRIME_TYPES and
// MOCK_SUMMARY.categoryMix use -- duplicated here (small, stable set) rather than
// parsed out of the .ts source, since this script has no TS loader.
export const CRIME_SUB_HEADS = [
  { crimeSubHeadId: 101, crimeSubHeadName: 'Theft of Motor Vehicle', crimeHeadId: 2, crimeGroupName: 'Crimes Against Property' },
  { crimeSubHeadId: 102, crimeSubHeadName: 'House Break-in', crimeHeadId: 2, crimeGroupName: 'Crimes Against Property' },
  { crimeSubHeadId: 103, crimeSubHeadName: 'Chain Snatching', crimeHeadId: 1, crimeGroupName: 'Crimes Against Body' },
  { crimeSubHeadId: 104, crimeSubHeadName: 'Cyber Financial Fraud', crimeHeadId: 5, crimeGroupName: 'Cyber Crimes' },
  { crimeSubHeadId: 105, crimeSubHeadName: 'Assault', crimeHeadId: 1, crimeGroupName: 'Crimes Against Body' },
  { crimeSubHeadId: 106, crimeSubHeadName: 'Cattle Theft', crimeHeadId: 2, crimeGroupName: 'Crimes Against Property' },
];

export function scaleWeightsToTarget(items, target) {
  const totalWeight = items.reduce((sum, item) => sum + item.relativeWeight, 0);
  const scaled = items.map((item) => ({
    ...item,
    caseCount: Math.max(1, Math.round((item.relativeWeight / totalWeight) * target)),
  }));
  const currentTotal = scaled.reduce((sum, item) => sum + item.caseCount, 0);
  const remainder = target - currentTotal;
  if (remainder !== 0) {
    const biggest = scaled.reduce((a, b) => (b.caseCount > a.caseCount ? b : a));
    biggest.caseCount += remainder;
  }
  return scaled;
}
