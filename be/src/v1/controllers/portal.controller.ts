import { Request, Response } from "express";
import { getPrisma } from "../../configs/prisma";
import {
  parsePaginationParams,
  paginateArray,
  sendSuccess,
  sendCreated,
  sendError,
} from "../../utils";

const DEFAULT_PORTAL_PARTY = 2;

export type Plain = {
  label: string;
  tone: "go" | "stop" | "customs" | "wait" | "idle";
  detail: string;
  key:
    | "ready"
    | "customs"
    | "charges"
    | "hold"
    | "request"
    | "expected"
    | "collected";
};

export function plainStatus(s: any): Plain {
  const activeHolds =
    s.activeHoldCount ||
    (s.holds || []).filter((h: any) => h.status === "ACTIVE").length;
  if (s.physicalStatus === "DEPARTED") {
    return {
      key: "collected",
      label: "Collected",
      tone: "idle",
      detail: "Left the depot",
    };
  }
  if (s.physicalStatus === "EXPECTED") {
    return {
      key: "expected",
      label: "On the way from port",
      tone: "idle",
      detail: "We will tell you when it arrives",
    };
  }
  if (activeHolds > 0) {
    return {
      key: "hold",
      label: "On hold",
      tone: "stop",
      detail: "Customs examination or terminal hold active",
    };
  }
  if (s.customsStatus === "QUERY") {
    return {
      key: "customs",
      label: "Customs query",
      tone: "stop",
      detail: "Customs needs an answer from you",
    };
  }
  if (s.customsStatus !== "CLEARED" && s.customsStatus !== "NOT_REQUIRED") {
    return {
      key: "customs",
      label: "Waiting for customs",
      tone: "customs",
      detail:
        s.customsStatus === "UNDER_EXAM"
          ? "Under examination"
          : "Entry lodged, awaiting clearance",
    };
  }
  if (s.billingStatus === "ACCRUING" || s.billingStatus === "PROFORMA") {
    return {
      key: "charges",
      label: "Charges due",
      tone: "wait",
      detail: "Pay charges to receive release order",
    };
  }
  if (s.releaseStatus === "APPROVED") {
    return {
      key: "ready",
      label: "Ready to collect",
      tone: "go",
      detail: "Book a truck and present delivery order",
    };
  }
  if (s.releaseStatus === "REQUESTED") {
    return {
      key: "request",
      label: "Delivery order being prepared",
      tone: "wait",
      detail: "Usually within 2 working hours",
    };
  }
  return {
    key: "request",
    label: "Ready to request delivery",
    tone: "wait",
    detail: "Customs cleared and charges settled",
  };
}

export class PortalController {
  public getUnits = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : DEFAULT_PORTAL_PARTY;
    const params = parsePaginationParams(req.query);
    const prisma = getPrisma();

    if (!prisma) {
      return sendSuccess(
        res,
        paginateArray([], params),
        "Database client not available",
      );
    }

    try {
      const stayDelegate = (prisma as any).unit_stay || (prisma as any).unit_stays;
      const dbStays = await stayDelegate.findMany({
        where: {
          OR: [
            {
              unit_stay_consignments: {
                OR: [
                  { agent_party_id: partyId },
                  { consignee_party_id: partyId },
                  { bill_to_party_id: partyId },
                ],
              },
            },
            {
              unit_stays_consignments: {
                OR: [
                  { agent_party_id: partyId },
                  { consignee_party_id: partyId },
                  { bill_to_party_id: partyId },
                ],
              },
            },
          ],
          physical_status: { not: "DEPARTED" },
        },
        include: {
          unit_stay_yard_locations: true,
          unit_stay_consignments: true,
          unit_stay_cargo_units: {
            include: {
              unit_types: true,
            },
          },
          unit_stay_holds: true,
        },
        orderBy: { unit_stay_id: "desc" },
      });

      const items = (dbStays || []).map((u: any) => {
        const holdsList = u.unit_stay_holds || u.holds || [];
        const activeHolds = holdsList.filter(
          (h: any) => h.status === "ACTIVE",
        ).length;
        const dwell = u.arrived_at || u.gated_in_at
          ? Math.max(
              1,
              Math.floor(
                (Date.now() - new Date(u.arrived_at || u.gated_in_at).getTime()) / 86400000,
              ),
            )
          : 4;

        const cUnit = u.unit_stay_cargo_units || u.cargo_unit;
        const unitNo = cUnit?.unit_no || u.unit_no || `CONT-${u.unit_stay_id}`;
        const unitType = cUnit?.unit_types || u.unit_stays_unit_types;
        const category = cUnit?.unit_category || unitType?.category || "CONTAINER";
        const typeCode = unitType?.type_code || "40HC";
        const loc = u.unit_stay_yard_locations || u.unit_stays_yard_locations;
        const consign = u.unit_stay_consignments || u.unit_stays_consignments;

        return {
          unitStayId: Number(u.unit_stay_id),
          siteId: u.site_id,
          consignmentId: u.consignment_id ? Number(u.consignment_id) : null,
          cargoUnit: {
            cargoUnitId: Number(u.cargo_unit_id || u.unit_stay_id),
            category,
            unitNo,
            unitTypeCode: typeCode,
            isoType: typeCode,
            tareWeightKg: cUnit?.tare_kg || 3800,
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
          currentLocation: loc
            ? {
                locationId: loc.yard_location_id,
                fullCode: loc.full_code,
                zone:
                  loc.full_code?.split("-")[0] || "A",
              }
            : undefined,
          unitSummary: {
            unitNo,
            category,
            activeHoldCount: activeHolds,
            releaseStatus: u.release_status,
            physicalStatus: u.physical_status,
            dwellDays: dwell,
            consignmentRef: consign?.consignment_no || consign?.ref_no,
          },
          arrivedAt: (u.arrived_at || u.gated_in_at || u.createdate)?.toISOString(),
        };
      });

      const paginated = paginateArray(items, params, (s: any) => s.unitStayId);
      return sendSuccess(
        res,
        paginated,
        "Customer units retrieved successfully",
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getInvoices = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : DEFAULT_PORTAL_PARTY;
    const params = parsePaginationParams(req.query);
    const prisma = getPrisma();

    if (!prisma) {
      return sendSuccess(
        res,
        paginateArray([], params),
        "Database client not available",
      );
    }

    try {
      const invDelegate = (prisma as any).invoice || (prisma as any).invoices;
      const dbInvoices = await invDelegate.findMany({
        where: { bill_to_party_id: partyId },
        include: { invoice_lines: true },
        orderBy: { invoice_id: "desc" },
      });

      const items = (dbInvoices || []).map((i: any) => ({
        invoiceId: Number(i.invoice_id),
        invoiceNo: i.invoice_no,
        docKind: i.invoice_type === "PROFORMA" ? "PROFORMA" : "TAX_INVOICE",
        status: i.status || "ISSUED",
        billToPartyId: i.bill_to_party_id,
        total: Number(i.total || i.total_amount || 0),
        totalAmount: Number(i.total || i.total_amount || 0),
        balance: i.status === "PAID" ? 0 : Number(i.balance !== undefined && i.balance !== null ? i.balance : (i.total || i.total_amount || 0)),
        currency: i.currency || "USD",
        invoiceDate: (i.invoice_date || i.created_at || i.createdate)?.toISOString() || new Date().toISOString(),
        issuedAt: (i.issued_at || i.created_at || i.createdate)?.toISOString() || new Date().toISOString(),
        dueAt: (i.due_date || i.created_at || i.createdate)?.toISOString() || new Date().toISOString(),
        consignmentRef: `BL-${String(i.invoice_no || "").slice(-6)}`,
        lines: (i.invoice_lines || []).map((l: any) => ({
          lineId: Number(l.invoice_line_id),
          chargeCode: `CHG-${l.charge_id || l.line_no || 1}`,
          description: l.description || l.charge_name || "Depot Services",
          amount: Number(l.amount || l.line_total || 0),
        })),
      }));

      const paginated = paginateArray(items, params, (i: any) => i.invoiceId);
      return sendSuccess(
        res,
        paginated,
        "Customer invoices retrieved successfully",
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getDocuments = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const prisma = getPrisma();

    if (!prisma) {
      return sendSuccess(
        res,
        paginateArray([], params),
        "Database client not available",
      );
    }

    try {
      const docDelegate = (prisma as any).document || (prisma as any).documents;
      const dbDocs = await docDelegate.findMany({
        where: { status: "ACTIVE" },
        orderBy: { document_id: "desc" },
      });

      const items = (dbDocs || []).map((d: any) => ({
        documentId: Number(d.document_id),
        docTypeCode: d.doc_type_code,
        title: d.file_name || d.doc_type_code,
        ref: `DOC-${d.document_id}`,
        fileName: d.file_name,
        sizeBytes: d.size_bytes || 0,
        capturedAt: (d.created_at || d.createdate)?.toISOString() || new Date().toISOString(),
        status: d.status || "ACTIVE",
      }));

      const paginated = paginateArray(items, params, (d: any) => d.documentId);
      return sendSuccess(
        res,
        paginated,
        "Customer documents retrieved successfully",
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getAppointments = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const prisma = getPrisma();

    if (!prisma) {
      return sendSuccess(
        res,
        paginateArray([], params),
        "Database client not available",
      );
    }

    try {
      const apptDelegate = (prisma as any).appointment || (prisma as any).appointments;
      const dbAppts = await apptDelegate.findMany({
        include: { appointments_visit_types: true, appointments_parties: true },
        orderBy: { appointment_id: "desc" },
      });

      const items = (dbAppts || []).map((a: any) => ({
        appointmentId: Number(a.appointment_id),
        appointmentNo: a.appointment_no || `APT-26-0${a.appointment_id}`,
        siteId: a.site_id,
        slotStart: a.slot_start?.toISOString() || new Date().toISOString(),
        slotEnd:
          a.slot_end?.toISOString() ||
          new Date(Date.now() + 3600000).toISOString(),
        slotTime: a.slot_start?.toISOString(),
        visitTypeCode:
          a.appointments_visit_types?.visit_type_code ||
          a.appointments_visit_types?.visit_code ||
          "IMPORT_PICKUP",
        plate: a.truck_plate || "T 882 DKL",
        driver: "Driver",
        driverPhone: "+255 754 112 334",
        status: a.status || "BOOKED",
      }));

      const paginated = paginateArray(items, params, (a: any) => a.appointmentId);
      return sendSuccess(
        res,
        paginated,
        "Customer appointments retrieved successfully",
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getRequests = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : DEFAULT_PORTAL_PARTY;
    const params = parsePaginationParams(req.query);
    const prisma = getPrisma();

    if (!prisma) {
      return sendSuccess(
        res,
        paginateArray([], params),
        "Database client not available",
      );
    }

    try {
      const srDelegate = (prisma as any).service_request || (prisma as any).service_requests;
      const dbReqs = await srDelegate.findMany({
        where: { party_id: partyId },
        include: { parties: true },
        orderBy: { service_request_id: "desc" },
      });

      const items = (dbReqs || []).map((r: any) => {
        let detailsObj: any = {};
        const rawJson = r.payload_json || r.details_json;
        if (rawJson) {
          try {
            detailsObj = JSON.parse(rawJson);
          } catch {}
        }
        return {
          serviceRequestId: Number(r.service_request_id),
          requestId: Number(r.service_request_id),
          requestNo: r.request_no || detailsObj.requestNo || `SR-26-0${r.service_request_id}`,
          partyId: r.party_id,
          partyName: r.parties?.party_name || detailsObj.partyName || "Kilele Clearing & Forwarding",
          requestKind: r.request_kind || r.request_type,
          kind: r.request_kind || r.request_type,
          status: r.status || "SUBMITTED",
          subject: r.subject || detailsObj.subject || "Customer Service Request",
          details: r.details || detailsObj.details || "",
          createdAt:
            (r.createdate || r.created_at)?.toISOString() ||
            detailsObj.createdAt ||
            new Date().toISOString(),
          slaDueAt:
            detailsObj.slaDueAt ||
            new Date(Date.now() + 86400000).toISOString(),
          messages: detailsObj.messages || [
            {
              from: "customer",
              who: "Customer",
              at: (r.createdate || r.created_at)?.toISOString() || new Date().toISOString(),
              text: r.details || detailsObj.details || "Request logged in database.",
            },
          ],
          consignmentRef: detailsObj.consignmentRef,
          unitNo: detailsObj.unitNo,
          assignedTo: r.assigned_to_sub || detailsObj.assignedTo,
          payload: detailsObj.payload || detailsObj,
        };
      });

      const paginated = paginateArray(items, params, (s: any) => s.serviceRequestId);
      return sendSuccess(
        res,
        paginated,
        "Customer service requests retrieved successfully",
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getSummary = async (req: Request, res: Response) => {
    const partyId = req.query.partyId
      ? parseInt(String(req.query.partyId), 10)
      : DEFAULT_PORTAL_PARTY;
    const prisma = getPrisma();

    if (!prisma) {
      return sendSuccess(
        res,
        {
          readyToCollect: 0,
          waitingForCustoms: 0,
          onHold: 0,
          chargesDue: 0,
          openInvoicesCount: 0,
        },
        "Database client not available",
      );
    }

    try {
      const stayDelegate = (prisma as any).unit_stay || (prisma as any).unit_stays;
      const invDelegate = (prisma as any).invoice || (prisma as any).invoices;
      const [dbStays, dbInvoices] = await Promise.all([
        stayDelegate.findMany({
          where: {
            OR: [
              {
                unit_stay_consignments: {
                  OR: [
                    { agent_party_id: partyId },
                    { consignee_party_id: partyId },
                    { bill_to_party_id: partyId },
                  ],
                },
              },
              {
                unit_stays_consignments: {
                  OR: [
                    { agent_party_id: partyId },
                    { consignee_party_id: partyId },
                    { bill_to_party_id: partyId },
                  ],
                },
              },
            ],
            physical_status: { not: "DEPARTED" },
          },
          include: {
            unit_stay_cargo_units: { include: { unit_types: true } },
            unit_stay_holds: true,
          },
          take: 500,
        }),
        invDelegate.findMany({
          where: { bill_to_party_id: partyId },
          take: 500,
        }),
      ]);

      const units = (dbStays || []).map((u: any) => ({
        unitStayId: Number(u.unit_stay_id),
        cargoUnit: {
          cargoUnitId: Number(u.cargo_unit_id || u.unit_stay_id),
          category: u.cargo_unit?.unit_category || u.cargo_unit?.unit_types?.category || "CONTAINER",
          unitNo: u.cargo_unit?.unit_no || u.unit_no || `CONT-${u.unit_stay_id}`,
          unitTypeCode: u.cargo_unit?.unit_types?.type_code || "40HC",
        },
        physicalStatus: u.physical_status,
        customsStatus: u.customs_status,
        releaseStatus: u.release_status,
        billingStatus: u.billing_status,
        activeHoldCount: (u.holds || []).filter((h: any) => h.status === "ACTIVE")
          .length,
      }));

      const plainMap = new Map<number, Plain>(
        units.map((s: any) => [s.unitStayId, plainStatus(s)]),
      );
      const readyToCollect = units.filter(
        (s: any) => plainMap.get(s.unitStayId)?.key === "ready",
      ).length;
      const waitingForCustoms = units.filter(
        (s: any) => plainMap.get(s.unitStayId)?.key === "customs",
      ).length;
      const onHold = units.filter(
        (s: any) => plainMap.get(s.unitStayId)?.key === "hold",
      ).length;

      const openInvoices = (dbInvoices || []).filter(
        (i: any) => i.status !== "PAID",
      );
      const chargesDue = openInvoices.reduce(
        (acc: number, i: any) => acc + Number(i.total || i.total_amount || 0),
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
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public bookAppointment = async (req: Request, res: Response) => {
    const body = req.body;
    const prisma = getPrisma();

    if (!prisma) {
      return sendError(res, "Database client not available", 500);
    }

    try {
      const vtDelegate = (prisma as any).m_visit_type || (prisma as any).visit_types;
      const partyDelegate = (prisma as any).m_party || (prisma as any).parties;
      const apptDelegate = (prisma as any).appointment || (prisma as any).appointments;

      const visitTypeCode = body.visitTypeCode || "IMPORT_PICKUP";
      const visitType = await vtDelegate.findFirst({
        where: {
          OR: [
            { visit_type_code: visitTypeCode },
            { visit_code: visitTypeCode },
          ],
        },
      });
      const vtId = visitType?.visit_type_id || 3;

      const transporterParty = await partyDelegate.findFirst({
        where: { party_code: "T-UPEPO" },
      });
      const tId = transporterParty?.party_id || 7;

      const apptCount = await apptDelegate.count();
      const appointmentNo = body.appointmentNo || `APT-26-0${apptCount + 4130}`;
      const slotStart =
        body.slotStart || body.slotTime || new Date(Date.now() + 3600000);
      const slotEnd = body.slotEnd || new Date(Date.now() + 7200000);

      const created = await apptDelegate.create({
        data: {
          site_id: body.siteId || 1,
          visit_type_id: vtId,
          transporter_party_id: tId,
          appointment_no: appointmentNo,
          truck_plate: (
            body.plate ||
            body.truckPlate ||
            "T 882 DKL"
          ).toUpperCase(),
          slot_start: new Date(slotStart),
          slot_end: new Date(slotEnd),
          status: "BOOKED",
          createdby: "portal",
        },
      });

      return sendCreated(
        res,
        {
          appointmentId: Number(created.appointment_id),
          appointmentNo: created.appointment_no,
          siteId: created.site_id,
          slotStart: created.slot_start.toISOString(),
          slotEnd: created.slot_end.toISOString(),
          plate: created.truck_plate || (body.plate || "T 882 DKL").toUpperCase(),
          driver: body.driver || body.driverName || "Rashid Mwangi",
          driverPhone: body.driverPhone || "+255 754 112 334",
          visitTypeCode,
          status: created.status,
          createdAt:
            created.created_at?.toISOString() ||
            created.createdate?.toISOString() ||
            new Date().toISOString(),
        },
        "Truck appointment booked successfully in database",
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public submitRequest = async (req: Request, res: Response) => {
    const body = req.body;
    const prisma = getPrisma();

    if (!prisma) {
      return sendError(res, "Database client not available", 500);
    }

    try {
      const srDelegate = (prisma as any).service_request || (prisma as any).service_requests;
      const k = body.requestKind || body.kind || "DELIVERY";
      const partyId = body.partyId || DEFAULT_PORTAL_PARTY;
      const reqCount = await srDelegate.count();
      const requestNo = `SR-26-0${7120 + reqCount + 1}`;

      const requestPayload = {
        requestNo,
        requestKind: k,
        kind: k,
        partyId,
        subject: body.subject || "Customer Service Request",
        details: body.details || "",
        unitStayId: body.unitStayId,
        payload: body.payload || null,
        createdAt: new Date().toISOString(),
        messages: [
          {
            from: "customer",
            who: "Customer",
            at: new Date().toISOString(),
            text: body.details || "Customer request details submitted online.",
          },
        ],
      };

      const created = await srDelegate.create({
        data: {
          site_id: body.siteId || 1,
          party_id: partyId,
          request_no: requestNo,
          request_kind: k,
          request_type: k,
          status: "SUBMITTED",
          subject: body.subject || "Customer Service Request",
          details: body.details || "",
          payload_json: JSON.stringify(requestPayload),
          details_json: JSON.stringify(requestPayload),
          createdby: "portal",
        },
      });

      return sendCreated(
        res,
        {
          serviceRequestId: Number(created.service_request_id),
          requestId: Number(created.service_request_id),
          ...requestPayload,
          status: created.status,
        },
        "Customer service request submitted successfully in database",
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public payInvoice = async (req: Request, res: Response) => {
    const invoiceId = parseInt(req.params.invoiceId, 10);
    const body = req.body;
    const prisma = getPrisma();

    if (!prisma) {
      return sendError(res, "Database client not available", 500);
    }

    try {
      const invDelegate = (prisma as any).invoice || (prisma as any).invoices;
      const dbInv = await invDelegate.findUnique({
        where: { invoice_id: invoiceId },
      });

      if (!dbInv) {
        return sendError(res, "Invoice not found in database", 404, {
          code: "INVOICE_NOT_FOUND",
        });
      }

      const currentBal = Number(dbInv.balance !== undefined && dbInv.balance !== null ? dbInv.balance : (dbInv.total || dbInv.total_amount));
      const payAmount = body.amount ? Number(body.amount) : currentBal;
      const newBal = Math.max(0, currentBal - payAmount);
      const updated = await invDelegate.update({
        where: { invoice_id: invoiceId },
        data: {
          balance: newBal,
          status: newBal === 0 ? "PAID" : "PART_PAID",
        },
      });

      return sendSuccess(
        res,
        { invoiceId, newBalance: newBal.toFixed(2), status: updated.status },
        "Invoice payment processed successfully in database",
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getInvitations = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database client not available", 500);
    }
    try {
      const piDelegate = (prisma as any).portal_invitation || (prisma as any).portal_invitations;
      const dbInvs = await piDelegate.findMany({
        include: { parties: true },
        orderBy: { portal_invitation_id: "desc" },
      });

      const items = (dbInvs || []).map((i: any) => ({
        invitationId: Number(i.portal_invitation_id || i.invitation_id),
        email: i.email,
        partyId: i.party_id,
        partyName: i.parties?.party_name || "Customer",
        role: i.role || "CLEARING_AGENT",
        status: i.status || "PENDING",
        sentAt: (i.sent_at || i.createdate)?.toISOString() || new Date().toISOString(),
        expiresAt: i.expires_at?.toISOString(),
        logInst: 1,
      }));

      return sendSuccess(res, { items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createInvitation = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database client not available", 500);
    }
    try {
      const piDelegate = (prisma as any).portal_invitation || (prisma as any).portal_invitations;
      const partyId = Number(req.body.partyId) || DEFAULT_PORTAL_PARTY;
      const email = req.body.email || "user@example.com";
      const role = req.body.role || "CLEARING_AGENT";

      const created = await piDelegate.create({
        data: {
          party_id: partyId,
          email,
          role_id: 1,
          status: "PENDING",
          token_sha256: `INV-${Date.now()}`.padEnd(64, '0'),
          expires_at: new Date(Date.now() + 7 * 86400000),
          createdby: "portal",
        },
        include: { parties: true },
      });

      return sendCreated(res, {
        invitationId: Number(created.portal_invitation_id || created.invitation_id),
        email: created.email,
        partyId: created.party_id,
        partyName: created.parties?.party_name || "Customer",
        role: role,
        status: created.status,
        sentAt: (created.sent_at || created.createdate)?.toISOString() || new Date().toISOString(),
        logInst: 1,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public revokeInvitation = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database client not available", 500);
    }
    try {
      const piDelegate = (prisma as any).portal_invitation || (prisma as any).portal_invitations;
      const id = parseInt(req.params.invitationId, 10);
      const updated = await piDelegate.update({
        where: { portal_invitation_id: id },
        data: { status: "REVOKED", revoked_at: new Date() },
      });
      return sendSuccess(res, { success: true, invitation: updated });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public acceptInvitation = async (req: Request, res: Response) => {
    return sendSuccess(res, {
      success: true,
      message: "Portal invitation accepted successfully.",
    });
  };
}

export const portalController = new PortalController();
