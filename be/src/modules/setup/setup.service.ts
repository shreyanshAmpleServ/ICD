import { PrismaClient } from '@prisma/client';
import { getPrisma, isDbLive } from '../../configs/prisma';
import {
  company as seedCompany,
  countryPacks as seedPacks,
  sites as seedSites,
  calendars as seedCalendars,
  holidays as seedHolidays,
  fieldRules as seedFieldRules,
  yardNodes as seedYardNodes,
  gates as seedGates,
  checkpoints as seedCheckpoints,
  visitTypes as seedVisitTypes,
  unitTypes as seedUnitTypes,
  cargoRegimes as seedRegimes,
  trucks as seedTrucks,
  drivers as seedDrivers,
  vessels as seedVessels,
  ports as seedPorts,
  commodities as seedCommodities,
  equipment as seedEquipment,
  users as seedUsers,
  permissions as seedPerms,
  releaseRules as seedReleaseRules,
  approvalPolicies as seedApprovalPolicies,
  exceptionTypes as seedExceptionTypes,
  inspectionTemplates as seedInspectionTemplates,
  damageCodes as seedDamageCodes,
  periods as seedPeriods,
  glSettings as seedGlSettings,
  taxCodes as seedTaxCodes,
  chargeCodes as seedChargeCodes,
  paymentChannels as seedPaymentChannels,
  notificationTemplates as seedNotificationTemplates,
  notificationRules as seedNotificationRules,
  printTemplates as seedPrintTemplates,
  numberSequences as seedNumberSequences,
  documentTypes as seedDocumentTypes,
  devices as seedDevices,
  integrations as seedIntegrations,
  syncStates as seedSyncStates,
  outbox as seedOutbox,
  models as seedModels,
} from '../../data/admin';
import { ROLES } from '../../configs/permissions';

class SetupService {
  private get db(): PrismaClient | null {
    return isDbLive() ? getPrisma() : null;
  }

  // =========================================================================
  // 1. Company & Sites
  // =========================================================================
  public async getCompany(id = 1): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        let comp = await db.companies.findFirst({ where: { company_id: id } });
        if (!comp) {
          comp = await db.companies.findFirst();
        }
        if (!comp) {
          comp = await db.companies.create({
            data: {
              company_code: seedCompany.companyCode,
              legal_name: seedCompany.legalName,
              trading_name: seedCompany.tradingName || 'DCC Terminal Services',
              country_code: seedCompany.countryCode || 'TZ',
              country_pack_code: seedCompany.countryPackCode || 'TZ_DEFAULT',
              base_currency: seedCompany.baseCurrency || 'USD',
              tax_id: seedCompany.taxId,
              vat_no: seedCompany.vatNo,
              is_active: true,
            },
          });
        }
        return {
          companyId: comp.company_id,
          companyCode: comp.company_code,
          legalName: comp.legal_name,
          tradingName: comp.trading_name,
          countryCode: comp.country_code,
          countryPackCode: comp.country_pack_code,
          baseCurrency: comp.base_currency,
          taxId: comp.tax_id,
          vatNo: comp.vat_no,
          addressLine1: 'Plot 112, Nelson Mandela Road',
          addressLine2: 'Kurasini Port Area',
          city: 'Dar es Salaam',
          phone: '+255 22 211 4455',
          email: 'info@dcc.example',
          isActive: comp.is_active ?? true,
        };
      } catch (err) {
        console.warn('[SetupService.getCompany] DB error:', err);
      }
    }
    return seedCompany;
  }

  public async updateCompany(id: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const updated = await db.companies.update({
          where: { company_id: id },
          data: {
            legal_name: data.legalName,
            trading_name: data.tradingName,
            tax_id: data.taxId,
            vat_no: data.vatNo,
            base_currency: data.baseCurrency,
            updated_at: new Date(),
          },
        });
        return {
          companyId: updated.company_id,
          companyCode: updated.company_code,
          legalName: updated.legal_name,
          tradingName: updated.trading_name,
          baseCurrency: updated.base_currency,
          taxId: updated.tax_id,
          vatNo: updated.vat_no,
          isActive: updated.is_active ?? true,
          ...data,
        };
      } catch (err) {
        console.warn('[SetupService.updateCompany] DB error:', err);
      }
    }
    Object.assign(seedCompany, data);
    return seedCompany;
  }

  public async getSites(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.sites.count();
        if (count === 0) {
          const comp = await this.getCompany();
          for (const s of seedSites) {
            await db.sites.create({
              data: {
                site_code: s.siteCode,
                site_name: s.siteName,
                company_id: comp.companyId,
                country_code: s.countryCode || 'TZ',
                time_zone: s.timeZone || 'Africa/Dar_es_Salaam',
                city: s.city || 'Dar es Salaam',
                address_line1: s.addressLine1,
                is_active: s.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.sites.findMany({ orderBy: { site_id: 'asc' } });
        return rows.map((r, i) => {
          const seedMatch = seedSites.find((s) => s.siteCode === r.site_code) || seedSites[i] || seedSites[0];
          return {
            siteId: r.site_id,
            siteCode: r.site_code,
            siteName: r.site_name,
            companyId: r.company_id,
            countryCode: r.country_code || 'TZ',
            time_zone: r.time_zone || 'Africa/Dar_es_Salaam',
            timeZone: r.time_zone || 'Africa/Dar_es_Salaam',
            calendarId: r.calendar_id || 1,
            calendarCode: 'TZ_PUBLIC',
            addressLine1: r.address_line1 || seedMatch.addressLine1,
            city: r.city || seedMatch.city,
            latitude: seedMatch.latitude,
            longitude: seedMatch.longitude,
            customsStationCode: seedMatch.customsStationCode,
            regulatorLicenceNo: seedMatch.regulatorLicenceNo,
            offlineGateLimitMin: seedMatch.offlineGateLimitMin || 60,
            signatureMode: seedMatch.signatureMode || 'EITHER',
            facilities: seedMatch.facilities || ['ICD', 'CFS'],
            isActive: r.is_active ?? true,
            gates: seedMatch.gates || 2,
            slots: seedMatch.slots || 400,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getSites] DB error:', err);
      }
    }
    return seedSites;
  }

  public async createSite(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const comp = await this.getCompany();
        const created = await db.sites.create({
          data: {
            site_code: data.siteCode,
            site_name: data.siteName,
            company_id: comp.companyId,
            country_code: data.countryCode || 'TZ',
            time_zone: data.timeZone || 'Africa/Dar_es_Salaam',
            city: data.city || 'Dar es Salaam',
            address_line1: data.addressLine1 || '',
            is_active: data.isActive ?? true,
          },
        });
        const fullSite = {
          siteId: created.site_id,
          siteCode: created.site_code,
          siteName: created.site_name,
          companyId: created.company_id,
          countryCode: created.country_code,
          timeZone: created.time_zone,
          facilities: data.facilities || ['ICD'],
          gates: data.gates || 1,
          slots: data.slots || 100,
          offlineGateLimitMin: data.offlineGateLimitMin || 60,
          signatureMode: data.signatureMode || 'EITHER',
          isActive: created.is_active ?? true,
          ...data,
        };
        seedSites.push(fullSite as any);
        return fullSite;
      } catch (err) {
        console.warn('[SetupService.createSite] DB error:', err);
      }
    }
    const newSite = { siteId: seedSites.length + 1, ...data };
    seedSites.push(newSite as any);
    return newSite;
  }

  public async updateSite(id: number | string, data: any): Promise<any> {
    const db = this.db;
    const numId = Number(id);
    if (db && !isNaN(numId)) {
      try {
        const updated = await db.sites.update({
          where: { site_id: numId },
          data: {
            site_name: data.siteName,
            time_zone: data.timeZone,
            city: data.city,
            address_line1: data.addressLine1,
            is_active: data.isActive,
            updated_at: new Date(),
          },
        });
        const match = seedSites.find((s) => s.siteId === numId);
        if (match) Object.assign(match, data);
        return { ...match, ...data, siteId: updated.site_id };
      } catch (err) {
        console.warn('[SetupService.updateSite] DB error:', err);
      }
    }
    const match = seedSites.find((s) => String(s.siteId) === String(id) || s.siteCode === id);
    if (match) Object.assign(match, data);
    return match || data;
  }

  public async getCountryPacks(): Promise<any[]> {
    return seedPacks;
  }

  public async activateCountryPack(packCode: string): Promise<any> {
    const pack = seedPacks.find((p) => p.packCode === packCode);
    if (pack) pack.isActive = true;
    return pack;
  }

  // =========================================================================
  // 2. Yard Designer
  // =========================================================================
  public async getYardLocations(siteId?: number): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.yard_blocks.count();
        if (count === 0) {
          const site = (await db.sites.findFirst()) || { site_id: 1 };
          await db.yard_blocks.createMany({
            data: [
              { site_id: site.site_id, block_code: 'A', block_name: 'Block A (Imports)', max_bays: 12, max_rows: 6, max_tiers: 4 },
              { site_id: site.site_id, block_code: 'B', block_name: 'Block B (Exports)', max_bays: 10, max_rows: 6, max_tiers: 4 },
              { site_id: site.site_id, block_code: 'R', block_name: 'Reefer Gantry R', max_bays: 6, max_rows: 4, max_tiers: 3 },
              { site_id: site.site_id, block_code: 'X', block_name: 'Dangerous Goods X', max_bays: 4, max_rows: 4, max_tiers: 2 },
            ],
          });
        }
        return seedYardNodes;
      } catch (err) {
        console.warn('[SetupService.getYardLocations] DB error:', err);
      }
    }
    return seedYardNodes;
  }

  public async createYardLocation(data: any): Promise<any> {
    const db = this.db;
    if (db && data.siteId) {
      try {
        await db.yard_blocks.create({
          data: {
            site_id: Number(data.siteId),
            block_code: data.name || data.code || 'N',
            block_name: data.description || `Block ${data.name || 'New'}`,
            max_bays: data.bays || 10,
            max_rows: data.rows || 6,
            max_tiers: data.tiers || 4,
          },
        });
      } catch (err) {
        console.warn('[SetupService.createYardLocation] DB error:', err);
      }
    }
    const node = { id: seedYardNodes.length + 1, ...data };
    seedYardNodes.push(node as any);
    return node;
  }

  // =========================================================================
  // 3. Gates & Visit Types
  // =========================================================================
  public async getGates(siteId?: number): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.gates.count();
        if (count === 0) {
          const site = (await db.sites.findFirst()) || { site_id: 1 };
          await db.gates.create({
            data: {
              site_id: site.site_id,
              gate_code: 'G-MAIN',
              gate_name: 'Main Terminal Gate',
              gate_kind: 'OUTER',
              is_active: true,
            },
          });
        }
        const rows = await db.gates.findMany({
          include: { gate_lanes: true },
          orderBy: { gate_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((g, i) => {
            const seed = seedGates[i] || seedGates[0];
            return {
              gateId: g.gate_id,
              siteId: g.site_id,
              gateCode: g.gate_code,
              gateName: g.gate_name,
              gateKind: g.gate_kind,
              isActive: g.is_active ?? true,
              lanes: g.gate_lanes.length > 0 ? g.gate_lanes.map((l) => ({
                laneId: l.gate_lane_id,
                laneCode: l.lane_code,
                direction: l.direction,
                isActive: l.is_active ?? true,
              })) : seed.lanes,
            };
          });
        }
      } catch (err) {
        console.warn('[SetupService.getGates] DB error:', err);
      }
    }
    return seedGates;
  }

  public async getVisitTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.visit_types.count();
        if (count === 0) {
          for (const vt of seedVisitTypes) {
            const vCode = (vt as any).visitCode || (vt as any).visitTypeCode || 'DROP_OFF';
            const vName = (vt as any).visitName || (vt as any).visitTypeName || 'Container Drop-off';
            await db.visit_types.upsert({
              where: { visit_code: vCode },
              update: {},
              create: {
                visit_code: vCode,
                visit_name: vName,
                requires_appointment: vt.requiresAppointment ?? false,
                is_active: vt.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.visit_types.findMany({ orderBy: { visit_type_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedVisitTypes.find((v) => ((v as any).visitCode || (v as any).visitTypeCode) === r.visit_code) || seedVisitTypes[i] || seedVisitTypes[0]) as any;
          return {
            visitTypeId: r.visit_type_id,

            visitCode: r.visit_code,
            visitTypeCode: r.visit_code,
            visitName: r.visit_name,
            visitTypeName: r.visit_name,
            requiresAppointment: r.requires_appointment ?? false,
            isActive: r.is_active ?? true,
            allowedGates: seed?.allowedGates || ['G-MAIN'],
            stages: seed?.stages || ['OUTER_IN', 'WEIGH_IN', 'SLOT', 'WEIGH_OUT', 'OUTER_OUT'],
            checkpoints: seed?.checkpoints || [],
            requiresNomination: seed?.requiresNomination ?? true,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getVisitTypes] DB error:', err);
      }
    }
    return seedVisitTypes;
  }

  public async updateVisitType(id: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.visit_types.update({
          where: { visit_type_id: Number(id) },
          data: {
            visit_name: data.visitName || data.visitTypeName,
            requires_appointment: data.requiresAppointment,
            is_active: data.isActive,
          },
        });
      } catch (err) {
        console.warn('[SetupService.updateVisitType] DB error:', err);
      }
    }
    const match = seedVisitTypes.find((v) => v.visitTypeId === Number(id));
    if (match) Object.assign(match, data);
    return match || data;
  }

  public async getCheckpoints(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.checkpoints.count();
        if (count === 0) {
          const gate = (await db.gates.findFirst()) || { gate_id: 1 };
          for (const cp of seedCheckpoints) {
            await db.checkpoints.upsert({
              where: { checkpoint_code: cp.checkpointCode },
              update: {},
              create: {
                gate_id: gate.gate_id,
                checkpoint_code: cp.checkpointCode,
                checkpoint_name: cp.checkpointName,
                checkpoint_kind: cp.checkpointKind || 'OUTER_IN',
                is_active: cp.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.checkpoints.findMany({ orderBy: { checkpoint_id: 'asc' } });
        return rows.map((r) => ({
          checkpointId: r.checkpoint_id,
          gateId: r.gate_id,
          checkpointCode: r.checkpoint_code,
          checkpointName: r.checkpoint_name,
          checkpointKind: r.checkpoint_kind,
          isActive: r.is_active ?? true,
        }));
      } catch (err) {
        console.warn('[SetupService.getCheckpoints] DB error:', err);
      }
    }
    return seedCheckpoints;
  }

  // =========================================================================
  // 4. Unit Types & Checks
  // =========================================================================
  public async getUnitTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.unit_types.count();
        if (count === 0) {
          for (const ut of seedUnitTypes) {
            await db.unit_types.upsert({
              where: { type_code: ut.typeCode },
              update: {},
              create: {
                type_code: ut.typeCode,
                type_name: ut.typeName,
                category: ut.category || 'CONTAINER',
                length_ft: ut.lengthFt || 20,
                teu: ut.teu || 1.0,
                is_reefer: ut.isReefer ?? false,
                is_active: ut.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.unit_types.findMany({ orderBy: { unit_type_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedUnitTypes.find((u) => u.typeCode === r.type_code) || seedUnitTypes[i] || seedUnitTypes[0]) as any;
          return {
            unitTypeId: r.unit_type_id,
            typeCode: r.type_code,
            typeName: r.type_name,
            category: r.category,
            lengthFt: r.length_ft,
            teu: Number(r.teu || 1.0),
            isReefer: r.is_reefer ?? false,
            isActive: r.is_active ?? true,
            identityRules: seed.identityRules || ['ISO_6346'],
            checks: seed.checks || [],
          };
        });
      } catch (err) {
        console.warn('[SetupService.getUnitTypes] DB error:', err);
      }
    }
    return seedUnitTypes;
  }

  public async createUnitType(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.unit_types.create({
          data: {
            type_code: data.typeCode,
            type_name: data.typeName,
            category: data.category || 'CONTAINER',
            length_ft: data.lengthFt ? Number(data.lengthFt) : 20,
            teu: data.teu ? Number(data.teu) : 1.0,
            is_reefer: !!data.isReefer,
            is_active: data.isActive ?? true,
          },
        });
        const full = { unitTypeId: created.unit_type_id, ...data };
        seedUnitTypes.push(full as any);
        return full;
      } catch (err) {
        console.warn('[SetupService.createUnitType] DB error:', err);
      }
    }
    const item = { unitTypeId: seedUnitTypes.length + 1, ...data };
    seedUnitTypes.push(item as any);
    return item;
  }

  public async updateUnitType(code: string, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.unit_types.update({
          where: { type_code: code },
          data: {
            type_name: data.typeName,
            category: data.category,
            is_active: data.isActive,
          },
        });
      } catch (err) {
        console.warn('[SetupService.updateUnitType] DB error:', err);
      }
    }
    const match = seedUnitTypes.find((u) => u.typeCode === code);
    if (match) Object.assign(match, data);
    return match || data;
  }

  public async getCargoRegimes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.cargo_regimes.count();
        if (count === 0) {
          for (const cr of seedRegimes) {
            await db.cargo_regimes.upsert({
              where: { regime_code: cr.regimeCode },
              update: {},
              create: {
                regime_code: cr.regimeCode,
                regime_name: cr.regimeName,
                requires_customs: true,
              },
            });
          }
        }
        const rows = await db.cargo_regimes.findMany();
        return rows.map((r, i) => {
          const seed = (seedRegimes.find((s) => s.regimeCode === r.regime_code) || seedRegimes[i] || seedRegimes[0]) as any;
          return {
            cargoRegimeId: r.cargo_regime_id,
            regimeCode: r.regime_code,
            regimeName: r.regime_name,
            refs: seed.refs || [],
          };
        });
      } catch (err) {
        console.warn('[SetupService.getCargoRegimes] DB error:', err);
      }
    }
    return seedRegimes;
  }

  // =========================================================================
  // 5. Trucks, Drivers, Vessels, Ports, Commodities, Equipment
  // =========================================================================
  public async getTrucks(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.trucks.findMany({ include: { parties: true }, orderBy: { truck_id: 'desc' } });
        if (rows.length > 0) {
          return rows.map((t) => ({
            truckId: t.truck_id,
            plateNo: t.plate_no,
            countryCode: t.country_code || 'TZ',
            carrierPartyId: t.transporter_party_id || 1,
            carrierName: t.parties?.party_name || 'Upepo Transporters',
            isBlacklisted: !(t.is_active ?? true),
            isActive: t.is_active ?? true,
          }));
        }
      } catch (err) {
        console.warn('[SetupService.getTrucks] DB error:', err);
      }
    }
    return seedTrucks;
  }

  public async createTruck(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const party = (await db.parties.findFirst()) || { party_id: 1 };
        const created = await db.trucks.create({
          data: {
            plate_no: data.plateNo,
            transporter_party_id: data.carrierPartyId ? Number(data.carrierPartyId) : party.party_id,
            is_active: !data.isBlacklisted,
          },
        });
        const full = { truckId: created.truck_id, ...data };
        seedTrucks.push(full as any);
        return full;
      } catch (err) {
        console.warn('[SetupService.createTruck] DB error:', err);
      }
    }
    const item = { truckId: seedTrucks.length + 1, ...data };
    seedTrucks.push(item as any);
    return item;
  }

  public async getDrivers(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.drivers.findMany({ orderBy: { driver_id: 'desc' } });
        if (rows.length > 0) {
          return rows.map((d) => ({
            driverId: d.driver_id,
            licenceNo: d.licence_no,
            fullName: d.driver_name,
            phone: d.phone || '+255 71 000 0000',
            isBlacklisted: !(d.is_active ?? true),
            isActive: d.is_active ?? true,
          }));
        }
      } catch (err) {
        console.warn('[SetupService.getDrivers] DB error:', err);
      }
    }
    return seedDrivers;
  }

  public async createDriver(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const party = (await db.parties.findFirst()) || { party_id: 1 };
        const created = await db.drivers.create({
          data: {
            driver_name: data.fullName,
            licence_no: data.licenceNo,
            phone: data.phone || '',
            transporter_party_id: party.party_id,
            is_active: !data.isBlacklisted,
          },
        });
        const full = { driverId: created.driver_id, ...data };
        seedDrivers.push(full as any);
        return full;
      } catch (err) {
        console.warn('[SetupService.createDriver] DB error:', err);
      }
    }
    const item = { driverId: seedDrivers.length + 1, ...data };
    seedDrivers.push(item as any);
    return item;
  }

  public async getVessels(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.vessels.findMany({ orderBy: { vessel_id: 'asc' } });
        if (rows.length > 0) {
          return rows.map((v, i) => {
            const seed = (seedVessels[i] || seedVessels[0]) as any;
            return {
              vesselId: v.vessel_id,
              vesselName: v.vessel_name,
              lloydsImo: v.imo_no,
              callSign: v.call_sign || seed.callSign || '3FMS7',
              countryCode: (v as any).country_code || 'PA',
              isActive: v.is_active ?? true,
            };
          });
        }
      } catch (err) {
        console.warn('[SetupService.getVessels] DB error:', err);
      }
    }
    return seedVessels;
  }

  public async getPorts(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.ports.count();
        if (count === 0) {
          for (const p of seedPorts) {
            const pCode = (p as any).portCode || (p as any).unlocode || 'TZDAR';
            await db.ports.upsert({
              where: { port_code: pCode },
              update: {},
              create: {
                port_code: pCode,
                port_name: p.portName,
                country_code: p.countryCode || 'TZ',
              },
            });
          }
        }
        const rows = await db.ports.findMany({ orderBy: { port_id: 'asc' } });
        return rows.map((r) => ({
          portId: r.port_id,
          portCode: r.port_code,
          portName: r.port_name,
          countryCode: r.country_code,
        }));
      } catch (err) {
        console.warn('[SetupService.getPorts] DB error:', err);
      }
    }
    return seedPorts;
  }

  public async getCommodities(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.commodities.count();
        if (count === 0) {
          for (const c of seedCommodities) {
            await db.commodities.upsert({
              where: { commodity_code: c.commodityCode },
              update: {},
              create: {
                commodity_code: c.commodityCode,
                commodity_name: c.commodityName,
                hs_code: c.hsCode || '',
                is_hazardous: c.isHazardous ?? false,
              },
            });
          }
        }
        const rows = await db.commodities.findMany({ orderBy: { commodity_id: 'asc' } });
        return rows.map((r) => ({
          commodityId: r.commodity_id,
          commodityCode: r.commodity_code,
          commodityName: r.commodity_name,
          hsCode: r.hs_code,
          isHazardous: r.is_hazardous ?? false,
        }));
      } catch (err) {
        console.warn('[SetupService.getCommodities] DB error:', err);
      }
    }
    return seedCommodities;
  }

  public async getEquipment(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.equipment.findMany({ orderBy: { equipment_id: 'asc' } });
        if (rows.length > 0) {
          return rows.map((e, i) => {
            const seed = (seedEquipment[i] || seedEquipment[0]) as any;
            return {
              equipmentId: e.equipment_id,
              siteId: e.site_id,
              equipmentCode: e.equipment_code,
              equipmentType: e.equipment_type,
              status: (e as any).status || 'AVAILABLE',
              hoursUsed: seed.hoursUsed || 240,
              nextServiceDue: seed.nextServiceDue || '2026-11-15',
              isActive: e.is_active ?? true,
            };
          });
        }
      } catch (err) {
        console.warn('[SetupService.getEquipment] DB error:', err);
      }
    }
    return seedEquipment;
  }

  // =========================================================================
  // 6. Users & Roles
  // =========================================================================
  public async getUsers(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.users.findMany({
          include: { user_roles: { include: { roles: true } } },
          orderBy: { user_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((u, i) => {
            const seed = seedUsers.find((s) => s.userId === u.user_id) || seedUsers[i] || seedUsers[0];
            const roleCodes = u.user_roles.map((ur) => ur.roles?.role_code).filter(Boolean);
            return {
              userId: u.user_id,
              userSub: u.user_sub || `usr_${u.user_id}`,
              fullName: u.user_name,
              userName: u.user_name,
              email: u.email || `${u.user_name.toLowerCase().replace(/\s+/g, '.')}@icd.example`,
              phone: u.phone || '+255 754 000 000',
              title: seed.title || 'Terminal Officer',
              siteCodes: seed.siteCodes || ['DAR1'],
              isActive: u.is_active ?? true,
              roleGrants: roleCodes.map((rc) => ({ roleCode: rc, roleName: rc })),
            };
          });
        }
      } catch (err) {
        console.warn('[SetupService.getUsers] DB error:', err);
      }
    }
    return seedUsers;
  }

  public async createUser(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.users.create({
          data: {
            user_name: data.fullName || data.userName,
            email: data.email,
            phone: data.phone,
            default_site_id: 1,
            is_active: data.isActive ?? true,
          },
        });
        const full = { userId: created.user_id, ...data };
        seedUsers.push(full as any);
        return full;
      } catch (err) {
        console.warn('[SetupService.createUser] DB error:', err);
      }
    }
    const item = { userId: seedUsers.length + 1, ...data };
    seedUsers.push(item as any);
    return item;
  }

  public async updateUser(id: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.users.update({
          where: { user_id: Number(id) },
          data: {
            user_name: data.fullName || data.userName,
            email: data.email,
            phone: data.phone,
            is_active: data.isActive,
          },
        });
      } catch (err) {
        console.warn('[SetupService.updateUser] DB error:', err);
      }
    }
    const match = seedUsers.find((u) => u.userId === Number(id));
    if (match) Object.assign(match, data);
    return match || data;
  }

  public async getRoles(): Promise<any[]> {
    return Object.values(ROLES).map((r, i) => ({
      roleId: i + 1,
      roleCode: r.code,
      roleName: r.name,
      code: r.code,
      name: r.name,
      external: !!r.external,
      grants: r.grants,
      logInst: 1,
    }));
  }

  public async getPermissions(): Promise<any[]> {
    return seedPerms;
  }

  // =========================================================================
  // 7. Holds, Release & Approvals
  // =========================================================================
  public async getReleaseRules(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.release_rules.count();
        if (count === 0) {
          const site = (await db.sites.findFirst()) || { site_id: 1 };
          for (const rr of seedReleaseRules) {
            const rCode = (rr as any).ruleCode || `RR-${(rr as any).releaseRuleId}`;
            await db.release_rules.upsert({
              where: { rule_code: rCode },
              update: {},
              create: {
                site_id: site.site_id,
                rule_code: rCode,
                description: `${(rr as any).regimeCode || 'ALL'} - ${(rr as any).conditionCode || 'RULE'}`,
                is_active: rr.isActive ?? true,
              },
            });
          }
        }
        return seedReleaseRules;
      } catch (err) {
        console.warn('[SetupService.getReleaseRules] DB error:', err);
      }
    }
    return seedReleaseRules;
  }

  public async getApprovalPolicies(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.approval_policies.count();
        if (count === 0) {
          const site = (await db.sites.findFirst()) || { site_id: 1 };
          for (const ap of seedApprovalPolicies) {
            await db.approval_policies.create({
              data: {
                site_id: site.site_id,
                permission_code: ap.permissionCode,
                min_amount: (ap as any).amountFrom ? Number((ap as any).amountFrom) : 0,
                max_amount: 999999,
                approval_level: (ap as any).levelsRequired || 1,
                is_active: ap.isActive ?? true,
              },
            });
          }
        }
        return seedApprovalPolicies;
      } catch (err) {
        console.warn('[SetupService.getApprovalPolicies] DB error:', err);
      }
    }
    return seedApprovalPolicies;
  }

  public async getExceptionTypes(): Promise<any[]> {
    return seedExceptionTypes;
  }

  // =========================================================================
  // 8. Inspection Checklists & Damage Codes
  // =========================================================================
  public async getInspectionTemplates(): Promise<any[]> {
    return seedInspectionTemplates;
  }

  public async getDamageCodes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.repair_codes.count();
        if (count === 0) {
          for (const dc of seedDamageCodes) {
            await db.repair_codes.upsert({
              where: { repair_code: dc.damageCode },
              update: {},
              create: {
                component_code: dc.appliesTo || 'GEN',
                repair_code: dc.damageCode,
                description: dc.damageName,
                default_hours: 1.0,
                is_active: true,
              },
            });
          }
        }
        const rows = await db.repair_codes.findMany({ orderBy: { repair_code_id: 'asc' } });
        return rows.map((r) => {
          return {
            damageCode: r.repair_code,
            damageName: r.description,
            appliesTo: (r.component_code as any) || 'ANY',
          };
        });
      } catch (err) {
        console.warn('[SetupService.getDamageCodes] DB error:', err);
      }
    }
    return seedDamageCodes;
  }

  // =========================================================================
  // 9. Finance Setup
  // =========================================================================
  public async getAccountingPeriods(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.accounting_periods.count();
        if (count === 0) {
          const comp = await this.getCompany();
          for (const p of seedPeriods) {
            await db.accounting_periods.upsert({
              where: { period_code: p.periodKey },
              update: {},
              create: {
                company_id: comp.companyId,
                period_code: p.periodKey,
                start_date: new Date(p.periodKey + '-01'),
                end_date: new Date(p.periodKey + '-28'),
                status: p.status,
                is_closed: p.status === 'CLOSED',
              },
            });
          }
        }
        const rows = await db.accounting_periods.findMany({ orderBy: { period_code: 'desc' } });
        return rows.map((r, i) => {
          const seed = (seedPeriods[i] || seedPeriods[0]) as any;
          return {
            periodKey: r.period_code,
            label: seed.label || r.period_code,
            status: r.status,
            invoicesCount: seed.invoicesCount || 10,
            revenueTotal: seed.revenueTotal || 15000,
            closedAt: seed.closedAt,
            closedBy: seed.closedBy,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getAccountingPeriods] DB error:', err);
      }
    }
    return seedPeriods;
  }

  public async getChargeCodes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.charge_codes.count();
        if (count === 0) {
          for (const cc of seedChargeCodes) {
            const uom = (cc as any).uom || 'DAY';
            await db.charge_codes.upsert({
              where: { charge_code: cc.chargeCode },
              update: {},
              create: {
                charge_code: cc.chargeCode,
                charge_name: cc.chargeName,
                default_uom: uom,
                is_active: cc.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.charge_codes.findMany({ orderBy: { charge_code_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedChargeCodes.find((s) => s.chargeCode === r.charge_code) || seedChargeCodes[i] || seedChargeCodes[0]) as any;
          return {
            chargeCodeId: r.charge_code_id,
            chargeCode: r.charge_code,
            chargeName: r.charge_name,
            uom: r.default_uom,
            category: seed.category || 'STORAGE',
            taxCode: seed.taxCode || 'VAT_18',
            isActive: r.is_active ?? true,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getChargeCodes] DB error:', err);
      }
    }
    return seedChargeCodes;
  }

  public async getTaxCodes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.tax_codes.count();
        if (count === 0) {
          for (const tc of seedTaxCodes) {
            const rate = (tc as any).ratePercent || (tc as any).ratePct || 18.0;
            await db.tax_codes.upsert({
              where: { tax_code: tc.taxCode },
              update: {},
              create: {
                tax_code: tc.taxCode,
                tax_name: tc.taxName,
                tax_rate: Number(rate),
                is_active: tc.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.tax_codes.findMany({ orderBy: { tax_code_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedTaxCodes.find((s) => s.taxCode === r.tax_code) || seedTaxCodes[i] || seedTaxCodes[0]) as any;
          return {
            taxCodeId: r.tax_code_id,
            taxCode: r.tax_code,
            taxName: r.tax_name,
            ratePercent: Number(r.tax_rate || 18.0),
            isActive: r.is_active ?? true,
            verify: seed.verify,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getTaxCodes] DB error:', err);
      }
    }
    return seedTaxCodes;
  }

  public async getPaymentChannels(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.payment_channels.count();
        if (count === 0) {
          for (const pc of seedPaymentChannels) {
            const reqRef = (pc as any).requiresRef !== undefined ? (pc as any).requiresRef : true;
            await db.payment_channels.upsert({
              where: { channel_code: pc.channelCode },
              update: {},
              create: {
                channel_code: pc.channelCode,
                channel_name: pc.channelName,
                requires_ref: reqRef,
                is_active: pc.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.payment_channels.findMany({ orderBy: { channel_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedPaymentChannels.find((s) => s.channelCode === r.channel_code) || seedPaymentChannels[i] || seedPaymentChannels[0]) as any;
          return {
            channelId: r.channel_id,
            channelCode: r.channel_code,
            channelName: r.channel_name,
            requiresRef: r.requires_ref ?? true,
            isActive: r.is_active ?? true,
            example: seed.example || 'REF-123',
            refHint: seed.refHint || 'Reference required',
          };
        });
      } catch (err) {
        console.warn('[SetupService.getPaymentChannels] DB error:', err);
      }
    }
    return seedPaymentChannels;
  }

  public async getGlSettings(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.gl_settings.count();
        if (count === 0) {
          const comp = await this.getCompany();
          for (const gl of seedGlSettings) {
            const val = (gl as any).settingValue || (gl as any).glAccount || '1000';
            await db.gl_settings.upsert({
              where: { setting_key: gl.settingKey },
              update: {},
              create: {
                company_id: comp.companyId,
                setting_key: gl.settingKey,
                setting_value: val,
                description: gl.description || '',
              },
            });
          }
        }
        const rows = await db.gl_settings.findMany();
        return rows.map((r) => ({
          settingKey: r.setting_key,
          settingValue: r.setting_value,
          description: r.description,
        }));
      } catch (err) {
        console.warn('[SetupService.getGlSettings] DB error:', err);
      }
    }
    return seedGlSettings;
  }

  // =========================================================================
  // 10. Notifications & Printing
  // =========================================================================
  public async getNotificationTemplates(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.notification_templates.count();
        if (count === 0) {
          for (const nt of seedNotificationTemplates) {
            const subj = (nt as any).subjectTemplate || (nt as any).templateName || 'Notification';
            await db.notification_templates.upsert({
              where: { template_code: nt.templateCode },
              update: {},
              create: {
                template_code: nt.templateCode,
                channel: (nt as any).channel || 'EMAIL',
                subject_template: subj,
                body_template: nt.body || (nt as any).bodyTemplate || '',
                is_active: nt.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.notification_templates.findMany({ orderBy: { template_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedNotificationTemplates.find((s) => s.templateCode === r.template_code) || seedNotificationTemplates[i] || seedNotificationTemplates[0]) as any;
          const body = r.body_template || seed?.body || '';
          const subject = r.subject_template || seed?.subject || null;
          return {
            notificationTemplateId: r.template_id,
            templateId: r.template_id,
            templateCode: r.template_code,
            eventType: seed?.eventType || 'UnitGatedIn',
            channel: r.channel || seed?.channel || 'SMS',
            languageCode: seed?.languageCode || 'en',
            subject,
            subjectTemplate: subject,
            body,
            bodyTemplate: body,
            isActive: r.is_active ?? true,
            draft: seed?.draft ?? false,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getNotificationTemplates] DB error:', err);
      }
    }
    return seedNotificationTemplates;
  }

  public async getNotificationRules(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.notification_rules.count();
        if (count === 0) {
          const site = (await db.sites.findFirst()) || { site_id: 1 };
          for (const nr of seedNotificationRules) {
            const role = (nr as any).recipientRole || 'OPS_MANAGER';
            await db.notification_rules.create({
              data: {
                site_id: site.site_id,
                event_type: nr.eventType,
                channel: (nr as any).channel || 'EMAIL',
                recipient_role: role,
                is_active: nr.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.notification_rules.findMany({ orderBy: { rule_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedNotificationRules[i] || seedNotificationRules[0]) as any;
          return {
            ruleId: r.rule_id,
            siteId: r.site_id,
            eventType: r.event_type,
            channel: r.channel,
            recipientRole: r.recipient_role,
            recipientName: seed.recipientName || r.recipient_role,
            isActive: r.is_active ?? true,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getNotificationRules] DB error:', err);
      }
    }
    return seedNotificationRules;
  }

  public async getPrintTemplates(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.print_templates.count();
        if (count === 0) {
          const site = (await db.sites.findFirst()) || { site_id: 1 };
          for (const pt of seedPrintTemplates) {
            const tCode = (pt as any).templateCode || `PT-${(pt as any).docKind}`;
            await db.print_templates.upsert({
              where: { template_code: tCode },
              update: {},
              create: {
                site_id: site.site_id,
                template_code: tCode,
                template_name: pt.templateName,
                raw_content: (pt as any).sampleData ? JSON.stringify((pt as any).sampleData) : '',
                is_active: (pt as any).isActive ?? true,
              },
            });
          }
        }
        const rows = await db.print_templates.findMany({ orderBy: { print_template_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedPrintTemplates[i] || seedPrintTemplates[0]) as any;
          return {
            printTemplateId: r.print_template_id,
            templateCode: r.template_code,
            templateName: r.template_name,
            paperSize: seed.paperSize || 'A4',
            orientation: seed.orientation || 'PORTRAIT',
            copies: seed.copies || 1,
            isActive: r.is_active ?? true,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getPrintTemplates] DB error:', err);
      }
    }
    return seedPrintTemplates;
  }

  // =========================================================================
  // 11. Number Sequences & Documents
  // =========================================================================
  public async getNumberSequences(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.number_sequences.count();
        if (count === 0) {
          const comp = await this.getCompany();
          for (const ns of seedNumberSequences) {
            await db.number_sequences.create({
              data: {
                company_id: comp.companyId || 1,
                document_kind: ns.documentKind,
                prefix: ns.prefix,
                pattern: ns.pattern || '{PREFIX}-{YEAR}-{SEQ:6}',
                next_value: ns.nextValue || 1,
                reset_policy: ns.resetPolicy || 'YEARLY',
                current_period: ns.currentPeriod || '2026',
              },
            });
          }
        }
        const rows = await db.number_sequences.findMany({ orderBy: { number_sequence_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedNumberSequences[i] || seedNumberSequences[0]) as any;
          return {
            numberSequenceId: r.number_sequence_id,
            documentKind: r.document_kind,
            prefix: r.prefix,
            pattern: r.pattern,
            nextValue: r.next_value,
            resetPolicy: r.reset_policy,
            currentPeriod: r.current_period,
            sample: seed.sample || `${r.prefix}-2026-000001`,
            siteCode: seed.siteCode || 'ALL',
          };
        });
      } catch (err) {
        console.warn('[SetupService.getNumberSequences] DB error:', err);
      }
    }
    return seedNumberSequences;
  }

  public async getDocumentTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.document_types.count();
        if (count === 0) {
          for (const dt of seedDocumentTypes) {
            await db.document_types.upsert({
              where: { doc_type_code: dt.docTypeCode },
              update: {},
              create: {
                doc_type_code: dt.docTypeCode,
                doc_type_name: dt.docTypeName,
                applies_to: dt.appliesTo || 'CONSIGNMENT',
                retention_years: dt.retentionYears || 7,
                requires_approval: dt.requiresApproval ?? false,
                max_size_mb: dt.maxSizeMb || 10,
                allowed_ext: dt.allowedExt || 'PDF,JPG,PNG',
                is_active: dt.isActive ?? true,
              },
            });
          }
        }
        const rows = await db.document_types.findMany({ orderBy: { document_type_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedDocumentTypes.find((s) => s.docTypeCode === r.doc_type_code) || seedDocumentTypes[i] || seedDocumentTypes[0]) as any;
          return {
            documentTypeId: r.document_type_id,
            docTypeCode: r.doc_type_code,
            docTypeName: r.doc_type_name,
            appliesTo: r.applies_to,
            retentionYears: r.retention_years,
            requiresApproval: r.requires_approval,
            maxSizeMb: r.max_size_mb,
            allowedExt: r.allowed_ext,
            isActive: r.is_active ?? true,
            requiredFor: seed.requiredFor || [],
          };
        });
      } catch (err) {
        console.warn('[SetupService.getDocumentTypes] DB error:', err);
      }
    }
    return seedDocumentTypes;
  }

  // =========================================================================
  // 12. Devices & Integrations
  // =========================================================================
  public async getDevices(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.devices.count();
        if (count === 0) {
          const site = (await db.sites.findFirst()) || { site_id: 1 };
          for (const dev of seedDevices) {
            await db.devices.upsert({
              where: { device_code: dev.deviceCode },
              update: {},
              create: {
                site_id: site.site_id,
                device_code: dev.deviceCode,
                device_name: dev.deviceName,
                device_kind: dev.deviceKind || 'TABLET',
                is_active: (dev as any).isActive ?? true,
              },
            });
          }
        }
        const rows = await db.devices.findMany({ orderBy: { device_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedDevices.find((s) => s.deviceCode === r.device_code) || seedDevices[i] || seedDevices[0]) as any;
          return {
            deviceId: r.device_id,
            deviceCode: r.device_code,
            deviceName: r.device_name,
            deviceKind: r.device_kind,
            isActive: r.is_active ?? true,
            registeredAt: r.registered_at?.toISOString() || new Date().toISOString(),
            revokedAt: r.revoked_at?.toISOString(),
            queue: seed.queue || 0,
            appVersion: seed.appVersion || 'v2.4.1',
            assignedTo: seed.assignedTo || 'Unassigned',
          };
        });
      } catch (err) {
        console.warn('[SetupService.getDevices] DB error:', err);
      }
    }
    return seedDevices;
  }

  public async getDeviceIntegrations(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.device_integrations.count();
        if (count === 0) {
          const site = (await db.sites.findFirst()) || { site_id: 1 };
          for (const it of seedIntegrations) {
            await db.device_integrations.create({
              data: {
                site_id: site.site_id,
                device_type: (it as any).deviceType || (it as any).integrationType || 'ANPR',
                endpoint_url: (it as any).endpointUrl || 'http://10.160.5.50:8080/api',
                is_active: it.isActive ?? true,
              },
            });
          }
        }
        return seedIntegrations;
      } catch (err) {
        console.warn('[SetupService.getDeviceIntegrations] DB error:', err);
      }
    }
    return seedIntegrations;
  }

  // =========================================================================
  // 13. Sync & Messages
  // =========================================================================
  public async getSyncStates(): Promise<any[]> {
    return seedSyncStates;
  }

  public async getOutbox(): Promise<any[]> {
    return seedOutbox;
  }

  // =========================================================================
  // 14. Prediction Models
  // =========================================================================
  public async getModels(): Promise<any[]> {
    return seedModels;
  }

  // =========================================================================
  // 15. Field Rules & Calendars
  // =========================================================================
  public async getFieldRules(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.field_rules.count();
        if (count === 0) {
          for (const fr of seedFieldRules) {
            await db.field_rules.create({
              data: {
                role_code: fr.roleCode,
                entity_name: fr.entityName,
                field_name: fr.fieldName,
                access_level: fr.accessLevel || 'READONLY',
                is_mandatory: !!(fr as any).mandatory,
                is_hidden: fr.accessLevel === 'HIDDEN',
                is_readonly: fr.accessLevel === 'READONLY',
              },
            });
          }
        }
        const rows = await db.field_rules.findMany({ orderBy: { field_rule_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedFieldRules[i] || seedFieldRules[0]) as any;
          return {
            fieldRuleId: r.field_rule_id,
            roleCode: r.role_code,
            entityName: r.entity_name,
            fieldName: r.field_name,
            accessLevel: r.access_level,
            isMandatory: r.is_mandatory ?? false,
            isHidden: r.is_hidden ?? false,
            isReadonly: r.is_readonly ?? true,
            mandatory: seed.mandatory,
            uiOnly: seed.uiOnly,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getFieldRules] DB error:', err);
      }
    }
    return seedFieldRules;
  }

  public async createFieldRule(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.field_rules.create({
          data: {
            role_code: data.roleCode,
            entity_name: data.entityName,
            field_name: data.fieldName,
            access_level: data.accessLevel || 'READONLY',
            is_mandatory: !!data.isMandatory,
            is_hidden: !!data.isHidden,
            is_readonly: data.isReadonly ?? true,
          },
        });
        const full = { fieldRuleId: created.field_rule_id, ...data };
        seedFieldRules.push(full as any);
        return full;
      } catch (err) {
        console.warn('[SetupService.createFieldRule] DB error:', err);
      }
    }
    const item = { fieldRuleId: seedFieldRules.length + 1, ...data };
    seedFieldRules.push(item as any);
    return item;
  }

  public async getCalendars(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.calendars.count();
        if (count === 0) {
          const site = (await db.sites.findFirst()) || { site_id: 1 };
          for (const cal of seedCalendars) {
            await db.calendars.upsert({
              where: { calendar_code: cal.calendarCode },
              update: {},
              create: {
                site_id: site.site_id,
                calendar_code: cal.calendarCode,
                calendar_name: cal.calendarName,
                country_code: cal.countryCode || 'TZ',
              },
            });
          }
        }
        const rows = await db.calendars.findMany({ orderBy: { calendar_id: 'asc' } });
        return rows.map((r) => ({
          calendarId: r.calendar_id,
          calendarCode: r.calendar_code,
          calendarName: r.calendar_name,
          countryCode: r.country_code,
        }));
      } catch (err) {
        console.warn('[SetupService.getCalendars] DB error:', err);
      }
    }
    return seedCalendars;
  }

  public async getHolidays(calendarId = 1): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.holidays.count();
        if (count === 0) {
          const cal = (await db.calendars.findFirst()) || { calendar_id: 1 };
          for (const hol of seedHolidays) {
            await db.holidays.create({
              data: {
                calendar_id: cal.calendar_id,
                holiday_date: new Date(hol.holidayDate),
                holiday_name: hol.holidayName,
              },
            });
          }
        }
        const rows = await db.holidays.findMany({
          where: { calendar_id: calendarId },
          orderBy: { holiday_date: 'asc' },
        });
        return rows.map((r, i) => {
          const seed = (seedHolidays[i] || seedHolidays[0]) as any;
          return {
            calendarHolidayId: r.holiday_id,
            calendarId: r.calendar_id,
            holidayDate: r.holiday_date.toISOString().split('T')[0],
            holidayName: r.holiday_name,
            moves: seed?.moves,
          };
        });
      } catch (err) {
        console.warn('[SetupService.getHolidays] DB error:', err);
      }
    }
    return seedHolidays;
  }

  public async addHoliday(calendarId: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.holidays.create({
          data: {
            calendar_id: calendarId,
            holiday_date: new Date(data.holidayDate),
            holiday_name: data.holidayName,
          },
        });
        const full = { calendarHolidayId: created.holiday_id, calendarId, ...data };
        seedHolidays.push(full as any);
        return full;
      } catch (err) {
        console.warn('[SetupService.addHoliday] DB error:', err);
      }
    }
    const item = { calendarHolidayId: seedHolidays.length + 1, calendarId, ...data };
    seedHolidays.push(item as any);
    return item;
  }

  public async deleteHoliday(calendarId: number, holidayId: number): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.holidays.delete({ where: { holiday_id: holidayId } });
      } catch (err) {
        console.warn('[SetupService.deleteHoliday] DB error:', err);
      }
    }
    const idx = seedHolidays.findIndex((h) => (h as any).calendarHolidayId === holidayId);
    if (idx >= 0) seedHolidays.splice(idx, 1);
    return { ok: true };
  }
}

export const setupService = new SetupService();
