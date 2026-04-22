import type { MapPoint } from '../map';

export const SUPPORTED_UNITS = ['m', 'ft'] as const;

export type CalibrationUnit = (typeof SUPPORTED_UNITS)[number];

export interface ScaleCalibration {
  pointA: MapPoint;
  pointB: MapPoint;
  pixelDistance: number;
  realDistance: number;
  unit: CalibrationUnit;
  pixelsPerUnit: number;
  metersPerPixel: number;
}

const FEET_PER_METER = 3.28084;

export function distanceBetweenPoints(pointA: MapPoint, pointB: MapPoint): number {
  const deltaX = pointB.x - pointA.x;
  const deltaY = pointB.y - pointA.y;
  return Math.hypot(deltaX, deltaY);
}

export function toMeters(value: number, unit: CalibrationUnit): number {
  if (unit === 'ft') {
    return value / FEET_PER_METER;
  }
  return value;
}

export function fromMeters(value: number, unit: CalibrationUnit): number {
  if (unit === 'ft') {
    return value * FEET_PER_METER;
  }
  return value;
}

export function createScaleCalibration(
  pointA: MapPoint,
  pointB: MapPoint,
  realDistance: number,
  unit: CalibrationUnit
): ScaleCalibration {
  const pixelDistance = distanceBetweenPoints(pointA, pointB);

  if (!Number.isFinite(realDistance) || realDistance <= 0) {
    throw new Error('Distance must be a positive number.');
  }

  if (!Number.isFinite(pixelDistance) || pixelDistance <= 0) {
    throw new Error('Points must be distinct to calibrate scale.');
  }

  const meters = toMeters(realDistance, unit);

  return {
    pointA,
    pointB,
    pixelDistance,
    realDistance,
    unit,
    pixelsPerUnit: pixelDistance / realDistance,
    metersPerPixel: meters / pixelDistance
  };
}

export function pixelsToRealDistance(pixels: number, calibration: ScaleCalibration): number {
  return pixels / calibration.pixelsPerUnit;
}