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
              country_pack_id: 1,
              base_currency: seedCompany.baseCurrency || 'USD',
              tax_id: seedCompany.taxId,
              vat_no: seedCompany.vatNo,
              is_active: true,
              createdby: 'SYSTEM',
            },
          });
        }
        return {
          companyId: comp.company_id,
          companyCode: comp.company_code,
          legalName: comp.legal_name,
          tradingName: comp.trading_name,
          countryCode: comp.country_code,
          countryPackCode: 'TZ_DEFAULT',
          countryPackId: comp.country_pack_id,
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
            updatedate: new Date(),
            updatedby: 'SYSTEM',
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
            createdby: 'SYSTEM',
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
            updatedate: new Date(),
            updatedby: 'SYSTEM',
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
        const rows = await db.m_yard_location.findMany({
          where: siteId ? { site_id: siteId } : {},
          include: { m_yard_location_tag: { include: { m_location_tag: true } } },
          orderBy: { yard_location_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            yardLocationId: r.yard_location_id,
            siteId: r.site_id,
            parentId: r.parent_id,
            levelNo: r.level_no,
            locationCode: r.location_code,
            fullCode: r.full_code,
            locationKind: r.location_kind,
            isSlot: r.is_slot,
            allows20: r.allows_20,
            allows40: r.allows_40,
            allows45: r.allows_45,
            maxTier: r.max_tier,
            maxWeightKg: r.max_weight_kg,
            baySize: r.bay_size,
            reeferPlugNo: r.reefer_plug_no,
            mapX: r.map_x ? Number(r.map_x) : null,
            mapY: r.map_y ? Number(r.map_y) : null,
            mapW: r.map_w ? Number(r.map_w) : null,
            mapH: r.map_h ? Number(r.map_h) : null,
            mapRotation: r.map_rotation,
            sortOrder: r.sort_order,
            isBlocked: r.is_blocked,
            blockedReason: r.blocked_reason,
            isActive: r.is_active,
            tags: r.m_yard_location_tag.map((t) => t.m_location_tag?.tag_code || t.m_location_tag?.tag_name || 'GEN'),
          }));
        }
      } catch (err: any) {
        console.warn('[SetupService.getYardLocations] DB error:', err.message);
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
            level_no: data.levelNo || 1,
            location_code: data.locationCode || data.code || 'N',
            full_code: data.fullCode || data.code || 'N',
            location_kind: data.locationKind || 'BLOCK',
            allows_20: data.allows20 ?? true,
            allows_40: data.allows40 ?? true,
            allows_45: data.allows45 ?? false,
            max_tier: data.maxTier || 4,
            max_weight_kg: data.maxWeightKg || null,
            is_active: data.isActive ?? true,
            createdby: 'SYSTEM',
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
        return rows.map((g) => ({
          gateId: g.gate_id,
          siteId: g.site_id,
          gateCode: g.gate_code,
          gateName: g.gate_name,
          gateKind: g.gate_kind,
          isActive: g.is_active ?? true,
          lanes: g.m_gate_lane.map((l) => ({
            gateLaneId: l.gate_lane_id,
            gateId: l.gate_id,
            laneCode: l.lane_code,
            direction: l.direction,
            isActive: l.is_active ?? true,
          })),
        }));
      } catch (err: any) {
        console.warn('[SetupService.getGates] DB error:', err.message);
      }
    }
    return [];
  }

  public async createGate(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const siteId = data.siteId ? Number(data.siteId) : 1;
        const gateCode = data.gateCode || `GATE-${Date.now() % 10000}`;
        const gateName = data.gateName || 'New Gate';
        const gateKind = data.gateKind || 'OUTER';
        const isActive = data.isActive ?? true;

        const created = await db.m_gate.create({
          data: {
            site_id: siteId,
            gate_code: gateCode,
            gate_name: gateName,
            gate_kind: gateKind,
            is_active: isActive,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
        });

        const lanesToCreate = Array.isArray(data.lanes) && data.lanes.length > 0
          ? data.lanes
          : [{ laneCode: 'L1', direction: 'IN', isActive: true }];

        for (const l of lanesToCreate) {
          await db.m_gate_lane.create({
            data: {
              gate_id: created.gate_id,
              lane_code: l.laneCode || 'L1',
              direction: l.direction || 'IN',
              is_active: l.isActive ?? true,
              createdby: 'SYSTEM',
              log_inst: 1,
            },
          });
        }

        const fresh = await db.m_gate.findUnique({
          where: { gate_id: created.gate_id },
          include: { m_gate_lane: true },
        });

        if (fresh) {
          return {
            gateId: fresh.gate_id,
            siteId: fresh.site_id,
            gateCode: fresh.gate_code,
            gateName: fresh.gate_name,
            gateKind: fresh.gate_kind,
            isActive: fresh.is_active ?? true,
            lanes: fresh.m_gate_lane.map((l) => ({
              gateLaneId: l.gate_lane_id,
              gateId: l.gate_id,
              laneCode: l.lane_code,
              direction: l.direction,
              isActive: l.is_active ?? true,
            })),
          };
        }
      } catch (err: any) {
        console.warn('[SetupService.createGate] DB error:', err.message);
      }
    }
    return { gateId: Date.now() % 10000, ...data };
  }

  public async updateGate(id: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.gateCode) updateData.gate_code = data.gateCode;
        if (data.gateName) updateData.gate_name = data.gateName;
        if (data.gateKind) updateData.gate_kind = data.gateKind;
        if (data.isActive !== undefined) updateData.is_active = Boolean(data.isActive);

        await db.m_gate.update({
          where: { gate_id: Number(id) },
          data: updateData,
        });

        if (Array.isArray(data.lanes)) {
          for (const l of data.lanes) {
            if (l.gateLaneId && typeof l.gateLaneId === 'number' && l.gateLaneId > 0 && l.gateLaneId < 1000000) {
              const existing = await db.m_gate_lane.findUnique({
                where: { gate_lane_id: Number(l.gateLaneId) },
              });
              if (existing) {
                await db.m_gate_lane.update({
                  where: { gate_lane_id: Number(l.gateLaneId) },
                  data: {
                    lane_code: l.laneCode ?? existing.lane_code,
                    direction: l.direction ?? existing.direction,
                    is_active: l.isActive !== undefined ? Boolean(l.isActive) : existing.is_active,
                    updatedate: new Date(),
                    updatedby: 'SYSTEM',
                  },
                });
                continue;
              }
            }
            if (l.laneCode) {
              await db.m_gate_lane.create({
                data: {
                  gate_id: Number(id),
                  lane_code: l.laneCode,
                  direction: l.direction || 'IN',
                  is_active: l.isActive !== undefined ? Boolean(l.isActive) : true,
                  createdby: 'SYSTEM',
                  log_inst: 1,
                },
              });
            }
          }
        }

        const fresh = await db.m_gate.findUnique({
          where: { gate_id: Number(id) },
          include: { m_gate_lane: true },
        });

        if (fresh) {
          return {
            gateId: fresh.gate_id,
            siteId: fresh.site_id,
            gateCode: fresh.gate_code,
            gateName: fresh.gate_name,
            gateKind: fresh.gate_kind,
            isActive: fresh.is_active ?? true,
            lanes: fresh.m_gate_lane.map((l) => ({
              gateLaneId: l.gate_lane_id,
              gateId: l.gate_id,
              laneCode: l.lane_code,
              direction: l.direction,
              isActive: l.is_active ?? true,
            })),
          };
        }
      } catch (err: any) {
        console.warn('[SetupService.updateGate] DB error:', err.message);
      }
    }
    return { gateId: Number(id), ...data };
  }

  public async deleteGate(id: number): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.m_gate_lane.deleteMany({ where: { gate_id: Number(id) } });
        await db.m_checkpoint.updateMany({ where: { gate_id: Number(id) }, data: { gate_id: null } });
        await db.m_gate.delete({ where: { gate_id: Number(id) } });
        return { success: true };
      } catch (err: any) {
        console.warn('[SetupService.deleteGate] DB error:', err.message);
      }
    }
    return { success: true };
  }

  public async createLane(gateId: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const lane = await db.m_gate_lane.create({
          data: {
            gate_id: Number(gateId),
            lane_code: data.laneCode || 'L1',
            direction: data.direction || 'IN',
            is_active: data.isActive ?? true,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
        });
        return {
          gateLaneId: lane.gate_lane_id,
          gateId: lane.gate_id,
          laneCode: lane.lane_code,
          direction: lane.direction,
          isActive: lane.is_active,
        };
      } catch (err: any) {
        console.warn('[SetupService.createLane] DB error:', err.message);
      }
    }
    return { gateLaneId: Date.now() % 10000, gateId, ...data };
  }

  public async updateLane(laneId: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.laneCode) updateData.lane_code = data.laneCode;
        if (data.direction) updateData.direction = data.direction;
        if (data.isActive !== undefined) updateData.is_active = Boolean(data.isActive);

        const lane = await db.m_gate_lane.update({
          where: { gate_lane_id: Number(laneId) },
          data: updateData,
        });
        return {
          gateLaneId: lane.gate_lane_id,
          gateId: lane.gate_id,
          laneCode: lane.lane_code,
          direction: lane.direction,
          isActive: lane.is_active,
        };
      } catch (err: any) {
        console.warn('[SetupService.updateLane] DB error:', err.message);
      }
    }
    return { gateLaneId: Number(laneId), ...data };
  }

  public async deleteLane(laneId: number): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.m_gate_lane.delete({ where: { gate_lane_id: Number(laneId) } });
        return { success: true };
      } catch (err: any) {
        console.warn('[SetupService.deleteLane] DB error:', err.message);
      }
    }
    return { success: true };
  }

  public async getVisitTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_visit_type.findMany({
          include: {
            m_visit_type_checkpoint: {
              include: { m_checkpoint: true },
              orderBy: { seq_no: 'asc' },
            },
          },
          orderBy: { visit_type_id: 'asc' },
        });
        return rows.map((r) => ({
          visitTypeId: r.visit_type_id,
          siteId: r.site_id,
          visitCode: r.visit_type_code,
          visitTypeCode: r.visit_type_code,
          visitName: r.visit_type_name,
          visitTypeName: r.visit_type_name,
          requiresAppointment: r.requires_appointment ?? false,
          requiresNomination: r.requires_nomination ?? true,
          isActive: r.is_active ?? true,
          checkpoints: r.m_visit_type_checkpoint.map((cp) => ({
            seqNo: cp.seq_no,
            checkpointCode: cp.m_checkpoint?.checkpoint_code || 'OUTER_IN',
            checkpointName: cp.m_checkpoint?.checkpoint_name || 'Checkpoint',
            isMandatory: cp.is_mandatory,
          })),
        }));
      } catch (err: any) {
        console.warn('[SetupService.getVisitTypes] DB error:', err.message);
      }
    }
    return [];
  }

  public async createVisitType(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const siteId = data.siteId ? Number(data.siteId) : 1;
        const code = (data.visitCode || data.visitTypeCode || `VT_${Date.now() % 10000}`).toUpperCase();
        const name = data.visitName || data.visitTypeName || 'New Visit Type';

        const created = await db.m_visit_type.create({
          data: {
            site_id: siteId,
            visit_type_code: code,
            visit_type_name: name,
            requires_nomination: data.requiresNomination ?? true,
            requires_appointment: data.requiresAppointment ?? false,
            is_active: data.isActive ?? true,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
        });

        if (Array.isArray(data.checkpoints) && data.checkpoints.length > 0) {
          const allCps = await db.m_checkpoint.findMany();
          const cpMap = new Map();
          for (const cp of allCps) {
            cpMap.set(cp.checkpoint_code, cp.checkpoint_id);
          }
          for (let i = 0; i < data.checkpoints.length; i++) {
            const cpItem = data.checkpoints[i];
            const codeKey = cpItem.checkpointCode || cpItem.code;
            const cpId = cpMap.get(codeKey) || cpItem.checkpointId;
            if (cpId) {
              await db.m_visit_type_checkpoint.create({
                data: {
                  visit_type_id: created.visit_type_id,
                  seq_no: i + 1,
                  checkpoint_id: cpId,
                  is_mandatory: cpItem.isMandatory !== undefined ? Boolean(cpItem.isMandatory) : true,
                  createdby: 'SYSTEM',
                  log_inst: 1,
                },
              });
            }
          }
        }

        const fresh = await db.m_visit_type.findUnique({
          where: { visit_type_id: created.visit_type_id },
          include: {
            m_visit_type_checkpoint: {
              include: { m_checkpoint: true },
              orderBy: { seq_no: 'asc' },
            },
          },
        });

        if (fresh) {
          return {
            visitTypeId: fresh.visit_type_id,
            siteId: fresh.site_id,
            visitCode: fresh.visit_type_code,
            visitTypeCode: fresh.visit_type_code,
            visitName: fresh.visit_type_name,
            visitTypeName: fresh.visit_type_name,
            requiresAppointment: fresh.requires_appointment ?? false,
            requiresNomination: fresh.requires_nomination ?? true,
            isActive: fresh.is_active ?? true,
            checkpoints: fresh.m_visit_type_checkpoint.map((cp) => ({
              seqNo: cp.seq_no,
              checkpointCode: cp.m_checkpoint?.checkpoint_code || 'OUTER_IN',
              checkpointName: cp.m_checkpoint?.checkpoint_name || 'Checkpoint',
              isMandatory: cp.is_mandatory,
            })),
          };
        }
      } catch (err: any) {
        console.warn('[SetupService.createVisitType] DB error:', err.message);
      }
    }
    return { visitTypeId: Date.now() % 10000, ...data };
  }

  public async updateVisitType(id: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.visitName || data.visitTypeName) {
          updateData.visit_type_name = data.visitName || data.visitTypeName;
        }
        if (data.visitCode || data.visitTypeCode) {
          updateData.visit_type_code = data.visitCode || data.visitTypeCode;
        }
        if (data.requiresAppointment !== undefined) {
          updateData.requires_appointment = Boolean(data.requiresAppointment);
        }
        if (data.requiresNomination !== undefined) {
          updateData.requires_nomination = Boolean(data.requiresNomination);
        }
        if (data.isActive !== undefined) {
          updateData.is_active = Boolean(data.isActive);
        }

        await db.m_visit_type.update({
          where: { visit_type_id: Number(id) },
          data: updateData,
        });

        // Sequence / Checkpoints update - ensures persistence across refresh
        if (Array.isArray(data.checkpoints)) {
          await db.m_visit_type_checkpoint.deleteMany({
            where: { visit_type_id: Number(id) },
          });

          const allCps = await db.m_checkpoint.findMany();
          const cpMap = new Map();
          for (const cp of allCps) {
            cpMap.set(cp.checkpoint_code, cp.checkpoint_id);
          }

          for (let i = 0; i < data.checkpoints.length; i++) {
            const cpItem = data.checkpoints[i];
            const codeKey = cpItem.checkpointCode || cpItem.code;
            const cpId = cpMap.get(codeKey) || cpItem.checkpointId;
            if (cpId) {
              await db.m_visit_type_checkpoint.create({
                data: {
                  visit_type_id: Number(id),
                  seq_no: i + 1,
                  checkpoint_id: cpId,
                  is_mandatory: cpItem.isMandatory !== undefined ? Boolean(cpItem.isMandatory) : true,
                  createdby: 'SYSTEM',
                  log_inst: 1,
                },
              });
            }
          }
        }

        const fresh = await db.m_visit_type.findUnique({
          where: { visit_type_id: Number(id) },
          include: {
            m_visit_type_checkpoint: {
              include: { m_checkpoint: true },
              orderBy: { seq_no: 'asc' },
            },
          },
        });

        if (fresh) {
          return {
            visitTypeId: fresh.visit_type_id,
            siteId: fresh.site_id,
            visitCode: fresh.visit_type_code,
            visitTypeCode: fresh.visit_type_code,
            visitName: fresh.visit_type_name,
            visitTypeName: fresh.visit_type_name,
            requiresAppointment: fresh.requires_appointment ?? false,
            requiresNomination: fresh.requires_nomination ?? true,
            isActive: fresh.is_active ?? true,
            checkpoints: fresh.m_visit_type_checkpoint.map((cp) => ({
              seqNo: cp.seq_no,
              checkpointCode: cp.m_checkpoint?.checkpoint_code || 'OUTER_IN',
              checkpointName: cp.m_checkpoint?.checkpoint_name || 'Checkpoint',
              isMandatory: cp.is_mandatory,
            })),
          };
        }
      } catch (err: any) {
        console.warn('[SetupService.updateVisitType] DB error:', err.message);
      }
    }
    return { visitTypeId: Number(id), ...data };
  }

  public async deleteVisitType(id: number): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.m_visit_type_checkpoint.deleteMany({ where: { visit_type_id: Number(id) } });
        await db.m_visit_type.delete({ where: { visit_type_id: Number(id) } });
        return { success: true };
      } catch (err: any) {
        console.warn('[SetupService.deleteVisitType] DB error:', err.message);
      }
    }
    return { success: true };
  }

  public async getCheckpoints(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_checkpoint.findMany({ orderBy: { checkpoint_id: 'asc' } });
        return rows.map((r) => ({
          checkpointId: r.checkpoint_id,
          siteId: r.site_id,
          gateId: r.gate_id,
          checkpointCode: r.checkpoint_code,
          checkpointName: r.checkpoint_name,
          checkpointKind: r.checkpoint_kind,
          isActive: r.is_active ?? true,
        }));
      } catch (err: any) {
        console.warn('[SetupService.getCheckpoints] DB error:', err.message);
      }
    }
    return [];
  }

  public async createCheckpoint(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const VALID_KINDS = ['OUTER_IN', 'INNER_IN', 'WEIGH_IN', 'INNER_OUT', 'WEIGH_OUT', 'OUTER_OUT', 'OTHER'];
        const siteId = data.siteId ? Number(data.siteId) : 1;
        const code = (data.checkpointCode || `CP_${Date.now() % 10000}`).toUpperCase();
        const name = data.checkpointName || 'New Checkpoint';
        const rawKind = (data.checkpointKind || 'OUTER_IN').toUpperCase();
        const kind = VALID_KINDS.includes(rawKind) ? rawKind : 'OTHER';
        const gateId = data.gateId ? Number(data.gateId) : null;
        const isActive = data.isActive ?? true;

        const created = await db.m_checkpoint.create({
          data: {
            site_id: siteId,
            checkpoint_code: code,
            checkpoint_name: name,
            checkpoint_kind: kind,
            gate_id: gateId,
            is_active: isActive,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
        });
        return {
          checkpointId: created.checkpoint_id,
          siteId: created.site_id,
          checkpointCode: created.checkpoint_code,
          checkpointName: created.checkpoint_name,
          checkpointKind: created.checkpoint_kind,
          gateId: created.gate_id,
          isActive: created.is_active ?? true,
        };
      } catch (err: any) {
        console.warn('[SetupService.createCheckpoint] DB error:', err.message);
      }
    }
    return { checkpointId: Date.now() % 10000, ...data };
  }

  public async updateCheckpoint(id: number, data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const VALID_KINDS = ['OUTER_IN', 'INNER_IN', 'WEIGH_IN', 'INNER_OUT', 'WEIGH_OUT', 'OUTER_OUT', 'OTHER'];
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.checkpointName) updateData.checkpoint_name = data.checkpointName;
        if (data.checkpointCode) updateData.checkpoint_code = data.checkpointCode;
        if (data.checkpointKind) {
          const rawKind = String(data.checkpointKind).toUpperCase();
          updateData.checkpoint_kind = VALID_KINDS.includes(rawKind) ? rawKind : 'OTHER';
        }
        if (data.gateId !== undefined) updateData.gate_id = data.gateId ? Number(data.gateId) : null;
        if (data.isActive !== undefined) updateData.is_active = Boolean(data.isActive);

        const updated = await db.m_checkpoint.update({
          where: { checkpoint_id: Number(id) },
          data: updateData,
        });
        return {
          checkpointId: updated.checkpoint_id,
          siteId: updated.site_id,
          checkpointCode: updated.checkpoint_code,
          checkpointName: updated.checkpoint_name,
          checkpointKind: updated.checkpoint_kind,
          gateId: updated.gate_id,
          isActive: updated.is_active ?? true,
        };
      } catch (err: any) {
        console.warn('[SetupService.updateCheckpoint] DB error:', err.message);
      }
    }
    return { checkpointId: Number(id), ...data };
  }

  public async deleteCheckpoint(id: number): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        await db.m_visit_type_checkpoint.deleteMany({ where: { checkpoint_id: Number(id) } });
        await db.m_checkpoint.delete({ where: { checkpoint_id: Number(id) } });
        return { success: true };
      } catch (err: any) {
        console.warn('[SetupService.deleteCheckpoint] DB error:', err.message);
      }
    }
    return { success: true };
  }

  // =========================================================================
  // 4. Unit Types & Checks
  // =========================================================================
  public async getUnitTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_unit_type.findMany({ orderBy: { unit_type_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedUnitTypes.find((u) => u.typeCode === r.type_code) || seedUnitTypes[i] || seedUnitTypes[0]) as any;
          return {
            unitTypeId: r.unit_type_id,
            typeCode: r.type_code,
            typeName: r.type_name,
            category: r.unit_category,
            unitCategory: r.unit_category,
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
            unit_category: data.category || 'CONTAINER',
            length_ft: data.lengthFt ? Number(data.lengthFt) : 20,
            teu: data.teu ? Number(data.teu) : 1.0,
            is_reefer: !!data.isReefer,
            is_active: data.isActive ?? true,
            createdby: 'SYSTEM',
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
        await db.m_unit_type.updateMany({
          where: { type_code: code },
          data: {
            type_name: data.typeName,
            unit_category: data.category,
            is_active: data.isActive,
            updatedate: new Date(),
            updatedby: 'SYSTEM',
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
  public async getTrucks(query?: any): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_truck.findMany({
          include: { m_party_m_truck: true },
          orderBy: { truck_id: 'desc' },
        });
        if (rows.length > 0) {
          const mapped = rows.map((t) => ({
            truckId: t.truck_id,
            plateNo: t.plate_no,
            plateDisplay: t.plate_display || t.plate_no,
            vehicleKind: t.vehicle_kind || 'TRUCK',
            transporterPartyId: t.transporter_party_id || 7,
            carrierPartyId: t.transporter_party_id || 7,
            transporterName: t.m_party_m_truck?.party_name || 'Twiga Minerals Corporation',
            carrierName: t.m_party_m_truck?.party_name || 'Twiga Minerals Corporation',
            countryCode: t.country_code || 'TZ',
            makeModel: t.make_model || 'Standard Truck',
            axleCount: t.axle_count ?? 3,
            tareKg: t.tare_kg ?? 9200,
            source: t.source || 'NG',
            syncStatus: t.sync_status || 'SYNCED',
            ngRefId: t.ng_ref_id || undefined,
            gateBlocked: !(t.is_active ?? true),
            localNote: (t as any).local_note || undefined,
            isActive: t.is_active ?? true,
            isBlacklisted: !(t.is_active ?? true),
          }));

          if (query?.q) {
            const q = String(query.q).toUpperCase().replace(/\s/g, '');
            return mapped.filter(
              (m) =>
                m.plateNo.replace(/\s/g, '').includes(q) ||
                m.plateDisplay.toUpperCase().replace(/\s/g, '').includes(q) ||
                m.makeModel.toUpperCase().includes(q) ||
                m.transporterName.toUpperCase().includes(q)
            );
          }
          return mapped;
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
        const party = (await db.m_party.findFirst()) || { party_id: 1 };
        const rawPlate = String(data.plateDisplay || data.plateNo || 'T 000 AAA');
        const plateNo = rawPlate.replace(/\s/g, '').toUpperCase();
        const plateDisplay = data.plateDisplay || rawPlate;

        const created = await db.m_truck.create({
          data: {
            plate_no: plateNo,
            plate_display: plateDisplay,
            vehicle_kind: data.vehicleKind || 'TRUCK',
            transporter_party_id: data.transporterPartyId || data.carrierPartyId ? Number(data.transporterPartyId || data.carrierPartyId) : party.party_id,
            country_code: data.countryCode || 'TZ',
            make_model: data.makeModel || 'Standard Truck',
            axle_count: data.axleCount ? Number(data.axleCount) : 3,
            tare_kg: data.tareKg ? Number(data.tareKg) : 9000,
            source: data.source || 'LOCAL',
            sync_status: data.syncStatus || 'PROVISIONAL',
            ng_ref_id: data.ngRefId || null,
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
          include: { m_party_m_truck: true },
        });

        return {
          truckId: created.truck_id,
          plateNo: created.plate_no,
          plateDisplay: created.plate_display,
          vehicleKind: created.vehicle_kind,
          transporterPartyId: created.transporter_party_id,
          carrierPartyId: created.transporter_party_id,
          transporterName: created.m_party_m_truck?.party_name || 'Transporter',
          carrierName: created.m_party_m_truck?.party_name || 'Transporter',
          countryCode: created.country_code,
          makeModel: created.make_model,
          axleCount: created.axle_count,
          tareKg: created.tare_kg,
          source: created.source,
          syncStatus: created.sync_status,
          ngRefId: created.ng_ref_id || undefined,
          isActive: created.is_active,
          isBlacklisted: !created.is_active,
          localNote: data.localNote,
          gateBlocked: Boolean(data.gateBlocked),
        };
      } catch (err) {
        console.warn('[SetupService.createTruck] DB error:', err);
      }
    }
    const item = { truckId: Date.now() % 100000, ...data };
    seedTrucks.push(item as any);
    return item;
  }

  public async updateTruck(id: number | string, data: any): Promise<any> {
    const db = this.db;
    const numId = Number(id);
    if (db) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.plateNo) updateData.plate_no = String(data.plateNo).replace(/\s/g, '').toUpperCase();
        if (data.plateDisplay) updateData.plate_display = String(data.plateDisplay);
        if (data.vehicleKind) updateData.vehicle_kind = String(data.vehicleKind);
        if (data.makeModel) updateData.make_model = String(data.makeModel);
        if (data.axleCount !== undefined) updateData.axle_count = Number(data.axleCount);
        if (data.tareKg !== undefined) updateData.tare_kg = Number(data.tareKg);
        if (data.transporterPartyId !== undefined) updateData.transporter_party_id = Number(data.transporterPartyId);
        if (data.carrierPartyId !== undefined) updateData.transporter_party_id = Number(data.carrierPartyId);
        if (data.countryCode) updateData.country_code = String(data.countryCode);
        if (data.source) updateData.source = String(data.source);
        if (data.syncStatus) updateData.sync_status = String(data.syncStatus);
        if (data.isActive !== undefined) updateData.is_active = Boolean(data.isActive);
        if (data.gateBlocked !== undefined) updateData.is_active = !Boolean(data.gateBlocked);

        const updated = await db.m_truck.update({
          where: { truck_id: numId },
          data: updateData,
          include: { m_party_m_truck: true },
        });

        return {
          truckId: updated.truck_id,
          plateNo: updated.plate_no,
          plateDisplay: updated.plate_display,
          vehicleKind: updated.vehicle_kind,
          transporterPartyId: updated.transporter_party_id,
          carrierPartyId: updated.transporter_party_id,
          transporterName: updated.m_party_m_truck?.party_name || 'Transporter',
          carrierName: updated.m_party_m_truck?.party_name || 'Transporter',
          countryCode: updated.country_code,
          makeModel: updated.make_model,
          axleCount: updated.axle_count,
          tareKg: updated.tare_kg,
          source: updated.source,
          syncStatus: updated.sync_status,
          ngRefId: updated.ng_ref_id || undefined,
          isActive: updated.is_active,
          isBlacklisted: !updated.is_active,
          gateBlocked: data.gateBlocked !== undefined ? Boolean(data.gateBlocked) : !updated.is_active,
          localNote: data.localNote,
        };
      } catch (err) {
        console.warn('[SetupService.updateTruck] DB error:', err);
      }
    }
    return { truckId: numId, ...data };
  }

  public async getDrivers(query?: any): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_driver.findMany({
          include: { m_party_m_driver: true },
          orderBy: { driver_id: 'desc' },
        });
        if (rows.length > 0) {
          const mapped = rows.map((d) => ({
            driverId: d.driver_id,
            driverName: d.driver_name,
            fullName: d.driver_name,
            licenceNo: d.licence_no,
            licenceClass: d.licence_class || 'E',
            licenceExpiry: d.licence_expiry ? d.licence_expiry.toISOString().split('T')[0] : null,
            licenceCountry: d.licence_country || 'TZ',
            phone: d.phone || '+255 754 000 000',
            transporterPartyId: d.transporter_party_id || 7,
            transporterName: d.m_party_m_driver?.party_name || 'Twiga Minerals Corporation',
            source: d.source || 'NG',
            syncStatus: d.sync_status || 'SYNCED',
            ngRefId: d.ng_ref_id || undefined,
            localNote: (d as any).local_note || undefined,
            isActive: d.is_active ?? true,
            isBlacklisted: !(d.is_active ?? true),
          }));

          if (query?.q) {
            const q = String(query.q).toUpperCase().replace(/\s/g, '');
            return mapped.filter(
              (m) =>
                m.driverName.toUpperCase().replace(/\s/g, '').includes(q) ||
                m.licenceNo.replace(/\s/g, '').includes(q) ||
                m.transporterName.toUpperCase().includes(q)
            );
          }
          return mapped;
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
        const party = (await db.m_party.findFirst()) || { party_id: 1 };
        const created = await db.m_driver.create({
          data: {
            driver_name: data.driverName || data.fullName || 'New Driver',
            licence_no: String(data.licenceNo || Date.now()),
            licence_class: data.licenceClass || 'E',
            licence_expiry: data.licenceExpiry ? new Date(data.licenceExpiry) : new Date(Date.now() + 365 * 86400000),
            licence_country: data.licenceCountry || 'TZ',
            phone: data.phone || '',
            transporter_party_id: data.transporterPartyId ? Number(data.transporterPartyId) : party.party_id,
            source: data.source || 'LOCAL',
            sync_status: data.syncStatus || 'PROVISIONAL',
            ng_ref_id: data.ngRefId || null,
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
          include: { m_party_m_driver: true },
        });

        return {
          driverId: created.driver_id,
          driverName: created.driver_name,
          fullName: created.driver_name,
          licenceNo: created.licence_no,
          licenceClass: created.licence_class,
          licenceExpiry: created.licence_expiry ? created.licence_expiry.toISOString().split('T')[0] : null,
          licenceCountry: created.licence_country,
          phone: created.phone,
          transporterPartyId: created.transporter_party_id,
          transporterName: created.m_party_m_driver?.party_name || 'Transporter',
          source: created.source,
          syncStatus: created.sync_status,
          ngRefId: created.ng_ref_id || undefined,
          isActive: created.is_active,
          isBlacklisted: !created.is_active,
          localNote: data.localNote,
        };
      } catch (err) {
        console.warn('[SetupService.createDriver] DB error:', err);
      }
    }
    const item = { driverId: Date.now() % 100000, ...data };
    seedDrivers.push(item as any);
    return item;
  }

  public async updateDriver(id: number | string, data: any): Promise<any> {
    const db = this.db;
    const numId = Number(id);
    if (db) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.driverName || data.fullName) updateData.driver_name = String(data.driverName || data.fullName);
        if (data.licenceNo) updateData.licence_no = String(data.licenceNo);
        if (data.licenceClass) updateData.licence_class = String(data.licenceClass);
        if (data.licenceExpiry) updateData.licence_expiry = new Date(data.licenceExpiry);
        if (data.licenceCountry) updateData.licence_country = String(data.licenceCountry);
        if (data.phone !== undefined) updateData.phone = String(data.phone);
        if (data.transporterPartyId !== undefined) updateData.transporter_party_id = Number(data.transporterPartyId);
        if (data.source) updateData.source = String(data.source);
        if (data.syncStatus) updateData.sync_status = String(data.syncStatus);
        if (data.isActive !== undefined) updateData.is_active = Boolean(data.isActive);

        const updated = await db.m_driver.update({
          where: { driver_id: numId },
          data: updateData,
          include: { m_party_m_driver: true },
        });

        return {
          driverId: updated.driver_id,
          driverName: updated.driver_name,
          fullName: updated.driver_name,
          licenceNo: updated.licence_no,
          licenceClass: updated.licence_class,
          licenceExpiry: updated.licence_expiry ? updated.licence_expiry.toISOString().split('T')[0] : null,
          licenceCountry: updated.licence_country,
          phone: updated.phone,
          transporterPartyId: updated.transporter_party_id,
          transporterName: updated.m_party_m_driver?.party_name || 'Transporter',
          source: updated.source,
          syncStatus: updated.sync_status,
          ngRefId: updated.ng_ref_id || undefined,
          isActive: updated.is_active,
          isBlacklisted: !updated.is_active,
          localNote: data.localNote,
        };
      } catch (err) {
        console.warn('[SetupService.updateDriver] DB error:', err);
      }
    }
    return { driverId: numId, ...data };
  }

  public async getVessels(query?: any): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_vessel.findMany({
          include: { m_party_m_vessel: true },
          orderBy: { vessel_id: 'asc' },
        });
        if (rows.length > 0) {
          const mapped = rows.map((v) => ({
            vesselId: v.vessel_id,
            vesselName: v.vessel_name,
            imoNo: v.imo_no || '',
            lloydsImo: v.imo_no || '',
            callSign: v.call_sign || '—',
            flagCountry: v.flag_country || 'TZ',
            countryCode: v.flag_country || 'TZ',
            operatorPartyId: v.operator_party_id || null,
            operatorName: v.m_party_m_vessel?.party_name || 'Shipping Line',
            source: 'NG',
            isActive: v.is_active ?? true,
          }));

          if (query?.q) {
            const q = String(query.q).toUpperCase();
            return mapped.filter(
              (m) =>
                m.vesselName.toUpperCase().includes(q) ||
                m.imoNo.includes(q) ||
                m.callSign.toUpperCase().includes(q) ||
                m.operatorName.toUpperCase().includes(q)
            );
          }
          return mapped;
        }
      } catch (err) {
        console.warn('[SetupService.getVessels] DB error:', err);
      }
    }
    return seedVessels;
  }

  public async createVessel(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.m_vessel.create({
          data: {
            vessel_name: data.vesselName || 'New Vessel',
            imo_no: data.imoNo || data.lloydsImo || null,
            call_sign: data.callSign || null,
            flag_country: data.flagCountry || data.countryCode || 'PA',
            operator_party_id: data.operatorPartyId ? Number(data.operatorPartyId) : 1,
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
          include: { m_party_m_vessel: true },
        });
        return {
          vesselId: created.vessel_id,
          vesselName: created.vessel_name,
          imoNo: created.imo_no,
          lloydsImo: created.imo_no,
          callSign: created.call_sign,
          flagCountry: created.flag_country,
          countryCode: created.flag_country,
          operatorPartyId: created.operator_party_id,
          operatorName: created.m_party_m_vessel?.party_name || 'Shipping Line',
          source: 'NG',
          isActive: created.is_active,
        };
      } catch (err) {
        console.warn('[SetupService.createVessel] DB error:', err);
      }
    }
    const item = { vesselId: Date.now() % 100000, ...data };
    seedVessels.push(item as any);
    return item;
  }

  public async updateVessel(id: number | string, data: any): Promise<any> {
    const db = this.db;
    const numId = Number(id);
    if (db) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.vesselName) updateData.vessel_name = String(data.vesselName);
        if (data.imoNo || data.lloydsImo) updateData.imo_no = String(data.imoNo || data.lloydsImo);
        if (data.callSign) updateData.call_sign = String(data.callSign);
        if (data.flagCountry || data.countryCode) updateData.flag_country = String(data.flagCountry || data.countryCode);
        if (data.operatorPartyId !== undefined) updateData.operator_party_id = Number(data.operatorPartyId);
        if (data.isActive !== undefined) updateData.is_active = Boolean(data.isActive);

        const updated = await db.m_vessel.update({
          where: { vessel_id: numId },
          data: updateData,
          include: { m_party_m_vessel: true },
        });
        return {
          vesselId: updated.vessel_id,
          vesselName: updated.vessel_name,
          imoNo: updated.imo_no,
          lloydsImo: updated.imo_no,
          callSign: updated.call_sign,
          flagCountry: updated.flag_country,
          countryCode: updated.flag_country,
          operatorPartyId: updated.operator_party_id,
          operatorName: updated.m_party_m_vessel?.party_name || 'Shipping Line',
          source: 'NG',
          isActive: updated.is_active,
        };
      } catch (err) {
        console.warn('[SetupService.updateVessel] DB error:', err);
      }
    }
    return { vesselId: numId, ...data };
  }

  public async getPorts(query?: any): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_port.findMany({ orderBy: { port_id: 'asc' } });
        if (rows.length > 0) {
          const mapped = rows.map((r) => ({
            portId: r.port_id,
            unlocode: r.unlocode,
            portCode: r.unlocode || 'PORT',
            portName: r.port_name,
            countryCode: r.country_code || 'TZ',
            portKind: r.port_kind || 'SEAPORT',
            isActive: r.is_active ?? true,
          }));

          if (query?.q) {
            const q = String(query.q).toUpperCase();
            return mapped.filter(
              (m) =>
                m.portName.toUpperCase().includes(q) ||
                (m.unlocode && m.unlocode.toUpperCase().includes(q)) ||
                m.countryCode.toUpperCase().includes(q)
            );
          }
          return mapped;
        }
      } catch (err) {
        console.warn('[SetupService.getPorts] DB error:', err);
      }
    }
    return seedPorts;
  }

  public async createPort(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.m_port.create({
          data: {
            port_name: data.portName || 'New Port',
            unlocode: data.unlocode || null,
            country_code: data.countryCode || 'TZ',
            port_kind: data.portKind || 'SEAPORT',
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
        });
        return {
          portId: created.port_id,
          unlocode: created.unlocode,
          portCode: created.unlocode || 'PORT',
          portName: created.port_name,
          countryCode: created.country_code,
          portKind: created.port_kind,
          isActive: created.is_active,
        };
      } catch (err) {
        console.warn('[SetupService.createPort] DB error:', err);
      }
    }
    const item = { portId: Date.now() % 100000, ...data };
    seedPorts.push(item as any);
    return item;
  }

  public async updatePort(id: number | string, data: any): Promise<any> {
    const db = this.db;
    const numId = Number(id);
    if (db) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.portName) updateData.port_name = String(data.portName);
        if (data.unlocode !== undefined) updateData.unlocode = data.unlocode || null;
        if (data.countryCode) updateData.country_code = String(data.countryCode);
        if (data.portKind) updateData.port_kind = String(data.portKind);
        if (data.isActive !== undefined) updateData.is_active = Boolean(data.isActive);

        const updated = await db.m_port.update({
          where: { port_id: numId },
          data: updateData,
        });
        return {
          portId: updated.port_id,
          unlocode: updated.unlocode,
          portCode: updated.unlocode || 'PORT',
          portName: updated.port_name,
          countryCode: updated.country_code,
          portKind: updated.port_kind,
          isActive: updated.is_active,
        };
      } catch (err) {
        console.warn('[SetupService.updatePort] DB error:', err);
      }
    }
    return { portId: numId, ...data };
  }

  public async getCommodities(query?: any): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_commodity.findMany({ orderBy: { commodity_id: 'asc' } });
        if (rows.length > 0) {
          const mapped = rows.map((r) => ({
            commodityId: r.commodity_id,
            commodityCode: r.commodity_code,
            commodityName: r.commodity_name,
            hsCode: r.hs_code || '',
            isHazardous: r.is_hazardous ?? false,
            isActive: r.is_active ?? true,
          }));

          if (query?.q) {
            const q = String(query.q).toUpperCase();
            return mapped.filter(
              (m) =>
                m.commodityCode.toUpperCase().includes(q) ||
                m.commodityName.toUpperCase().includes(q) ||
                m.hsCode.includes(q)
            );
          }
          return mapped;
        }
      } catch (err) {
        console.warn('[SetupService.getCommodities] DB error:', err);
      }
    }
    return seedCommodities;
  }

  public async createCommodity(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.m_commodity.create({
          data: {
            commodity_code: String(data.commodityCode || data.code || 'COMM').toUpperCase(),
            commodity_name: String(data.commodityName || data.name || 'New Commodity'),
            hs_code: data.hsCode || null,
            is_hazardous: Boolean(data.isHazardous),
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
        });
        return {
          commodityId: created.commodity_id,
          commodityCode: created.commodity_code,
          commodityName: created.commodity_name,
          hsCode: created.hs_code,
          isHazardous: created.is_hazardous,
          isActive: created.is_active,
        };
      } catch (err) {
        console.warn('[SetupService.createCommodity] DB error:', err);
      }
    }
    const item = { commodityId: Date.now() % 100000, ...data };
    seedCommodities.push(item as any);
    return item;
  }

  public async updateCommodity(id: number | string, data: any): Promise<any> {
    const db = this.db;
    const numId = Number(id);
    if (db) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.commodityCode || data.code) updateData.commodity_code = String(data.commodityCode || data.code).toUpperCase();
        if (data.commodityName || data.name) updateData.commodity_name = String(data.commodityName || data.name);
        if (data.hsCode !== undefined) updateData.hs_code = data.hsCode || null;
        if (data.isHazardous !== undefined) updateData.is_hazardous = Boolean(data.isHazardous);
        if (data.isActive !== undefined) updateData.is_active = Boolean(data.isActive);

        const updated = await db.m_commodity.update({
          where: { commodity_id: numId },
          data: updateData,
        });
        return {
          commodityId: updated.commodity_id,
          commodityCode: updated.commodity_code,
          commodityName: updated.commodity_name,
          hsCode: updated.hs_code,
          isHazardous: updated.is_hazardous,
          isActive: updated.is_active,
        };
      } catch (err) {
        console.warn('[SetupService.updateCommodity] DB error:', err);
      }
    }
    return { commodityId: numId, ...data };
  }

  public async getEquipment(query?: any): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_equipment.findMany({ orderBy: { equipment_id: 'asc' } });
        if (rows.length > 0) {
          const mapped = rows.map((e) => ({
            equipmentId: e.equipment_id,
            siteId: e.site_id,
            equipmentCode: e.equipment_code,
            equipmentName: e.equipment_name || e.equipment_code,
            equipmentType: e.equipment_type || 'REACH_STACKER',
            capacityKg: e.capacity_kg ?? 45000,
            status: (e as any).status || 'AVAILABLE',
            isActive: e.is_active ?? true,
          }));

          if (query?.q) {
            const q = String(query.q).toUpperCase();
            return mapped.filter(
              (m) =>
                m.equipmentCode.toUpperCase().includes(q) ||
                m.equipmentName.toUpperCase().includes(q) ||
                m.equipmentType.toUpperCase().includes(q)
            );
          }
          return mapped;
        }
      } catch (err) {
        console.warn('[SetupService.getEquipment] DB error:', err);
      }
    }
    return seedEquipment;
  }

  public async createEquipment(data: any): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const created = await db.m_equipment.create({
          data: {
            site_id: data.siteId ? Number(data.siteId) : 1,
            equipment_code: String(data.equipmentCode || data.code || 'EQ-01').toUpperCase(),
            equipment_name: String(data.equipmentName || data.name || 'New Equipment'),
            equipment_type: String(data.equipmentType || data.type || 'REACH_STACKER'),
            capacity_kg: data.capacityKg ? Number(data.capacityKg) : 45000,
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
            createdby: 'SYSTEM',
            log_inst: 1,
          },
        });
        return {
          equipmentId: created.equipment_id,
          siteId: created.site_id,
          equipmentCode: created.equipment_code,
          equipmentName: created.equipment_name,
          equipmentType: created.equipment_type,
          capacityKg: created.capacity_kg,
          status: 'AVAILABLE',
          isActive: created.is_active,
        };
      } catch (err) {
        console.warn('[SetupService.createEquipment] DB error:', err);
      }
    }
    const item = { equipmentId: Date.now() % 100000, ...data };
    seedEquipment.push(item as any);
    return item;
  }

  public async updateEquipment(id: number | string, data: any): Promise<any> {
    const db = this.db;
    const numId = Number(id);
    if (db) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.equipmentCode || data.code) updateData.equipment_code = String(data.equipmentCode || data.code).toUpperCase();
        if (data.equipmentName || data.name) updateData.equipment_name = String(data.equipmentName || data.name);
        if (data.equipmentType || data.type) updateData.equipment_type = String(data.equipmentType || data.type);
        if (data.capacityKg !== undefined) updateData.capacity_kg = Number(data.capacityKg);
        if (data.siteId !== undefined) updateData.site_id = Number(data.siteId);
        if (data.isActive !== undefined) updateData.is_active = Boolean(data.isActive);

        const updated = await db.m_equipment.update({
          where: { equipment_id: numId },
          data: updateData,
        });
        return {
          equipmentId: updated.equipment_id,
          siteId: updated.site_id,
          equipmentCode: updated.equipment_code,
          equipmentName: updated.equipment_name,
          equipmentType: updated.equipment_type,
          capacityKg: updated.capacity_kg,
          status: 'AVAILABLE',
          isActive: updated.is_active,
        };
      } catch (err) {
        console.warn('[SetupService.updateEquipment] DB error:', err);
      }
    }
    return { equipmentId: numId, ...data };
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
            user_sub: data.userSub || ('usr_' + Date.now()),
            user_name: data.fullName || data.userName,
            email: data.email,
            phone: data.phone,
            is_active: data.isActive ?? true,
            createdby: 'SYSTEM',
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
            module: p.module_code,
            moduleCode: p.module_code,
            action: p.permission_code.split('.').pop() || 'manage',
            scopeAllowed: 'SITE',
            description: p.description,
            isApproval: p.is_approval,
            supportsLimit: p.supports_limit,
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
          include: { m_cargo_regime: true },
          orderBy: { release_rule_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            releaseRuleId: r.release_rule_id,
            cargoRegimeId: r.cargo_regime_id,
            regimeCode: r.m_cargo_regime?.regime_code || 'LOCAL',
            conditionCode: r.condition_code,
            unitCategory: r.unit_category || 'ALL',
            atApproval: r.at_approval,
            atGateOut: r.at_gate_out,
            canOverride: r.can_override,
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
        const rows = await db.m_approval_policy.findMany({
          orderBy: { approval_policy_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r) => ({
            approvalPolicyId: r.approval_policy_id,
            permissionCode: r.permission_code,
            siteId: r.site_id,
            amountFrom: Number(r.amount_from),
            amountCurrency: r.amount_currency || 'USD',
            levelsRequired: r.levels_required,
            expiresAfterHours: r.expires_after_hours,
            isActive: r.is_active,
            logInst: r.log_inst,
          }));
        }
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
        const rows = await db.m_exception_type.findMany({
          orderBy: { exception_code: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((e) => ({
            exceptionTypeId: e.exception_type_id,
            exceptionCode: e.exception_code,
            exceptionName: e.exception_name,
            severity: e.severity,
            slaMinutes: e.sla_minutes,
            supervisorClose: e.supervisor_close,
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
          orderBy: { inspection_template_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((t) => ({
            templateId: t.inspection_template_id,
            inspectionTemplateId: t.inspection_template_id,
            templateCode: t.template_code,
            templateName: t.template_name,
            unitTypeKind: t.unit_category,
            unitCategory: t.unit_category,
            isActive: t.is_active,
            minPhotos: t.min_photos,
            items: t.m_inspection_item.map((i) => ({
              itemId: i.inspection_item_id,
              itemCode: i.item_code,
              itemName: i.item_name,
              itemLabel: i.item_name,
              area: i.area,
              inputType: i.input_type,
              isMandatory: i.is_mandatory,
              sortOrder: i.sort_order,
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
            damageCode: d.damage_code,
            damageName: d.damage_name,
            appliesTo: d.applies_to,
            component: d.damage_code.slice(0, 2),
            type: d.damage_code.slice(2, 4) || 'GEN',
            severity: 'MOD',
            description: d.damage_name,
            isActive: true,
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
        const rows = await db.m_charge_code.findMany({ orderBy: { charge_code_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedChargeCodes.find((s) => s.chargeCode === r.charge_code) || seedChargeCodes[i] || seedChargeCodes[0]) as any;
          return {
            chargeCodeId: r.charge_code_id,
            chargeCode: r.charge_code,
            chargeName: r.charge_name,
            uom: seed.uom || 'DAY',
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
        const rows = await db.m_tax_code.findMany({ orderBy: { tax_code_id: 'asc' } });
        return rows.map((r, i) => {
          const seed = (seedTaxCodes.find((s) => s.taxCode === r.tax_code) || seedTaxCodes[i] || seedTaxCodes[0]) as any;
          return {
            taxCodeId: r.tax_code_id,
            taxCode: r.tax_code,
            taxName: r.tax_name,
            ratePercent: Number(r.rate_pct),
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
        const rows = await db.m_notification_template.findMany({
          orderBy: { notification_template_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r, i) => {
            const seed = (seedNotificationTemplates.find((s) => s.templateCode === r.template_code) || seedNotificationTemplates[i] || seedNotificationTemplates[0]) as any;
            return {
              notificationTemplateId: r.notification_template_id,
              templateId: r.notification_template_id,
              templateCode: r.template_code,
              eventType: r.event_type || seed?.eventType || 'UnitGatedIn',
              channel: r.channel || seed?.channel || 'SMS',
              languageCode: r.language_code || seed?.languageCode || 'en',
              subject: r.subject || seed?.subject || null,
              subjectTemplate: r.subject || seed?.subject || null,
              body: r.body || seed?.body || '',
              bodyTemplate: r.body || seed?.body || '',
              isActive: r.is_active ?? true,
              draft: seed?.draft ?? false,
            };
          });
        }
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
        const rows = await db.m_print_template.findMany({
          orderBy: { print_template_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((r, i) => {
            const seed = (seedPrintTemplates[i] || seedPrintTemplates[0]) as any;
            return {
              printTemplateId: r.print_template_id,
              templateCode: r.doc_kind,
              docKind: r.doc_kind,
              templateName: r.template_name,
              paperSize: r.paper_size || seed.paperSize || 'A4',
              orientation: seed.orientation || 'PORTRAIT',
              copies: r.default_copies || seed.copies || 1,
              reprintWatermark: r.reprint_watermark,
              status: r.status,
              isActive: r.status === 'APPROVED' || r.status === 'ACTIVE',
            };
          });
        }
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
          include: { m_device_integration_gate_lanes: true, m_device_integration_devices: true },
          orderBy: { device_integration_id: 'asc' },
        });
        if (rows.length > 0) {
          return rows.map((di) => ({
            deviceIntegrationId: di.device_integration_id,
            siteId: di.site_id,
            integrationKind: di.integration_kind,
            gateLaneId: di.gate_lane_id,
            lane: di.m_device_integration_gate_lanes?.lane_code ? ('Main gate · ' + di.m_device_integration_gate_lanes.lane_code) : 'Lane 1',
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
