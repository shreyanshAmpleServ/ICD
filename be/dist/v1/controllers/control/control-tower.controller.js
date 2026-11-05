"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlTowerController = void 0;
exports.controlTowerController = {
    getStatus: async (_req, res) => {
        try {
            res.json({
                terminalStatus: 'GREEN',
                activeVesselsAtBerth: 2,
                trucksInYard: 14,
                waitingGateInQueue: 4,
                averageDwellDays: 3.8,
                activeCriticalAlerts: 0,
                equipmentAvailabilityPct: 94.0,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
