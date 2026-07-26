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

  it('positions each district header directly above its own units, with no gap between them', () => {
    const { container } = render(<CaseLoadTreemap data={data} />);
    const groups = container.querySelectorAll('svg > g');
    expect(groups.length).toBeGreaterThan(0);
    groups.forEach((g) => {
      const header = g.querySelector('.treemap-district-header')!;
      const firstUnit = g.querySelector('.treemap-unit-cell')!;
      const headerBottom = Number(header.getAttribute('y')) + Number(header.getAttribute('height'));
      const unitTop = Number(firstUnit.getAttribute('y'));
      expect(unitTop).toBeCloseTo(headerBottom, 1);
    });
  });

  it('sorts districts with data alphabetically first, then zero-total districts alphabetically after', () => {
    const mixed = [
      { districtName: 'Zeta', unitName: 'Zeta PS', caseCount: 0 },
      { districtName: 'Bengaluru Urban', unitName: 'Whitefield PS', caseCount: 400 },
      { districtName: 'Alpha', unitName: 'Alpha PS', caseCount: 0 },
      { districtName: 'Mysuru', unitName: 'Mysuru PS', caseCount: 200 },
    ];
    const { container } = render(<CaseLoadTreemap data={mixed} />);
    const headerLabels = Array.from(container.querySelectorAll('.treemap-district-header + text')).map(
      (el) => el.textContent?.split(' (')[0],
    );
    expect(headerLabels).toEqual(['Bengaluru Urban', 'Mysuru', 'Alpha', 'Zeta']);
  });

  it('labels a zero-total district "No data" instead of "(0)", and still renders a visible box for it', () => {
    const mixed = [
      { districtName: 'Bengaluru Urban', unitName: 'Whitefield PS', caseCount: 400 },
      { districtName: 'Zeta', unitName: 'Zeta PS', caseCount: 0 },
    ];
    const { container } = render(<CaseLoadTreemap data={mixed} />);
    const headerTexts = Array.from(container.querySelectorAll('.treemap-district-header + text')).map((el) => el.textContent);
    expect(headerTexts.some((t) => t?.includes('Zeta') && t?.includes('No data'))).toBe(true);

    const zetaCell = Array.from(container.querySelectorAll('.treemap-unit-cell')).find((el) =>
      el.querySelector('title')?.textContent?.includes('Zeta PS'),
    )!;
    expect(Number(zetaCell.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(zetaCell.getAttribute('height'))).toBeGreaterThan(0);
  });
});
