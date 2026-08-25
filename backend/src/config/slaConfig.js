const SLA_CONFIG = {
  targets: {
    high: { responseHours: 2, resolutionHours: 24 },
    medium: { responseHours: 6, resolutionHours: 48 },
    low: { responseHours: 24, resolutionHours: 72 }
  },
  riskThresholdPercent: 15 // Within 15% remaining resolution SLA shifts status to AT_RISK
};

module.exports = SLA_CONFIG;
