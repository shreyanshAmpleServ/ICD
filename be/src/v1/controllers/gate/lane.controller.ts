import { Request, Response } from "express";
import { getPrisma } from "../../../db/prisma";

export const gateLaneController = {
  getLanes: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res
          .status(500)
          .json({ error: "Database connection unavailable" });
      }

      const lanes = await prisma.m_gate_lane.findMany({
        include: { m_gate: true },
        orderBy: { gate_lane_id: "asc" },
      });

      const items = (lanes || []).map((l: any) => ({
        laneId: l.gate_lane_id,
        gateId: l.gate_id,
        gateCode: l.m_gate?.gate_code || "GATE-1",
        gateName: l.m_gate?.gate_name || "Main Gate",
        laneCode: l.lane_code,
        direction: l.direction,
        hasScale: true,
        hasOcr: true,
        hasRfid: true,
        hasKiosk: true,
        barrierOpen: false,
        status: l.is_active ? "ONLINE" : "OFFLINE",
      }));
      return res.json({ items, total: items.length });
    } catch (err: any) {
      console.error("getLanes error:", err);
      res.status(500).json({ error: err.message });
    }
  },

  openBarrier: async (req: Request, res: Response) => {
    try {
      const { laneId } = req.params;
      const prisma = getPrisma();
      if (!prisma) {
        return res
          .status(500)
          .json({ error: "Database connection unavailable" });
      }

      const id = Number(laneId);
      const lane = await prisma.m_gate_lane.findFirst({
        where: { gate_lane_id: isNaN(id) ? undefined : id },
        include: { m_gate: true },
      });

      return res.json({
        success: true,
        laneId: id,
        barrierOpen: true,
        message: `Barrier manually opened for lane ${lane?.lane_code || id}`,
      });
    } catch (err: any) {
      console.error("openBarrier error:", err);
      res.status(500).json({ error: err.message });
    }
  },

  closeBarrier: async (req: Request, res: Response) => {
    try {
      const { laneId } = req.params;
      return res.json({
        success: true,
        laneId: Number(laneId),
        barrierOpen: false,
        message: `Barrier closed for lane ${laneId}`,
      });
    } catch (err: any) {
      console.error("closeBarrier error:", err);
      res.status(500).json({ error: err.message });
    }
  },

  getGatePass: async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const prisma = getPrisma();
      if (!prisma) {
        return res
          .status(500)
          .json({ error: "Database connection unavailable" });
      }

      const visit = await prisma.truck_visit.findFirst({
        where: {
          OR: [{ gate_pass_no: token }, { visit_no: token }],
        },
        include: {
          m_truck_truck_visit_truck_idTom_truck: true,
          m_driver: true,
          m_party_truck_visit: true,
          visit_unit_txn: {
            include: {
              unit_stay: {
                include: {
                  unit_stay_cargo_units: true,
                },
              },
            },
          },
        },
      });

      if (!visit) {
        return res.status(404).json({ error: "Gate pass not found" });
      }

      return res.json({
        valid: true,
        truckVisitId: Number(visit.truck_visit_id),
        passNo: visit.gate_pass_no || `GP-${token.slice(0, 8).toUpperCase()}`,
        token,
        visitNo: visit.visit_no,
        truckPlate:
          visit.m_truck_truck_visit_truck_idTom_truck?.plate_no || "T 000 AAA",
        driverName: visit.m_driver?.driver_name || "Driver",
        transporter: visit.m_party_truck_visit?.party_name,
        issuedAt:
          visit.arrived_at?.toISOString() || visit.createdate?.toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        status: visit.status,
        units: (visit.visit_unit_txn || []).map((u: any) => ({
          unitNo: u.unit_stay?.unit_stay_cargo_units?.unit_no,
          action: u.direction,
        })),
      });
    } catch (err: any) {
      console.error("getGatePass error:", err);
      res.status(500).json({ error: err.message });
    }
  },
};
