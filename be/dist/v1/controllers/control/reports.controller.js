"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlReportsController = void 0;
exports.controlReportsController = {
    getOperationalReports: async (_req, res) => {
        try {
            res.json({
                reports: [
                    { reportId: 'REP-001', title: 'Daily Gate Throughput', category: 'GATE', generatedAt: new Date().toISOString() },
                    { reportId: 'REP-002', title: 'Yard Dwell Time by Shipping Line', category: 'YARD', generatedAt: new Date().toISOString() },
                    { reportId: 'REP-003', title: 'Customs Examination Turnaround', category: 'CARGO', generatedAt: new Date().toISOString() },
                    { reportId: 'REP-004', title: 'Daily Revenue & Cashier Closeout', category: 'BILLING', generatedAt: new Date().toISOString() },
                ],
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
