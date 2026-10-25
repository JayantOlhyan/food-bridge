export const config = {
  // DEMO ONLY: not food-safety guidance. Real thresholds must follow FSSAI/local rules.
  maxHoldHours: {'hot-held': 4, refrigerated: 8, 'room-temperature': 2, 'packaged-sealed': 6},
  minLeadMinutes: 30, avgSpeedKmh: 20, bufferMinutes: 8,
  weights: {timeMargin: .4, distance: .35, capacityFit: .25},
  urgencyMinutes: {high: 60, medium: 180}, co2Factor: 2.5,
  co2Assumption: 'Illustrative demo assumption, not a measured emissions assessment.'
};
