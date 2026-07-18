type Position = [number, number];

function forEachPosition(coordinates: unknown, visit: (pos: Position) => void): void {
  if (!Array.isArray(coordinates)) return;
  if (typeof coordinates[0] === 'number') {
    visit(coordinates as Position);
    return;
  }
  for (const child of coordinates) forEachPosition(child, visit);
}

export function geometryBounds(geometry: { coordinates: unknown }): [[number, number], [number, number]] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  forEachPosition(geometry.coordinates, ([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  return [[minLng, minLat], [maxLng, maxLat]];
}

// Bounds-center approximation, not a true polygon centroid -- good enough for
// placing a marker near the middle of a district/station shape without pulling in
// a geometry library for what's a visual nicety (the red-zone pulse), not analysis.
export function featureCentroid(geometry: { coordinates: unknown }): [number, number] {
  const [[minLng, minLat], [maxLng, maxLat]] = geometryBounds(geometry);
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

export function featureCollectionBounds(featureCollection: {
  features: Array<{ geometry: { coordinates: unknown } }>;
}): [[number, number], [number, number]] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const feature of featureCollection.features) {
    const [[featureMinLng, featureMinLat], [featureMaxLng, featureMaxLat]] = geometryBounds(feature.geometry);
    if (featureMinLng < minLng) minLng = featureMinLng;
    if (featureMaxLng > maxLng) maxLng = featureMaxLng;
    if (featureMinLat < minLat) minLat = featureMinLat;
    if (featureMaxLat > maxLat) maxLat = featureMaxLat;
  }

  return [[minLng, minLat], [maxLng, maxLat]];
}
