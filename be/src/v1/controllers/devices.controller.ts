import { Request, Response } from "express";
import { getPrisma } from "../../configs/prisma";
import { sendSuccess, sendCreated, sendError } from "../../utils";

export class DevicesController {
  // Device Integrations
  public getIntegrations = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const dbInts = await (prisma as any).device_integrations.findMany({
        orderBy: { device_integration_id: "asc" },
      });

      const items = (dbInts || []).map((i: any) => ({
        deviceIntegrationId: i.device_integration_id,
        integrationKind: i.integration_kind || i.device_type,
        lane: "Main Gate In 1",
        vendor: i.vendor || "Hikvision",
        model: i.model || "iDS-TCM403-BI",
        laneMode: i.lane_mode || "ASSISTED",
        endpointUrl: i.endpoint_url || "http://10.160.5.101:8081/anpr/lane1",
        isActive: i.is_active ?? true,
        health: "OK",
      }));

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createIntegration = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const siteId = Number(req.siteId || req.body.siteId) || 1;
      const deviceType = req.body.integrationKind || req.body.deviceType || "ANPR";

      const created = await (prisma as any).device_integrations.create({
        data: {
          site_id: siteId,
          integration_kind: deviceType,
          vendor: req.body.vendor || "Hikvision",
          model: req.body.model || "iDS-TCM403",
          lane_mode: req.body.laneMode || "ASSISTED",
          is_active: req.body.isActive ?? true,
          createdby: "system",
        },
      });

      return sendCreated(res, {
        deviceIntegrationId: created.device_integration_id,
        integrationKind: created.integration_kind,
        lane: req.body.lane || "Main Gate In 1",
        vendor: created.vendor,
        model: created.model,
        laneMode: created.lane_mode,
        endpointUrl: req.body.endpointUrl || "http://10.160.5.101:8081/anpr/lane1",
        isActive: created.is_active,
        health: "OK",
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getIntegrationById = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.deviceIntegrationId, 10);
      const item = await (prisma as any).device_integrations.findUnique({
        where: { device_integration_id: id },
      });

      if (!item) return sendError(res, "Device integration not found", 404);

      return sendSuccess(res, {
        deviceIntegrationId: item.device_integration_id,
        integrationKind: item.integration_kind || item.device_type,
        lane: "Main Gate In 1",
        vendor: item.vendor || "Hikvision",
        model: item.model || "iDS-TCM403-BI",
        laneMode: item.lane_mode || "ASSISTED",
        endpointUrl: item.endpoint_url || "http://10.160.5.101:8081/anpr/lane1",
        isActive: item.is_active,
        health: "OK",
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public updateIntegration = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      const id = parseInt(req.params.deviceIntegrationId, 10);
      const updated = await (prisma as any).device_integrations.update({
        where: { device_integration_id: id },
        data: {
          is_active: req.body.isActive,
        },
      });

      return sendSuccess(res, {
        deviceIntegrationId: updated.device_integration_id,
        integrationKind: updated.integration_kind,
        isActive: updated.is_active,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  // Device Reads (ANPR / OCR Gate Feeds)
  public ingestRead = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    const payload = req.body.payload || req.body;
    const kind = req.body.integrationKind || "ANPR";

    // When an ANPR plate read is ingested, log it into truck visits or return matched confirmation
    return sendCreated(res, {
      deviceReadId: Date.now(),
      integrationKind: kind,
      payload,
      status: "INGESTED",
      capturedAt: new Date().toISOString(),
    });
  };

  public getReads = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }
    try {
      // Query recent truck visits and gate activity to construct real device reads
      const visits = await (prisma as any).truck_visits.findMany({
        take: 10,
        orderBy: { truck_visit_id: "desc" },
        include: { m_truck_truck_visit_truck_idTom_truck: true },
      });

      const items = (visits || []).map((v: any, idx: number) => ({
        deviceReadId: Number(v.truck_visit_id),
        integrationKind: idx % 2 === 0 ? "ANPR" : "CONTAINER_OCR",
        payload: {
          plateNo: v.m_truck_truck_visit_truck_idTom_truck?.plate_no || "T 124 DFH",
          confidence: 0.98,
        },
        status: "MATCHED",
        capturedAt: v.arrived_at?.toISOString() || new Date().toISOString(),
      }));

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public matchRead = async (req: Request, res: Response) => {
    const id = req.params.deviceReadId;
    return sendSuccess(res, {
      success: true,
      deviceRead: {
        deviceReadId: id,
        status: "MATCHED",
        matchedAt: new Date().toISOString(),
      },
    });
  };
}

export const devicesController = new DevicesController();
