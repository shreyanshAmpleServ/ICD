import { unitTypes, identityRules, plateFormats } from "../../data/admin";
import { allStays } from "../../data/core";
import { holdsOf } from "../../data/control";
import { search } from "../../data/search";
import { getPrisma, isDbLive } from "../../configs/prisma";
import {
  PaginationParams,
  PaginatedResponse,
  paginateArray,
  NotFoundError,
} from "../../utils";
import {
  containerNumberSchema,
  vinNumberSchema,
} from "../validations/common.validation";

export class UnitsService {
  public async getUnitTypes(
    params: PaginationParams,
  ): Promise<PaginatedResponse<any>> {
    return paginateArray(unitTypes, params, (u) => u.unitTypeId);
  }

  public async createUnitType(body: any): Promise<any> {
    const newType = {
      unitTypeId: unitTypes.length + 1,
      typeCode:
        body.typeCode || body.unitTypeCode || `UT-${unitTypes.length + 1}`,
      typeName: body.typeName || "Standard Container",
      category: body.category || "CONTAINER",
      identityRules: ["ISO_6346"],
      isActive: true,
      logInst: 1,
      ...body,
    };
    unitTypes.push(newType as any);
    return newType;
  }

  public async getUnitTypeById(idOrCode: string): Promise<any> {
    const item = unitTypes.find(
      (u) =>
        String(u.unitTypeId) === idOrCode || (u as any).typeCode === idOrCode,
    );
    if (!item) {
      throw new NotFoundError("Unit type", idOrCode);
    }
    return item;
  }

  public async updateUnitType(idOrCode: string, body: any): Promise<any> {
    const item = await this.getUnitTypeById(idOrCode);
    Object.assign(item, body);
    return item;
  }

  public async getIdentityRules(
    params: PaginationParams,
  ): Promise<PaginatedResponse<any>> {
    return paginateArray(identityRules, params);
  }

  public validateIdentity(
    category: string,
    rawValue: string,
  ): {
    category: string;
    rawValue: string;
    normalizedValue: string;
    isValid: boolean;
    ruleApplied: string;
    errors: string[];
  } {
    const val = String(rawValue || "")
      .trim()
      .toUpperCase();

    if (category === "CONTAINER") {
      const parseResult = containerNumberSchema.safeParse(val);
      return {
        category: "CONTAINER",
        rawValue,
        normalizedValue: val.replace(/\s+/g, ""),
        isValid: parseResult.success,
        ruleApplied: "ISO 6346",
        errors: parseResult.success
          ? []
          : [
              "Unit number must consist of 4 letters and 7 digits (e.g. MSKU 123456 7)",
            ],
      };
    }

    if (category === "VEHICLE_VIN") {
      const parseResult = vinNumberSchema.safeParse(val);
      return {
        category: "VEHICLE_VIN",
        rawValue,
        normalizedValue: val,
        isValid: parseResult.success,
        ruleApplied: "ISO 3779 VIN",
        errors: parseResult.success
          ? []
          : [
              "VIN must be exactly 17 alphanumeric characters, excluding I, O, Q",
            ],
      };
    }

    return {
      category: category || "CUSTOM",
      rawValue,
      normalizedValue: val,
      isValid: true,
      ruleApplied: "NONE",
      errors: [],
    };
  }

  public async getPlateFormats(
    params: PaginationParams,
  ): Promise<PaginatedResponse<any>> {
    return paginateArray(plateFormats, params);
  }

  public searchGlobal(q: string) {
    const trimmed = String(q || "").trim();
    const results = search(trimmed);
    return {
      query: trimmed,
      results,
      total: results.reduce((acc, g) => acc + (g.hits?.length || 0), 0),
    };
  }

  public async getUnits(
    filters: {
      category?: any;
      status?: any;
      customsStatus?: any;
      location?: any;
      search?: any;
    },
    params: PaginationParams,
  ): Promise<PaginatedResponse<any>> {
    let items = allStays;

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbStays = await prisma.unit_stays.findMany({
            include: {
              unit_types: true,
              yard_locations: true,
              consignments: true,
              cargo_regimes: true,
              holds: true,
            },
            orderBy: { unit_stay_id: "desc" },
          });

          if (dbStays && dbStays.length > 0) {
            const mapped = dbStays.map((u) => {
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
                  category: u.unit_types?.category || "CONTAINER",
                  unitNo: u.unit_no,
                  unitTypeCode: u.unit_types?.type_code || "40HC",
                  isoType: u.unit_types?.type_code || "40HC",
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
                currentLocation: u.yard_locations
                  ? {
                      locationId: u.yard_locations.yard_location_id,
                      fullCode: u.yard_locations.full_code,
                      zone: u.yard_locations.full_code.split("-")[0] || "A",
                    }
                  : undefined,
                unitSummary: {
                  unitNo: u.unit_no,
                  category: u.unit_types?.category || "CONTAINER",
                  activeHoldCount: activeHolds,
                  releaseStatus: u.release_status,
                  physicalStatus: u.physical_status,
                  dwellDays: dwell,
                  consignmentRef: u.consignments?.ref_no,
                },
                arrivedAt: u.arrived_at?.toISOString(),
              };
            });

            const dbIds = new Set(mapped.map((m) => m.cargoUnit.unitNo));
            items = [
              ...mapped,
              ...allStays.filter((s) => !dbIds.has(s.cargoUnit.unitNo)),
            ] as any;
          }
        } catch (err: any) {
          console.warn(
            "[UnitsService] DB query fallback to memory:",
            err.message,
          );
        }
      }
    }

    if (filters.category) {
      items = items.filter((s) => s.cargoUnit?.category === filters.category);
    }
    if (filters.status) {
      items = items.filter((s) => s.physicalStatus === filters.status);
    }
    if (filters.customsStatus) {
      items = items.filter((s) => s.customsStatus === filters.customsStatus);
    }
    if (filters.location) {
      items = items.filter((s) =>
        s.currentLocation?.fullCode?.startsWith(String(filters.location)),
      );
    }
    if (filters.search) {
      const q = String(filters.search).toLowerCase();
      items = items.filter(
        (s) =>
          s.cargoUnit?.unitNo.toLowerCase().includes(q) ||
          s.sealNo?.toLowerCase().includes(q) ||
          s.currentLocation?.fullCode?.toLowerCase().includes(q),
      );
    }

    return paginateArray(items, params, (s) => s.unitStayId);
  }

  /**
   * Retrieves single Unit Stay by ID or UnitNo
   */
  public async getUnitStayById(idOrUnitNo: string): Promise<any> {
    const stay = allStays.find(
      (x) =>
        String(x.unitStayId) === idOrUnitNo ||
        x.cargoUnit?.unitNo.toUpperCase() === idOrUnitNo.toUpperCase(),
    );
    if (!stay) {
      throw new NotFoundError("Unit stay", idOrUnitNo);
    }
    return stay;
  }

  public async createUnitStay(body: any): Promise<any> {
    const newStay = {
      unitStayId: allStays.length + 5001,
      siteId: 1,
      consignmentId: body.consignmentId || 101,
      cargoUnit: {
        cargoUnitId: allStays.length + 5001,
        category: body.category || "CONTAINER",
        unitNo: body.unitNo || `NEWU${Date.now().toString().slice(-7)}`,
        isoType: body.isoType || "40HC",
        tareWeightKg: body.tareWeightKg || 3800,
      },
      physicalStatus: "EXPECTED",
      flow: body.flow || "IMPORT",
      sealNo: body.sealNo || "SEAL-001",
      customsStatus: "PENDING",
      releaseStatus: "PENDING_CHARGES",
      gatedInAt: new Date().toISOString(),
      logInst: 1,
      ...body,
    };
    allStays.push(newStay as any);
    return newStay;
  }

  /**
   * Updates an existing Unit Stay
   */
  public async updateUnitStay(idOrUnitNo: string, body: any): Promise<any> {
    const stay = await this.getUnitStayById(idOrUnitNo);
    Object.assign(stay, body, { logInst: ((stay as any).logInst || 1) + 1 });
    return stay;
  }

  /**
   * Gets timeline events for a Unit Stay
   */
  public async getUnitTimeline(idOrUnitNo: string): Promise<any> {
    const stay = await this.getUnitStayById(idOrUnitNo);
    const timeline = [
      {
        eventType: "MANIFEST_IMPORTED",
        occurredAt: "2026-10-01T08:00:00Z",
        summary: "Manifest received from shipping line",
        user: "SYSTEM",
      },
      {
        eventType: "DISCHARGE_CONFIRMED",
        occurredAt: "2026-10-03T14:30:00Z",
        summary: "Container discharged at Port of Dar es Salaam",
        user: "PORT_EDI",
      },
      {
        eventType: "GATE_IN",
        occurredAt: stay.gatedInAt || "2026-10-04T09:15:00Z",
        summary: "Gate in pass issued to truck T 124 DFH",
        user: "Rose A.",
      },
      {
        eventType: "YARD_PLACEMENT",
        occurredAt: "2026-10-04T09:45:00Z",
        summary: `Placed into yard slot ${stay.currentLocation?.fullCode || "A-02-04-2"}`,
        user: "Ibrahim N.",
      },
      {
        eventType: "CUSTOMS_STATUS",
        occurredAt: "2026-10-05T11:00:00Z",
        summary: `Customs status updated to ${stay.customsStatus}`,
        user: "Rehema K.",
      },
    ];
    return {
      unitStayId: stay.unitStayId,
      unitNo: stay.cargoUnit?.unitNo,
      events: timeline,
    };
  }

  /**
   * Gets active holds on a Unit Stay
   */
  public async getUnitHolds(
    idOrUnitNo: string,
    params: PaginationParams,
  ): Promise<PaginatedResponse<any>> {
    const stay = await this.getUnitStayById(idOrUnitNo);
    const holds = holdsOf(stay.unitStayId || 0);
    return paginateArray(holds, params);
  }

  /**
   * Gets yard moves history
   */
  public async getUnitHistory(idOrUnitNo: string): Promise<any> {
    const stay = await this.getUnitStayById(idOrUnitNo);
    return {
      unitStayId: stay.unitStayId,
      unitNo: stay.cargoUnit?.unitNo,
      moves: [
        {
          fromLocation: "GATE_IN_LANE_1",
          toLocation: stay.currentLocation?.fullCode || "A-02-04-2",
          movedAt: stay.gatedInAt,
          movedBy: "Ibrahim N.",
        },
      ],
    };
  }
}

export const unitsService = new UnitsService();
