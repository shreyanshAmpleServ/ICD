import { Request, Response } from 'express';
import { getPrisma } from '../../../db/prisma';

const SLA_HOURS: Record<string, number> = {
  DELIVERY: 4,
  EMPTY_RETURN: 8,
  DOCUMENT_SUBMISSION: 8,
  FREE_DAY_EXTENSION: 24,
  INVOICE_QUERY: 48,
  DAMAGE_CLAIM: 72,
  COMPLAINT: 24,
  OTHER: 48,
};

export const customerServiceRequestsController = {
  getServiceRequests: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database unavailable' });
      }

      const srDelegate = (prisma as any).service_request || (prisma as any).service_requests;
      const dbReqs = await srDelegate.findMany({
        include: {
          m_party_service_request: true,
          consignment: true,
          unit_stay: {
            include: {
              unit_stay_cargo_units: true,
            },
          },
        },
        orderBy: { service_request_id: 'desc' },
      });

      const items = (dbReqs || []).map((r: any) => {
        let detailsObj: any = {};
        const rawJson = r.payload_json || r.details_json;
        if (rawJson) {
          try {
            detailsObj = JSON.parse(rawJson);
          } catch {}
        }

        const sReqId = Number(r.service_request_id);
        const createdDate = (r.createdate || r.created_at)
          ? new Date(r.createdate || r.created_at).toISOString()
          : detailsObj.createdAt || new Date().toISOString();

        const kind = r.request_kind || r.request_type || detailsObj.requestKind || 'OTHER';
        const slaHours = SLA_HOURS[kind] || 24;
        const createdAtMs = Date.parse(createdDate);
        const slaDueAt = detailsObj.slaDueAt || new Date(createdAtMs + slaHours * 3600000).toISOString();

        const messages = detailsObj.messages || [
          {
            from: 'customer',
            who: detailsObj.createdBy || r.createdby || r.m_party_service_request?.party_name || 'Customer',
            at: createdDate,
            text: r.details || detailsObj.details || r.subject || 'Customer service request.',
          },
        ];

        const partyName = r.m_party_service_request?.party_name || detailsObj.partyName || `Party ${r.party_id}`;
        const unitNo = r.unit_stay?.unit_stay_cargo_units?.unit_no || detailsObj.unitNo;
        const consignmentRef = r.consignment?.consignment_no || detailsObj.consignmentRef;

        return {
          serviceRequestId: sReqId,
          requestId: sReqId,
          requestNo: r.request_no || detailsObj.requestNo || `SR-26-0${sReqId}`,
          requestKind: kind,
          requestType: kind,
          partyId: r.party_id,
          partyName,
          consignmentId: r.consignment_id ? Number(r.consignment_id) : detailsObj.consignmentId,
          consignmentRef,
          unitStayId: r.unit_stay_id ? Number(r.unit_stay_id) : detailsObj.unitStayId,
          unitNo,
          unitNumber: unitNo,
          subject: r.subject || detailsObj.subject || 'Service Request',
          details: r.details || detailsObj.details || '',
          notes: r.details || detailsObj.details || '',
          status: r.status || 'SUBMITTED',
          assignedTo: r.assigned_to_sub || detailsObj.assignedTo,
          resultEntity: r.result_entity || detailsObj.resultEntity,
          resultId: r.result_id ? Number(r.result_id) : detailsObj.resultId,
          respondedAt: r.responded_at ? new Date(r.responded_at).toISOString() : detailsObj.respondedAt,
          closedAt: r.closed_at ? new Date(r.closed_at).toISOString() : detailsObj.closedAt,
          createdAt: createdDate,
          createdDate,
          slaDueAt,
          messages,
          payload: detailsObj.payload || detailsObj,
        };
      });

      return res.json({ items, total: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createServiceRequest: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database unavailable' });
      }
      const srDelegate = (prisma as any).service_request || (prisma as any).service_requests;
      const count = await srDelegate.count();
      const requestNo = req.body.requestNo || `SR-26-0${7120 + count + 1}`;
      const kind = req.body.requestKind || req.body.requestType || 'OTHER';
      const partyId = Number(req.body.partyId) || 1;
      const subject = req.body.subject || 'Customer Service Request';
      const details = req.body.details || req.body.notes || '';
      const unitStayId = req.body.unitStayId ? BigInt(req.body.unitStayId) : undefined;
      const consignmentId = req.body.consignmentId ? BigInt(req.body.consignmentId) : undefined;

      const payloadObj = {
        requestNo,
        requestKind: kind,
        partyId,
        subject,
        details,
        unitStayId: req.body.unitStayId ? Number(req.body.unitStayId) : undefined,
        consignmentId: req.body.consignmentId ? Number(req.body.consignmentId) : undefined,
        payload: req.body.payload || null,
        createdAt: new Date().toISOString(),
        messages: [
          {
            from: 'customer',
            who: (req as any).user?.userName || 'Customer',
            at: new Date().toISOString(),
            text: details || subject,
          },
        ],
      };

      const created = await srDelegate.create({
        data: {
          site_id: Number(req.body.siteId || (req as any).siteId) || 1,
          party_id: partyId,
          request_no: requestNo,
          request_kind: kind,
          status: 'SUBMITTED',
          subject,
          details,
          payload_json: JSON.stringify(payloadObj),
          unit_stay_id: unitStayId,
          consignment_id: consignmentId,
          createdby: (req as any).user?.userName || 'portal',
        },
      });

      return res.status(201).json({
        serviceRequestId: Number(created.service_request_id),
        requestId: Number(created.service_request_id),
        ...payloadObj,
        status: created.status,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  respondServiceRequest: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database unavailable' });
      }
      const srDelegate = (prisma as any).service_request || (prisma as any).service_requests;
      const id = Number(req.params.serviceRequestId || req.params.id);
      const existing = await srDelegate.findFirst({
        where: { service_request_id: id },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      let detailsObj: any = {};
      try {
        detailsObj = JSON.parse(existing.payload_json || existing.details_json || '{}');
      } catch {}

      const nextStatus = req.body.action || req.body.status || 'IN_REVIEW';
      const messages = detailsObj.messages || [];
      if (req.body.message || req.body.reply || req.body.text) {
        messages.push({
          from: 'staff',
          who: (req as any).user?.userName || req.body.userName || req.body.who || 'Staff',
          at: new Date().toISOString(),
          text: req.body.message || req.body.reply || req.body.text,
        });
      }
      detailsObj.messages = messages;
      detailsObj.status = nextStatus;

      const updated = await srDelegate.update({
        where: { service_request_id: id },
        data: {
          status: nextStatus,
          payload_json: JSON.stringify(detailsObj),
          responded_at: new Date(),
          updatedate: new Date(),
          updatedby: (req as any).user?.userName || 'staff',
        },
      });

      return res.json({
        serviceRequestId: id,
        status: updated.status,
        messages,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};


