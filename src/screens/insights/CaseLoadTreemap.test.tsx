import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CaseLoadTreemap } from './CaseLoadTreemap';

const data = [
  { districtName: 'Bengaluru Urban', unitName: 'Whitefield PS', caseCount: 400 },
  { districtName: 'Bengaluru Urban', unitName: 'Koramangala PS', caseCount: 300 },
  { districtName: 'Mysuru', unitName: 'Mysuru Town PS', caseCount: 200 },
];

describe('CaseLoadTreemap', () => {
  it('renders one header group per district and one cell per unit', () => {
    const { container } = render(<CaseLoadTreemap data={data} />);
    expect(container.querySelectorAll('.treemap-district-header')).toHaveLength(2);
    expect(container.querySelectorAll('.treemap-unit-cell')).toHaveLength(3);
  });

  it('shows the district total in its header label', () => {
    const { container } = render(<CaseLoadTreemap data={data} />);
    const headerTexts = Array.from(container.querySelectorAll('.treemap-district-header + text')).map((el) => el.textContent);
    expect(headerTexts.some((t) => t?.includes('Bengaluru Urban') && t?.includes('700'))).toBe(true);
  });
});
