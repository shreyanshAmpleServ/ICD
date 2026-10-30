import { Request, Response } from "express";
import { getPrisma } from "../../configs/prisma";
import {
  parsePaginationParams,
  paginateArray,
  sendSuccess,
  sendCreated,
  sendError,
  NotFoundError,
} from "../../utils";

export class PartiesController {
  public getParties = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }

    try {
      const { role, q, source, syncStatus, creditStatus, isActive } = req.query;

      // 1. Fetch parties with roles and contacts
      const dbParties = await prisma.m_party.findMany({
        where: {
          ...(isActive !== undefined ? { is_active: isActive === "true" } : {}),
          ...(source ? { source: String(source).toUpperCase() } : {}),
          ...(syncStatus
            ? { sync_status: String(syncStatus).toUpperCase() }
            : {}),
          ...(creditStatus
            ? { credit_status: String(creditStatus).toUpperCase() }
            : {}),
        },
        include: {
          m_party_m_party_role: true,
          m_party_m_party_contact: true,
        },
        orderBy: { party_id: "asc" },
      });

      // 2. Fetch open unit stays to calculate live open units count per party
      const openStays = await prisma.unit_stay.findMany({
        where: { physical_status: { not: "DEPARTED" } },
        select: {
          line_party_id: true,
          unit_stay_consignments: {
            select: {
              consignee_party_id: true,
              agent_party_id: true,
              bill_to_party_id: true,
              shipping_line_party_id: true,
              shipper_party_id: true,
            },
          },
        },
      });

      const openUnitsMap = new Map<number, number>();
      for (const stay of openStays) {
        const associatedParties = new Set<number>();
        if (stay.line_party_id)
          associatedParties.add(Number(stay.line_party_id));
        if (stay.unit_stay_consignments) {
          const c = stay.unit_stay_consignments;
          if (c.consignee_party_id)
            associatedParties.add(Number(c.consignee_party_id));
          if (c.agent_party_id) associatedParties.add(Number(c.agent_party_id));
          if (c.bill_to_party_id)
            associatedParties.add(Number(c.bill_to_party_id));
          if (c.shipping_line_party_id)
            associatedParties.add(Number(c.shipping_line_party_id));
          if (c.shipper_party_id)
            associatedParties.add(Number(c.shipper_party_id));
        }
        associatedParties.forEach((pId) => {
          openUnitsMap.set(pId, (openUnitsMap.get(pId) || 0) + 1);
        });
      }

      // 3. Map entities to API contract
      interface PartyListItem {
        partyId: number;
        partyCode: string;
        partyName: string;
        shortName: string | null;
        roles: string[];
        countryCode: string;
        city: string;
        phone: string | null;
        email: string | null;
        creditStatus: string;
        creditLimit: string;
        creditCurrency: string;
        defaultCurrency: string;
        vatNo: string | null;
        taxId: string | null;
        disbursementService: boolean;
        source: string;
        syncStatus: string;
        ngRefId: string | null;
        isActive: boolean;
        logInst: number;
        openUnits: number;
        contacts: Array<{
          contactId: number;
          fullName: string;
          role: string;
          email: string;
          phone: string;
          isPrimary: boolean;
        }>;
      }

      let items: PartyListItem[] = dbParties.map((p: any) => {
        const roles = (p.m_party_m_party_role || []).map(
          (r: any) => r.role_code,
        );
        return {
          partyId: Number(p.party_id),
          partyCode: p.party_code,
          partyName: p.party_name,
          shortName: p.short_name || null,
          roles: roles.length > 0 ? roles : ["CUSTOMER"],
          countryCode: p.country_code || "TZ",
          city: p.city || "Dar es Salaam",
          phone: p.phone || null,
          email: p.email || null,
          creditStatus: p.credit_status || "CASH",
          creditLimit: p.credit_limit ? String(p.credit_limit) : "0.00",
          creditCurrency: p.credit_currency || "USD",
          defaultCurrency: p.default_currency || "USD",
          vatNo: p.vat_no || null,
          taxId: p.tax_id || null,
          disbursementService: Boolean(p.disbursement_service),
          source: p.source || "NG",
          syncStatus: p.sync_status || "SYNCED",
          ngRefId: p.ng_ref_id || null,
          isActive: Boolean(p.is_active),
          logInst: p.log_inst || 1,
          openUnits: openUnitsMap.get(p.party_id) || 0,
          contacts: (p.m_party_m_party_contact || []).map((c: any) => ({
            contactId: Number(c.party_contact_id),
            fullName: c.contact_name,
            role: c.job_title || "OPERATIONS",
            email: c.email || "",
            phone: c.phone || "",
            isPrimary: Boolean(c.is_primary),
          })),
        };
      });

      // 4. In-memory filters for role and q
      if (role) {
        const roleUpper = String(role).toUpperCase();
        items = items.filter((p: PartyListItem) => p.roles.includes(roleUpper));
      }

      if (q) {
        const query = String(q).toLowerCase();
        items = items.filter(
          (p: PartyListItem) =>
            p.partyName.toLowerCase().includes(query) ||
            p.partyCode.toLowerCase().includes(query) ||
            Boolean(p.taxId && p.taxId.toLowerCase().includes(query)),
        );
      }

      // If client requests raw array (e.g. ?format=array), return array directly
      if (req.query.format === "array") {
        return res.json(items);
      }

      // Standard OpenAPI payload
      return res.json({
        items,
        total: items.length,
        nextCursor: null,
      });
    } catch (err: any) {
      console.error("[PartiesController.getParties] Error:", err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * GET /parties/:partyId
   * Get party details by ID or code
   */
  public getPartyDetail = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }

    try {
      const partyIdParam = req.params.partyId;
      const numId = parseInt(partyIdParam, 10);

      const p = await prisma.m_party.findFirst({
        where: isNaN(numId)
          ? { party_code: partyIdParam }
          : { OR: [{ party_id: numId }, { party_code: partyIdParam }] },
        include: {
          m_party_m_party_role: true,
          m_party_m_party_contact: true,
        },
      });

      if (!p) {
        return res.status(404).json({ error: "Party not found" });
      }

      const roles = (p.m_party_m_party_role || []).map((r: any) => r.role_code);

      const detail = {
        partyId: Number(p.party_id),
        partyCode: p.party_code,
        partyName: p.party_name,
        shortName: p.short_name || null,
        roles: roles.length > 0 ? roles : ["CUSTOMER"],
        countryCode: p.country_code || "TZ",
        city: p.city || "Dar es Salaam",
        phone: p.phone || null,
        email: p.email || null,
        creditStatus: p.credit_status || "CASH",
        creditLimit: p.credit_limit ? String(p.credit_limit) : "0.00",
        creditCurrency: p.credit_currency || "USD",
        defaultCurrency: p.default_currency || "USD",
        vatNo: p.vat_no || null,
        taxId: p.tax_id || null,
        disbursementService: Boolean(p.disbursement_service),
        source: p.source || "NG",
        syncStatus: p.sync_status || "SYNCED",
        ngRefId: p.ng_ref_id || null,
        isActive: Boolean(p.is_active),
        logInst: p.log_inst || 1,
        contacts: (p.m_party_m_party_contact || []).map((c: any) => ({
          contactId: Number(c.party_contact_id),
          fullName: c.contact_name,
          role: c.job_title || "OPERATIONS",
          email: c.email || "",
          phone: c.phone || "",
          isPrimary: Boolean(c.is_primary),
        })),
      };

      return res.json(detail);
    } catch (err: any) {
      console.error("[PartiesController.getPartyDetail] Error:", err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * POST /parties
   * Create a new party
   */
  public createParty = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }

    try {
      const b = req.body;
      const partyCode = b.partyCode || `C-LOCAL${Date.now()}`;
      const roles: string[] =
        Array.isArray(b.roles) && b.roles.length > 0 ? b.roles : ["CUSTOMER"];

      const created = await prisma.m_party.create({
        data: {
          party_code: partyCode,
          party_name: b.partyName || "New Party",
          short_name: b.shortName || null,
          country_code: b.countryCode || "TZ",
          city: b.city || "Dar es Salaam",
          phone: b.phone || null,
          email: b.email || null,
          credit_status: b.creditStatus || "CASH",
          credit_limit: b.creditLimit ? parseFloat(String(b.creditLimit)) : 0,
          credit_currency: b.creditCurrency || "USD",
          default_currency: b.defaultCurrency || "USD",
          vat_no: b.vatNo || null,
          tax_id: b.taxId || null,
          disbursement_service: Boolean(b.disbursementService),
          source: b.source || "LOCAL",
          sync_status: b.syncStatus || "PROVISIONAL",
          ng_ref_id: b.ngRefId || null,
          is_active: b.isActive ?? true,
          createdby: (req as any).userSub || "system",
        },
      });

      // Add roles
      for (const r of roles) {
        await prisma.m_party_role.create({
          data: {
            party_id: created.party_id,
            role_code: r.toUpperCase(),
            createdby: (req as any).userSub || "system",
          },
        });
      }

      return sendCreated(res, {
        partyId: Number(created.party_id),
        partyCode: created.party_code,
        partyName: created.party_name,
        roles,
        source: created.source,
        syncStatus: created.sync_status,
      });
    } catch (err: any) {
      console.error("[PartiesController.createParty] Error:", err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * PATCH /parties/:partyId
   * Update party
   */
  public updateParty = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }

    try {
      const partyIdParam = req.params.partyId;
      const numId = parseInt(partyIdParam, 10);
      const b = req.body;

      const existing = await prisma.m_party.findFirst({
        where: isNaN(numId)
          ? { party_code: partyIdParam }
          : { party_id: numId },
      });

      if (!existing) {
        return res.status(404).json({ error: "Party not found" });
      }

      const updated = await prisma.m_party.update({
        where: { party_id: existing.party_id },
        data: {
          ...(b.partyName ? { party_name: b.partyName } : {}),
          ...(b.shortName !== undefined ? { short_name: b.shortName } : {}),
          ...(b.city ? { city: b.city } : {}),
          ...(b.phone !== undefined ? { phone: b.phone } : {}),
          ...(b.email !== undefined ? { email: b.email } : {}),
          ...(b.creditStatus ? { credit_status: b.creditStatus } : {}),
          ...(b.creditLimit !== undefined
            ? { credit_limit: parseFloat(String(b.creditLimit)) }
            : {}),
          ...(b.syncStatus ? { sync_status: b.syncStatus } : {}),
          ...(b.isActive !== undefined
            ? { is_active: Boolean(b.isActive) }
            : {}),
          log_inst: { increment: 1 },
          updatedby: (req as any).userSub || "system",
        },
      });

      return res.json({
        partyId: Number(updated.party_id),
        partyCode: updated.party_code,
        partyName: updated.party_name,
        logInst: updated.log_inst,
      });
    } catch (err: any) {
      console.error("[PartiesController.updateParty] Error:", err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * POST /parties:provisional
   * Create provisional party
   */
  public createProvisional = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }

    try {
      const b = req.body;
      const partyCode = b.partyCode || `PROV-${Date.now()}`;
      const roles: string[] =
        Array.isArray(b.roles) && b.roles.length > 0 ? b.roles : ["CUSTOMER"];

      const created = await prisma.m_party.create({
        data: {
          party_code: partyCode,
          party_name: b.partyName || "Provisional Party",
          country_code: b.countryCode || "TZ",
          city: b.city || "Dar es Salaam",
          source: "LOCAL",
          sync_status: "PROVISIONAL",
          credit_status: "CASH",
          is_active: true,
          createdby: (req as any).userSub || "system",
        },
      });

      for (const r of roles) {
        await prisma.m_party_role.create({
          data: {
            party_id: created.party_id,
            role_code: r.toUpperCase(),
            createdby: (req as any).userSub || "system",
          },
        });
      }

      return sendCreated(res, {
        partyId: Number(created.party_id),
        partyCode: created.party_code,
        partyName: created.party_name,
        roles,
        source: "LOCAL",
        syncStatus: "PROVISIONAL",
        isActive: true,
      });
    } catch (err: any) {
      console.error("[PartiesController.createProvisional] Error:", err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * POST /parties/:partyId/match & /parties/:partyId:match
   * Match provisional party with master NG record
   */
  public matchParty = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }

    try {
      const partyIdParam = req.params.partyId;
      const numId = parseInt(partyIdParam, 10);
      const ngRefId =
        req.body.ngRefId || req.body.matchedMasterPartyId || "NG-MATCHED";

      const existing = await prisma.m_party.findFirst({
        where: isNaN(numId)
          ? { party_code: partyIdParam }
          : { party_id: numId },
      });

      if (!existing) {
        return res.status(404).json({ error: "Party not found" });
      }

      const updated = await prisma.m_party.update({
        where: { party_id: existing.party_id },
        data: {
          sync_status: "SYNCED",
          source: "NG",
          ng_ref_id: String(ngRefId),
          updatedby: (req as any).userSub || "system",
        },
      });

      return res.json({
        success: true,
        party: {
          partyId: Number(updated.party_id),
          partyCode: updated.party_code,
          partyName: updated.party_name,
          syncStatus: updated.sync_status,
          ngRefId: updated.ng_ref_id,
        },
        message: "Provisional party successfully linked to master record.",
      });
    } catch (err: any) {
      console.error("[PartiesController.matchParty] Error:", err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * GET /parties/:partyId/contacts
   * Get party contacts
   */
  public getContacts = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }

    try {
      const partyIdParam = req.params.partyId;
      const numId = parseInt(partyIdParam, 10);

      const party = await prisma.m_party.findFirst({
        where: isNaN(numId)
          ? { party_code: partyIdParam }
          : { party_id: numId },
      });

      if (!party) {
        return res.status(404).json({ error: "Party not found" });
      }

      const contacts = await prisma.m_party_contact.findMany({
        where: { party_id: party.party_id },
        orderBy: { is_primary: "desc" },
      });

      const items = contacts.map((c: any) => ({
        contactId: Number(c.party_contact_id),
        fullName: c.contact_name,
        role: c.job_title || "OPERATIONS",
        email: c.email || "",
        phone: c.phone || "",
        isPrimary: Boolean(c.is_primary),
      }));

      return res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      console.error("[PartiesController.getContacts] Error:", err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * PUT /parties/:partyId/contacts
   * Replace or add contacts for party
   */
  public updateContacts = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }

    try {
      const partyIdParam = req.params.partyId;
      const numId = parseInt(partyIdParam, 10);
      const incomingList = Array.isArray(req.body) ? req.body : [req.body];

      const party = await prisma.m_party.findFirst({
        where: isNaN(numId)
          ? { party_code: partyIdParam }
          : { party_id: numId },
      });

      if (!party) {
        return res.status(404).json({ error: "Party not found" });
      }

      for (const c of incomingList) {
        if (c.contactId) {
          await prisma.m_party_contact.update({
            where: { party_contact_id: Number(c.contactId) },
            data: {
              contact_name: c.fullName || c.contactName,
              job_title: c.role || c.jobTitle,
              email: c.email,
              phone: c.phone,
              is_primary: Boolean(c.isPrimary),
              updatedby: (req as any).userSub || "system",
            },
          });
        } else {
          await prisma.m_party_contact.create({
            data: {
              party_id: party.party_id,
              contact_name: c.fullName || c.contactName || "New Contact",
              job_title: c.role || c.jobTitle || "OPERATIONS",
              email: c.email || "",
              phone: c.phone || "",
              is_primary: Boolean(c.isPrimary),
              createdby: (req as any).userSub || "system",
            },
          });
        }
      }

      const updated = await prisma.m_party_contact.findMany({
        where: { party_id: party.party_id },
      });

      const items = updated.map((c: any) => ({
        contactId: Number(c.party_contact_id),
        fullName: c.contact_name,
        role: c.job_title || "OPERATIONS",
        email: c.email || "",
        phone: c.phone || "",
        isPrimary: Boolean(c.is_primary),
      }));

      return res.json({ items, total: items.length });
    } catch (err: any) {
      console.error("[PartiesController.updateContacts] Error:", err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * PATCH /parties/:partyId/contacts/:contactId
   * Patch single contact
   */
  public patchContact = async (req: Request, res: Response) => {
    const prisma = getPrisma();
    if (!prisma) {
      return sendError(res, "Database unavailable", 500);
    }

    try {
      const contactId = parseInt(req.params.contactId, 10);
      const b = req.body;

      const updated = await prisma.m_party_contact.update({
        where: { party_contact_id: contactId },
        data: {
          ...(b.fullName || b.contactName
            ? { contact_name: b.fullName || b.contactName }
            : {}),
          ...(b.role || b.jobTitle ? { job_title: b.role || b.jobTitle } : {}),
          ...(b.email !== undefined ? { email: b.email } : {}),
          ...(b.phone !== undefined ? { phone: b.phone } : {}),
          ...(b.isPrimary !== undefined
            ? { is_primary: Boolean(b.isPrimary) }
            : {}),
          updatedby: (req as any).userSub || "system",
        },
      });

      return res.json({
        contactId: Number(updated.party_contact_id),
        fullName: updated.contact_name,
        role: updated.job_title,
        email: updated.email,
        phone: updated.phone,
        isPrimary: updated.is_primary,
      });
    } catch (err: any) {
      console.error("[PartiesController.patchContact] Error:", err);
      return sendError(res, err.message, 500);
    }
  };
}

export const partiesController = new PartiesController();
