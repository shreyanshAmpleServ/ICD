import { Request, Response } from "express";
import { getPrisma, isDbLive } from "../../configs/prisma";
import {
  portalUnits as fallbackPortalUnits,
  invoicesOf as fallbackInvoicesOf,
  portalDocs as fallbackPortalDocs,
  serviceRequests as fallbackServiceRequests,
  appointments as fallbackAppointments,
  plainStatus,
  PORTAL_PARTY,
} from "../../data/insight";
import { invoices } from "../../data/money";
import {
  parsePaginationParams,
  paginateArray,
  sendSuccess,
  sendCreated,
  sendError,
} from "../../utils";

export class PortalController {
  public getUnits = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : PORTAL_PARTY;
    const params = parsePaginationParams(req.query);
    let items: any[] = [];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbStays = await prisma.unit_stays.findMany({
            where: {
              unit_stays_consignments: {
                OR: [
                  { agent_party_id: partyId },
                  { consignee_party_id: partyId },
                  { bill_to_party_id: partyId },
                ],
              },
              physical_status: { not: "DEPARTED" },
            },
            include: {
              unit_stays_unit_types: true,
              unit_stays_yard_locations: true,
              unit_stays_consignments: true,
              holds: true,
            },
            orderBy: { unit_stay_id: "desc" },
          });

          if (dbStays && dbStays.length > 0) {
            items = dbStays.map((u) => {
              const activeHolds = (u.holds || []).filter(
                (h) => h.status === "ACTIVE",
              ).length;
              const dwell = u.arrived_at
                ? Math.max(
                    1,
                    Math.floor(
                      (Date.now() - new Date(u.arrived_at).getTime()) /
                        86400000,
                    ),
                  )
                : 4;
              return {
                unitStayId: u.unit_stay_id,
                siteId: u.site_id,
                consignmentId: u.consignment_id,
                cargoUnit: {
                  cargoUnitId: u.unit_stay_id,
                  category: u.unit_stays_unit_types?.category || "CONTAINER",
                  unitNo: u.unit_no,
                  unitTypeCode: u.unit_stays_unit_types?.type_code || "40HC",
                  isoType: u.unit_stays_unit_types?.type_code || "40HC",
                  tareWeightKg: 3800,
                },
                physicalStatus: u.physical_status,
                flow: u.flow,
                fullEmpty: u.full_empty,
                customsStatus: u.customs_status,
                releaseStatus: u.release_status,
                billingStatus: u.billing_status,
                sealNo: u.seal_no,
                grossWeightKg: Number(u.gross_weight_kg || 0),
                activeHoldCount: activeHolds,
                currentLocation: u.unit_stays_yard_locations
                  ? {
                      locationId: u.unit_stays_yard_locations.yard_location_id,
                      fullCode: u.unit_stays_yard_locations.full_code,
                      zone: u.unit_stays_yard_locations.full_code.split("-")[0] || "A",
                    }
                  : undefined,
                unitSummary: {
                  unitNo: u.unit_no,
                  category: u.unit_stays_unit_types?.category || "CONTAINER",
                  activeHoldCount: activeHolds,
                  releaseStatus: u.release_status,
                  physicalStatus: u.physical_status,
                  dwellDays: dwell,
                  consignmentRef: u.unit_stays_consignments?.ref_no,
                },
                arrivedAt: u.arrived_at?.toISOString(),
              };
            });
          }
        } catch (err: any) {
          console.warn(
            "[PortalController] DB query units fallback to in-memory store:",
            err.message,
          );
        }
      }
    }

    if (items.length === 0) {
      items = fallbackPortalUnits(partyId).filter(
        (s) => s.physicalStatus !== "DEPARTED",
      );
    }

    const paginated = paginateArray(items, params, (s) => s.unitStayId);
    return sendSuccess(res, paginated, "Customer units retrieved successfully");
  };

  public getInvoices = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : PORTAL_PARTY;
    const params = parsePaginationParams(req.query);
    let items: any[] = [];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbInvoices = await prisma.invoices.findMany({
            where: { bill_to_party_id: partyId },
            include: { invoice_lines: true },
            orderBy: { invoice_id: "desc" },
          });

          if (dbInvoices && dbInvoices.length > 0) {
            items = dbInvoices.map((i) => ({
              invoiceId: i.invoice_id,
              invoiceNo: i.invoice_no,
              docKind:
                i.invoice_type === "PROFORMA" ? "PROFORMA" : "TAX_INVOICE",
              status: i.status || "ISSUED",
              billToPartyId: i.bill_to_party_id,
              total: Number(i.total_amount),
              totalAmount: Number(i.total_amount),
              balance: Number(i.total_amount),
              currency: i.currency || "USD",
              invoiceDate:
                i.created_at?.toISOString() || new Date().toISOString(),
              issuedAt: i.created_at?.toISOString() || new Date().toISOString(),
              dueAt: i.created_at?.toISOString() || new Date().toISOString(),
              consignmentRef: `BL-${i.invoice_no.slice(-6)}`,
              lines: (i.invoice_lines || []).map((l) => ({
                lineId: l.invoice_line_id,
                chargeCode: `CHG-${l.charge_id}`,
                description: l.description,
                amount: Number(l.amount),
              })),
            }));
          }
        } catch (err: any) {
          console.warn(
            "[PortalController] DB query invoices fallback:",
            err.message,
          );
        }
      }
    }

    if (items.length === 0) {
      items = fallbackInvoicesOf(partyId);
    }

    const paginated = paginateArray(items, params, (i) => i.invoiceId);
    return sendSuccess(
      res,
      paginated,
      "Customer invoices retrieved successfully",
    );
  };

  public getDocuments = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : PORTAL_PARTY;
    const params = parsePaginationParams(req.query);
    let items: any[] = [];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbDocs = await prisma.documents.findMany({
            where: { status: "ACTIVE" },
            orderBy: { document_id: "desc" },
          });

          if (dbDocs && dbDocs.length > 0) {
            items = dbDocs.map((d) => ({
              documentId: d.document_id,
              docTypeCode: d.doc_type_code,
              title: d.file_name || d.doc_type_code,
              ref: `DOC-${d.document_id}`,
              fileName: d.file_name,
              sizeBytes: d.size_bytes || 0,
              capturedAt:
                d.created_at?.toISOString() || new Date().toISOString(),
              status: d.status || "ACTIVE",
            }));
          }
        } catch (err: any) {
          console.warn(
            "[PortalController] DB query documents fallback:",
            err.message,
          );
        }
      }
    }

    if (items.length === 0) {
      items = fallbackPortalDocs;
    }

    const paginated = paginateArray(items, params, (d) => d.documentId);
    return sendSuccess(
      res,
      paginated,
      "Customer documents retrieved successfully",
    );
  };

  public getAppointments = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : PORTAL_PARTY;
    const params = parsePaginationParams(req.query);
    let items: any[] = [];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbAppts = await prisma.appointments.findMany({
            include: { appointments_visit_types: true },
            orderBy: { appointment_id: "desc" },
          });

          if (dbAppts && dbAppts.length > 0) {
            items = dbAppts.map((a) => ({
              appointmentId: a.appointment_id,
              appointmentNo: a.appointment_no || `APT-26-0${a.appointment_id}`,
              siteId: a.site_id,
              slotStart:
                a.slot_start?.toISOString() || new Date().toISOString(),
              slotEnd:
                a.slot_end?.toISOString() ||
                new Date(Date.now() + 3600000).toISOString(),
              slotTime: a.slot_start?.toISOString(),
              visitTypeCode:
                a.appointments_visit_types?.visit_code || "IMPORT_PICKUP",
              plate: a.truck_plate,
              driver: "Driver",
              driverPhone: "+255 754 112 334",
              status: a.status || "BOOKED",
            }));
          }
        } catch (err: any) {
          console.warn(
            "[PortalController] DB query appointments fallback:",
            err.message,
          );
        }
      }
    }

    if (items.length === 0) {
      items = fallbackAppointments;
    }

    const paginated = paginateArray(items, params, (a) => a.appointmentId);
    return sendSuccess(
      res,
      paginated,
      "Customer appointments retrieved successfully",
    );
  };

  public getRequests = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : PORTAL_PARTY;
    const params = parsePaginationParams(req.query);
    let items: any[] = [];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbReqs = await prisma.service_requests.findMany({
            where: { party_id: partyId },
            orderBy: { service_request_id: "desc" },
          });

          if (dbReqs && dbReqs.length > 0) {
            items = dbReqs.map((r) => {
              let detailsObj: any = {};
              if (r.details_json) {
                try {
                  detailsObj = JSON.parse(r.details_json);
                } catch {}
              }
              return {
                serviceRequestId: r.service_request_id,
                requestId: r.service_request_id,
                requestNo:
                  detailsObj.requestNo || `SR-26-0${r.service_request_id}`,
                partyId: r.party_id,
                partyName:
                  detailsObj.partyName || "Kilele Clearing & Forwarding",
                requestKind: r.request_type,
                kind: r.request_type,
                status: r.status || "SUBMITTED",
                subject: detailsObj.subject || r.request_type,
                details: detailsObj.details || "",
                createdAt:
                  r.created_at?.toISOString() ||
                  detailsObj.createdAt ||
                  new Date().toISOString(),
                slaDueAt:
                  detailsObj.slaDueAt ||
                  new Date(Date.now() + 86400000).toISOString(),
                messages: detailsObj.messages || [
                  {
                    from: "customer",
                    who: "Customer",
                    at: r.created_at?.toISOString() || new Date().toISOString(),
                    text:
                      detailsObj.details || "Request logged in database.",
                  },
                ],
                consignmentRef: detailsObj.consignmentRef,
                unitNo: detailsObj.unitNo,
                assignedTo: detailsObj.assignedTo,
                payload: detailsObj.payload,
              };
            });
          }
        } catch (err: any) {
          console.warn(
            "[PortalController] DB query service_requests fallback:",
            err.message,
          );
        }
      }
    }

    if (items.length === 0) {
      items = fallbackServiceRequests.filter((s) => s.partyId === partyId);
    }

    const paginated = paginateArray(items, params, (s) => s.serviceRequestId);
    return sendSuccess(
      res,
      paginated,
      "Customer service requests retrieved successfully",
    );
  };

  public getSummary = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : PORTAL_PARTY;

    let units: any[] = [];
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbStays = await prisma.unit_stays.findMany({
            where: {
              unit_stays_consignments: {
                OR: [
                  { agent_party_id: partyId },
                  { consignee_party_id: partyId },
                  { bill_to_party_id: partyId },
                ],
              },
              physical_status: { not: "DEPARTED" },
            },
            include: { unit_stays_unit_types: true, holds: true },
            take: 500,
          });
          if (dbStays && dbStays.length > 0) {
            units = dbStays.map((u) => ({
              unitStayId: u.unit_stay_id,
              cargoUnit: {
                cargoUnitId: u.unit_stay_id,
                category: u.unit_stays_unit_types?.category || "CONTAINER",
                unitNo: u.unit_no,
                unitTypeCode: u.unit_stays_unit_types?.type_code || "40HC",
              },
              physicalStatus: u.physical_status,
              customsStatus: u.customs_status,
              releaseStatus: u.release_status,
              billingStatus: u.billing_status,
              activeHoldCount: (u.holds || []).filter(
                (h) => h.status === "ACTIVE",
              ).length,
            }));
          }
        } catch (err: any) {
          console.warn(
            "[PortalController] Summary DB units fallback:",
            err.message,
          );
        }
      }
    }
    if (units.length === 0) {
      units = fallbackPortalUnits(partyId).filter(
        (s) => s.physicalStatus !== "DEPARTED",
      );
    }

    let invs: any[] = [];
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbInvoices = await prisma.invoices.findMany({
            where: { bill_to_party_id: partyId },
            take: 500,
          });
          if (dbInvoices && dbInvoices.length > 0) {
            invs = dbInvoices.map((i) => ({
              invoiceId: i.invoice_id,
              balance: Number(i.total_amount),
            }));
          }
        } catch (err: any) {
          console.warn(
            "[PortalController] Summary DB invoices fallback:",
            err.message,
          );
        }
      }
    }
    if (invs.length === 0) {
      invs = fallbackInvoicesOf(partyId);
    }

    const plainMap = new Map(units.map((s) => [s.unitStayId, plainStatus(s)]));
    const readyToCollect = units.filter(
      (s) => plainMap.get(s.unitStayId)?.key === "ready",
    ).length;
    const waitingForCustoms = units.filter(
      (s) => plainMap.get(s.unitStayId)?.key === "customs",
    ).length;
    const onHold = units.filter(
      (s) => plainMap.get(s.unitStayId)?.key === "hold",
    ).length;

    const openInvoices = invs.filter((i) => Number(i.balance || 0) > 0);
    const chargesDue = openInvoices.reduce(
      (acc, i) => acc + Number(i.balance || 0),
      0,
    );

    return sendSuccess(
      res,
      {
        readyToCollect,
        waitingForCustoms,
        onHold,
        chargesDue,
        openInvoicesCount: openInvoices.length,
      },
      "Portal KPI summary calculated successfully",
    );
  };

  public bookAppointment = async (req: Request, res: Response) => {
    const body = req.body;
    const newAppt: any = {
      appointmentId: fallbackAppointments.length + 101,
      appointmentNo: `APT-26-0${fallbackAppointments.length + 4130}`,
      siteId: body.siteId || 1,
      slotStart:
        body.slotStart ||
        body.slotTime ||
        new Date(Date.now() + 3600000).toISOString(),
      slotEnd: body.slotEnd || new Date(Date.now() + 7200000).toISOString(),
      plate: (body.plate || body.truckPlate || "T 882 DKL").toUpperCase(),
      driver: body.driver || body.driverName || "Rashid Mwangi",
      driverPhone: body.driverPhone || "+255 754 112 334",
      visitTypeCode: body.visitTypeCode || "IMPORT_PICKUP",
      status: "BOOKED",
      bookedVia: "PORTAL",
      createdAt: new Date().toISOString(),
    };

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const visitType = await prisma.visit_types.findFirst({
            where: { visit_code: newAppt.visitTypeCode },
          });
          const vtId = visitType?.visit_type_id || 3;
          const transporterParty = await prisma.parties.findFirst({
            where: { party_code: "T-UPEPO" },
          });
          const tId = transporterParty?.party_id || 7;

          const created = await prisma.appointments.create({
            data: {
              site_id: newAppt.siteId,
              visit_type_id: vtId,
              transporter_party_id: tId,
              appointment_no: newAppt.appointmentNo,
              truck_plate: newAppt.plate,
              slot_start: new Date(newAppt.slotStart),
              slot_end: new Date(newAppt.slotEnd),
              status: "BOOKED",
            },
          });
          newAppt.appointmentId = created.appointment_id;
        } catch (err: any) {
          console.warn("[PortalController] DB book appointment fallback:", err.message);
        }
      }
    }

    fallbackAppointments.unshift(newAppt as any);
    return sendCreated(res, newAppt, "Truck appointment booked successfully");
  };

  public submitRequest = async (req: Request, res: Response) => {
    const body = req.body;
    const k = body.requestKind || body.kind || "DELIVERY";
    const newReq: any = {
      serviceRequestId: fallbackServiceRequests.length + 501,
      requestId: fallbackServiceRequests.length + 501,
      requestNo: `SR-26-0${7120 + fallbackServiceRequests.length}`,
      partyId: body.partyId || PORTAL_PARTY,
      requestKind: k,
      kind: k,
      status: "SUBMITTED",
      createdAt: new Date().toISOString(),
      subject: body.subject || "Customer Service Request",
      details: body.details || "",
      unitStayId: body.unitStayId,
      payload: body.payload || null,
      messages: [
        {
          from: "customer",
          who: "Customer",
          at: new Date().toISOString(),
          text: body.details || "Customer request details submitted online.",
        },
      ],
    };

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.service_requests.create({
            data: {
              site_id: body.siteId || 1,
              party_id: newReq.partyId,
              request_type: k,
              status: "SUBMITTED",
              details_json: JSON.stringify(newReq),
            },
          });
          newReq.serviceRequestId = created.service_request_id;
          newReq.requestId = created.service_request_id;
        } catch (err: any) {
          console.warn("[PortalController] DB submit request fallback:", err.message);
        }
      }
    }

    fallbackServiceRequests.unshift(newReq as any);
    return sendCreated(
      res,
      newReq,
      "Customer service request submitted successfully",
    );
  };

  public payInvoice = async (req: Request, res: Response) => {
    const invoiceId = parseInt(req.params.invoiceId, 10);
    const body = req.body;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbInv = await prisma.invoices.findUnique({
            where: { invoice_id: invoiceId },
          });
          if (dbInv) {
            const currentBal = Number(dbInv.total_amount);
            const payAmount = body.amount ? Number(body.amount) : currentBal;
            const newBal = Math.max(0, currentBal - payAmount);
            const updated = await prisma.invoices.update({
              where: { invoice_id: invoiceId },
              data: {
                status: newBal === 0 ? "PAID" : "PART_PAID",
              },
            });
            return sendSuccess(
              res,
              { invoiceId, newBalance: newBal.toFixed(2), status: updated.status },
              "Invoice payment processed successfully",
            );
          }
        } catch (err: any) {
          console.warn("[PortalController] DB pay invoice fallback:", err.message);
        }
      }
    }

    const inv = invoices.find((i) => i.invoiceId === invoiceId);
    if (!inv) {
      return sendError(res, "Invoice not found", 404, {
        code: "INVOICE_NOT_FOUND",
      });
    }

    const currentBal = Number(inv.balance);
    const payAmount = body.amount ? Number(body.amount) : currentBal;
    const newBal = Math.max(0, currentBal - payAmount);
    inv.balance = newBal.toFixed(2);
    if (newBal === 0) {
      inv.status = "PAID";
    }
    return sendSuccess(
      res,
      { invoiceId, newBalance: inv.balance, status: inv.status },
      "Invoice payment processed successfully",
    );
  };
}

export const portalController = new PortalController();
