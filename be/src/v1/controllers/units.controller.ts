import { Request, Response } from 'express';
import { getPrisma } from '../../configs/prisma';
import { isDbLive } from '../../db/prisma';
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
      const dbTypes = await prisma.m_unit_type.findMany({
        orderBy: { unit_type_id: 'asc' },
      });

      const mapped = dbTypes.map((u: any) => ({
        unitTypeId: Number(u.unit_type_id),
        typeCode: u.type_code,
        typeName: u.type_name,
        category: u.unit_category,
        lengthFt: u.length_ft,
        teu: String(u.teu_factor || 1.0),
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
      const created = await prisma.m_unit_type.create({
        data: {
          type_code: body.typeCode || body.unitTypeCode || `UT-${Date.now()}`,
          type_name: body.typeName || 'Standard Container',
          unit_category: body.category || 'CONTAINER',
          length_ft: body.lengthFt ? Number(body.lengthFt) : 40,
          teu: body.teu ? Number(body.teu) : 2.0,
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
          category: created.unit_category,
          lengthFt: created.length_ft,
          teu: String((created as any).teu || 2.0),
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
      const dbType = await prisma.m_unit_type.findFirst({
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
          category: dbType.unit_category,
          lengthFt: dbType.length_ft,
          teu: String((dbType as any).teu || 1.0),
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
      const existing = await prisma.m_unit_type.findFirst({
        where: isNaN(Number(idOrCode))
          ? { type_code: idOrCode }
          : { OR: [{ unit_type_id: Number(idOrCode) }, { type_code: idOrCode }] },
      });

      if (!existing) {
        throw new NotFoundError('Unit type', idOrCode);
      }

      const updated = await prisma.m_unit_type.update({
        where: { unit_type_id: existing.unit_type_id },
        data: {
          type_name: req.body.typeName ?? existing.type_name,
          unit_category: req.body.category ?? existing.unit_category,
          is_active: req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.is_active,
          updatedate: new Date(),
          updatedby: 'system',
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
          ruleApplied: 'VIN-17 (ISO 3779)',
          errors: parseResult.success ? [] : ['VIN must be exactly 17 characters without I, O, or Q'],
        },
        'Vehicle VIN identity validated'
      );
    }

    return sendSuccess(
      res,
      {
        category: category || 'GENERAL',
        rawValue,
        normalizedValue: val,
        isValid: val.length > 0 && val.length <= 40,
        ruleApplied: 'Length check',
        errors: val.length === 0 ? ['Reference cannot be empty'] : [],
      },
      'General identity validated'
    );
  };

  public getPlateFormats = async (req: Request, res: Response) => {
    const params = parsePaginationParams(req.query);
    const result = paginateArray(PLATE_FORMATS, params);
    return sendSuccess(res, result, 'Plate formats retrieved successfully');
  };

  public search = async (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return sendSuccess(res, { query: q, results: [], total: 0 }, 'Search completed');
    }

    try {
      const allUnits = await cargoService.getUnits();
      const hits = allUnits.filter((u: any) => {
        const uNo = (u.cargoUnit?.unitNo || u.unitNo || '').toUpperCase();
        return uNo.includes(q.toUpperCase());
      }).slice(0, 10);

      const results = [
        {
          entity: 'UNIT',
          label: 'Units',
          hits: hits.map((u: any) => ({
            id: Number(u.unitStayId),
            title: u.cargoUnit?.unitNo || u.unitNo,
            status: u.physicalStatus,
            to: `/units/${u.unitStayId}`,
          })),
        },
      ];

      return sendSuccess(
        res,
        {
          query: q,
          results,
          total: hits.length,
        },
        'Search completed successfully'
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getUnits = async (req: Request, res: Response) => {
    try {
      const items = await cargoService.getUnits(req.query);
      return res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public createUnit = async (req: Request, res: Response) => {
    try {
      const created = await cargoService.createUnit(req.body);
      return sendCreated(res, created, 'Unit stay created successfully');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getUnitById = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    try {
      const unit = await cargoService.getUnit(idOrUnitNo);
      if (!unit) {
        throw new NotFoundError('Unit stay', idOrUnitNo);
      }
      return sendSuccess(res, unit, 'Unit stay retrieved successfully');
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        return sendError(res, err.message, 404);
      }
      return sendError(res, err.message, 500);
    }
  };

  public updateUnit = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    try {
      const updated = await cargoService.updateUnit(idOrUnitNo, req.body);
      return sendSuccess(res, updated, 'Unit stay updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getUnitTimeline = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    try {
      const u = await cargoService.getUnit(idOrUnitNo);
      if (!u) {
        throw new NotFoundError('Unit stay', idOrUnitNo);
      }
      const events = await cargoService.getUnitTimeline(idOrUnitNo);
      return sendSuccess(
        res,
        {
          unitStayId: Number(u.unitStayId || idOrUnitNo),
          unitNo: u.cargoUnit?.unitNo || (u as any).unitNo || `CONT-${idOrUnitNo}`,
          events,
        },
        'Unit timeline retrieved successfully'
      );
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        return sendError(res, err.message, 404);
      }
      return sendError(res, err.message, 500);
    }
  };

  public getUnitHolds = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    const params = parsePaginationParams(req.query);

    try {
      const allHolds = await cargoService.getHolds();
      const filtered = allHolds.filter((h: any) => String(h.unitStayId) === String(idOrUnitNo) || String(h.unitNo) === String(idOrUnitNo));
      const paginated = paginateArray(filtered, params, (h: any) => h.holdId);
      return sendSuccess(res, paginated, 'Unit holds retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  };

  public getUnitHistory = async (req: Request, res: Response) => {
    const idOrUnitNo = req.params.unitStayId;
    try {
      const u = await cargoService.getUnit(idOrUnitNo);
      if (!u) {
        throw new NotFoundError('Unit stay', idOrUnitNo);
      }
      const prisma = getPrisma();
      let moves: any[] = [];
      if (isDbLive() && prisma) {
        try {
          const dbMoves = await prisma.yard_move.findMany({
            where: { unit_stay_id: Number(u.unitStayId) },
            include: {
              m_yard_location_yard_move_from_location_idTom_yard_location: true,
              m_yard_location_yard_move_to_location_idTom_yard_location: true,
            },
            orderBy: { yard_move_id: 'desc' },
          });
          if (dbMoves && dbMoves.length > 0) {
            moves = dbMoves.map((m: any) => ({
              yardMoveId: Number(m.yard_move_id),
              moveType: m.move_kind || 'RELOCATE',
              status: 'COMPLETED',
              fromLocation: m.m_yard_location_yard_move_from_location_idTom_yard_location?.full_code,
              toLocation: m.m_yard_location_yard_move_to_location_idTom_yard_location?.full_code,
              orderedAt: m.occurred_at?.toISOString(),
              executedAt: m.occurred_at?.toISOString(),
            }));
          }
        } catch { }
      }
      if (moves.length === 0) {
        moves = [
          {
            fromLocation: 'GATE_IN_LANE_1',
            toLocation: u.currentLocation?.fullCode || 'A-01-01-1',
            movedAt: u.dischargeAt || new Date().toISOString(),
            movedBy: 'Terminal Yard Operator',
          },
        ];
      }
      return sendSuccess(
        res,
        {
          unitStayId: Number(u.unitStayId || idOrUnitNo),
          unitNo: u.cargoUnit?.unitNo || (u as any).unitNo || `CONT-${idOrUnitNo}`,
          moves,
        },
        'Unit history retrieved successfully'
      );
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        return sendError(res, err.message, 404);
      }
      return sendError(res, err.message, 500);
    }
  };
}

export const unitsController = new UnitsController();
