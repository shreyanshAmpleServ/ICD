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
        let comp = await db.m_company.findFirst({ where: { company_id: id } });
        if (!comp) {
          comp = await db.m_company.findFirst();
        }
        if (!comp) {
          comp = await db.m_company.create({
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
        const updated = await db.m_company.update({
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
        const rows = await db.m_site.findMany({
          include: {
            m_site_facility: true,
            m_gate: true,
          },
          orderBy: { site_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r) => {
            const facilities = r.m_site_facility.map(f => f.facility_type);
            return {
              siteId: r.site_id,
              siteCode: r.site_code,
              siteName: r.site_name,
              companyId: r.company_id,
              countryCode: r.country_code || 'TZ',
              timeZone: r.time_zone || 'Africa/Dar_es_Salaam',
              calendarId: r.calendar_id || 1,
              calendarCode: 'TZ_PUBLIC',
              addressLine1: r.address_line1 || 'Plot 112, Nelson Mandela Road',
              city: r.city || 'Dar es Salaam',
              latitude: r.latitude ? String(r.latitude) : '-6.832100',
              longitude: r.longitude ? String(r.longitude) : '39.231700',
              customsStationCode: r.customs_station_code || 'DLICD1',
              regulatorLicenceNo: r.regulator_licence_no || 'TASAC/ICD/0231',
              offlineGateLimitMin: r.offline_gate_limit_min || 60,
              signatureMode: r.signature_mode || 'EITHER',
              facilities: facilities.length > 0 ? facilities : ['ICD', 'CFS'],
              isActive: r.is_active ?? true,
              gates: r.m_gate.length || 2,
              slots: r.site_code === 'DAR1' ? 660 : (r.site_code === 'DAR2' ? 39 : 96),
            };
          });
        }
      } catch (err: any) {
        console.warn('[SetupService.getSites] DB error:', err.message);
      }
    }
    return seedSites;
  }

  public async createSite(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const comp = await this.getCompany();
        const created = await db.m_site.create({
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
        const updated = await db.m_site.update({
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
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_country_pack.findMany({ orderBy: { pack_code: 'asc' } });
        if (rows.length > 0) {
          return rows.map((r) => ({
            packCode: r.pack_code,
            packName: r.pack_name,
            countryCode: r.country_code,
            packVersion: r.pack_version,
            currencyCode: r.country_code === 'TZ' ? 'TZS' : 'USD',
            taxLabel: 'VAT',
            taxRatePct: 18.0,
            isActive: r.is_active,
            logInst: r.log_inst,
          }));
        }
      } catch (err) {
        console.error('getCountryPacks db error:', err);
      }
    }
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
        const count = await db.m_yard_location.count();
        if (count === 0) {
          const site = (await db.m_site.findFirst()) || { site_id: 1 };
          await db.m_yard_location.createMany({
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
        await db.m_yard_location.create({
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
        const where: any = {};
        if (siteId) where.site_id = Number(siteId);
        const rows = await db.m_gate.findMany({
          where,
          include: { m_gate_lane: true },
          orderBy: { gate_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((g) => ({
            gateId: g.gate_id,
            siteId: g.site_id,
            gateCode: g.gate_code,
            gateName: g.gate_name,
            gateKind: g.gate_kind,
            isActive: g.is_active ?? true,
            lanes: g.m_gate_lane.map((l) => ({
              gateLaneId: l.gate_lane_id,
              laneCode: l.lane_code,
              direction: l.direction,
              isActive: l.is_active ?? true,
            })),
          }));
        }
      } catch (err: any) {
        console.warn('[SetupService.getGates] DB error:', err.message);
      }
    }
    return seedGates;
  }

    public async getVisitTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_visit_type.findMany({
          include: {
            m_visit_type_checkpoint: {
              include: { m_checkpoint: true },
              orderBy: { seq_no: 'asc' }
            }
          },
          orderBy: { visit_type_id: 'asc' }
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            visitTypeId: r.visit_type_id,
            visitCode: r.visit_type_code,
            visitTypeCode: r.visit_type_code,
            visitName: r.visit_type_name,
            visitTypeName: r.visit_type_name,
            requiresAppointment: r.requires_appointment ?? false,
            requiresNomination: r.requires_nomination ?? true,
            isActive: r.is_active ?? true,
            checkpoints: r.m_visit_type_checkpoint.map(cp => ({
              seqNo: cp.seq_no,
              checkpointCode: cp.m_checkpoint?.checkpoint_code || 'OUTER_IN',
              checkpointName: cp.m_checkpoint?.checkpoint_name || 'Checkpoint',
              isMandatory: cp.is_mandatory,
            })),
          }));
        }
      } catch (err: any) {
        console.warn('[SetupService.getVisitTypes] DB error:', err.message);
      }
    }
    return seedVisitTypes;
  }

  public async updateVisitType(id: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.m_visit_type.update({
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
        const count = await db.m_checkpoint.count();
        if (count === 0) {
          const gate = (await db.m_gate.findFirst()) || { gate_id: 1 };
          for (const cp of seedCheckpoints) {
            await db.m_checkpoint.upsert({
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
        const rows = await db.m_checkpoint.findMany({ orderBy: { checkpoint_id: 'asc' } });
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
        const count = await db.m_unit_type.count();
        if (count === 0) {
          for (const ut of seedUnitTypes) {
            await db.m_unit_type.upsert({
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
        const rows = await db.m_unit_type.findMany({ orderBy: { unit_type_id: 'asc' } });
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
        const created = await db.m_unit_type.create({
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
        await db.m_unit_type.update({
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
        const count = await db.m_cargo_regime.count();
        if (count === 0) {
          for (const cr of seedRegimes) {
            await db.m_cargo_regime.upsert({
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
        const rows = await db.m_cargo_regime.findMany();
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
        const rows = await db.m_truck.findMany({ include: { parties: true }, orderBy: { truck_id: 'desc' } });
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
        const created = await db.m_truck.create({
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
        const rows = await db.m_driver.findMany({ orderBy: { driver_id: 'desc' } });
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
        const created = await db.m_driver.create({
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
        const rows = await db.m_vessel.findMany({ orderBy: { vessel_id: 'asc' } });
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
        const count = await db.m_port.count();
        if (count === 0) {
          for (const p of seedPorts) {
            const pCode = (p as any).portCode || (p as any).unlocode || 'TZDAR';
            await db.m_port.upsert({
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
        const rows = await db.m_port.findMany({ orderBy: { port_id: 'asc' } });
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
        const count = await db.m_commodity.count();
        if (count === 0) {
          for (const c of seedCommodities) {
            await db.m_commodity.upsert({
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
        const rows = await db.m_commodity.findMany({ orderBy: { commodity_id: 'asc' } });
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
        const rows = await db.m_equipment.findMany({ orderBy: { equipment_id: 'asc' } });
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
        const rows = await db.app_user.findMany({
          include: {
            user_site_role: {
              include: { m_role: true, m_site: true },
            },
          },
          orderBy: { user_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((u) => {
            const roleGrants = u.user_site_role.map((ur) => ({
              roleCode: ur.m_role?.role_code || 'GATE_OFFICER',
              roleName: ur.m_role?.role_name || 'Gate officer',
              siteId: ur.site_id,
              validFrom: ur.valid_from?.toISOString(),
              validTo: ur.valid_to?.toISOString(),
            }));
            const siteCodes = [...new Set(u.user_site_role.map((ur) => ur.m_site?.site_code || 'All sites'))];
            return {
              userId: u.user_id,
              userSub: u.user_sub,
              userName: u.user_name,
              fullName: u.user_name,
              title: u.user_name === 'Ashok Kumar' ? 'ICD administrator' : (u.user_name.includes('Officer') ? 'Officer' : 'Terminal Operator'),
              email: u.email,
              phone: u.phone,
              preferredLanguage: u.preferred_language || 'en',
              isNgUser: u.is_ng_user ?? true,
              mfaRequired: u.mfa_required ?? false,
              isActive: u.is_active ?? true,
              lastLoginAt: u.last_login_at?.toISOString(),
              roleGrants,
              siteCodes: siteCodes.length > 0 ? siteCodes : ['All sites'],
            };
          });
        }
      } catch (err: any) {
        console.warn('[SetupService.getUsers] DB error:', err.message);
      }
    }
    return seedUsers;
  }

  public async createUser(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.app_user.create({
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
        await db.app_user.update({
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
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_role.findMany({
          include: { m_role_permission: { include: { m_permission: true } } },
          orderBy: { role_code: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            roleId: r.role_id,
            roleCode: r.role_code,
            roleName: r.role_name,
            code: r.role_code,
            name: r.role_name,
            description: r.description,
            isSystem: r.is_system,
            isActive: r.is_active,
            grants: r.m_role_permission.map((rp) => rp.permission_code),
            logInst: r.log_inst,
          }));
        }
      } catch (err) {
        console.error('getRoles db error:', err);
      }
    }
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
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_permission.findMany({ orderBy: { permission_code: 'asc' } });
        if (rows.length > 0) {
          return rows.map((p) => ({
            permissionCode: p.permission_code,
            module: p.module,
            action: p.action,
            scopeAllowed: p.scope_allowed,
            description: p.description,
            logInst: p.log_inst,
          }));
        }
      } catch (err) {
        console.error('getPermissions db error:', err);
      }
    }
    return seedPerms;
  }

  // =========================================================================
  // 7. Holds, Release & Approvals
  // =========================================================================
  public async getReleaseRules(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_release_rule.findMany({
          include: { m_site: true },
          orderBy: { release_rule_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            releaseRuleId: r.release_rule_id,
            siteId: r.site_id,
            siteCode: r.m_site?.site_code || 'DAR1',
            cargoRegime: r.cargo_regime,
            conditionCode: r.condition_code,
            isMandatory: r.is_mandatory,
            canWaive: r.can_waive,
            waivePermissionCode: r.waive_permission_code,
            isActive: r.is_active,
            logInst: r.log_inst,
          }));
        }
      } catch (err) {
        console.error('getReleaseRules db error:', err);
      }
    }
    return seedReleaseRules;
  }

  public async getApprovalPolicies(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.m_approval_policy.count();
        if (count === 0) {
          const site = (await db.m_site.findFirst()) || { site_id: 1 };
          for (const ap of seedApprovalPolicies) {
            await db.m_approval_policy.create({
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
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_exception_type.findMany({ orderBy: { exception_type_code: 'asc' } });
        if (rows.length > 0) {
          return rows.map((e) => ({
            exceptionTypeCode: e.exception_type_code,
            exceptionName: e.exception_name,
            category: e.category,
            severity: e.severity,
            defaultResolution: e.default_resolution,
            slaMinutes: e.sla_minutes,
            isActive: e.is_active,
            logInst: e.log_inst,
          }));
        }
      } catch (err) {
        console.error('getExceptionTypes db error:', err);
      }
    }
    return seedExceptionTypes;
  }

  // =========================================================================
  // 8. Inspection Checklists & Damage Codes
  // =========================================================================
  public async getInspectionTemplates(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_inspection_template.findMany({
          include: { m_inspection_item: true },
          orderBy: { template_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((t) => ({
            templateId: t.template_id,
            templateCode: t.template_code,
            templateName: t.template_name,
            unitTypeKind: t.unit_type_kind,
            isActive: t.is_active,
            items: t.m_inspection_item.map((i) => ({
              itemId: i.item_id,
              itemSeq: i.item_seq,
              itemCode: i.item_code,
              itemLabel: i.item_label,
              itemType: i.item_type,
              isRequired: i.is_required,
              optionsJson: i.options_json ? JSON.parse(i.options_json) : null,
            })),
            logInst: t.log_inst,
          }));
        }
      } catch (err) {
        console.error('getInspectionTemplates db error:', err);
      }
    }
    return seedInspectionTemplates;
  }

  public async getDamageCodes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_damage_code.findMany({ orderBy: { damage_code_id: 'asc' } });
        if (rows.length > 0) {
          return rows.map((d) => ({
            damageCodeId: d.damage_code_id,
            componentCode: d.component_code,
            damageTypeCode: d.damage_type_code,
            severityCode: d.severity_code,
            description: d.description,
            isActive: d.is_active,
            logInst: d.log_inst,
          }));
        }
      } catch (err) {
        console.error('getDamageCodes db error:', err);
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
        const rows = await db.accounting_period.findMany({
          orderBy: { period_key: 'desc' },
        });
        if (rows.length > 0) {
          return rows.map((p) => ({
            accountingPeriodId: p.accounting_period_id,
            companyId: p.company_id,
            periodKey: p.period_key,
            periodStart: p.period_start ? p.period_start.toISOString().split('T')[0] : '',
            periodEnd: p.period_end ? p.period_end.toISOString().split('T')[0] : '',
            status: p.status,
            closedAt: p.closed_at ? p.closed_at.toISOString() : undefined,
            closedBy: p.closed_by_sub || undefined,
            logInst: p.log_inst,
          }));
        }
      } catch (err) {
        console.error('getAccountingPeriods db error:', err);
      }
    }
    return seedPeriods;
  }

  public async getChargeCodes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.m_charge_code.count();
        if (count === 0) {
          for (const cc of seedChargeCodes) {
            const uom = (cc as any).uom || 'DAY';
            await db.m_charge_code.upsert({
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
        const rows = await db.m_charge_code.findMany({ orderBy: { charge_code_id: 'asc' } });
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
        const count = await db.m_tax_code.count();
        if (count === 0) {
          for (const tc of seedTaxCodes) {
            const rate = (tc as any).ratePercent || (tc as any).ratePct || 18.0;
            await db.m_tax_code.upsert({
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
        const rows = await db.m_tax_code.findMany({ orderBy: { tax_code_id: 'asc' } });
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
        const rows = await db.m_payment_channel.findMany({
          orderBy: { channel_code: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((pc) => ({
            paymentChannelId: pc.payment_channel_id,
            companyId: pc.company_id,
            channelCode: pc.channel_code,
            channelName: pc.channel_name,
            method: pc.method,
            provider: pc.provider,
            currency: pc.currency,
            glAccount: pc.gl_account,
            referencePattern: pc.reference_pattern,
            isActive: pc.is_active,
            logInst: pc.log_inst,
          }));
        }
      } catch (err) {
        console.error('getPaymentChannels db error:', err);
      }
    }
    return seedPaymentChannels;
  }

  public async getGlSettings(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_gl_setting.findMany({
          orderBy: { setting_key: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((g) => ({
            companyId: g.company_id,
            settingKey: g.setting_key,
            glAccount: g.gl_account,
            description: g.description,
            logInst: g.log_inst,
          }));
        }
      } catch (err) {
        console.error('getGlSettings db error:', err);
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
        const count = await db.m_notification_template.count();
        if (count === 0) {
          for (const nt of seedNotificationTemplates) {
            const subj = (nt as any).subjectTemplate || (nt as any).templateName || 'Notification';
            await db.m_notification_template.upsert({
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
        const rows = await db.m_notification_template.findMany({ orderBy: { template_id: 'asc' } });
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
        const rows = await db.m_notification_rule.findMany({
          orderBy: { notification_rule_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            ruleId: r.notification_rule_id,
            notificationRuleId: r.notification_rule_id,
            siteId: r.site_id,
            eventType: r.event_type,
            templateCode: r.template_code,
            channel: r.channel,
            recipientKind: r.recipient_kind,
            roleId: r.role_id,
            isActive: r.is_active,
            logInst: r.log_inst,
          }));
        }
      } catch (err) {
        console.error('getNotificationRules db error:', err);
      }
    }
    return seedNotificationRules;
  }

  public async getPrintTemplates(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.m_print_template.count();
        if (count === 0) {
          const site = (await db.m_site.findFirst()) || { site_id: 1 };
          for (const pt of seedPrintTemplates) {
            const tCode = (pt as any).templateCode || `PT-${(pt as any).docKind}`;
            await db.m_print_template.upsert({
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
        const rows = await db.m_print_template.findMany({ orderBy: { print_template_id: 'asc' } });
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
        const rows = await db.m_number_sequence.findMany({
          include: { m_site: true },
          orderBy: { number_sequence_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r, i) => {
            const seed = (seedNumberSequences[i] || seedNumberSequences[0]) as any;
            return {
              numberSequenceId: r.number_sequence_id,
              companyId: r.company_id,
              siteId: r.site_id,
              siteCode: r.m_site?.site_code || seed?.siteCode || 'DAR1',
              documentKind: r.document_kind,
              prefix: r.prefix,
              pattern: r.pattern,
              nextValue: Number(r.next_value),
              resetPolicy: r.reset_policy,
              currentPeriod: r.current_period || '2026',
              sample: seed?.sample || `${r.prefix}-2026-000001`,
              logInst: r.log_inst,
            };
          });
        }
      } catch (err) {
        console.error('getNumberSequences db error:', err);
      }
    }
    return seedNumberSequences;
  }

  public async getDocumentTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.m_document_type.count();
        if (count === 0) {
          for (const dt of seedDocumentTypes) {
            await db.m_document_type.upsert({
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
        const rows = await db.m_document_type.findMany({ orderBy: { document_type_id: 'asc' } });
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
        const rows = await db.m_device.findMany({
          orderBy: { device_id: 'asc' }
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            deviceId: r.device_id,
            siteId: r.site_id,
            deviceCode: r.device_code,
            deviceName: r.device_name,
            deviceKind: r.device_kind,
            isActive: !r.revoked_at,
            registeredAt: r.registered_at?.toISOString(),
            registeredBy: r.registered_by,
            revokedAt: r.revoked_at?.toISOString(),
            revokedReason: r.revoked_reason,
            lastSeenAt: r.last_seen_at?.toISOString() || new Date().toISOString(),
            queue: 0,
            appVersion: '1.4.2',
            assignedTo: r.device_name,
          }));
        }
      } catch (err: any) {
        console.warn('[SetupService.getDevices] DB error:', err.message);
      }
    }
    return seedDevices;
  }

  public async getDeviceIntegrations(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_device_integration.findMany({
          include: { m_gate_lane: true, m_device: true },
          orderBy: { device_integration_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((di) => ({
            deviceIntegrationId: di.device_integration_id,
            siteId: di.site_id,
            integrationKind: di.integration_kind,
            gateLaneId: di.gate_lane_id,
            lane: di.m_gate_lane?.lane_code ? `Main gate · ${di.m_gate_lane.lane_code}` : 'Lane 1',
            vendor: di.vendor,
            model: di.model,
            gateAgentDeviceId: di.gate_agent_device_id,
            laneMode: di.lane_mode,
            isActive: di.is_active,
            health: 'OK',
            readsToday: 142,
            matchPct: 94,
            logInst: di.log_inst,
          }));
        }
      } catch (err) {
        console.error('getDeviceIntegrations db error:', err);
      }
    }
    return seedIntegrations;
  }

  // =========================================================================
  // 13. Sync & Messages
  // =========================================================================
  public async getSyncStates(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.sync_state.findMany({
          orderBy: { entity_name: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((s) => ({
            masterCode: s.entity_name,
            targetSystem: s.source_system,
            syncDirection: 'INBOUND',
            lastSyncAt: s.last_run_at ? s.last_run_at.toISOString() : (s.last_updatedate ? s.last_updatedate.toISOString() : new Date().toISOString()),
            lastSyncStatus: s.last_status || 'OK',
            rowsSyncedTotal: s.rows_last_run || 0,
            total: s.rows_last_run || 25,
            provisional: 0,
            logInst: s.log_inst,
          }));
        }
      } catch (err) {
        console.error('getSyncStates db error:', err);
      }
    }
    return seedSyncStates;
  }

  public async getOutbox(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.outbox_event.findMany({
          orderBy: { outbox_event_id: 'desc' },
          take: 50,
        });
        if (rows.length > 0) {
          return rows.map((o) => ({
            id: Number(o.outbox_event_id),
            eventType: o.event_type,
            aggregate: `${o.aggregate_type} ${o.aggregate_id}`,
            destination: 'NG_EVENTS',
            status: 'SENT',
            attempts: 1,
            occurredAt: o.occurred_at.toISOString(),
            payload: o.payload_json ? JSON.parse(o.payload_json) : null,
          }));
        }
      } catch (err) {
        console.error('getOutbox db error:', err);
      }
    }
    return seedOutbox;
  }

  // =========================================================================
  // 14. Prediction Models
  // =========================================================================
  public async getModels(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.ml_model_version.findMany({
          orderBy: { ml_model_version_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((m) => {
            const metrics = m.metrics_json ? JSON.parse(m.metrics_json) : {};
            return {
              mlModelVersionId: m.ml_model_version_id,
              modelCode: m.model_code,
              versionLabel: m.version_label,
              trainedAt: m.trained_at.toISOString(),
              from: m.training_window_from ? m.training_window_from.toISOString().split('T')[0] : '2025-10-01',
              to: m.training_window_to ? m.training_window_to.toISOString().split('T')[0] : '2026-09-20',
              isActive: m.is_active,
              metrics,
              summary: m.model_code === 'YARD_ALLOC'
                ? `${Math.round((metrics.top3Acceptance || 0.8) * 100)}% of moves went to one of the top 3 slots it offered`
                : (m.model_code === 'DWELL' ? `Exit date off by ${metrics.maeDays || 2.4} days on average` : 'Occupancy forecast model'),
              logInst: m.log_inst,
            };
          });
        }
      } catch (err) {
        console.error('getModels db error:', err);
      }
    }
    return seedModels;
  }

  // =========================================================================
  // 15. Field Rules & Calendars
  // =========================================================================
  public async getFieldRules(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_field_rule.findMany({
          include: { m_role: true },
          orderBy: { field_rule_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((f) => ({
            fieldRuleId: f.field_rule_id,
            roleCode: f.m_role?.role_code || 'CLERK',
            entityName: f.entity_name,
            fieldName: f.field_name,
            fieldBehavior: f.access_level,
            logInst: f.log_inst,
          }));
        }
      } catch (err) {
        console.error('getFieldRules db error:', err);
      }
    }
    return seedFieldRules;
  }

  public async createFieldRule(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const role = await db.m_role.findFirst({
          where: { role_code: data.roleCode }
        });
        const roleId = role?.role_id || 1;
        const created = await db.m_field_rule.create({
          data: {
            role_id: roleId,
            entity_name: data.entityName,
            field_name: data.fieldName,
            access_level: data.accessLevel || data.fieldBehavior || 'READONLY',
            createdby: 'SYSTEM',
          },
          include: { m_role: true }
        });
        return {
          fieldRuleId: created.field_rule_id,
          roleCode: created.m_role?.role_code || data.roleCode,
          entityName: created.entity_name,
          fieldName: created.field_name,
          fieldBehavior: created.access_level,
          logInst: created.log_inst,
        };
      } catch (err) {
        console.warn('[SetupService.createFieldRule] DB error:', err);
      }
    }
    const newRule = { fieldRuleId: seedFieldRules.length + 1, ...data };
    seedFieldRules.push(newRule);
    return newRule;
  }

  public async getCalendars(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const count = await db.m_calendar.count();
        if (count === 0) {
          const site = (await db.m_site.findFirst()) || { site_id: 1 };
          for (const cal of seedCalendars) {
            await db.m_calendar.upsert({
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
        const rows = await db.m_calendar.findMany({ orderBy: { calendar_id: 'asc' } });
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
        const rows = await db.m_calendar_holiday.findMany({
          where: { calendar_id: calendarId },
          orderBy: { holiday_date: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((h) => ({
            calendarHolidayId: h.calendar_holiday_id,
            calendarId: h.calendar_id,
            holidayDate: h.holiday_date.toISOString().split('T')[0],
            holidayName: h.holiday_name,
            logInst: h.log_inst,
          }));
        }
      } catch (err) {
        console.error('getHolidays db error:', err);
      }
    }
    return seedHolidays;
  }

  public async addHoliday(calendarId: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.m_calendar_holiday.create({
          data: {
            calendar_id: calendarId,
            holiday_date: new Date(data.holidayDate),
            holiday_name: data.holidayName,
            createdby: 'SYSTEM',
          },
        });
        return {
          calendarHolidayId: created.calendar_holiday_id,
          calendarId: created.calendar_id,
          holidayDate: created.holiday_date.toISOString().split('T')[0],
          holidayName: created.holiday_name,
          logInst: created.log_inst,
        };
      } catch (err) {
        console.warn('[SetupService.addHoliday] DB error:', err);
      }
    }
    const full = { calendarHolidayId: seedHolidays.length + 1, calendarId, ...data };
    seedHolidays.push(full);
    return full;
  }

  public async deleteHoliday(calendarId: number, holidayId: number): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.m_calendar_holiday.delete({ where: { calendar_holiday_id: holidayId } });
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
