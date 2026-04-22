import { describe, expect, it } from 'vitest';
import {
  createScaleCalibration,
  distanceBetweenPoints,
  fromMeters,
  pixelsToRealDistance,
  toMeters
} from './measurement';

describe('measurement calibration utilities', () => {
  it('calculates euclidean distance between points', () => {
    expect(distanceBetweenPoints({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('creates calibration with pixels-per-unit and meters-per-pixel', () => {
    const calibration = createScaleCalibration({ x: 0, y: 0 }, { x: 100, y: 0 }, 10, 'm');

    expect(calibration.pixelDistance).toBe(100);
    expect(calibration.pixelsPerUnit).toBe(10);
    expect(calibration.metersPerPixel).toBeCloseTo(0.1, 8);
    expect(pixelsToRealDistance(55, calibration)).toBeCloseTo(5.5, 8);
  });

  it('converts feet to meters and back', () => {
    const feet = 12;
    const meters = toMeters(feet, 'ft');
    expect(fromMeters(meters, 'ft')).toBeCloseTo(feet, 5);
  });

  it('rejects invalid distance and duplicate points', () => {
    expect(() => createScaleCalibration({ x: 5, y: 5 }, { x: 5, y: 5 }, 10, 'm')).toThrow();
    expect(() => createScaleCalibration({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, 'm')).toThrow();
  });
});