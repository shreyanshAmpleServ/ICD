import { Request, Response } from "express";
import { getPrisma } from "../../../db/prisma";
import { search as mockSearch } from "../../../data/search";

export const searchController = {
  globalSearch: async (req: Request, res: Response) => {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 2) {
      return res.json({ query: q, groups: [], results: [], total: 0 });
    }

    const normQ = q.replace(/[\s-]/g, "");
    const prisma = getPrisma();
    const groups: any[] = [];

    if (prisma) {
      try {
        const queryWithTimeout = async <T>(
          promise: Promise<T>,
          fallback: T,
        ): Promise<T> => {
          try {
            return await Promise.race([
              promise,
              new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 2000),
              ),
            ]);
          } catch (err) {
            return fallback;
          }
        };

        const [
          units,
          visits,
          consignments,
          parties,
          regimes,
          appointments,
          invoices,
        ] = await Promise.all([
          queryWithTimeout(
            prisma.cargo_unit.findMany({
              where: {
                OR: [
                  { unit_no: { contains: q } },
                  { unit_no: { contains: normQ } },
                  { engine_no: { contains: q } },
                  { make: { contains: q } },
                  { model: { contains: q } },
                ],
              },
              include: {
                cargo_unit_unit_stays: true,
              },
              take: 6,
            }),
            [],
          ),

          queryWithTimeout(
            prisma.truck_visit.findMany({
              where: {
                OR: [
                  { visit_no: { contains: q } },
                  { gate_pass_no: { contains: q } },
                  { nomination_ref: { contains: q } },
                ],
              },
              include: {
                m_truck_truck_visit_truck_idTom_truck: true,
                m_driver: true,
                m_party_truck_visit: true,
              },
              take: 5,
            }),
            [],
          ),

          queryWithTimeout(
            prisma.consignment.findMany({
              where: {
                OR: [
                  { ref_no: { contains: q } },
                  { cargo_description: { contains: q } },
                ],
              },
              take: 5,
            }),
            [],
          ),

          queryWithTimeout(
            prisma.m_party.findMany({
              where: {
                OR: [
                  { party_name: { contains: q } },
                  { party_code: { contains: q } },
                  { tax_id: { contains: q } },
                ],
              },
              take: 5,
            }),
            [],
          ),

          // 5. Cargo Regimes
          queryWithTimeout(
            prisma.m_cargo_regime.findMany({
              where: {
                OR: [
                  { regime_code: { contains: q } },
                  { regime_name: { contains: q } },
                ],
              },
              take: 5,
            }),
            [],
          ),

          queryWithTimeout(
            prisma.appointment.findMany({
              where: {
                appointment_no: { contains: q },
              },
              take: 5,
            }),
            [],
          ),

          queryWithTimeout(
            prisma.invoice.findMany({
              where: {
                invoice_no: { contains: q },
              },
              take: 5,
            }),
            [],
          ),
        ]);

        if (units && units.length > 0) {
          groups.push({
            entity: "UNIT",
            label: "Units & Containers",
            hits: units.map((u: any) => {
              const stay = u.cargo_unit_unit_stays?.[0];
              return {
                id: Number(u.cargo_unit_id),
                title: u.unit_no,
                subtitle: [
                  u.unit_category,
                  u.make && `${u.make} ${u.model || ""}`,
                ]
                  .filter(Boolean)
                  .join(" · "),
                status: stay?.physical_status || "IN_YARD",
                link: {
                  entityName: "cargo_unit",
                  entityId: Number(u.cargo_unit_id),
                },
                to: `/cargo/units`,
              };
            }),
          });
        }

        if (visits && visits.length > 0) {
          groups.push({
            entity: "VISIT",
            label: "Truck Visits & Gates",
            hits: visits.map((v: any) => {
              const plate = v.m_truck_truck_visit_truck_idTom_truck?.plate_no;
              const driver = v.m_driver?.driver_name;
              return {
                id: Number(v.truck_visit_id),
                title: `${v.visit_no} ${plate ? `(${plate})` : ""}`,
                subtitle: [driver, v.m_party_truck_visit?.party_name]
                  .filter(Boolean)
                  .join(" · "),
                status: v.status,
                link: {
                  entityName: "truck_visit",
                  entityId: Number(v.truck_visit_id),
                },
                to: "/gate/queue",
              };
            }),
          });
        }

        if (consignments && consignments.length > 0) {
          groups.push({
            entity: "CONSIGNMENT",
            label: "Consignments & BLs",
            hits: consignments.map((c: any) => ({
              id: Number(c.consignment_id),
              title: c.ref_no,
              subtitle: c.cargo_description || "Consignment Reference",
              status: c.ref_type,
              link: {
                entityName: "consignment",
                entityId: Number(c.consignment_id),
              },
              to: "/cargo/consignments",
            })),
          });
        }

        if (parties && parties.length > 0) {
          groups.push({
            entity: "PARTY",
            label: "Customers & Parties",
            hits: parties.map((p: any) => ({
              id: p.party_id,
              title: p.party_name,
              subtitle: `Code: ${p.party_code}`,
              status: p.is_active ? "ACTIVE" : "INACTIVE",
              link: { entityName: "party", entityId: p.party_id },
              to: "/customers/parties",
            })),
          });
        }

        if (regimes && regimes.length > 0) {
          groups.push({
            entity: "REGIME",
            label: "Cargo Regimes",
            hits: regimes.map((r: any) => ({
              id: r.cargo_regime_id,
              title: r.regime_name,
              subtitle: `Code: ${r.regime_code}`,
              status: r.is_active ? "ACTIVE" : "INACTIVE",
              link: { entityName: "cargo_regime", entityId: r.cargo_regime_id },
              to: "/setup/units",
            })),
          });
        }

        if (appointments && appointments.length > 0) {
          groups.push({
            entity: "APPOINTMENT",
            label: "Appointments",
            hits: appointments.map((a: any) => ({
              id: Number(a.appointment_id),
              title: a.appointment_no,
              subtitle: `Slot: ${a.slot_start?.toLocaleTimeString?.() || ""}`,
              status: a.status,
              link: {
                entityName: "appointment",
                entityId: Number(a.appointment_id),
              },
              to: "/gate/appointments",
            })),
          });
        }

        if (invoices && invoices.length > 0) {
          groups.push({
            entity: "INVOICE",
            label: "Invoices",
            hits: invoices.map((inv: any) => ({
              id: Number(inv.invoice_id),
              title: inv.invoice_no || "Invoice",
              subtitle: `Currency: ${inv.currency || "USD"}`,
              status: inv.status,
              link: { entityName: "invoice", entityId: Number(inv.invoice_id) },
              to: "/billing/invoices",
            })),
          });
        }

        if (groups.length > 0) {
          const totalHits = groups.reduce(
            (acc, g) => acc + (g.hits?.length || 0),
            0,
          );
          return res.json({
            query: q,
            groups,
            results: groups,
            total: totalHits,
          });
        }
      } catch (err: any) {
        console.warn("[SearchController] DB search error:", err.message);
      }
    }

    try {
      const mockResults = mockSearch(q) || [];
      const total = mockResults.reduce(
        (acc: number, g: any) => acc + (g.hits?.length || 0),
        0,
      );
      return res.json({
        query: q,
        groups: mockResults,
        results: mockResults,
        total,
      });
    } catch {
      return res.json({
        query: q,
        groups: [],
        results: [],
        total: 0,
      });
    }
  },
};
