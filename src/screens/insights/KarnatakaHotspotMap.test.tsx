import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { KarnatakaHotspotMap } from './KarnatakaHotspotMap';

vi.mock('maplibre-gl', () => {
  function MockMap(this: Record<string, unknown>) {
    this.on = vi.fn((event: string, cb: () => void) => { if (event === 'load') cb(); });
    this.addSource = vi.fn();
    this.addLayer = vi.fn();
    this.getSource = vi.fn();
    this.fitBounds = vi.fn();
    this.remove = vi.fn();
  }
  return { default: { Map: vi.fn(MockMap) } };
});

const boundaries = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { districtId: 1, district: 'Bengaluru Urban' },
      geometry: { type: 'Polygon', coordinates: [[[77, 12], [78, 12], [78, 13], [77, 12]]] },
    },
  ],
};

describe('KarnatakaHotspotMap', () => {
  it('renders a map container and initializes MapLibre with the boundaries and points', async () => {
    const maplibregl = (await import('maplibre-gl')).default;
    const { container } = render(
      <KarnatakaHotspotMap boundaries={boundaries} points={[{ lat: 12.97, lon: 77.59, crimeHead: 'Cyber Crimes', count: 12 }]} />,
    );
    expect(container.querySelector('.hotspot-map-canvas')).not.toBeNull();
    expect(maplibregl.Map).toHaveBeenCalledOnce();
  });
});
