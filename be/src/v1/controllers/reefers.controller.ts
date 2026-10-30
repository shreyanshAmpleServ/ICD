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
      const dbReefers = await prisma.reefer_sessions.findMany({
        include: {
          unit_stays: true,
          reefer_readings: { orderBy: { recorded_at: "desc" }, take: 10 },
        },
        orderBy: { reefer_session_id: "desc" },
      });

      const items = (dbReefers || []).map((r) => {
        const readings = (r.reefer_readings || []).map((rd) => ({
          recordedAt: rd.recorded_at?.toISOString() || new Date().toISOString(),
          supplyTempC: Number(rd.supply_temp_c ?? -17.9),
          returnTempC: Number(rd.return_temp_c ?? -17.4),
          ambientTempC: 30.5,
          powerKw: Number(rd.power_kw ?? 4.8),
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
          reeferSessionId: r.reefer_session_id,
          unitStayId: r.unit_stay_id,
          unitNo: r.unit_stays?.unit_no || "CMAU 773120 1",
          plugNo: r.plug_code || "R-01",
          pluggedAt: r.plugged_at?.toISOString() || new Date(Date.now() - 360 * 60000).toISOString(),
          unpluggedAt: r.unplugged_at?.toISOString() || undefined,
          setTempC: Number(r.target_temp_c ?? -18),
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
      const siteId = Number(req.siteId || req.body.siteId) || 1;
      const unitStayId = Number(req.body.unitStayId) || 5001;
      const plugCode = req.body.plugCode || req.body.plugNo || "R-01";
      const targetTempC = req.body.targetTempC ? Number(req.body.targetTempC) : -18.0;

      const created = await prisma.reefer_sessions.create({
        data: {
          site_id: siteId,
          unit_stay_id: unitStayId,
          plug_code: plugCode,
          target_temp_c: targetTempC,
          plugged_at: new Date(),
        },
      });

      return sendCreated(res, {
        reeferSessionId: created.reefer_session_id,
        unitStayId: created.unit_stay_id,
        unitNo: req.body.unitNo || "MSKU 882014 9",
        plugCode: created.plug_code,
        pluggedAt: created.plugged_at?.toISOString(),
        targetTempC: Number(created.target_temp_c),
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
      const r = await prisma.reefer_sessions.findUnique({
        where: { reefer_session_id: id },
        include: {
          unit_stays: true,
          reefer_readings: { orderBy: { recorded_at: "desc" }, take: 10 },
        },
      });

      if (!r) return sendError(res, "Reefer session not found", 404);

      return sendSuccess(res, {
        reeferSessionId: r.reefer_session_id,
        unitStayId: r.unit_stay_id,
        unitNo: r.unit_stays?.unit_no,
        plugNo: r.plug_code,
        pluggedAt: r.plugged_at?.toISOString(),
        unpluggedAt: r.unplugged_at?.toISOString(),
        setTempC: Number(r.target_temp_c),
        readings: (r.reefer_readings || []).map((rd) => ({
          recordedAt: rd.recorded_at?.toISOString(),
          supplyTempC: Number(rd.supply_temp_c),
          returnTempC: Number(rd.return_temp_c),
          powerKw: Number(rd.power_kw),
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
      const updated = await prisma.reefer_sessions.update({
        where: { reefer_session_id: id },
        data: {
          unplugged_at: new Date(),
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
      const dbReadings = await prisma.reefer_readings.findMany({
        where: { reefer_session_id: sessionId },
        orderBy: { recorded_at: "desc" },
      });

      const items = (dbReadings || []).map((rd) => ({
        readingId: rd.reading_id,
        setTempC: -18.0,
        supplyTempC: Number(rd.supply_temp_c ?? -17.9),
        returnTempC: Number(rd.return_temp_c ?? -17.4),
        powerKw: Number(rd.power_kw ?? 4.8),
        recordedAt: rd.recorded_at?.toISOString(),
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
      const created = await prisma.reefer_readings.create({
        data: {
          reefer_session_id: sessionId,
          set_temp_c: req.body.setTempC ? Number(req.body.setTempC) : -18.0,
          supply_temp_c: req.body.supplyTempC ? Number(req.body.supplyTempC) : -17.8,
          return_temp_c: req.body.returnTempC ? Number(req.body.returnTempC) : -17.2,
          power_kw: req.body.powerKw ? Number(req.body.powerKw) : 4.8,
          recorded_at: new Date(),
        },
      });

      return sendCreated(res, {
        readingId: created.reading_id,
        setTempC: req.body.setTempC || -18.0,
        supplyTempC: Number(created.supply_temp_c),
        returnTempC: Number(created.return_temp_c),
        powerKw: Number(created.power_kw),
        recordedAt: created.recorded_at?.toISOString(),
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };
}

export const reefersController = new ReefersController();
