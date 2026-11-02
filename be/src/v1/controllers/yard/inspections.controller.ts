import { Request, Response } from 'express';
import { getPrisma } from '../../../configs/prisma';
import { sendSuccess, sendCreated, sendError } from '../../../utils';

export const yardInspectionsController = {
  getInspections: async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
            const dbInspections = await prisma.inspection.findMany({
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

            const items = (dbInspections || []).map((i: any) => {
              const u = i.unit_stay?.unit_stay_cargo_units;
              const findings = (i.inspection_finding || []).map((f: any) => ({
                inspectionFindingId: Number(f.inspection_finding_id),
                area: f.area,
                locationDetail: f.location_detail || "",
                damageCode: f.m_damage_code?.damage_code || "DT",
                severity: f.severity,
                sizeCm: f.size_cm || undefined,
                description: f.description || undefined,
                needsRepair: f.needs_repair ?? true,
                isPreexisting: f.is_preexisting ?? false,
                photoDocumentIds: [Number(f.inspection_finding_id) * 10, Number(f.inspection_finding_id) * 10 + 1],
              }));

              const results = (i.inspection_result || []).map((r: any) => ({
                inspectionItemId: r.inspection_item_id,
                isOk: r.is_ok,
                resultValue: r.result_value || (r.is_ok ? "OK" : "DAMAGED"),
              }));

              const isMajor = i.overall_condition === 'MAJOR_DAMAGE' || i.overall_condition === 'REJECTED';
              const approvalNeeded = i.status === 'COMPLETED' && isMajor;

              return {
                inspectionId: Number(i.inspection_id),
                unitStayId: Number(i.unit_stay_id),
                siteId: i.unit_stay?.site_id || 1,
                unitNo: u?.unit_no || "MSKU 882014 9",
                category: u?.unit_category === "VEHICLE" ? "VEHICLE" : "CONTAINER",
                unitType: u?.cargo_unit_unit_types?.type_code || "40HR",
                templateCode: i.m_inspection_template?.template_code || "CTR-STD-v4",
                inspectionKind: i.inspection_kind,
                status: i.status,
                overallCondition: i.overall_condition,
                odometerKm: i.odometer_km || undefined,
                fuelLevel: i.fuel_level || undefined,
                batteryOk: i.battery_ok ?? undefined,
                personalEffects: i.personal_effects || undefined,
                remarks: i.remarks || undefined,
                startedAt: i.started_at?.toISOString() || i.createdate.toISOString(),
                completedAt: i.completed_at?.toISOString() || undefined,
                inspector: i.inspector_sub || "Juma M.",
                plateNo: i.truck_visit?.m_truck_truck_visit_truck_idTom_truck?.plate_no || undefined,
                truckVisitId: i.truck_visit_id ? Number(i.truck_visit_id) : undefined,
                approvalNeeded,
                approvedBy: i.approved_by || undefined,
                signatureMode: "SCREEN",
                signedBy: i.status === 'COMPLETED' ? "Driver" : undefined,
                findings,
                results,
                photoCount: findings.length > 0 ? 6 : 4,
              };
            });

            return res.json(items);
          } catch (err: any) {
            return sendError(res, err.message, 500);
          }
        },

        getInspectionById: async (req: Request, res: Response) => {
          const prisma = getPrisma();
          if (!prisma) {
            return sendError(res, "Database unavailable", 500);
          }
          try {
            const id = parseInt(req.params.inspectionId || req.params.id, 10);
            const i = await prisma.inspection.findUnique({
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

            if (!i) return sendError(res, "Inspection not found", 404);

            const u = i.unit_stay?.unit_stay_cargo_units;
            const findings = (i.inspection_finding || []).map((f: any) => ({
              inspectionFindingId: Number(f.inspection_finding_id),
              area: f.area,
              locationDetail: f.location_detail || "",
              damageCode: f.m_damage_code?.damage_code || "DT",
              severity: f.severity,
              sizeCm: f.size_cm || undefined,
              description: f.description || undefined,
              needsRepair: f.needs_repair ?? true,
              isPreexisting: f.is_preexisting ?? false,
              photoDocumentIds: [Number(f.inspection_finding_id) * 10, Number(f.inspection_finding_id) * 10 + 1],
            }));

            const results = (i.inspection_result || []).map((r: any) => ({
              inspectionItemId: r.inspection_item_id,
              isOk: r.is_ok,
              resultValue: r.result_value || (r.is_ok ? "OK" : "DAMAGED"),
            }));

            const isMajor = i.overall_condition === 'MAJOR_DAMAGE' || i.overall_condition === 'REJECTED';
            const approvalNeeded = i.status === 'COMPLETED' && isMajor;

            return res.json({
              inspectionId: Number(i.inspection_id),
              unitStayId: Number(i.unit_stay_id),
              siteId: i.unit_stay?.site_id || 1,
              unitNo: u?.unit_no || "MSKU 882014 9",
              category: u?.unit_category === "VEHICLE" ? "VEHICLE" : "CONTAINER",
              unitType: u?.cargo_unit_unit_types?.type_code || "40HR",
              templateCode: i.m_inspection_template?.template_code || "CTR-STD-v4",
              inspectionKind: i.inspection_kind,
              status: i.status,
              overallCondition: i.overall_condition,
              odometerKm: i.odometer_km || undefined,
              fuelLevel: i.fuel_level || undefined,
              batteryOk: i.battery_ok ?? undefined,
              personalEffects: i.personal_effects || undefined,
              remarks: i.remarks || undefined,
              startedAt: i.started_at?.toISOString() || i.createdate.toISOString(),
              completedAt: i.completed_at?.toISOString() || undefined,
              inspector: i.inspector_sub || "Juma M.",
              plateNo: i.truck_visit?.m_truck_truck_visit_truck_idTom_truck?.plate_no || undefined,
              truckVisitId: i.truck_visit_id ? Number(i.truck_visit_id) : undefined,
              approvalNeeded,
              approvedBy: i.approved_by || undefined,
              signatureMode: "SCREEN",
              signedBy: i.status === 'COMPLETED' ? "Driver" : undefined,
              findings,
              results,
              photoCount: findings.length > 0 ? 6 : 4,
            });
          } catch (err: any) {
            return sendError(res, err.message, 500);
          }
        },

          createInspection: async (req: Request, res: Response) => {
            const prisma = getPrisma();
            if (!prisma) {
              return sendError(res, "Database unavailable", 500);
            }
            try {
              const unitStayId = Number(req.body.unitStayId) || 1;
              const kind = req.body.inspectionKind || req.body.kind || "PERIODIC";
              const templateId = req.body.templateId || (req.body.category === "VEHICLE" ? 3 : 1);

              const created = await prisma.inspection.create({
                data: {
                  unit_stay_id: unitStayId,
                  inspection_template_id: templateId,
                  inspection_kind: kind,
                  status: "IN_PROGRESS",
                  started_at: new Date(),
                  inspector_sub: req.body.inspector || "Juma M.",
                  remarks: req.body.remarks,
                  createdby: "system",
                },
              });

              return sendCreated(res, {
                inspectionId: Number(created.inspection_id),
                unitStayId: Number(created.unit_stay_id),
                inspectionKind: created.inspection_kind,
                status: created.status,
                startedAt: created.started_at.toISOString(),
              });
            } catch (err: any) {
              return sendError(res, err.message, 500);
            }
          },

            saveResults: async (req: Request, res: Response) => {
              const prisma = getPrisma();
              if (!prisma) {
                return sendError(res, "Database unavailable", 500);
              }
              try {
                const id = parseInt(req.params.inspectionId || req.params.id, 10);
                const { results, findings, odometerKm, fuelLevel, personalEffects } = req.body;

                if (results && Array.isArray(results)) {
                  for (const r of results) {
                    const itemId = Number(r.inspectionItemId);
                    const isOk = r.resultValue === "OK" || r.isOk === true;
                    await prisma.inspection_result.upsert({
                      where: {
                        inspection_id_inspection_item_id: {
                          inspection_id: id,
                          inspection_item_id: itemId,
                        },
                      },
                      update: {
                        result_value: r.resultValue || (isOk ? "OK" : "DAMAGED"),
                        is_ok: isOk,
                      },
                      create: {
                        inspection_id: id,
                        inspection_item_id: itemId,
                        result_value: r.resultValue || (isOk ? "OK" : "DAMAGED"),
                        is_ok: isOk,
                        createdby: "system",
                      },
                    });
                    }
                  }

                  if (findings && Array.isArray(findings)) {
                    for (const f of findings) {
                      let damageCodeId = f.damageCodeId || 1;
                      if (f.damageCode) {
                        const dc = await prisma.m_damage_code.findFirst({ where: { damage_code: f.damageCode } });
                        if (dc) damageCodeId = dc.damage_code_id;
                      }

                      await prisma.inspection_finding.create({
                        data: {
                          inspection_id: id,
                          area: f.area || "WALLS",
                          damage_code_id: damageCodeId,
                          severity: f.severity || "MINOR",
                          location_detail: f.locationDetail,
                          size_cm: f.sizeCm ? String(f.sizeCm) : null,
                          description: f.description,
                          needs_repair: f.severity !== "MINOR",
                          createdby: "system",
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

                    return sendSuccess(res, { success: true });
                  } catch (err: any) {
                    return sendError(res, err.message, 500);
                  }
                },

                  completeInspection: async (req: Request, res: Response) => {
                    const prisma = getPrisma();
                    if (!prisma) {
                      return sendError(res, "Database unavailable", 500);
                    }
                    try {
                      const id = parseInt(req.params.inspectionId || req.params.id, 10);
                      const cond = req.body.overallCondition || req.body.condition || "SOUND";

                      const updated = await prisma.inspection.update({
                        where: { inspection_id: id },
                        data: {
                          status: "COMPLETED",
                          completed_at: new Date(),
                          overall_condition: cond,
                        },
                      });

                      return sendSuccess(res, { success: true, inspection: updated });
                    } catch (err: any) {
                      return sendError(res, err.message, 500);
                    }
                  },

                    approveInspection: async (req: Request, res: Response) => {
                      const prisma = getPrisma();
                      if (!prisma) {
                        return sendError(res, "Database unavailable", 500);
                      }
                      try {
                        const id = parseInt(req.params.inspectionId || req.params.id, 10);

                        const updated = await prisma.inspection.update({
                          where: { inspection_id: id },
                          data: {
                            status: "APPROVED",
                            approved_at: new Date(),
                            approved_by: "manager.ops",
                          },
                        });

                        return sendSuccess(res, { success: true, inspection: updated });
                      } catch (err: any) {
                        return sendError(res, err.message, 500);
                      }
                    },
};
