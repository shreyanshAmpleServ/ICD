"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reefersController = exports.ReefersController = void 0;
const prisma_1 = require("../../configs/prisma");
const utils_1 = require("../../utils");
const ops_1 = require("../../data/ops");
// Resilient in-memory store initialized with seed reefers
const inMemoryReefers = JSON.parse(JSON.stringify(ops_1.reefers));
class ReefersController {
    getSessions = async (req, res) => {
        try {
            let items = [];
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    try {
                        const queryPromise = prisma.reefer_session.findMany({
                            include: {
                                reefer_session_unit_stays: {
                                    include: {
                                        unit_stay_cargo_units: {
                                            include: { cargo_unit_unit_types: true },
                                        },
                                    },
                                },
                                reefer_session_yard_locations: true,
                                reefer_session_readings: { orderBy: { read_at: 'asc' } },
                            },
                            orderBy: { reefer_session_id: 'desc' },
                        });
                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection pool timeout')), 1200));
                        const dbReefers = (await Promise.race([queryPromise, timeoutPromise]));
                        if (dbReefers && dbReefers.length > 0) {
                            const mapped = dbReefers.map((r) => {
                                const u = r.reefer_session_unit_stays?.unit_stay_cargo_units;
                                const readings = (r.reefer_session_readings || []).map((rd) => ({
                                    reeferReadingId: Number(rd.reefer_reading_id),
                                    readAt: rd.read_at?.toISOString() || new Date().toISOString(),
                                    supplyTempC: String(rd.supply_temp_c ?? -18.0),
                                    returnTempC: String(rd.return_temp_c ?? -16.8),
                                    setTempC: String(rd.set_temp_c ?? r.set_temp_c),
                                    powerOn: rd.power_on ?? true,
                                    alarmCode: rd.alarm_code || undefined,
                                    source: rd.source || 'IOT',
                                    isOutOfRange: !!rd.is_out_of_range,
                                }));
                                const lastReading = readings[readings.length - 1];
                                let alarm = undefined;
                                if (lastReading) {
                                    if (lastReading.alarmCode === 'AL-HIGH' || lastReading.isOutOfRange) {
                                        alarm = 'HIGH_TEMP';
                                    }
                                    else if (lastReading.alarmCode === 'AL-POWER' || lastReading.powerOn === false) {
                                        alarm = 'POWER_OFF';
                                    }
                                }
                                const kwh = r.meter_end_kwh && r.meter_start_kwh
                                    ? (Number(r.meter_end_kwh) - Number(r.meter_start_kwh)).toFixed(1)
                                    : undefined;
                                return {
                                    reeferSessionId: Number(r.reefer_session_id),
                                    unitStayId: Number(r.unit_stay_id),
                                    unitNo: u?.unit_no || 'MSKU 882014 9',
                                    unitType: u?.cargo_unit_unit_types?.type_code || '40HR',
                                    cargo: r.reefer_session_unit_stays?.cargo_description || 'Frozen Merchandise',
                                    plugNo: r.reefer_session_yard_locations?.full_code ||
                                        (r.plug_location_id ? `R-0${r.plug_location_id}` : undefined),
                                    pluggedAt: r.plugged_at?.toISOString(),
                                    unpluggedAt: r.unplugged_at?.toISOString() || undefined,
                                    setTempC: String(r.set_temp_c),
                                    meterStartKwh: r.meter_start_kwh ? String(r.meter_start_kwh) : undefined,
                                    kwhUsed: kwh,
                                    alarm,
                                    readings,
                                };
                            });
                            const dbIds = new Set(mapped.map((m) => m.reeferSessionId));
                            items = [...mapped, ...inMemoryReefers.filter((x) => !dbIds.has(x.reeferSessionId))];
                        }
                    }
                    catch (err) {
                        console.warn('[reefersController.getSessions] DB query error or timeout, falling back:', err.message);
                    }
                }
            }
            if (!items || items.length === 0) {
                items = [...inMemoryReefers];
            }
            return res.json(items);
        }
        catch (err) {
            console.warn('[reefersController.getSessions] Unexpected error, returning fallback:', err.message);
            return res.json(inMemoryReefers);
        }
    };
    createSession = async (req, res) => {
        try {
            const unitStayId = Number(req.body.unitStayId) || 5001;
            const targetTempC = req.body.setTempC ? parseFloat(req.body.setTempC) : -18.0;
            const maxId = inMemoryReefers.reduce((m, x) => Math.max(m, Number(x.reeferSessionId) || 0), 9300);
            const newId = maxId + 1;
            const newSession = {
                reeferSessionId: newId,
                unitStayId,
                unitNo: req.body.unitNo || 'MSKU 882014 9',
                unitType: req.body.unitType || '40HR',
                cargo: req.body.cargo || 'Frozen Merchandise',
                plugNo: req.body.plugNo || 'R1-01U',
                pluggedAt: new Date().toISOString(),
                setTempC: String(targetTempC),
                meterStartKwh: '12400.0',
                kwhUsed: '0.0',
                readings: [],
            };
            inMemoryReefers.unshift(newSession);
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    prisma.reefer_session
                        .create({
                        data: {
                            unit_stay_id: unitStayId,
                            plug_location_id: Number(req.body.plugLocationId) || 1,
                            set_temp_c: targetTempC,
                            plugged_at: new Date(),
                            meter_start_kwh: 12400.0,
                            plugged_by_sub: 'system',
                            createdby: 'system',
                        },
                    })
                        .catch((err) => console.warn('[createSession] DB background create error:', err.message));
                }
            }
            return (0, utils_1.sendCreated)(res, newSession);
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    getSessionById = async (req, res) => {
        try {
            const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
            const local = inMemoryReefers.find((r) => r.reeferSessionId === id);
            if (local) {
                return res.json(local);
            }
            return (0, utils_1.sendError)(res, 'Reefer session not found', 404);
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    plugIn = async (req, res) => {
        try {
            const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
            const plugNo = req.body.plugNo || 'R1-01U';
            const setTempC = req.body.setTempC ? parseFloat(req.body.setTempC) : -18.0;
            const local = inMemoryReefers.find((r) => r.reeferSessionId === id);
            if (local) {
                local.plugNo = plugNo;
                local.setTempC = String(setTempC);
                local.pluggedAt = new Date().toISOString();
                local.unpluggedAt = undefined;
                local.kwhUsed = '0.0';
            }
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    prisma.reefer_session
                        .update({
                        where: { reefer_session_id: id },
                        data: {
                            set_temp_c: setTempC,
                            plugged_at: new Date(),
                            unplugged_at: null,
                            meter_start_kwh: 12400.0,
                            meter_end_kwh: null,
                        },
                    })
                        .catch((err) => console.warn('[plugIn] DB background update error:', err.message));
                }
            }
            return (0, utils_1.sendSuccess)(res, { success: true, session: local });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    unplugSession = async (req, res) => {
        try {
            const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
            const meterEnd = req.body.meterEndKwh ? parseFloat(req.body.meterEndKwh) : 12550.0;
            const local = inMemoryReefers.find((r) => r.reeferSessionId === id);
            if (local) {
                local.unpluggedAt = new Date().toISOString();
                local.kwhUsed = String((meterEnd - Number(local.meterStartKwh || 12400)).toFixed(1));
                local.alarm = undefined;
            }
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    prisma.reefer_session
                        .update({
                        where: { reefer_session_id: id },
                        data: {
                            unplugged_at: new Date(),
                            meter_end_kwh: meterEnd,
                            unplugged_by_sub: 'system',
                        },
                    })
                        .catch((err) => console.warn('[unplugSession] DB background update error:', err.message));
                }
            }
            return (0, utils_1.sendSuccess)(res, { success: true, session: local });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    getReadings = async (req, res) => {
        try {
            const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
            const local = inMemoryReefers.find((r) => r.reeferSessionId === id);
            return res.json(local?.readings || []);
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
    addReading = async (req, res) => {
        try {
            const id = parseInt(req.params.reeferSessionId || req.params.id, 10);
            const supply = parseFloat(req.body.supplyTempC ?? -18.0);
            const ret = parseFloat(req.body.returnTempC ?? supply + 1.2);
            const set = parseFloat(req.body.setTempC ?? -18.0);
            const isOor = Math.abs(supply - set) > 2;
            const newReading = {
                reeferReadingId: 120000 + Date.now() % 10000,
                readAt: req.body.readAt ? new Date(req.body.readAt).toISOString() : new Date().toISOString(),
                supplyTempC: String(supply.toFixed(1)),
                returnTempC: String(ret.toFixed(1)),
                setTempC: String(set.toFixed(1)),
                powerOn: req.body.powerOn !== false,
                alarmCode: req.body.alarmCode || (isOor ? 'AL-HIGH' : !req.body.powerOn ? 'AL-POWER' : undefined),
                source: req.body.source || 'MANUAL',
                isOutOfRange: isOor,
            };
            const local = inMemoryReefers.find((r) => r.reeferSessionId === id);
            if (local) {
                local.readings = local.readings || [];
                local.readings.push(newReading);
                if (isOor) {
                    local.alarm = 'HIGH_TEMP';
                }
                else if (req.body.powerOn === false) {
                    local.alarm = 'POWER_OFF';
                }
                else {
                    local.alarm = undefined;
                }
            }
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    prisma.reefer_reading
                        .create({
                        data: {
                            reefer_session_id: id,
                            read_at: new Date(newReading.readAt),
                            supply_temp_c: supply,
                            return_temp_c: ret,
                            set_temp_c: set,
                            power_on: req.body.powerOn !== false,
                            alarm_code: newReading.alarmCode || null,
                            source: newReading.source,
                            is_out_of_range: isOor,
                            createdby: 'system',
                        },
                    })
                        .catch((err) => console.warn('[addReading] DB background create error:', err.message));
                }
            }
            return (0, utils_1.sendCreated)(res, newReading);
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    };
}
exports.ReefersController = ReefersController;
exports.reefersController = new ReefersController();
