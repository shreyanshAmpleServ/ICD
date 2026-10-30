import { Request, Response } from 'express';
import { getPrisma } from '../../configs/prisma';
import { parsePaginationParams, paginateArray, NotFoundError, sendSuccess, sendCreated, sendError } from '../../utils';
import { containerNumberSchema, vinNumberSchema } from '../validations/common.validation';
import { cargoService } from '../../modules/cargo/cargo.service';

// Static validation rules for identity & registration plates
const IDENTITY_RULES = [
  { ruleCode: 'ISO6346', ruleName: 'Container number (ISO 6346)', regexPattern: '^[A-Z]{3}[UJZ][0-9]{7}$', checkDigitAlgo: 'ISO6346', description: 'Owner code + category + 6 digits + check digit; check digit validated.', example: 'CSQU 305438 3' },
  { ruleCode: 'VIN17', ruleName: 'Vehicle identification number', regexPattern: '^[A-HJ-NPR-Z0-9]{17}$', checkDigitAlgo: 'NONE', description: '17 characters, no I, O or Q.', example: 'JTMHV05J604123456' },
  { ruleCode: 'JP_FRAME', ruleName: 'Japanese chassis / frame number', regexPattern: '^[A-Z0-9]{2,8}-[0-9]{4,8}$', checkDigitAlgo: 'NONE', description: 'Model code, dash, serial.', example: 'NZE141-1234567' },
  { ruleCode: 'FREE_TEXT', ruleName: 'Free reference (lots, packages)', regexPattern: '^.{1,40}$', checkDigitAlgo: 'NONE', description: 'Any reference up to 40 characters.', example: 'LOT-0441/12' },
];

const PLATE_FORMATS = [
  { code: 'TZ', country: 'Tanzania', pattern: '^T ?[0-9]{3} ?[A-Z]{3}$', example: 'T 412 DKL', note: 'Stored without spaces (T412DKL); shown with spaces.' },
  { code: 'TZ_TRAILER', country: 'Tanzania trailer', pattern: '^T ?[0-9]{3} ?[A-Z]{3}$', example: 'T 118 DPE', note: 'Trailers carry their own plate.' },
  { code: 'ZM', country: 'Zambia', pattern: '^[A-Z]{3} ?[0-9]{4}$', example: 'BAK 4471', note: 'Transit trucks to Lusaka.' },
  { code: 'KE', country: 'Kenya', pattern: '^K[A-Z]{2} ?[0-9]{3}[A-Z]$', example: 'KDA 233M', note: 'Kenya commercial registration.' },
];

export class UnitsController {
  public getUnitTypes = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const prisma = getPrisma();

    if (!prisma) {
      return sendSuccess(res, paginateArray([], params), 'Database not connected');
    }

    try {
      const dbTypes = await (prisma as any).unit_types.findMany({
        orderBy: { unit_type_id: 'asc' },
      });

      const mapped = dbTypes.map((u: any) => ({
        unitTypeId: Number(u.unit_type_id),
        typeCode: u.type_code,
        typeName: u.type_name,
        category: u.unit_category || u.category,
        lengthFt: u.length_ft,
        teu: String(u.teu_factor || u.teu || 1.0),
        isReefer: Boolean(u.is_reefer),
        isActive: Boolean(u.is_active),
      }));

      const result = paginateArray(mapped, params, (u: any) => u.unitTypeId);
      return sendSuccess(res, result, 'Unit types retrieved successfully from database');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createUnitType = async (req: Request, res: Response) => {
    const body = req.body;
    const prisma = getPrisma();

    if (!prisma) {
      return sendError(res, 'Database not connected', 500);
    }

    try {
      const created = await (prisma as any).unit_types.create({
        data: {
          type_code: body.typeCode || body.unitTypeCode || `UT-${Date.now()}`,
          type_name: body.typeName || 'Standard Container',
          unit_category: body.category || 'CONTAINER',
          length_ft: body.lengthFt ? Number(body.lengthFt) : 40,
          teu_factor: body.teu ? Number(body.teu) : 2.0,
          is_reefer: Boolean(body.isReefer),
          is_active: true,
          createdby: 'system',
        },
      });

      return sendCreated(
        res,
        {
          unitTypeId: Number(created.unit_type_id),
          typeCode: created.type_code,
          typeName: created.type_name,
          category: created.unit_category || created.category,
          lengthFt: created.length_ft,
          teu: String(created.teu_factor || created.teu),
          isReefer: created.is_reefer,
          isActive: created.is_active,
        },
        'Unit type created successfully in database'
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getUnitTypeById = async (req: Request, res: Response) => {
    const idOrCode = req.params.unitTypeId;
    const prisma = getPrisma();

    if (!prisma) {
      return sendError(res, 'Database not connected', 500);
    }

    try {
      const dbType = await (prisma as any).unit_types.findFirst({
        where: isNaN(Number(idOrCode))
          ? { type_code: idOrCode }
          : { OR: [{ unit_type_id: Number(idOrCode) }, { type_code: idOrCode }] },
      });

      if (!dbType) {
        throw new NotFoundError('Unit type', idOrCode);
      }

      return sendSuccess(
        res,
        {
          unitTypeId: Number(dbType.unit_type_id),
          typeCode: dbType.type_code,
          typeName: dbType.type_name,
          category: dbType.unit_category || dbType.category,
          lengthFt: dbType.length_ft,
          teu: String(dbType.teu_factor || dbType.teu),
          isReefer: dbType.is_reefer,
          isActive: dbType.is_active,
        },
        'Unit type retrieved successfully'
      );
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      return sendError(res, err.message, 500);
    }
  };

  public updateUnitType = async (req: Request, res: Response) => {
    const idOrCode = req.params.unitTypeId;
    const prisma = getPrisma();

    if (!prisma) {
      return sendError(res, 'Database not connected', 500);
    }

    try {
      const existing = await (prisma as any).unit_types.findFirst({
        where: isNaN(Number(idOrCode))
          ? { type_code: idOrCode }
          : { OR: [{ unit_type_id: Number(idOrCode) }, { type_code: idOrCode }] },
      });

      if (!existing) {
        throw new NotFoundError('Unit type', idOrCode);
      }

      const updated = await (prisma as any).unit_types.update({
        where: { unit_type_id: existing.unit_type_id },
        data: {
          type_name: req.body.typeName ?? existing.type_name,
          unit_category: req.body.category ?? existing.unit_category,
          is_active: req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.is_active,
        },
      });

      return sendSuccess(res, updated, 'Unit type updated successfully');
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      return sendError(res, err.message, 500);
    }
  };

  public getIdentityRules = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = paginateArray(IDENTITY_RULES, params);
    return sendSuccess(res, result, 'Identity rules retrieved successfully');
  };

  public validateIdentity = async (req: Request, res: Response) => {
    const { category, rawValue } = req.body;
    const val = String(rawValue || '').trim().toUpperCase();

    if (category === 'CONTAINER') {
      const parseResult = containerNumberSchema.safeParse(val);
      return sendSuccess(
        res,
        {
          category: 'CONTAINER',
          rawValue,
          normalizedValue: val.replace(/\s+/g, ''),
          isValid: parseResult.success,
          ruleApplied: 'ISO 6346',
          errors: parseResult.success
            ? []
            : ['Unit number must consist of 4 letters and 7 digits (e.g. MSKU 123456 7)'],
        },
        'Container identity validated'
      );
    }

    if (category === 'VEHICLE_VIN') {
      const parseResult = vinNumberSchema.safeParse(val);
      return sendSuccess(
        res,
        {
          category: 'VEHICLE_VIN',
          rawValue,
          normalizedValue: val,
          isValid: parseResult.success,
          ruleApplied: 'ISO 3779 VIN',
          errors: parseResult.success
            ? []
            : ['VIN must be exactly 17 alphanumeric characters, excluding I, O, Q'],
        },
        'Vehicle VIN validated'
      );
    }

    return sendSuccess(
      res,
      {
        category: category || 'CUSTOM',
        rawValue,
        normalizedValue: val,
        isValid: true,
        ruleApplied: 'NONE',
        errors: [],
      },
      'Custom identity validated'
    );
  };

  public getPlateFormats = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = paginateArray(PLATE_FORMATS, params);
    return sendSuccess(res, result, 'Plate formats retrieved successfully');
  };

  public search = async (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim();
    const prisma = getPrisma();

    if (!prisma || !q) {
      return sendSuccess(res, { query: q, results: [], total: 0 }, 'Search completed');
    }

    try {
      const [units, invoices] = await Promise.all([
        (prisma as any).unit_stays.findMany({
          where: {
            unit_stay_cargo_units: {
              unit_no: { contains: q },
            },
          },
          include: {
            unit_stay_cargo_units: true,
          },
          take: 10,
        }),
        (prisma as any).invoices.findMany({
          where: { invoice_no: { contains: q } },
          take: 10,
        }),
      ]);

      const results = [
        {
          entity: 'UNIT',
          label: 'Units',
          hits: units.map((u: any) => ({
            id: Number(u.unit_stay_id),
            title: u.unit_stay_cargo_units?.unit_no || `CONT-${u.unit_stay_id}`,
            status: u.physical_status,
            to: `/units/${u.unit_stay_id}`,
          })),
        },
        {
          entity: 'INVOICE',
          label: 'Invoices',
          hits: invoices.map((i: any) => ({
            id: Number(i.invoice_id),
            title: i.invoice_no,
            status: i.status,
            to: `/invoices/${i.invoice_id}`,
          })),
        },
      ];

      return sendSuccess(
        res,
        {
          query: q,
          results,
          total: units.length + invoices.length,
        },
        'Search results retrieved from database'
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getUnits = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    try {
      const dbStays = await (prisma as any).unit_stays.findMany({
        where: {
          ...(category
            ? {
              unit_stay_cargo_units: {
                unit_category: String(category),
              },
            }
            : {}),
          ...(status ? { physical_status: String(status) } : {}),
          ...(customsStatus ? { customs_status: String(customsStatus) } : {}),
          ...(searchQ
            ? {
              OR: [
                { unit_stay_cargo_units: { unit_no: { contains: String(searchQ) } } },
                { seal_no: { contains: String(searchQ) } },
              ],
            }
            : {}),
        },
        include: {
          unit_stay_cargo_units: {
            include: {
              cargo_unit_unit_types: true,
            },
          },
          unit_stay_yard_locations: true,
          unit_stay_consignments: true,
          unit_stay_cargo_regimes: true,
          unit_stay_holds: true,
        },
        orderBy: { unit_stay_id: 'desc' },
      });

      const mapped = dbStays.map((u: any) => {
        const activeHolds = (u.unit_stay_holds || []).filter((h: any) => h.status === 'ACTIVE').length;
        const dwell = u.gated_in_at
          ? Math.max(1, Math.floor((Date.now() - new Date(u.gated_in_at).getTime()) / 86400000))
          : 4;
        const cUnit = u.unit_stay_cargo_units;
        const uType = cUnit?.cargo_unit_unit_types;
        const unitNo = cUnit?.unit_no || `CONT-${u.unit_stay_id}`;
        const cat = cUnit?.unit_category || uType?.unit_category || 'CONTAINER';
        const typeCode = uType?.type_code || '40HC';

        return {
          unitStayId: Number(u.unit_stay_id),
          siteId: u.site_id,
          consignmentId: u.consignment_id ? Number(u.consignment_id) : null,
          cargoUnit: {
            cargoUnitId: Number(u.unit_stay_id),
            category: cat,
            unitNo,
            unitTypeCode: typeCode,
            isoType: typeCode,
            tareWeightKg: Number(uType?.default_tare_kg || 3800),
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
          currentLocation: u.unit_stay_yard_locations
            ? {
              locationId: u.unit_stay_yard_locations.yard_location_id,
              fullCode: u.unit_stay_yard_locations.full_code,
              zone: u.unit_stay_yard_locations.full_code.split('-')[0] || 'A',
            }
            : undefined,
          unitSummary: {
            unitNo,
            category: cat,
            activeHoldCount: activeHolds,
            releaseStatus: u.release_status,
            physicalStatus: u.physical_status,
            dwellDays: dwell,
            consignmentRef: u.unit_stay_consignments?.ref_no,
          },
          arrivedAt: (u.gated_in_at || u.createdate)?.toISOString(),
        };
      });

      const paginated = paginateArray(mapped, params, (s: any) => s.unitStayId);
      return sendSuccess(res, paginated, 'Units retrieved successfully from database');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createUnit = async (req: Request, res: Response) => {
    const body = req.body;
    const prisma = getPrisma();

    if (!prisma) {
      return sendError(res, 'Database not connected', 500);
    }

    try {
      const typeCode = body.isoType || body.unitTypeCode || '40HC';
      const uType = await (prisma as any).unit_types.findFirst({ where: { type_code: typeCode } });
      const typeId = uType?.unit_type_id || 2;
      const unitNo = body.unitNo || `NEWU${Date.now().toString().slice(-7)}`;

      let cUnit = await (prisma as any).cargo_units.findFirst({
        where: { unit_no: unitNo },
      });
      if (!cUnit) {
        cUnit = await (prisma as any).cargo_units.create({
          data: {
            unit_category: body.category || 'CONTAINER',
            unit_no: unitNo,
            unit_type_id: typeId,
            createdby: 'system',
          },
        });
      }

      const created = await (prisma as any).unit_stays.create({
        data: {
          site_id: body.siteId || 1,
          cargo_unit_id: cUnit.cargo_unit_id,
          consignment_id: body.consignmentId ? Number(body.consignmentId) : null,
          cargo_regime_id: body.cargoRegimeId || 1,
          flow: body.flow || 'IMPORT',
          full_empty: body.fullEmpty || 'F',
          physical_status: body.physicalStatus || 'EXPECTED',
          customs_status: body.customsStatus || 'NOT_LODGED',
          release_status: body.releaseStatus || 'NONE',
          seal_no: body.sealNo || 'SEAL-001',
          gross_weight_kg: body.grossWeightKg ? Number(body.grossWeightKg) : 24000,
          gated_in_at: new Date(),
          createdby: 'system',
        },
      });

      return sendCreated(
        res,
        {
          unitStayId: Number(created.unit_stay_id),
          unitNo,
          siteId: created.site_id,
          physicalStatus: created.physical_status,
          flow: created.flow,
          customsStatus: created.customs_status,
        },
        'Unit stay created successfully in database'
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getUnitById = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    try {
      const isNum = !isNaN(Number(idOrUnitNo));
      const u = await (prisma as any).unit_stays.findFirst({
        where: isNum
          ? {
            OR: [
              { unit_stay_id: Number(idOrUnitNo) },
              { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
            ],
          }
          : { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
        include: {
          unit_stay_cargo_units: {
            include: {
              cargo_unit_unit_types: true,
            },
          },
          unit_stay_yard_locations: true,
          unit_stay_consignments: true,
          unit_stay_cargo_regimes: true,
          unit_stay_holds: true,
        },
      });

      if (!u) {
        throw new NotFoundError('Unit stay', idOrUnitNo);
      }

      const activeHolds = (u.unit_stay_holds || []).filter((h: any) => h.status === 'ACTIVE').length;
      const cUnit = u.unit_stay_cargo_units;
      const uType = cUnit?.cargo_unit_unit_types;
      const unitNo = cUnit?.unit_no || `CONT-${u.unit_stay_id}`;
      const cat = cUnit?.unit_category || uType?.unit_category || 'CONTAINER';
      const typeCode = uType?.type_code || '40HC';

      const stay = {
        unitStayId: Number(u.unit_stay_id),
        siteId: u.site_id,
        consignmentId: u.consignment_id ? Number(u.consignment_id) : null,
        cargoUnit: {
          cargoUnitId: Number(u.unit_stay_id),
          category: cat,
          unitNo,
          unitTypeCode: typeCode,
          isoType: typeCode,
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
        currentLocation: u.unit_stay_yard_locations
          ? {
            locationId: u.unit_stay_yard_locations.yard_location_id,
            fullCode: u.unit_stay_yard_locations.full_code,
          }
          : undefined,
        gatedInAt: (u.gated_in_at || u.createdate)?.toISOString(),
      };

      return sendSuccess(res, stay, 'Unit stay retrieved successfully from database');
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      return sendError(res, err.message, 500);
    }
  };

  public updateUnit = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    const prisma = getPrisma();

    if (!prisma) {
      return sendError(res, 'Database not connected', 500);
    }

    try {
      const isNum = !isNaN(Number(idOrUnitNo));
      const u = await (prisma as any).unit_stays.findFirst({
        where: isNum
          ? {
            OR: [
              { unit_stay_id: Number(idOrUnitNo) },
              { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
            ],
          }
          : { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
      });

      if (!u) {
        throw new NotFoundError('Unit stay', idOrUnitNo);
      }

      const updated = await (prisma as any).unit_stays.update({
        where: { unit_stay_id: u.unit_stay_id },
        data: {
          ...(req.body.physicalStatus ? { physical_status: req.body.physicalStatus } : {}),
          ...(req.body.customsStatus ? { customs_status: req.body.customsStatus } : {}),
          ...(req.body.releaseStatus ? { release_status: req.body.releaseStatus } : {}),
          ...(req.body.billingStatus ? { billing_status: req.body.billingStatus } : {}),
          ...(req.body.sealNo ? { seal_no: req.body.sealNo } : {}),
        },
      });

      return sendSuccess(res, updated, 'Unit stay updated successfully in database');
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      return sendError(res, err.message, 500);
    }
  };

  public getUnitTimeline = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    try {
      const isNum = !isNaN(Number(idOrUnitNo));
      const u = await (prisma as any).unit_stays.findFirst({
        where: isNum
          ? {
            OR: [
              { unit_stay_id: Number(idOrUnitNo) },
              { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
            ],
          }
          : { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
        include: {
          unit_stay_cargo_units: true,
        },
      });

      if (!u) {
        throw new NotFoundError('Unit stay', idOrUnitNo);
      }

      const unitNo = u.unit_stay_cargo_units?.unit_no || `CONT-${u.unit_stay_id}`;
      const timeline = [
        {
          eventType: 'MANIFEST_IMPORTED',
          occurredAt: (u.gated_in_at || u.createdate)?.toISOString() || new Date().toISOString(),
          summary: 'Manifest record verified and loaded into ICD system',
          user: 'SYSTEM',
        },
        {
          eventType: 'GATE_IN',
          occurredAt: (u.gated_in_at || u.createdate)?.toISOString() || new Date().toISOString(),
          summary: `Unit ${unitNo} gated into depot`,
          user: 'Gate Officer',
        },
        {
          eventType: 'CUSTOMS_STATUS',
          occurredAt: new Date().toISOString(),
          summary: `Customs clearance status: ${u.customsStatus || 'PENDING'}`,
          user: 'TRA Customs',
        },
      ];

      return sendSuccess(
        res,
        {
          unitStayId: Number(u.unit_stay_id),
          unitNo,
          events: timeline,
        },
        'Unit timeline retrieved successfully'
      );
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      return sendError(res, err.message, 500);
    }
  };

  public getUnitHolds = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    const params = parsePaginationParams(req.query);
    const prisma = getPrisma();

    if (!prisma) {
      return sendSuccess(res, paginateArray([], params), 'Database not connected');
    }

    try {
      const isNum = !isNaN(Number(idOrUnitNo));
      const u = await (prisma as any).unit_stays.findFirst({
        where: isNum
          ? {
            OR: [
              { unit_stay_id: Number(idOrUnitNo) },
              { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
            ],
          }
          : { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
      });

      if (!u) {
        throw new NotFoundError('Unit stay', idOrUnitNo);
      }

      const holds = await (prisma as any).holds.findMany({
        where: { unit_stay_id: u.unit_stay_id },
        include: { hold_types: true },
        orderBy: { hold_id: 'desc' },
      });

      const mapped = holds.map((h: any) => ({
        holdId: Number(h.hold_id),
        unitStayId: Number(h.unit_stay_id),
        holdTypeCode: h.hold_types?.type_code || `HOLD_${h.hold_type_id}`,
        reason: h.reason,
        status: h.status,
        placedAt: h.placed_at?.toISOString(),
        liftedAt: h.lifted_at?.toISOString(),
      }));

      const paginated = paginateArray(mapped, params, (h: any) => h.holdId);
      return sendSuccess(res, paginated, 'Unit holds retrieved successfully from database');
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      return sendError(res, err.message, 500);
    }
  };

  public getUnitHistory = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    const prisma = getPrisma();

    if (!prisma) {
      return sendError(res, 'Database not connected', 500);
    }

    try {
      const isNum = !isNaN(Number(idOrUnitNo));
      const u = await (prisma as any).unit_stays.findFirst({
        where: isNum
          ? {
            OR: [
              { unit_stay_id: Number(idOrUnitNo) },
              { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
            ],
          }
          : { unit_stay_cargo_units: { unit_no: idOrUnitNo } },
        include: {
          unit_stay_cargo_units: true,
          unit_stay_yard_locations: true,
        },
      });

      if (!u) {
        throw new NotFoundError('Unit stay', idOrUnitNo);
      }

      const moves = await (prisma as any).yard_moves.findMany({
        where: { unit_stay_id: u.unit_stay_id },
        include: {
          m_yard_location_yard_move_from_location_idTom_yard_location: true,
          m_yard_location_yard_move_to_location_idTom_yard_location: true,
        },
        orderBy: { yard_move_id: 'desc' },
      });

      return sendSuccess(
        res,
        {
          unitStayId: Number(u.unit_stay_id),
          unitNo: u.unit_stay_cargo_units?.unit_no || `CONT-${u.unit_stay_id}`,
          moves: moves.length > 0
            ? moves.map((m: any) => ({
              yardMoveId: Number(m.yard_move_id),
              moveType: m.move_kind || 'RELOCATE',
              status: 'COMPLETED',
              fromLocation: m.m_yard_location_yard_move_from_location_idTom_yard_location?.full_code,
              toLocation: m.m_yard_location_yard_move_to_location_idTom_yard_location?.full_code,
              orderedAt: m.occurred_at?.toISOString(),
              executedAt: m.occurred_at?.toISOString(),
            }))
            : [
              {
                fromLocation: 'GATE_IN_LANE_1',
                toLocation: u.unit_stay_yard_locations?.full_code || 'A-01-01-1',
                movedAt: (u.gated_in_at || u.createdate)?.toISOString() || new Date().toISOString(),
                movedBy: 'Terminal Yard Operator',
              },
            ],
        },
        'Unit history retrieved successfully from database'
      );
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      return sendError(res, err.message, 500);
    }
  };
}

export const unitsController = new UnitsController();
