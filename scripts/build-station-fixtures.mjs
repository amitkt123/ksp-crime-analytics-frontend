// One-time local generator: spatial-joins the raw KGIS police station boundary file to
// Karnataka districts, simplifies each station polygon, and writes small per-district
// GeoJSON fixtures plus a TS roster module for mock-mode use. Not part of the build —
// run manually: node scripts/build-station-fixtures.mjs
// Requires dist/geo/KGISMAPS_KN_Police_Station_Boundaries.geojsonl to exist locally;
// that raw file is never committed (dist/ is gitignored).
import { createInterface } from 'node:readline';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const RAW_INPUT = 'dist/geo/KGISMAPS_KN_Police_Station_Boundaries.geojsonl';
const DISTRICTS_FILE = 'public/data/karnataka-districts.geojson';
const STATIONS_OUT_DIR = 'public/data/stations';
const FIXTURE_OUT_FILE = 'src/api/generatedStationFixtures.ts';
const SIMPLIFY_EPSILON = 0.0003;
const COORD_PRECISION = 5;

function ringCentroid(ring) {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return [sx / ring.length, sy / ring.length];
}

function geometryCentroid(geometry) {
  if (geometry.type === 'Polygon') return ringCentroid(geometry.coordinates[0]);
  const biggest = geometry.coordinates.reduce((a, b) => (a[0].length >= b[0].length ? a : b));
  return ringCentroid(biggest[0]);
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y) {
      const xIntersect = xi + ((y - yi) * (xj - xi)) / (yj - yi);
      if (x < xIntersect) inside = !inside;
    }
  }
  return inside;
}

function pointInPolygonCoords(point, coords) {
  if (!pointInRing(point, coords[0])) return false;
  return coords.slice(1).every((hole) => !pointInRing(point, hole));
}

function pointInGeometry(point, geometry) {
  if (geometry.type === 'Polygon') return pointInPolygonCoords(point, geometry.coordinates);
  return geometry.coordinates.some((poly) => pointInPolygonCoords(point, poly));
}

function distance([x1, y1], [x2, y2]) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function perpendicularDistance(point, a, b) {
  if (a[0] === b[0] && a[1] === b[1]) return distance(point, a);
  const [x, y] = point;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const num = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
  const den = Math.hypot(y2 - y1, x2 - x1);
  return num / den;
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

function simplifyRing(ring, epsilon) {
  const simplified = douglasPeucker(ring, epsilon);
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) simplified.push(first);
  return simplified;
}

function roundPoint([x, y]) {
  return [Number(x.toFixed(COORD_PRECISION)), Number(y.toFixed(COORD_PRECISION))];
}

function simplifyGeometry(geometry, epsilon) {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, epsilon).map(roundPoint)),
    };
  }
  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates.map((poly) => poly.map((ring) => simplifyRing(ring, epsilon).map(roundPoint))),
  };
}

async function main() {
  const districtsGeoJSON = JSON.parse(await readFile(DISTRICTS_FILE, 'utf8'));
  const districts = districtsGeoJSON.features;
  const districtCentroids = districts.map((d) => geometryCentroid(d.geometry));

  function resolveDistrictId(centroid) {
    for (let i = 0; i < districts.length; i++) {
      if (pointInGeometry(centroid, districts[i].geometry)) return districts[i].properties.districtId;
    }
    let nearestIndex = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < districtCentroids.length; i++) {
      const d = distance(centroid, districtCentroids[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    }
    return districts[nearestIndex].properties.districtId;
  }

  const stationsByDistrict = new Map();
  const rl = createInterface({ input: createReadStream(RAW_INPUT), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const feature = JSON.parse(line);
    const centroid = geometryCentroid(feature.geometry);
    const districtId = resolveDistrictId(centroid);
    const name = feature.properties.PS_BOUNDName;
    const geometry = simplifyGeometry(feature.geometry, SIMPLIFY_EPSILON);
    if (!stationsByDistrict.has(districtId)) stationsByDistrict.set(districtId, []);
    stationsByDistrict.get(districtId).push({ name, geometry });
  }

  let nextUnitId = 1;
  const rosterByDistrict = {};
  await mkdir(STATIONS_OUT_DIR, { recursive: true });

  for (const districtId of [...stationsByDistrict.keys()].sort((a, b) => a - b)) {
    const stations = stationsByDistrict.get(districtId);
    const features = [];
    const roster = [];
    for (const station of stations) {
      const unitId = nextUnitId++;
      roster.push({ unitId, unitName: station.name });
      features.push({ type: 'Feature', properties: { unitId, unitName: station.name }, geometry: station.geometry });
    }
    rosterByDistrict[districtId] = roster;
    const collection = { type: 'FeatureCollection', features };
    const json = JSON.stringify(collection);
    await writeFile(path.join(STATIONS_OUT_DIR, `${districtId}.geojson`), json);
    console.log(`district ${districtId}: ${features.length} stations, ${json.length} bytes`);
  }

  const fixtureSource = [
    'export interface StationFixture {',
    '  unitId: number;',
    '  unitName: string;',
    '}',
    '',
    `export const STATIONS_BY_DISTRICT: Record<number, StationFixture[]> = ${JSON.stringify(rosterByDistrict, null, 2)};`,
    '',
  ].join('\n');
  await writeFile(FIXTURE_OUT_FILE, fixtureSource);
  console.log(`wrote ${FIXTURE_OUT_FILE}: ${nextUnitId - 1} stations across ${Object.keys(rosterByDistrict).length} districts`);
}

main();
