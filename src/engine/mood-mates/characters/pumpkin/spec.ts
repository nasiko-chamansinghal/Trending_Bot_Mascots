import type { SolidSpec } from '../../solid/spec';

export const PUMPKIN_SPEC: SolidSpec = {
  body: {
    aspect: 0.8873,
    squareness: 1.0286,
    ribs: 7,
    groove: 0.019,
    grooveSharp: 1,
    grooveTop: 0,
    grooveBottom: 8,
    topDip: 0.1254,
    topDipWidth: 0.5847,
    bottomDip: 0.2787,
    bottomDipWidth: 0.322,
    taper: -0.006,
  },
  stem: {
    base: [0.0364, 0.7427, 0.0009],
    c1: [-0.0289, 0.877, -0.005],
    c2: [0.0176, 1.1515, 0.0046],
    tip: [-0.2108, 1.2438, 0.0191],
    radius: [0.1733, 0.098, 0.1085],
  },
  rest: { yaw: 0.0511, pitch: 0.2049, roll: -0.0003 },
  scale: 82,
  stretch: [0.997, 1.0129],
  center: [120, 144],
  stemColor: '#3B3B3B',
  capColor: '#515151',
  edge: 0.06,
};
