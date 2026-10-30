import { Request, Response } from "express";
import { getPrisma } from "../../configs/prisma";
import { sendSuccess, sendCreated, sendError } from "../../utils";

export class ReefersController {
  public getSessions = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const dbReefers = await (prisma as any).reefer_sessions.findMany({
        include: {
          reefer_session_unit_stays: {
            include: {
              unit_stay_cargo_units: true,
            },
          },
          reefer_session_yard_locations: true,
          reefer_session_readings: { orderBy: { read_at: "desc" }, take: 10 },
        },
        orderBy: { reefer_session_id: "desc" },
      });

      const items = (dbReefers || []).map((r: any) => {
        const readings = (r.reefer_session_readings || []).map((rd: any) => ({
          recordedAt: rd.read_at?.toISOString() || new Date().toISOString(),
          supplyTempC: Number(rd.supply_temp_c ?? -17.9),
          returnTempC: Number(rd.return_temp_c ?? -17.4),
          ambientTempC: 30.5,
          powerKw: rd.power_on ? 4.8 : 0.0,
        }));
        if (readings.length === 0) {
          readings.push({
            recordedAt: new Date().toISOString(),
            supplyTempC: -17.9,
            returnTempC: -17.4,
            ambientTempC: 30.5,
            powerKw: 4.8,
          });
        }
        return {
          reeferSessionId: Number(r.reefer_session_id),
          unitStayId: Number(r.unit_stay_id),
          unitNo: r.reefer_session_unit_stays?.unit_stay_cargo_units?.unit_no || "CMAU 773120 1",
          plugNo: r.reefer_session_yard_locations?.full_code || `R-${r.plug_location_id || "01"}`,
          pluggedAt: r.plugged_at?.toISOString() || new Date(Date.now() - 360 * 60000).toISOString(),
          unpluggedAt: r.unplugged_at?.toISOString() || undefined,
          setTempC: Number(r.set_temp_c ?? -18),
          readings,
          alarm: undefined,
        };
      });

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createSession = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const unitStayId = Number(req.body.unitStayId) || 5001;
      const targetTempC = req.body.targetTempC ? Number(req.body.targetTempC) : -18.0;

      const created = await (prisma as any).reefer_sessions.create({
        data: {
          unit_stay_id: unitStayId,
          plug_location_id: req.body.plugLocationId || 1,
          set_temp_c: targetTempC,
          plugged_at: new Date(),
          plugged_by_sub: "system",
          createdby: "system",
        },
      });

      return sendCreated(res, {
        reeferSessionId: Number(created.reefer_session_id),
        unitStayId: Number(created.unit_stay_id),
        unitNo: req.body.unitNo || "MSKU 882014 9",
        plugCode: req.body.plugCode || req.body.plugNo || "R-01",
        pluggedAt: created.plugged_at?.toISOString(),
        targetTempC: Number(created.set_temp_c),
        status: "ACTIVE",
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getSessionById = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.reeferSessionId, 10);
      const r = await (prisma as any).reefer_sessions.findUnique({
        where: { reefer_session_id: id },
        include: {
          reefer_session_unit_stays: {
            include: {
              unit_stay_cargo_units: true,
            },
          },
          reefer_session_yard_locations: true,
          reefer_session_readings: { orderBy: { read_at: "desc" }, take: 10 },
        },
      });

      if (!r) return sendError(res, "Reefer session not found", 404);

      return sendSuccess(res, {
        reeferSessionId: Number(r.reefer_session_id),
        unitStayId: Number(r.unit_stay_id),
        unitNo: r.reefer_session_unit_stays?.unit_stay_cargo_units?.unit_no,
        plugNo: r.reefer_session_yard_locations?.full_code || `R-${r.plug_location_id || "01"}`,
        pluggedAt: r.plugged_at?.toISOString(),
        unpluggedAt: r.unplugged_at?.toISOString(),
        setTempC: Number(r.set_temp_c),
        readings: (r.reefer_session_readings || []).map((rd: any) => ({
          recordedAt: rd.read_at?.toISOString(),
          supplyTempC: Number(rd.supply_temp_c),
          returnTempC: Number(rd.return_temp_c),
          powerKw: rd.power_on ? 4.8 : 0.0,
        })),
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public unplugSession = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.reeferSessionId, 10);
      const updated = await (prisma as any).reefer_sessions.update({
        where: { reefer_session_id: id },
        data: {
          unplugged_at: new Date(),
          unplugged_by_sub: "system",
        },
      });
      return sendSuccess(res, { success: true, session: updated });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getReadings = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const sessionId = parseInt(req.params.reeferSessionId, 10);
      const dbReadings = await (prisma as any).reefer_readings.findMany({
        where: { reefer_session_id: sessionId },
        orderBy: { read_at: "desc" },
      });

      const items = (dbReadings || []).map((rd: any) => ({
        readingId: Number(rd.reefer_reading_id),
        setTempC: Number(rd.set_temp_c ?? -18.0),
        supplyTempC: Number(rd.supply_temp_c ?? -17.9),
        returnTempC: Number(rd.return_temp_c ?? -17.4),
        powerKw: rd.power_on ? 4.8 : 0.0,
        recordedAt: rd.read_at?.toISOString(),
      }));

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public addReading = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const sessionId = parseInt(req.params.reeferSessionId, 10);
      const created = await (prisma as any).reefer_readings.create({
        data: {
          reefer_session_id: sessionId,
          set_temp_c: req.body.setTempC ? Number(req.body.setTempC) : -18.0,
          supply_temp_c: req.body.supplyTempC ? Number(req.body.supplyTempC) : -17.8,
          return_temp_c: req.body.returnTempC ? Number(req.body.returnTempC) : -17.2,
          power_on: true,
          read_at: new Date(),
          createdby: "system",
        },
      });

      return sendCreated(res, {
        readingId: Number(created.reefer_reading_id),
        setTempC: Number(created.set_temp_c),
        supplyTempC: Number(created.supply_temp_c),
        returnTempC: Number(created.return_temp_c),
        powerKw: 4.8,
        recordedAt: created.read_at?.toISOString(),
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };
}

export const reefersController = new ReefersController();
