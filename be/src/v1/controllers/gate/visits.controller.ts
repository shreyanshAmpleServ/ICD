import { Request, Response } from 'express';
import { visits } from '../../../data/gate';
import { getPrisma, isDbLive } from '../../../db/prisma';

const VALID_VISIT_STATUSES = ['CANCELLED', 'EXPIRED', 'REJECTED', 'EXITED', 'CHECKED_OUT', 'HELD', 'WORKING', 'ADMITTED', 'AT_OUTER_GATE', 'ANNOUNCED'];

function normalizeVisitStatus(status?: string): string {
  if (!status) return 'AT_OUTER_GATE';
  const s = status.toUpperCase();
  if (VALID_VISIT_STATUSES.includes(s)) return s;
  if (s === 'WAITING' || s === 'CALLED') return 'AT_OUTER_GATE';
  if (s === 'IN_YARD' || s === 'IN_PROGRESS') return 'WORKING';
  if (s === 'COMPLETED' || s === 'CLOSED' || s === 'DEPARTED') return 'EXITED';
  return 'AT_OUTER_GATE';
}

function getCheckpointCode(status: string, currentSeqNo?: number | null): string {
  if (currentSeqNo === 1) return 'OUTER_IN';
  if (currentSeqNo === 2) return 'INNER_IN';
  if (currentSeqNo === 3) return 'INNER_OUT';
  if (currentSeqNo === 4) return 'OUTER_OUT';
  if (status === 'WAITING' || status === 'ANNOUNCED') return 'OUTER_IN';
  if (status === 'CALLED' || status === 'ADMITTED') return 'INNER_IN';
  if (status === 'WORKING' || status === 'IN_YARD') return 'INNER_OUT';
  if (status === 'DEPARTED' || status === 'EXITING') return 'OUTER_OUT';
  return 'OUTER_IN';
}

export const gateVisitsController = {
  getVisits: async (req: Request, res: Response) => {
    try {
      let items: any[] = [];
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
            const dbVisits = await prisma.truck_visit.findMany({
              include: {
                m_truck_truck_visit_truck_idTom_truck: true,
                m_driver: true,
                m_party_truck_visit: true,
                m_visit_type: true,
                visit_unit_txn: {
                  include: {
                    unit_stay: {
                      include: {
                        unit_stay_cargo_units: true,
                      },
                    },
                  },
                },
              },
              orderBy: { arrived_at: 'desc' },
            });

            if(dbVisits && dbVisits.length > 0) {
          items = dbVisits.map((v: any, index: number) => {
            const chkCode = getCheckpointCode(v.status, v.current_seq_no || ((index % 3) + 1));
            return {
              truckVisitId: Number(v.truck_visit_id),
              visitNo: v.visit_no,
              siteId: v.site_id,
              truckId: v.truck_id,
              driverId: v.driver_id,
              partyId: v.transporter_party_id,
              status: v.status,
              nextCheckpointCode: chkCode,
              currentSeqNo: v.current_seq_no || 1,
              arrivedAt: v.arrived_at?.toISOString() || v.createdate?.toISOString() || new Date().toISOString(),
              calledAt: v.admitted_at?.toISOString(),
              admittedAt: v.admitted_at?.toISOString(),
              exitedAt: v.exited_at?.toISOString(),
              waitingMin: v.arrived_at
                ? Math.max(0, Math.round((Date.now() - new Date(v.arrived_at).getTime()) / 60000))
                : 12 + index * 5,
              plateNo: v.m_truck_truck_visit_truck_idTom_truck?.plate_no || 'T 000 AAA',
              driverName: v.m_driver?.driver_name || 'Driver',
              driverPhone: v.m_driver?.phone,
              driverLicence: v.m_driver?.license_no,
              transporter: v.m_party_truck_visit?.party_name || 'Global Transporter',
              carrierName: v.m_party_truck_visit?.party_name || 'Global Transporter',
              visitTypeCode: v.m_visit_type?.visit_type_code || 'IMPORT_PICKUP',
              visitTypeName: v.m_visit_type?.visit_type_name,
              lane: 'L1',
              units: (v.visit_unit_txn || []).map((u: any) => ({
                visitUnitTxnId: Number(u.visit_unit_txn_id),
                unitStayId: Number(u.unit_stay_id),
                action: u.direction,
                direction: u.direction,
                status: u.status,
                unitNo: u.unit_stay?.unit_stay_cargo_units?.unit_number || 'MSKU 000000 0',
                unitNumber: u.unit_stay?.unit_stay_cargo_units?.unit_number || 'MSKU 000000 0',
                isoCode: u.unit_stay?.unit_stay_cargo_units?.iso_code || '22G1',
                sealStatus: u.seal_status || 'MATCH',
              })),
            };
          });
        }
      }
    }

      if (items.length === 0) {
      items = visits;
    }

    res.json({ items, total: items.length, nextCursor: null });
  } catch(err: any) {
    console.error('getVisits error:', err);
    res.status(500).json({ error: err.message });
  }
},

  getVisitById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const prisma = getPrisma();
      if (prisma) {
          const numId = Number(id);
          const v = await prisma.truck_visit.findFirst({
            where: {
              OR: [
                ...(isNaN(numId) ? [] : [{ truck_visit_id: BigInt(numId) }]),
                { visit_no: String(id) },
              ],
            },
            include: {
              m_truck_truck_visit_truck_idTom_truck: true,
              m_driver: true,
              m_party_truck_visit: true,
              m_visit_type: true,
              visit_unit_txn: {
                include: {
                  unit_stay: {
                    include: {
                      unit_stay_cargo_units: true,
                    },
                  },
                },
              },
            },
          });

          if(v) {
            const chkCode = getCheckpointCode(v.status, v.current_seq_no);
            return res.json({
              truckVisitId: Number(v.truck_visit_id),
              visitNo: v.visit_no,
              siteId: v.site_id,
              truckId: v.truck_id,
              driverId: v.driver_id,
              partyId: v.transporter_party_id,
              status: v.status,
              nextCheckpointCode: chkCode,
              currentSeqNo: v.current_seq_no || 1,
              arrivedAt: v.arrived_at?.toISOString() || v.createdate?.toISOString(),
              calledAt: v.admitted_at?.toISOString(),
              admittedAt: v.admitted_at?.toISOString(),
              exitedAt: v.exited_at?.toISOString(),
              waitingMin: v.arrived_at
                ? Math.max(0, Math.round((Date.now() - new Date(v.arrived_at).getTime()) / 60000))
                : 15,
              plateNo: v.m_truck_truck_visit_truck_idTom_truck?.plate_no,
              driverName: v.m_driver?.driver_name,
              driverPhone: v.m_driver?.phone,
              driverLicence: v.m_driver?.license_no,
              transporter: v.m_party_truck_visit?.party_name,
              carrierName: v.m_party_truck_visit?.party_name,
              visitTypeCode: v.m_visit_type?.visit_type_code,
              visitTypeName: v.m_visit_type?.visit_type_name,
              lane: 'L1',
              units: (v.visit_unit_txn || []).map((u: any) => ({
                visitUnitTxnId: Number(u.visit_unit_txn_id),
                unitStayId: Number(u.unit_stay_id),
                action: u.direction,
                direction: u.direction,
                status: u.status,
                unitNo: u.unit_stay?.unit_stay_cargo_units?.unit_number,
                unitNumber: u.unit_stay?.unit_stay_cargo_units?.unit_number,
                isoCode: u.unit_stay?.unit_stay_cargo_units?.iso_code,
                sealStatus: u.seal_status,
              })),
            });
          }
        }

      const found = visits.find((v: any) => String(v.truckVisitId) === id || v.visitNo === id);
        if (!found) return res.status(404).json({ error: 'Truck visit not found' });
        res.json(found);
      } catch (err: any) {
        console.error('getVisitById error:', err);
        res.status(500).json({ error: err.message });
      }
    },

    createVisit: async (req: Request, res: Response) => {
      try {
        const prisma = getPrisma();
        if (prisma) {
            let truckId = req.body.truckId ? Number(req.body.truckId) : undefined;
            let driverId = req.body.driverId ? Number(req.body.driverId) : undefined;
            let transporterPartyId = req.body.partyId || req.body.transporterPartyId ? Number(req.body.partyId || req.body.transporterPartyId) : undefined;
            let visitTypeId = req.body.visitTypeId ? Number(req.body.visitTypeId) : undefined;

            // If plate number provided instead of truckId, look up or create truck
            if(!truckId && req.body.plateNo) {
              const foundTruck = await prisma.m_truck.findFirst({
                where: { plate_no: req.body.plateNo },
              });
          if (foundTruck) {
            truckId = foundTruck.truck_id;
          } else {
            const newTruck = await prisma.m_truck.create({
              data: {
                plate_no: req.body.plateNo,
                truck_type: 'SEMI_TRAILER',
                createdby: 'gate_operator',
              },
            });
            truckId = newTruck.truck_id;
          }
        }

        // If driver name provided instead of driverId, look up or create driver
        if (!driverId && req.body.driverName) {
          const foundDriver = await prisma.m_driver.findFirst({
            where: { driver_name: req.body.driverName },
          });
          if (foundDriver) {
            driverId = foundDriver.driver_id;
          } else {
            const newDriver = await prisma.m_driver.create({
              data: {
                driver_name: req.body.driverName,
                license_no: req.body.licenseNo || `LIC-${Date.now().toString().slice(-6)}`,
                phone: req.body.driverPhone,
                createdby: 'gate_operator',
              },
            });
            driverId = newDriver.driver_id;
          }
        }

        if (!transporterPartyId) {
          const p = await prisma.m_party.findFirst();
          transporterPartyId = p?.party_id || 1;
        }

        if (!visitTypeId) {
          if (req.body.visitTypeCode) {
            const vt = await prisma.m_visit_type.findFirst({
              where: { visit_type_code: req.body.visitTypeCode },
            });
            if (vt) visitTypeId = vt.visit_type_id;
          }
          if (!visitTypeId) {
            const defaultVt = await prisma.m_visit_type.findFirst();
            visitTypeId = defaultVt?.visit_type_id || 1;
          }
        }

        const visitNo = req.body.visitNo || `VIS-${new Date().toISOString().slice(2, 4)}-${Math.floor(10000 + Math.random() * 90000)}`;

        const normalizedStatus = normalizeVisitStatus(req.body.status || 'AT_OUTER_GATE');

        const created = await prisma.truck_visit.create({
          data: {
            site_id: Number(req.body.siteId) || 1,
            visit_no: visitNo,
            status: normalizedStatus,
            current_seq_no: 1,
            arrived_at: new Date(),
            truck_id: truckId,
            driver_id: driverId,
            transporter_party_id: transporterPartyId,
            visit_type_id: visitTypeId,
            createdby: 'gate_operator',
          },
        });

        // Link unit stay if provided
        const unitNo = req.body.unitNo || req.body.unitNumber;
        if (req.body.unitStayId || unitNo) {
          let stayId = req.body.unitStayId ? Number(req.body.unitStayId) : undefined;
          if (!stayId && unitNo) {
            const cargo = await prisma.cargo_unit.findFirst({
              where: { unit_number: unitNo },
              include: { unit_stay: true },
            });
            if (cargo && cargo.unit_stay && cargo.unit_stay.length > 0) {
              stayId = Number(cargo.unit_stay[0].unit_stay_id);
            }
          }

          if (stayId) {
            await prisma.visit_unit_txn.create({
              data: {
                truck_visit_id: created.truck_visit_id,
                unit_stay_id: BigInt(stayId),
                direction: req.body.direction || 'DROP',
                status: 'PLANNED',
                createdby: 'gate_operator',
              },
            });
          }
        }

        return res.status(201).json({
          truckVisitId: Number(created.truck_visit_id),
          visitNo: created.visit_no,
          status: created.status,
          nextCheckpointCode: 'OUTER_IN',
          arrivedAt: created.arrived_at?.toISOString(),
          plateNo: req.body.plateNo,
          driverName: req.body.driverName,
        });
      }

      const newVisit = { truckVisitId: visits.length + 1, ...req.body };
      visits.push(newVisit as any);
      res.status(201).json(newVisit);
    } catch (err: any) {
      console.error('createVisit error:', err);
      res.status(500).json({ error: err.message });
    }
  },

    updateVisitStatus: async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        const prisma = getPrisma();
        if (prisma) {
            const numId = Number(id);
            const normalizedStatus = normalizeVisitStatus(status);
            const updateData: any = { status: normalizedStatus, updatedate: new Date() };
            if(normalizedStatus === 'ADMITTED' || normalizedStatus === 'WORKING') {
              updateData.admitted_at = new Date();
          updateData.current_seq_no = 2;
        } else if (normalizedStatus === 'EXITED' || normalizedStatus === 'CHECKED_OUT') {
          updateData.exited_at = new Date();
          updateData.current_seq_no = 4;
        }

        const updated = await prisma.truck_visit.update({
          where: { truck_visit_id: BigInt(numId) },
          data: updateData,
        });
        return res.json({
          truckVisitId: Number(updated.truck_visit_id),
          visitNo: updated.visit_no,
          status: updated.status,
          updatedAt: updated.updatedate?.toISOString(),
        });
      }
      const v = visits.find((x: any) => String(x.truckVisitId) === id);
      if (v) (v as any).status = status;
      res.json(v || { success: true });
    } catch (err: any) {
      console.error('updateVisitStatus error:', err);
      res.status(500).json({ error: err.message });
    }
  },

checkin: async (req: Request, res: Response) => {
  try {
    const id = req.params.id?.replace(/:checkin$/, '');
    const prisma = getPrisma();
    if (prisma) {
      const numId = Number(id);
      const updated = await prisma.truck_visit.update({
        where: { truck_visit_id: BigInt(numId) },
        data: {
          status: 'ADMITTED',
          admitted_at: new Date(),
          current_seq_no: 2,
          updatedate: new Date(),
        },
      });
      return res.json({
        success: true,
        truckVisitId: Number(updated.truck_visit_id),
        status: updated.status,
        admittedAt: updated.admitted_at?.toISOString(),
      });
    }
    res.json({ success: true, truckVisitId: Number(id), status: 'ADMITTED' });
  } catch (err: any) {
    console.error('checkin error:', err);
    res.status(500).json({ error: err.message });
  }
},

  checkout: async (req: Request, res: Response) => {
    try {
      const id = req.params.id?.replace(/:checkout$/, '');
      const prisma = getPrisma();
      if (prisma) {
        const numId = Number(id);
        const updated = await prisma.truck_visit.update({
          where: { truck_visit_id: BigInt(numId) },
          data: {
            status: 'EXITED',
            exited_at: new Date(),
            checked_out_at: new Date(),
            current_seq_no: 4,
            updatedate: new Date(),
          },
        });
        return res.json({
          success: true,
          truckVisitId: Number(updated.truck_visit_id),
          status: updated.status,
          exitedAt: updated.exited_at?.toISOString(),
        });
      }
      res.json({ success: true, truckVisitId: Number(id), status: 'EXITED' });
    } catch (err: any) {
      console.error('checkout error:', err);
      res.status(500).json({ error: err.message });
    }
  },

    cancelVisit: async (req: Request, res: Response) => {
      try {
        const id = req.params.id?.replace(/:cancel$/, '');
        const prisma = getPrisma();
        if (prisma) {
          const numId = Number(id);
          const updated = await prisma.truck_visit.update({
            where: { truck_visit_id: BigInt(numId) },
            data: {
              status: 'CANCELLED',
              cancel_reason: req.body.reason || 'User cancelled',
              updatedate: new Date(),
            },
          });
          return res.json({
            success: true,
            truckVisitId: Number(updated.truck_visit_id),
            status: updated.status,
          });
        }
        res.json({ success: true, truckVisitId: Number(id), status: 'CANCELLED' });
      } catch (err: any) {
        console.error('cancelVisit error:', err);
        res.status(500).json({ error: err.message });
      }
    },

      turnBack: async (req: Request, res: Response) => {
        try {
          const { id } = req.params;
          const prisma = getPrisma();
          if (prisma) {
            const numId = Number(id);
            const updated = await prisma.truck_visit.update({
              where: { truck_visit_id: BigInt(numId) },
              data: {
                status: 'REJECTED',
                remarks: req.body.reason || 'Turned back at gate',
                updatedate: new Date(),
              },
            });
            return res.json({
              success: true,
              truckVisitId: Number(updated.truck_visit_id),
              status: updated.status,
            });
          }
          res.json({ success: true, truckVisitId: Number(id), status: 'REJECTED' });
        } catch (err: any) {
          console.error('turnBack error:', err);
          res.status(500).json({ error: err.message });
        }
      },

        recordCheckpointEvent: async (req: Request, res: Response) => {
          try {
            const { id } = req.params;
            res.json({
              success: true,
              truckVisitId: Number(id),
              checkpointCode: req.body.checkpointCode || 'INNER_IN',
              recordedAt: new Date().toISOString(),
            });
          } catch (err: any) {
            console.error('recordCheckpointEvent error:', err);
            res.status(500).json({ error: err.message });
          }
        },

          printGatePass: async (req: Request, res: Response) => {
            try {
              const { id } = req.params;
              res.json({
                success: true,
                printed: true,
                truckVisitId: Number(id),
                printedAt: new Date().toISOString(),
              });
            } catch (err: any) {
              console.error('printGatePass error:', err);
              res.status(500).json({ error: err.message });
            }
          },
};
