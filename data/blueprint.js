// Coordinate model for the four-page Wormald marketing plan.
//
// Units are feet. Printed room dimensions are authoritative. Boundaries without
// printed dimensions are proportional traces from the drawing and should be
// treated as having several-inch tolerance; the source does not support
// centimeter-level accuracy.

const ft = (feet, inches = 0) => feet + inches / 12;
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const room = (x0, z0, width, depth) => ({
  bounds: rect(x0, z0, x0 + width, z0 + depth),
  source: { width, depth },
});
export const extents = ({ bounds }) => ({
  x0: bounds[0][0], z0: bounds[0][1], x1: bounds[2][0], z1: bounds[2][1],
});

export const HOUSE = Object.freeze({
  width: 31.6,
  depth: 57.7,
  base: Object.freeze([0, 11, 22, 32]),
  ceiling: Object.freeze([10, 10, 9, 9]),
  rises: Object.freeze([11, 11, 10]),
});
const PENTHOUSE_TERRACE_SEAM = HOUSE.depth - 2 - ft(9, 4);

export const FOOTPRINT = Object.freeze({
  full: rect(0, 0, HOUSE.width, HOUSE.depth),
  upper: [[0, 0], [HOUSE.width, 0], [HOUSE.width, 46.4], [13.4, 46.4], [13.4, 55.7], [0, 55.7]],
  // The enclosed story steps around the stair/elevator core, loft, and wet-bar
  // bump-out. The east/right roof area beyond this ring is terrace.
  penthouseEnclosure: [[9, 2], [24.4, 2], [24.4, 5.5], [29.2, 5.5], [29.2, 13.3], [31, 13.3], [31, 30.6], [14.75, 30.6], [14.75, 33.7], [5.5, 33.7], [5.5, 25.8], [2.8, 25.8], [2.8, 11], [5.5, 11], [5.5, 5.5], [9, 5.5]],
  penthouseEnclosedRegions: Object.freeze([
    rect(9, 2, 24.4, 13.3), rect(5.5, 5.5, 9, 13.3),
    rect(24.4, 5.5, 29.2, 13.3), rect(2.8, 11, 5.5, 25.8),
    rect(5.5, 13.3, 31, 30.6), rect(5.5, 30.6, 14.75, 33.7),
  ]),
});

export const CORE = Object.freeze({
  stairHole: rect(22.1, 13.3, 31, 26.2),
  well: Object.freeze({ x0: 22.1, x1: 27.5, z0: 17, z1: 22.7 }),
  stair: Object.freeze({
    south: 13.3, north: 26.2, west: 22.1, east: 31,
    curveCenter: Object.freeze([22.1, 22.2]),
    curveInnerRadius: 5.4, curveOuterRadius: 8.9,
    landing: Object.freeze({ x0: 27.5, x1: 31, z0: 22.2, z1: 26.2 }),
    return: Object.freeze({ x0: 22.1, x1: 27.5, z0: 22.7, z1: 26.2 }),
    // The curved lower half turns 90 degrees to the half-story landing.
    // The upper straight flight returns across the north edge of the well.
    treads: Object.freeze({ winders: 9, return: 9, total: 18 }),
  }),
  elevator: Object.freeze({
    x0: 26.2, x1: 30.9, z0: 26.6, z1: 30.6,
    bounds: rect(26.2, 26.6, 30.9, 30.6),
    servedLevels: HOUSE.base,
  }),
});

export const VOIDS = Object.freeze({
  entryGallery: rect(8.6, 14.4, 15.6, 19.6),
  stair: CORE.stairHole,
});

export const ROOMS = Object.freeze({
  entry: Object.freeze({
    office: room(0.7, 0.7, ft(15, 5), ft(12, 11)),
    media: room(15.8167, 0.7, ft(15, 1), ft(11, 1)),
    gallery: { bounds: rect(4.95, 13.6167, 16.2, 21.9) },
    centerHall: { bounds: rect(16.2, 12, 30.9, 26.2) },
    studio: room(0.7, 21.9, ft(11, 11), ft(13, 1)),
    hall: { bounds: rect(18.2, 21.9, 22.1, 26.2) },
    bath3: { bounds: rect(12.6167, 21.9, 18.2, 30.6) },
    elevator: { bounds: CORE.elevator.bounds },
    rearHall: { bounds: rect(18.2, 26.2, 26.2, 30.6) },
    mechanical: { bounds: rect(12.6167, 30.6, 30.9, 35.3) },
    garage: room(0.7, 35.5, ft(30, 2), 21),
  }),
  main: Object.freeze({
    dining: room(0.7, 0.7, ft(12, 11), ft(15, 3)),
    living: room(14.9, 0.7, 16, ft(11, 4)),
    butlerMenu: { bounds: rect(0.7, 16.2, 8.4, 26.6) },
    pantry: room(8.4, 19.8, ft(6, 4), ft(6, 7)),
    powder: { bounds: rect(14.7333, 19.8, 19.4, 26.3833) },
    kitchen: room(0.7, 26.8, ft(14, 7), ft(18, 7)),
    great: room(15.8167, 28.4, ft(15, 1), 17),
    sun: room(0.7, 46.1, ft(12, 3), ft(9, 3)),
    stairHall: {
      bounds: rect(15.2833, 12.0333, 30.9, 28.4),
      regions: Object.freeze([
        rect(15.6, 12.0333, 22.1, 19.8),
        rect(22.1, 12.0333, 30.9, 13.3),
        rect(19.4, 19.8, 22.1, 26.4),
        rect(15.2833, 26.4, 26.2, 28.4),
        rect(22.1, 26.2, 26.2, 26.4),
      ]),
    },
    terrace: room(14.1, HOUSE.depth - ft(11, 10), ft(17, 6), ft(11, 10)),
  }),
  upper: Object.freeze({
    bed3: room(0.7, 0.7, ft(10, 8), ft(12, 4)),
    bath2: room(11.3667, 0.7, ft(6, 1), ft(12, 5)),
    bed2: room(19.5667, 0.7, ft(11, 4), ft(11, 1)),
    laundry: room(0.7, 16.3, ft(8, 3), ft(10, 4)),
    ownerBath: {
      bounds: rect(0.7, 27.0333, 0.7 + ft(14, 8), 27.0333 + ft(18, 8)),
      regions: Object.freeze([
        rect(0.7, 26.9, 11.4, 33.9),
        rect(0.7, 33.9, 16.2, 45.7),
      ]),
      source: { width: ft(14, 8), depth: ft(18, 8) },
    },
    ownerCloset: {
      bounds: rect(11.4, 26.9, 11.4 + ft(8, 5), 37.9),
      regions: Object.freeze([rect(11.4, 26.9, 19.8, 33.9)]),
      source: { width: ft(8, 5), depth: 11 },
    },
    ownerSuite: {
      bounds: rect(14.9, 29.4, 30.9, 46.4),
      regions: Object.freeze([
        rect(16.2, 33.9, 30.9, 45.7),
        rect(24.5, 28, 30.9, 33.9),
      ]),
      source: { width: 16, depth: 17 },
    },
    retreat: { bounds: rect(0.7, 46.4, 13.05, 55.35) },
    upperHall: {
      bounds: rect(8.95, 13.0333, 30.9, 26.9),
      regions: Object.freeze([
        rect(8.95, 13.0333, 22.1, 26.9),
        rect(22.1, 26.2, 26.2, 26.9),
        rect(22.1, 13.0333, 30.9, 13.3),
      ]),
    },
    wetBar: { bounds: rect(6.1, 43.15, 11.1, 46.05) },
  }),
  penthouse: Object.freeze({
    // The nominal loft is clipped on its east edge by the stair/elevator core.
    loft: {
      bounds: rect(2.8, 13.3, 2.8 + ft(23, 10), 29.8),
      regions: Object.freeze([rect(2.8, 13.3, 22.1, 25.8), rect(5.5, 25.8, 22.1, 26.8667), rect(14.75, 26.8667, 26.2, 30.6), rect(22.1, 26.2, 26.2, 26.8667), rect(2.8, 11, 9, 13.3)]),
      source: { width: ft(23, 10), depth: ft(16, 6) },
    },
    bed5: room(9, 2, ft(14, 11), ft(11, 1)),
    guestCloset: { bounds: rect(5.5, 5.5, 9, 11) },
    guestEntry: { bounds: rect(23.9167, 9.7, 24.4, 13.3) },
    bath4: { bounds: rect(24.4, 5.5, 29.2, 13.3) },
    wetBar: room(5.5, 33.7 - ft(6, 10), ft(9, 3), ft(6, 10)),
    sunTerrace: room(0.7, PENTHOUSE_TERRACE_SEAM, ft(12, 4), ft(9, 4)),
    diningTerrace: {
      ...room(0.7, PENTHOUSE_TERRACE_SEAM - ft(12, 8), ft(12, 4), ft(12, 8)),
      // Dining sits BEHIND the wet bar, not in a corridor around it.
      regions: Object.freeze([rect(0.7, 33.7, 14.75, PENTHOUSE_TERRACE_SEAM)]),
    },
    // Exact 17'1" east-west × 17'3" north-south source rectangle, rotated to
    // follow the sheet's full east/right side. `regions` clips only the small
    // loft/core intrusions; it is the buildable/pickable terrace surface.
    livingTerrace: {
      bounds: rect(HOUSE.width - ft(17, 1), 46.4 - ft(17, 3), HOUSE.width, 46.4),
      regions: Object.freeze([
        rect(14.75, 30.6, 31.6, 46.4),
        rect(31, 46.4 - ft(17, 3), 31.6, 30.6),
      ]),
      source: { width: ft(17, 3), depth: ft(17, 1), rotated: true },
    },
  }),
});

export const TERRACES = Object.freeze({
  main: ROOMS.main.terrace.bounds,
  upperSpiralLanding: rect(12.9, 48.1, 17.5, 51.9),
  penthouseSpiralLanding: rect(12.9, 48.1, 17.5, 51.9),
  penthouseSun: ROOMS.penthouse.sunTerrace.bounds,
  penthouseDining: ROOMS.penthouse.diningTerrace.bounds,
  penthouseDiningRegions: ROOMS.penthouse.diningTerrace.regions,
  penthouseLiving: ROOMS.penthouse.livingTerrace.bounds,
  penthouseLivingRegions: ROOMS.penthouse.livingTerrace.regions,
});

export const SOURCE_DIMENSIONS = Object.freeze({
  entry: Object.freeze({
    garage: [ft(30, 2), 21], studio: [ft(11, 11), ft(13, 1)],
    office: [ft(15, 5), ft(12, 11)], media: [ft(15, 1), ft(11, 1)],
  }),
  main: Object.freeze({
    dining: [ft(12, 11), ft(15, 3)], living: [16, ft(11, 4)],
    kitchen: [ft(14, 7), ft(18, 7)], great: [ft(15, 1), 17],
    sun: [ft(12, 3), ft(9, 3)], terrace: [ft(17, 6), ft(11, 10)],
    pantry: [ft(6, 4), ft(6, 7)],
  }),
  upper: Object.freeze({
    ownerSuite: [16, 17], ownerBath: [ft(14, 8), ft(18, 8)],
    ownerCloset: [ft(8, 5), 11], laundry: [ft(8, 3), ft(10, 4)],
    bed2: [ft(11, 4), ft(11, 1)], bed3: [ft(10, 8), ft(12, 4)],
    bath2: [ft(6, 1), ft(12, 5)],
  }),
  penthouse: Object.freeze({
    loft: [ft(23, 10), ft(16, 6)], bed5: [ft(14, 11), ft(11, 1)],
    wetBar: [ft(9, 3), ft(6, 10)], sunTerrace: [ft(12, 4), ft(9, 4)],
    diningTerrace: [ft(12, 4), ft(12, 8)], livingTerrace: [ft(17, 3), ft(17, 1)],
  }),
});

export const OPTIONAL = Object.freeze({
  mainCurvedStair: true,
  elevator: true,
  exteriorSpiral: Object.freeze({
    center: [16.9, 50],
    radius: 2.7,
    y0: 11,
    y1: 32,
    mainClearance: rect(14.2, 47.3, 19.6, 52.7),
    upperLanding: TERRACES.upperSpiralLanding,
    penthouseLanding: TERRACES.penthouseSpiralLanding,
    landingLevels: Object.freeze([HOUSE.base[2], HOUSE.base[3]]),
    guardGap: Object.freeze({ z0: 48.1, z1: 51.9 }),
  }),
  upperWetBar: true,
  penthouseWetBar: true,
});
