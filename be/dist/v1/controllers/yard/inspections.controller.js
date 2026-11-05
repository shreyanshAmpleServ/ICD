"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yardInspectionsController = void 0;
const prisma_1 = require("../../../configs/prisma");
const utils_1 = require("../../../utils");
const ops_1 = require("../../../data/ops");
// Resilient in-memory store initialized with seed inspections
const inMemoryInspections = JSON.parse(JSON.stringify(ops_1.inspections));
exports.yardInspectionsController = {
    getInspections: async (req, res) => {
        try {
            const siteIdParam = req.query.siteId;
            const statusParam = req.query.status;
            const kindParam = (req.query.inspectionKind || req.query.kind);
            const unitNoParam = req.query.unitNo;
            let items = [];
            // If DB is reported live, attempt query with a 1.2s timeout so pool issues never hang or error
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    try {
                        const queryPromise = prisma.inspection.findMany({
                            include: {
                                unit_stay: {
                                    include: {
                                        unit_stay_cargo_units: {
                                            include: { cargo_unit_unit_types: true },
                                        },
                                    },
                                },
                                m_inspection_template: true,
                                truck_visit: {
                                    include: { m_truck_truck_visit_truck_idTom_truck: true },
                                },
                                inspection_finding: {
                                    include: { m_damage_code: true },
                                },
                                inspection_result: true,
                            },
                            orderBy: { inspection_id: 'desc' },
                        });
                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection pool timeout')), 1200));
                        const dbInspections = (await Promise.race([queryPromise, timeoutPromise]));
                        if (dbInspections && dbInspections.length > 0) {
                            const mapped = dbInspections.map((i) => {
                                const u = i.unit_stay?.unit_stay_cargo_units;
                                const findings = (i.inspection_finding || []).map((f) => ({
                                    inspectionFindingId: Number(f.inspection_finding_id),
                                    area: f.area,
                                    locationDetail: f.location_detail || '',
                                    damageCode: f.m_damage_code?.damage_code || 'DT',
                                    severity: f.severity,
                                    sizeCm: f.size_cm || undefined,
                                    description: f.description || undefined,
                                    needsRepair: f.needs_repair ?? true,
                                    isPreexisting: f.is_preexisting ?? false,
                                    photoDocumentIds: [Number(f.inspection_finding_id) * 10, Number(f.inspection_finding_id) * 10 + 1],
                                }));
                                const results = (i.inspection_result || []).map((r) => ({
                                    inspectionItemId: r.inspection_item_id,
                                    isOk: r.is_ok,
                                    resultValue: r.result_value || (r.is_ok ? 'OK' : 'DAMAGED'),
                                }));
                                const isMajor = i.overall_condition === 'MAJOR_DAMAGE' || i.overall_condition === 'REJECTED';
                                const approvalNeeded = i.status === 'COMPLETED' && isMajor;
                                return {
                                    inspectionId: Number(i.inspection_id),
                                    unitStayId: Number(i.unit_stay_id),
                                    siteId: i.unit_stay?.site_id || 1,
                                    unitNo: u?.unit_no || 'MSKU 882014 9',
                                    category: u?.unit_category === 'VEHICLE' ? 'VEHICLE' : 'CONTAINER',
                                    unitType: u?.cargo_unit_unit_types?.type_code || '40HR',
                                    templateCode: i.m_inspection_template?.template_code || 'CTR-STD-v4',
                                    inspectionKind: i.inspection_kind,
                                    status: i.status,
                                    overallCondition: i.overall_condition,
                                    odometerKm: i.odometer_km || undefined,
                                    fuelLevel: i.fuel_level || undefined,
                                    batteryOk: i.battery_ok ?? undefined,
                                    personalEffects: i.personal_effects || undefined,
                                    remarks: i.remarks || undefined,
                                    startedAt: i.started_at?.toISOString() || i.createdate?.toISOString() || new Date().toISOString(),
                                    completedAt: i.completed_at?.toISOString() || undefined,
                                    inspector: i.inspector_sub || 'Juma M.',
                                    plateNo: i.truck_visit?.m_truck_truck_visit_truck_idTom_truck?.plate_no || undefined,
                                    truckVisitId: i.truck_visit_id ? Number(i.truck_visit_id) : undefined,
                                    approvalNeeded,
                                    approvedBy: i.approved_by || undefined,
                                    signatureMode: 'SCREEN',
                                    signedBy: i.status === 'COMPLETED' ? 'Driver' : undefined,
                                    findings,
                                    results,
                                    photoCount: findings.length > 0 ? 6 : 4,
                                };
                            });
                            const dbIds = new Set(mapped.map((m) => m.inspectionId));
                            items = [...mapped, ...inMemoryInspections.filter((x) => !dbIds.has(x.inspectionId))];
                        }
                    }
                    catch (err) {
                        console.warn('[yardInspectionsController] DB query error or timeout, falling back:', err.message);
                    }
                }
            }
            // If DB was not live or returned empty/failed, use in-memory store
            if (!items || items.length === 0) {
                items = [...inMemoryInspections];
            }
            // Apply site filter
            if (siteIdParam && siteIdParam.toLowerCase() !== 'all') {
                const sid = Number(siteIdParam);
                if (!isNaN(sid) && sid > 0) {
                    items = items.filter((i) => i.siteId === sid);
                }
            }
            // Apply status filter
            if (statusParam && statusParam.toLowerCase() !== 'all') {
                items = items.filter((i) => i.status === statusParam);
            }
            // Apply kind filter
            if (kindParam && kindParam.toLowerCase() !== 'all') {
                items = items.filter((i) => i.inspectionKind === kindParam);
            }
            // Apply unitNo search
            if (unitNoParam) {
                const uLower = unitNoParam.toLowerCase();
                items = items.filter((i) => i.unitNo && i.unitNo.toLowerCase().includes(uLower));
            }
            return res.json(items);
        }
        catch (err) {
            console.warn('[yardInspectionsController.getInspections] Unexpected error, returning fallback:', err.message);
            return res.json(inMemoryInspections);
        }
    },
    getInspectionById: async (req, res) => {
        try {
            const id = parseInt(req.params.inspectionId || req.params.id, 10);
            // Try database if live
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    try {
                        const queryPromise = prisma.inspection.findUnique({
                            where: { inspection_id: id },
                            include: {
                                unit_stay: {
                                    include: {
                                        unit_stay_cargo_units: {
                                            include: { cargo_unit_unit_types: true },
                                        },
                                        unit_stay_yard_locations: true,
                                    },
                                },
                                m_inspection_template: true,
                                truck_visit: {
                                    include: { m_truck_truck_visit_truck_idTom_truck: true },
                                },
                                inspection_finding: {
                                    include: { m_damage_code: true },
                                },
                                inspection_result: true,
                            },
                        });
                        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection pool timeout')), 1200));
                        const i = (await Promise.race([queryPromise, timeoutPromise]));
                        if (i) {
                            const u = i.unit_stay?.unit_stay_cargo_units;
                            const findings = (i.inspection_finding || []).map((f) => ({
                                inspectionFindingId: Number(f.inspection_finding_id),
                                area: f.area,
                                locationDetail: f.location_detail || '',
                                damageCode: f.m_damage_code?.damage_code || 'DT',
                                severity: f.severity,
                                sizeCm: f.size_cm || undefined,
                                description: f.description || undefined,
                                needsRepair: f.needs_repair ?? true,
                                isPreexisting: f.is_preexisting ?? false,
                                photoDocumentIds: [Number(f.inspection_finding_id) * 10, Number(f.inspection_finding_id) * 10 + 1],
                            }));
                            const results = (i.inspection_result || []).map((r) => ({
                                inspectionItemId: r.inspection_item_id,
                                isOk: r.is_ok,
                                resultValue: r.result_value || (r.is_ok ? 'OK' : 'DAMAGED'),
                            }));
                            const isMajor = i.overall_condition === 'MAJOR_DAMAGE' || i.overall_condition === 'REJECTED';
                            const approvalNeeded = i.status === 'COMPLETED' && isMajor;
                            return res.json({
                                inspectionId: Number(i.inspection_id),
                                unitStayId: Number(i.unit_stay_id),
                                siteId: i.unit_stay?.site_id || 1,
                                unitNo: u?.unit_no || 'MSKU 882014 9',
                                category: u?.unit_category === 'VEHICLE' ? 'VEHICLE' : 'CONTAINER',
                                unitType: u?.cargo_unit_unit_types?.type_code || '40HR',
                                templateCode: i.m_inspection_template?.template_code || 'CTR-STD-v4',
                                inspectionKind: i.inspection_kind,
                                status: i.status,
                                overallCondition: i.overall_condition,
                                odometerKm: i.odometer_km || undefined,
                                fuelLevel: i.fuel_level || undefined,
                                batteryOk: i.battery_ok ?? undefined,
                                personalEffects: i.personal_effects || undefined,
                                remarks: i.remarks || undefined,
                                startedAt: i.started_at?.toISOString() || i.createdate?.toISOString() || new Date().toISOString(),
                                completedAt: i.completed_at?.toISOString() || undefined,
                                inspector: i.inspector_sub || 'Juma M.',
                                plateNo: i.truck_visit?.m_truck_truck_visit_truck_idTom_truck?.plate_no || undefined,
                                truckVisitId: i.truck_visit_id ? Number(i.truck_visit_id) : undefined,
                                approvalNeeded,
                                approvedBy: i.approved_by || undefined,
                                signatureMode: 'SCREEN',
                                signedBy: i.status === 'COMPLETED' ? 'Driver' : undefined,
                                findings,
                                results,
                                photoCount: findings.length > 0 ? 6 : 4,
                            });
                        }
                    }
                    catch (err) {
                        console.warn('[yardInspectionsController.getInspectionById] DB error, trying fallback:', err.message);
                    }
                }
            }
            // Check in-memory store
            const local = inMemoryInspections.find((x) => x.inspectionId === id);
            if (local) {
                return res.json(local);
            }
            return (0, utils_1.sendError)(res, 'Inspection not found', 404);
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    },
    createInspection: async (req, res) => {
        try {
            const unitStayId = Number(req.body.unitStayId) || 1;
            const kind = req.body.inspectionKind || req.body.kind || 'PERIODIC';
            const templateCode = req.body.templateCode || (req.body.category === 'VEHICLE' ? 'VEH-STD-v3' : 'CTR-STD-v4');
            const siteId = Number(req.query.siteId || req.body.siteId || 1);
            const maxId = inMemoryInspections.reduce((m, x) => Math.max(m, Number(x.inspectionId) || 0), 1212);
            const inspectionId = maxId + 1;
            const newInsp = {
                inspectionId,
                unitStayId,
                siteId,
                unitNo: req.body.unitNo || 'MSKU 882014 9',
                category: req.body.category === 'VEHICLE' ? 'VEHICLE' : 'CONTAINER',
                unitType: req.body.unitType || (req.body.category === 'VEHICLE' ? 'CAR_SUV' : '40HR'),
                templateCode,
                inspectionKind: kind,
                status: 'IN_PROGRESS',
                overallCondition: 'SOUND',
                startedAt: new Date().toISOString(),
                inspector: req.body.inspector || 'Ashok Kumar',
                plateNo: req.body.plateNo,
                truckVisitId: req.body.truckVisitId ? Number(req.body.truckVisitId) : undefined,
                approvalNeeded: false,
                signatureMode: 'SCREEN',
                findings: [],
                results: [],
                photoCount: 4,
                remarks: req.body.remarks,
            };
            inMemoryInspections.unshift(newInsp);
            // Async create in DB if live
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    prisma.inspection
                        .create({
                        data: {
                            unit_stay_id: unitStayId,
                            inspection_template_id: req.body.templateId || (req.body.category === 'VEHICLE' ? 3 : 1),
                            inspection_kind: kind,
                            status: 'IN_PROGRESS',
                            started_at: new Date(),
                            inspector_sub: newInsp.inspector,
                            remarks: req.body.remarks,
                            createdby: 'system',
                        },
                    })
                        .catch((e) => console.warn('[createInspection] DB background create error:', e.message));
                }
            }
            return (0, utils_1.sendCreated)(res, newInsp);
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    },
    saveResults: async (req, res) => {
        try {
            const id = parseInt(req.params.inspectionId || req.params.id, 10);
            const { results, findings, odometerKm, fuelLevel, personalEffects, remarks } = req.body;
            // Update in-memory
            const local = inMemoryInspections.find((x) => x.inspectionId === id);
            if (local) {
                if (results)
                    local.results = results;
                if (findings)
                    local.findings = findings;
                if (odometerKm !== undefined)
                    local.odometerKm = Number(odometerKm);
                if (fuelLevel !== undefined)
                    local.fuelLevel = fuelLevel;
                if (personalEffects !== undefined)
                    local.personalEffects = personalEffects;
                if (remarks !== undefined)
                    local.remarks = remarks;
            }
            // Update DB if live
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    try {
                        if (results && Array.isArray(results)) {
                            for (const r of results) {
                                const itemId = Number(r.inspectionItemId);
                                const isOk = r.resultValue === 'OK' || r.isOk === true;
                                await prisma.inspection_result.upsert({
                                    where: {
                                        inspection_id_inspection_item_id: {
                                            inspection_id: id,
                                            inspection_item_id: itemId,
                                        },
                                    },
                                    update: {
                                        result_value: r.resultValue || (isOk ? 'OK' : 'DAMAGED'),
                                        is_ok: isOk,
                                    },
                                    create: {
                                        inspection_id: id,
                                        inspection_item_id: itemId,
                                        result_value: r.resultValue || (isOk ? 'OK' : 'DAMAGED'),
                                        is_ok: isOk,
                                        createdby: 'system',
                                    },
                                });
                            }
                        }
                        if (findings && Array.isArray(findings)) {
                            for (const f of findings) {
                                let damageCodeId = f.damageCodeId || 1;
                                if (f.damageCode) {
                                    const dc = await prisma.m_damage_code.findFirst({ where: { damage_code: f.damageCode } });
                                    if (dc)
                                        damageCodeId = dc.damage_code_id;
                                }
                                await prisma.inspection_finding.create({
                                    data: {
                                        inspection_id: id,
                                        area: f.area || 'WALLS',
                                        damage_code_id: damageCodeId,
                                        severity: f.severity || 'MINOR',
                                        location_detail: f.locationDetail,
                                        size_cm: f.sizeCm ? String(f.sizeCm) : null,
                                        description: f.description,
                                        needs_repair: f.severity !== 'MINOR',
                                        createdby: 'system',
                                    },
                                });
                            }
                        }
                        await prisma.inspection.update({
                            where: { inspection_id: id },
                            data: {
                                odometer_km: odometerKm ? Number(odometerKm) : undefined,
                                fuel_level: fuelLevel,
                                personal_effects: personalEffects,
                            },
                        });
                    }
                    catch (e) {
                        console.warn('[saveResults] DB background update error:', e.message);
                    }
                }
            }
            return (0, utils_1.sendSuccess)(res, { success: true, inspection: local });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    },
    completeInspection: async (req, res) => {
        try {
            const id = parseInt(req.params.inspectionId || req.params.id, 10);
            const cond = req.body.overallCondition || req.body.condition || 'SOUND';
            const isMajor = cond === 'MAJOR_DAMAGE' || cond === 'REJECTED';
            // Update in-memory
            const local = inMemoryInspections.find((x) => x.inspectionId === id);
            if (local) {
                local.status = 'COMPLETED';
                local.completedAt = new Date().toISOString();
                local.overallCondition = cond;
                local.approvalNeeded = isMajor;
            }
            // Update DB if live
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    prisma.inspection
                        .update({
                        where: { inspection_id: id },
                        data: {
                            status: 'COMPLETED',
                            completed_at: new Date(),
                            overall_condition: cond,
                        },
                    })
                        .catch((e) => console.warn('[completeInspection] DB background update error:', e.message));
                }
            }
            return (0, utils_1.sendSuccess)(res, { success: true, inspection: local });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    },
    approveInspection: async (req, res) => {
        try {
            const id = parseInt(req.params.inspectionId || req.params.id, 10);
            // Update in-memory
            const local = inMemoryInspections.find((x) => x.inspectionId === id);
            if (local) {
                local.status = 'APPROVED';
                local.approvalNeeded = false;
                local.approvedBy = 'manager.ops';
                local.approvedAt = new Date().toISOString();
            }
            // Update DB if live
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    prisma.inspection
                        .update({
                        where: { inspection_id: id },
                        data: {
                            status: 'APPROVED',
                            approved_at: new Date(),
                            approved_by: 'manager.ops',
                        },
                    })
                        .catch((e) => console.warn('[approveInspection] DB background update error:', e.message));
                }
            }
            return (0, utils_1.sendSuccess)(res, { success: true, inspection: local });
        }
        catch (err) {
            return (0, utils_1.sendError)(res, err.message, 500);
        }
    },
};
