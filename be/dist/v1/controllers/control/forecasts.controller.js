"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlForecastsController = void 0;
exports.controlForecastsController = {
    getForecasts: async (_req, res) => {
        try {
            res.json({
                modelName: 'YARD-OCCUPANCY-PROPHET-V2',
                predictedPeakDay: '2026-11-04',
                predictedPeakTeu: 10200,
                confidenceIntervalPct: 92.5,
                forecastPoints: [
                    { day: 'Day 1 (+1d)', expectedInboundTeu: 340, expectedOutboundTeu: 310, netOccupancy: 8520 },
                    { day: 'Day 2 (+2d)', expectedInboundTeu: 410, expectedOutboundTeu: 320, netOccupancy: 8610 },
                    { day: 'Day 3 (+3d)', expectedInboundTeu: 500, expectedOutboundTeu: 350, netOccupancy: 8760 },
                    { day: 'Day 4 (+4d)', expectedInboundTeu: 620, expectedOutboundTeu: 380, netOccupancy: 9000 },
                ],
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
