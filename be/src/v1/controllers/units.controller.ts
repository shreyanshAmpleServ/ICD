import { Request, Response } from 'express';
import { unitTypes, identityRules, plateFormats } from '../../data/admin';
import { allStays } from '../../data/core';
import { holdsOf } from '../../data/control';
import { search } from '../../data/search';
import { getPrisma, isDbLive } from '../../configs/prisma';
import { parsePaginationParams, paginateArray, NotFoundError, sendSuccess, sendCreated } from '../../utils';
import { containerNumberSchema, vinNumberSchema } from '../validations/common.validation';

export class UnitsController {
  public getUnitTypes = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = paginateArray(unitTypes, params, u => u.unitTypeId);
    return sendSuccess(res, result, 'Unit types retrieved successfully');
  };

  public createUnitType = async (req: Request, res: Response) => {
    const newType = {
      unitTypeId: unitTypes.length + 1,
      typeCode: req.body.typeCode || req.body.unitTypeCode || `UT-${unitTypes.length + 1}`,
      typeName: req.body.typeName || 'Standard Container',
      category: req.body.category || 'CONTAINER',
      identityRules: ['ISO_6346'],
      isActive: true,
      logInst: 1,
      ...req.body
    };
    unitTypes.push(newType as any);
    return sendCreated(res, newType, 'Unit type created successfully');
  };

  public getUnitTypeById = async (req: Request, res: Response) => {
    const idOrCode = req.params.unitTypeId;
    const item = unitTypes.find(u => String(u.unitTypeId) === idOrCode || (u as any).typeCode === idOrCode);
    if (!item) {
      throw new NotFoundError('Unit type', idOrCode);
    }
    return sendSuccess(res, item, 'Unit type retrieved successfully');
  };

  public updateUnitType = async (req: Request, res: Response) => {
    const idOrCode = req.params.unitTypeId;
    const item = unitTypes.find(u => String(u.unitTypeId) === idOrCode || (u as any).typeCode === idOrCode);
    if (!item) {
      throw new NotFoundError('Unit type', idOrCode);
    }
    Object.assign(item, req.body);
    return sendSuccess(res, item, 'Unit type updated successfully');
  };

  public getIdentityRules = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = paginateArray(identityRules, params);
    return sendSuccess(res, result, 'Identity rules retrieved successfully');
  };

  public validateIdentity = async (req: Request, res: Response) => {
    const { category, rawValue } = req.body;
    const val = String(rawValue || '').trim().toUpperCase();

    if (category === 'CONTAINER') {
      const parseResult = containerNumberSchema.safeParse(val);
      return sendSuccess(res, {
        category: 'CONTAINER',
        rawValue,
        normalizedValue: val.replace(/\s+/g, ''),
        isValid: parseResult.success,
        ruleApplied: 'ISO 6346',
        errors: parseResult.success ? [] : ['Unit number must consist of 4 letters and 7 digits (e.g. MSKU 123456 7)']
      }, 'Container identity validated');
    }

    if (category === 'VEHICLE_VIN') {
      const parseResult = vinNumberSchema.safeParse(val);
      return sendSuccess(res, {
        category: 'VEHICLE_VIN',
        rawValue,
        normalizedValue: val,
        isValid: parseResult.success,
        ruleApplied: 'ISO 3779 VIN',
        errors: parseResult.success ? [] : ['VIN must be exactly 17 alphanumeric characters, excluding I, O, Q']
      }, 'Vehicle VIN validated');
    }

    return sendSuccess(res, {
      category: category || 'CUSTOM',
      rawValue,
      normalizedValue: val,
      isValid: true,
      ruleApplied: 'NONE',
      errors: []
    }, 'Custom identity validated');
  };

  public getPlateFormats = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = paginateArray(plateFormats, params);
    return sendSuccess(res, result, 'Plate formats retrieved successfully');
  };

  public search = async (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim();
    const results = search(q);
    return sendSuccess(res, {
      query: q,
      results,
      total: results.reduce((acc, g) => acc + (g.hits?.length || 0), 0)
    }, 'Global search results retrieved');
  };

  public getUnits = async (req: Request, res: Response) => {
    const { category, status, customsStatus, location, search: searchQ } = req.query;
    const params = parsePaginationParams(req.query);
    let items = allStays;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbStays = await prisma.unit_stays.findMany({
            include: {
              unit_stays_unit_types: true,
              unit_stays_yard_locations: true,
              unit_stays_consignments: true,
              unit_stays_cargo_regimes: true,
              holds: true
            },
            orderBy: { unit_stay_id: 'desc' }
          });

          if (dbStays && dbStays.length > 0) {
            const mapped = dbStays.map(u => {
              const activeHolds = (u.holds || []).filter(h => h.status === 'ACTIVE').length;
              const dwell = u.arrived_at ? Math.max(1, Math.floor((Date.now() - new Date(u.arrived_at).getTime()) / 86400000)) : 4;
              return {
                unitStayId: u.unit_stay_id,
                siteId: u.site_id,
                consignmentId: u.consignment_id,
                cargoUnit: {
                  cargoUnitId: u.unit_stay_id,
                  category: u.unit_stays_unit_types?.category || 'CONTAINER',
                  unitNo: u.unit_no,
                  unitTypeCode: u.unit_stays_unit_types?.type_code || '40HC',
                  isoType: u.unit_stays_unit_types?.type_code || '40HC',
                  tareWeightKg: 3800
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
                currentLocation: u.unit_stays_yard_locations ? {
                  locationId: u.unit_stays_yard_locations.yard_location_id,
                  fullCode: u.unit_stays_yard_locations.full_code,
                  zone: u.unit_stays_yard_locations.full_code.split('-')[0] || 'A'
                } : undefined,
                unitSummary: {
                  unitNo: u.unit_no,
                  category: u.unit_stays_unit_types?.category || 'CONTAINER',
                  activeHoldCount: activeHolds,
                  releaseStatus: u.release_status,
                  physicalStatus: u.physical_status,
                  dwellDays: dwell,
                  consignmentRef: u.unit_stays_consignments?.ref_no
                },
                arrivedAt: u.arrived_at?.toISOString()
              };
            });

            const dbIds = new Set(mapped.map(m => m.cargoUnit.unitNo));
            items = [...mapped, ...allStays.filter(s => !dbIds.has(s.cargoUnit.unitNo))] as any;
          }
        } catch (err: any) {
          console.warn('[UnitsController] DB query fallback to memory:', err.message);
        }
      }
    }

    if (category) {
      items = items.filter(s => s.cargoUnit?.category === category);
    }
    if (status) {
      items = items.filter(s => s.physicalStatus === status);
    }
    if (customsStatus) {
      items = items.filter(s => s.customsStatus === customsStatus);
    }
    if (location) {
      items = items.filter(s => s.currentLocation?.fullCode?.startsWith(String(location)));
    }
    if (searchQ) {
      const q = String(searchQ).toLowerCase();
      items = items.filter(
        s =>
          s.cargoUnit?.unitNo.toLowerCase().includes(q) ||
          s.sealNo?.toLowerCase().includes(q) ||
          s.currentLocation?.fullCode?.toLowerCase().includes(q)
      );
    }

    const paginated = paginateArray(items, params, s => s.unitStayId);
    return sendSuccess(res, paginated, 'Units retrieved successfully');
  };

  public createUnit = async (req: Request, res: Response) => {
    const body = req.body;
    const newStay = {
      unitStayId: allStays.length + 5001,
      siteId: 1,
      consignmentId: body.consignmentId || 101,
      cargoUnit: {
        cargoUnitId: allStays.length + 5001,
        category: body.category || 'CONTAINER',
        unitNo: body.unitNo || `NEWU${Date.now().toString().slice(-7)}`,
        isoType: body.isoType || '40HC',
        tareWeightKg: body.tareWeightKg || 3800
      },
      physicalStatus: 'EXPECTED',
      flow: body.flow || 'IMPORT',
      sealNo: body.sealNo || 'SEAL-001',
      customsStatus: 'PENDING',
      releaseStatus: 'PENDING_CHARGES',
      gatedInAt: new Date().toISOString(),
      logInst: 1,
      ...body
    };
    allStays.push(newStay as any);
    return sendCreated(res, newStay, 'Unit stay created successfully');
  };

  public getUnitById = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    const stay = allStays.find(
      x => String(x.unitStayId) === idOrUnitNo || x.cargoUnit?.unitNo.toUpperCase() === idOrUnitNo.toUpperCase()
    );
    if (!stay) {
      throw new NotFoundError('Unit stay', idOrUnitNo);
    }
    return sendSuccess(res, stay, 'Unit stay retrieved successfully');
  };

  public updateUnit = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    const stay = allStays.find(
      x => String(x.unitStayId) === idOrUnitNo || x.cargoUnit?.unitNo.toUpperCase() === idOrUnitNo.toUpperCase()
    );
    if (!stay) {
      throw new NotFoundError('Unit stay', idOrUnitNo);
    }
    Object.assign(stay, req.body, { logInst: ((stay as any).logInst || 1) + 1 });
    return sendSuccess(res, stay, 'Unit stay updated successfully');
  };

  public getUnitTimeline = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    const stay = allStays.find(
      x => String(x.unitStayId) === idOrUnitNo || x.cargoUnit?.unitNo.toUpperCase() === idOrUnitNo.toUpperCase()
    );
    if (!stay) {
      throw new NotFoundError('Unit stay', idOrUnitNo);
    }
    const timeline = [
      {
        eventType: 'MANIFEST_IMPORTED',
        occurredAt: '2026-10-01T08:00:00Z',
        summary: 'Manifest received from shipping line',
        user: 'SYSTEM'
      },
      {
        eventType: 'DISCHARGE_CONFIRMED',
        occurredAt: '2026-10-03T14:30:00Z',
        summary: 'Container discharged at Port of Dar es Salaam',
        user: 'PORT_EDI'
      },
      {
        eventType: 'GATE_IN',
        occurredAt: stay.gatedInAt || '2026-10-04T09:15:00Z',
        summary: 'Gate in pass issued to truck T 124 DFH',
        user: 'Rose A.'
      },
      {
        eventType: 'YARD_PLACEMENT',
        occurredAt: '2026-10-04T09:45:00Z',
        summary: `Placed into yard slot ${stay.currentLocation?.fullCode || 'A-02-04-2'}`,
        user: 'Ibrahim N.'
      },
      {
        eventType: 'CUSTOMS_STATUS',
        occurredAt: '2026-10-05T11:00:00Z',
        summary: `Customs status updated to ${stay.customsStatus}`,
        user: 'Rehema K.'
      }
    ];
    return sendSuccess(res, {
      unitStayId: stay.unitStayId,
      unitNo: stay.cargoUnit?.unitNo,
      events: timeline
    }, 'Unit timeline retrieved successfully');
  };

  public getUnitHolds = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    const stay = allStays.find(
      x => String(x.unitStayId) === idOrUnitNo || x.cargoUnit?.unitNo.toUpperCase() === idOrUnitNo.toUpperCase()
    );
    if (!stay) {
      throw new NotFoundError('Unit stay', idOrUnitNo);
    }
    const params = parsePaginationParams(req.query);
    const holds = holdsOf(stay.unitStayId || 0);
    const paginated = paginateArray(holds, params);
    return sendSuccess(res, paginated, 'Unit holds retrieved successfully');
  };

  public getUnitHistory = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    const stay = allStays.find(
      x => String(x.unitStayId) === idOrUnitNo || x.cargoUnit?.unitNo.toUpperCase() === idOrUnitNo.toUpperCase()
    );
    if (!stay) {
      throw new NotFoundError('Unit stay', idOrUnitNo);
    }
    return sendSuccess(res, {
      unitStayId: stay.unitStayId,
      unitNo: stay.cargoUnit?.unitNo,
      moves: [
        {
          fromLocation: 'GATE_IN_LANE_1',
          toLocation: stay.currentLocation?.fullCode || 'A-02-04-2',
          movedAt: stay.gatedInAt,
          movedBy: 'Ibrahim N.'
        }
      ]
    }, 'Unit history retrieved successfully');
  };
}

export const unitsController = new UnitsController();
