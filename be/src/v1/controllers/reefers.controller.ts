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
        const dbReefers = await prisma.reefer_session.findMany({
          include: {
            reefer_session_unit_stays: {
              include: {
                unit_stay_cargo_units: {
                  include: { cargo_unit_unit_types: true },
                },
              },
            },
            reefer_session_yard_locations: true,
            reefer_session_readings: { orderBy: { read_at: "asc" } },
          },
          orderBy: { reefer_session_id: "desc" },
        });

        const items = (dbReefers || []).map((r: any) => {
          const u = r.reefer_session_unit_stays?.unit_stay_cargo_units;
          const readings = (r.reefer_session_readings || []).map((rd: any) => ({
            reeferReadingId: Number(rd.reefer_reading_id),
            readAt: rd.read_at?.toISOString() || new Date().toISOString(),
            supplyTempC: String(rd.supply_temp_c ?? -18.0),
            returnTempC: String(rd.return_temp_c ?? -16.8),
            setTempC: String(rd.set_temp_c ?? r.set_temp_c),
            powerOn: rd.power_on ?? true,
            alarmCode: rd.alarm_code || undefined,
            source: rd.source || "IOT",
            isOutOfRange: !!rd.is_out_of_range,
          }));

            const lastReading = readings[readings.length - 1];
            let alarm: "HIGH_TEMP" | "POWER_OFF" | "NO_READING" | undefined = undefined;
            if (lastReading) {
              if (lastReading.alarmCode === "AL-HIGH" || lastReading.isOutOfRange) {
                alarm = "HIGH_TEMP";
              } else if (lastReading.alarmCode === "AL-POWER" || lastReading.powerOn === false) {
                alarm = "POWER_OFF";
              }
            }

            const kwh =
              r.meter_end_kwh && r.meter_start_kwh
                ? (Number(r.meter_end_kwh) - Number(r.meter_start_kwh)).toFixed(1)
                : undefined;

            return {
              reeferSessionId: Number(r.reefer_session_id),
              unitStayId: Number(r.unit_stay_id),
              unitNo: u?.unit_no || "MSKU 882014 9",
              unitType: u?.cargo_unit_unit_types?.type_code || "40HR",
              cargo: r.reefer_session_unit_stays?.cargo_description || "Frozen Merchandise",
              plugNo: r.reefer_session_yard_locations?.full_code || (r.plug_location_id ? `R-0${r.plug_location_id}` : undefined),
              pluggedAt: r.plugged_at?.toISOString(),
              unpluggedAt: r.unplugged_at?.toISOString() || undefined,
              setTempC: String(r.set_temp_c),
              meterStartKwh: r.meter_start_kwh ? String(r.meter_start_kwh) : undefined,
              kwhUsed: kwh,
              alarm,
              readings,
            };
          });

        return res.json(items);
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
      const unitStayId = Number(req.body.unitStayId) || 1;
      const targetTempC = req.body.setTempC ? parseFloat(req.body.setTempC) : -18.0;

        const created = await prisma.reefer_session.create({
          data: {
            unit_stay_id: unitStayId,
            plug_location_id: Number(req.body.plugLocationId) || 1,
            set_temp_c: targetTempC,
            plugged_at: new Date(),
            meter_start_kwh: 12400.0,
            plugged_by_sub: "system",
            createdby: "system",
          },
        });

        return sendCreated(res, {
          reeferSessionId: Number(created.reefer_session_id),
          unitStayId: Number(created.unit_stay_id),
          setTempC: String(created.set_temp_c),
          pluggedAt: created.plugged_at.toISOString(),
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
        const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
        const r = await prisma.reefer_session.findUnique({
          where: { reefer_session_id: id },
          include: {
            reefer_session_unit_stays: {
              include: {
                unit_stay_cargo_units: {
                  include: { cargo_unit_unit_types: true },
                },
              },
            },
            reefer_session_yard_locations: true,
            reefer_session_readings: { orderBy: { read_at: "asc" } },
          },
        });

        if(!r) return sendError(res, "Reefer session not found", 404);

          const u = r.reefer_session_unit_stays?.unit_stay_cargo_units;
          const readings = (r.reefer_session_readings || []).map((rd: any) => ({
            reeferReadingId: Number(rd.reefer_reading_id),
            readAt: rd.read_at?.toISOString(),
            supplyTempC: String(rd.supply_temp_c),
            returnTempC: String(rd.return_temp_c),
            setTempC: String(rd.set_temp_c),
            powerOn: rd.power_on ?? true,
            alarmCode: rd.alarm_code || undefined,
            source: rd.source,
            isOutOfRange: !!rd.is_out_of_range,
          }));

          const lastReading = readings[readings.length - 1];
          let alarm: "HIGH_TEMP" | "POWER_OFF" | "NO_READING" | undefined = undefined;
          if(lastReading) {
            if (lastReading.alarmCode === "AL-HIGH" || lastReading.isOutOfRange) {
              alarm = "HIGH_TEMP";
            } else if (lastReading.alarmCode === "AL-POWER" || lastReading.powerOn === false) {
              alarm = "POWER_OFF";
            }
          }

      return res.json({
            reeferSessionId: Number(r.reefer_session_id),
            unitStayId: Number(r.unit_stay_id),
            unitNo: u?.unit_no || "MSKU 882014 9",
            unitType: u?.cargo_unit_unit_types?.type_code || "40HR",
            cargo: r.reefer_session_unit_stays?.cargo_description || "Frozen Goods",
            plugNo: r.reefer_session_yard_locations?.full_code || `R-0${r.plug_location_id || 1}`,
            pluggedAt: r.plugged_at?.toISOString(),
            unpluggedAt: r.unplugged_at?.toISOString() || undefined,
            setTempC: String(r.set_temp_c),
            alarm,
            readings,
          });
        } catch(err: any) {
          return sendError(res, err.message, 500);
        }
      };

  public plugIn = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
      const plugNo = req.body.plugNo || "R-01";
      const setTempC = req.body.setTempC ? parseFloat(req.body.setTempC) : -18.0;

      const updated = await prisma.reefer_session.update({
        where: { reefer_session_id: id },
        data: {
          set_temp_c: setTempC,
          plugged_at: new Date(),
          unplugged_at: null,
          meter_start_kwh: 12400.0,
          meter_end_kwh: null,
        },
      });

      return sendSuccess(res, { success: true, session: updated });
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
        const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
        const meterEnd = req.body.meterEndKwh ? parseFloat(req.body.meterEndKwh) : 12550.0;

        const updated = await prisma.reefer_session.update({
          where: { reefer_session_id: id },
          data: {
            unplugged_at: new Date(),
            meter_end_kwh: meterEnd,
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
        const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
        const readings = await prisma.reefer_reading.findMany({
          where: { reefer_session_id: id },
          orderBy: { read_at: "asc" },
        });

          const items = readings.map((rd: any) => ({
            reeferReadingId: Number(rd.reefer_reading_id),
            readAt: rd.read_at.toISOString(),
            supplyTempC: String(rd.supply_temp_c),
            returnTempC: String(rd.return_temp_c),
            setTempC: String(rd.set_temp_c),
            powerOn: rd.power_on ?? true,
            alarmCode: rd.alarm_code || undefined,
            source: rd.source,
            isOutOfRange: !!rd.is_out_of_range,
          }));

          return res.json(items);
        } catch(err: any) {
          return sendError(res, err.message, 500);
        }
      };

  public addReading = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
        const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
        const supply = parseFloat(req.body.supplyTempC ?? -18.0);
        const ret = parseFloat(req.body.returnTempC ?? supply + 1.2);
        const set = parseFloat(req.body.setTempC ?? -18.0);
        const isOor = Math.abs(supply - set) > 2;

        const created = await prisma.reefer_reading.create({
          data: {
            reefer_session_id: id,
            read_at: req.body.readAt ? new Date(req.body.readAt) : new Date(),
            supply_temp_c: supply,
            return_temp_c: ret,
            set_temp_c: set,
            power_on: req.body.powerOn !== false,
            alarm_code: req.body.alarmCode || (isOor ? "AL-HIGH" : null),
            source: req.body.source || "MANUAL",
            is_out_of_range: isOor,
            createdby: "system",
          },
        });

        return sendCreated(res, {
          reeferReadingId: Number(created.reefer_reading_id),
          readAt: created.read_at.toISOString(),
          supplyTempC: String(created.supply_temp_c),
          returnTempC: String(created.return_temp_c),
          setTempC: String(created.set_temp_c),
          powerOn: created.power_on,
          alarmCode: created.alarm_code,
          source: created.source,
          isOutOfRange: created.is_out_of_range,
        });
      } catch (err: any) {
        return sendError(res, err.message, 500);
      }
    };
  }

  export const reefersController = new ReefersController();
