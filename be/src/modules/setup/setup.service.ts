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
  delegations as seedDelegations,
  holdTypesSeed as seedHoldTypes,
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
          return rows.map((r) => {
            const kind = (r.location_kind || (r.level_no === 1 ? 'AREA' : r.level_no === 2 ? 'BLOCK' : 'SLOT')).toUpperCase();
            const cleanCode = (r.location_code || '').replace('BLOCK-', '');
            const name = kind === 'BLOCK'
              ? `Block ${cleanCode} · ${cleanCode === 'R' ? 'Reefer stack' : cleanCode === 'EXAM' ? 'Customs inspection' : cleanCode === 'C' ? 'Empties' : cleanCode === 'B' ? 'Heavy & transit' : 'Import full'}`
              : kind === 'AREA'
                ? `Area ${r.location_code} · Main container yard`
                : r.location_code;

            const rowsCount = (r as any).rows || (kind === 'BLOCK' ? (cleanCode === 'R' ? 4 : cleanCode === 'EXAM' ? 2 : 6) : undefined);
            const baysCount = (r as any).bays || (kind === 'BLOCK' ? (cleanCode === 'R' ? 8 : cleanCode === 'EXAM' ? 6 : 12) : undefined);
            const maxTier = r.max_tier || (kind === 'BLOCK' ? 4 : 1);

            return {
              yardLocationId: r.yard_location_id,
              siteId: r.site_id,
              parentId: r.parent_id,
              levelNo: r.level_no,
              locationCode: r.location_code,
              fullCode: r.full_code,
              locationKind: kind,
              kind,
              name,
              rows: rowsCount,
              bays: baysCount,
              isSlot: r.is_slot,
              allows20: r.allows_20,
              allows40: r.allows_40,
              allows45: r.allows_45,
              maxTier,
              maxWeightKg: r.max_weight_kg,
              baySize: r.bay_size,
              reeferPlugNo: r.reefer_plug_no,
              map: (r.map_x != null && r.map_y != null) ? {
                x: Number(r.map_x),
                y: Number(r.map_y),
                w: Number(r.map_w || 160),
                h: Number(r.map_h || 120),
              } : (kind === 'BLOCK' ? {
                x: cleanCode === 'A' ? 40 : cleanCode === 'B' ? 440 : cleanCode === 'C' ? 40 : cleanCode === 'R' ? 380 : cleanCode === 'EXAM' ? 380 : 720,
                y: cleanCode === 'A' ? 40 : cleanCode === 'B' ? 40 : cleanCode === 'C' ? 230 : cleanCode === 'R' ? 225 : cleanCode === 'EXAM' ? 318 : 230,
                w: cleanCode === 'A' || cleanCode === 'B' ? 360 : cleanCode === 'C' || cleanCode === 'R' ? 300 : 180,
                h: cleanCode === 'A' || cleanCode === 'B' ? 150 : cleanCode === 'C' ? 125 : cleanCode === 'R' ? 80 : cleanCode === 'EXAM' ? 50 : 125,
              } : undefined),
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
            };
          });
        }
      } catch (err: any) {
        console.warn('[SetupService.getYardLocations] DB error:', err.message);
      }
    }
    return siteId ? seedYardNodes.filter((n) => !n.siteId || n.siteId === siteId) : seedYardNodes;
  }

  public async createYardLocation(data: any): Promise<any> {
    const db = this.db;
    const siteId = Number(data.siteId || 1);
    const code = String(data.locationCode || data.code || data.name || `LOC-${Date.now()}`);
    const kind = String(data.kind || data.locationKind || 'AREA').toUpperCase();
    const fullCode = String(data.fullCode || code);

    if (db) {
      try {
        const created = await db.m_yard_location.create({
          data: {
            site_id: siteId,
            parent_id: data.parentId ? Number(data.parentId) : null,
            level_no: Number(data.levelNo || (kind === 'AREA' ? 1 : kind === 'BLOCK' ? 2 : 3)),
            location_code: code,
            full_code: fullCode,
            location_kind: kind,
            is_slot: Boolean(data.isSlot || kind === 'SLOT'),
            allows_20: data.allows20 ?? true,
            allows_40: data.allows40 ?? true,
            allows_45: data.allows45 ?? false,
            max_tier: data.maxTier ? Number(data.maxTier) : 4,
            max_weight_kg: data.maxWeightKg ? Number(data.maxWeightKg) : 32500,
            reefer_plug_no: data.reeferPlugNo || null,
            map_x: data.map?.x ?? data.mapX ?? null,
            map_y: data.map?.y ?? data.mapY ?? null,
            map_w: data.map?.w ?? data.mapW ?? null,
            map_h: data.map?.h ?? data.mapH ?? null,
            is_blocked: Boolean(data.isBlocked),
            blocked_reason: data.blockedReason || null,
            is_active: true,
            createdby: 'SYSTEM',
          },
        });

        const resultNode = {
          yardLocationId: created.yard_location_id,
          locationId: created.yard_location_id,
          siteId: created.site_id,
          parentId: created.parent_id,
          levelNo: created.level_no,
          locationCode: created.location_code,
          fullCode: created.full_code,
          name: created.location_code,
          kind: created.location_kind,
          locationKind: created.location_kind,
          isSlot: created.is_slot,
          allows20: created.allows_20,
          allows40: created.allows_40,
          allows45: created.allows_45,
          maxTier: created.max_tier,
          maxWeightKg: created.max_weight_kg,
          isBlocked: created.is_blocked,
          blockedReason: created.blocked_reason,
          tags: data.tags || [],
        };
        seedYardNodes.push(resultNode as any);
        return resultNode;
      } catch (err: any) {
        console.warn('[SetupService.createYardLocation] DB error:', err.message);
      }
    }
    const nextId = seedYardNodes.reduce((max, n) => Math.max(max, (n.yardLocationId && n.yardLocationId <= 2000000) ? n.yardLocationId : 0), 1000) + 1;
    const node = {
      yardLocationId: nextId,
      locationId: nextId,
      siteId,
      parentId: data.parentId ? Number(data.parentId) : null,
      levelNo: Number(data.levelNo || (kind === 'AREA' ? 1 : kind === 'BLOCK' ? 2 : 3)),
      locationCode: code,
      fullCode,
      name: data.name || code,
      kind,
      locationKind: kind,
      rows: data.rows,
      bays: data.bays,
      maxTier: data.maxTier || (kind === 'BLOCK' ? 4 : 1),
      isSlot: Boolean(data.isSlot || kind === 'SLOT'),
      allows20: data.allows20 ?? true,
      allows40: data.allows40 ?? true,
      allows45: data.allows45 ?? false,
      maxWeightKg: data.maxWeightKg || 32500,
      tags: data.tags || [],
      isActive: true,
      ...data,
    };
    seedYardNodes.push(node as any);
    return node;
  }

  public async updateYardLocation(id: string | number, data: any): Promise<any> {
    const db = this.db;
    const locId = Number(id);
    const isSafeInt = Number.isFinite(locId) && locId > 0 && locId <= 2147483647;

    if (db && isSafeInt) {
      try {
        const updateData: any = {
          updatedate: new Date(),
          updatedby: 'SYSTEM',
        };
        if (data.locationCode !== undefined) updateData.location_code = data.locationCode;
        if (data.fullCode !== undefined) updateData.full_code = data.fullCode;
        if (data.kind !== undefined || data.locationKind !== undefined) updateData.location_kind = (data.kind || data.locationKind).toUpperCase();
        if (data.allows20 !== undefined) updateData.allows_20 = Boolean(data.allows20);
        if (data.allows40 !== undefined) updateData.allows_40 = Boolean(data.allows40);
        if (data.allows45 !== undefined) updateData.allows_45 = Boolean(data.allows45);
        if (data.maxTier !== undefined) updateData.max_tier = Number(data.maxTier);
        if (data.maxWeightKg !== undefined) updateData.max_weight_kg = Number(data.maxWeightKg);
        if (data.reeferPlugNo !== undefined) updateData.reefer_plug_no = data.reeferPlugNo;
        if (data.isBlocked !== undefined) updateData.is_blocked = Boolean(data.isBlocked);
        if (data.blockedReason !== undefined) updateData.blocked_reason = data.blockedReason;
        if (data.map?.x !== undefined || data.mapX !== undefined) updateData.map_x = data.map?.x ?? data.mapX;
        if (data.map?.y !== undefined || data.mapY !== undefined) updateData.map_y = data.map?.y ?? data.mapY;
        if (data.map?.w !== undefined || data.mapW !== undefined) updateData.map_w = data.map?.w ?? data.mapW;
        if (data.map?.h !== undefined || data.mapH !== undefined) updateData.map_h = data.map?.h ?? data.mapH;

        const existing = await db.m_yard_location.findUnique({
          where: { yard_location_id: locId },
        });

        if (existing) {
          const updated = await db.m_yard_location.update({
            where: { yard_location_id: locId },
            data: updateData,
          });

          // Persist tags if provided
          if (Array.isArray(data.tags)) {
            try {
              await db.m_yard_location_tag.deleteMany({
                where: { yard_location_id: locId },
              });
              for (const tagCode of data.tags) {
                let tag = await db.m_location_tag.findFirst({
                  where: { tag_code: tagCode },
                });
                if (!tag) {
                  tag = await db.m_location_tag.create({
                    data: {
                      tag_code: tagCode,
                      tag_name: tagCode,
                      createdby: 'SYSTEM',
                    },
                  });
                }
                await db.m_yard_location_tag.create({
                  data: {
                    yard_location_id: locId,
                    location_tag_id: tag.location_tag_id,
                    createdby: 'SYSTEM',
                  },
                });
              }
            } catch (tagErr: any) {
              console.warn('[SetupService.updateYardLocation] Tags error:', tagErr.message);
            }
          }

          const resObj = {
            yardLocationId: updated.yard_location_id,
            locationId: updated.yard_location_id,
            siteId: updated.site_id,
            parentId: updated.parent_id,
            levelNo: updated.level_no,
            locationCode: updated.location_code,
            fullCode: updated.full_code,
            name: updated.location_code,
            kind: updated.location_kind,
            locationKind: updated.location_kind,
            isSlot: updated.is_slot,
            allows20: updated.allows_20,
            allows40: updated.allows_40,
            allows45: updated.allows_45,
            maxTier: updated.max_tier,
            maxWeightKg: updated.max_weight_kg,
            isBlocked: updated.is_blocked,
            blockedReason: updated.blocked_reason,
            tags: data.tags || [],
          };
          const inMem = seedYardNodes.find((n) => n.yardLocationId === locId);
          if (inMem) Object.assign(inMem, resObj);
          return resObj;
        }
      } catch (err: any) {
        console.warn('[SetupService.updateYardLocation] DB error:', err.message);
      }
    }
    const inMem = seedYardNodes.find((n) => n.yardLocationId === locId || String(n.locationCode) === String(id));
    if (inMem) Object.assign(inMem, data);
    return { yardLocationId: locId, ...data };
  }

  public async deleteYardLocation(id: string | number): Promise<any> {
    const db = this.db;
    const locId = Number(id);
    const isSafeInt = Number.isFinite(locId) && locId > 0 && locId <= 2147483647;

    if (db && isSafeInt) {
      try {
        await db.m_yard_location.update({
          where: { yard_location_id: locId },
          data: { is_active: false, updatedate: new Date() },
        });
        await db.m_yard_location.updateMany({
          where: { parent_id: locId },
          data: { is_active: false, updatedate: new Date() },
        });
      } catch (err: any) {
        console.warn('[SetupService.deleteYardLocation] DB error:', err.message);
      }
    }
    const idx = seedYardNodes.findIndex((n) => n.yardLocationId === locId || String(n.locationCode) === String(id));
    if (idx >= 0) seedYardNodes.splice(idx, 1);
    return { success: true, yardLocationId: locId };
  }

  public async blockSlot(slotCodeOrId: string | number, reason: string = 'Blocked by Yard Supervisor'): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const id = Number(slotCodeOrId);
        const where: any = Number.isFinite(id)
          ? { yard_location_id: id }
          : { location_code: String(slotCodeOrId) };

        const loc = await db.m_yard_location.findFirst({ where });
        if (loc) {
          const updated = await db.m_yard_location.update({
            where: { yard_location_id: loc.yard_location_id },
            data: { is_blocked: true, blocked_reason: reason, updatedate: new Date() },
          });
          return { success: true, locationCode: updated.location_code, isBlocked: true, reason };
        }
      } catch (err: any) {
        console.warn('[SetupService.blockSlot] DB error:', err.message);
      }
    }
    return { success: true, locationCode: String(slotCodeOrId), isBlocked: true, reason };
  }

  public async unblockSlot(slotCodeOrId: string | number): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const id = Number(slotCodeOrId);
        const where: any = Number.isFinite(id)
          ? { yard_location_id: id }
          : { location_code: String(slotCodeOrId) };

        const loc = await db.m_yard_location.findFirst({ where });
        if (loc) {
          const updated = await db.m_yard_location.update({
            where: { yard_location_id: loc.yard_location_id },
            data: { is_blocked: false, blocked_reason: null, updatedate: new Date() },
          });
          return { success: true, locationCode: updated.location_code, isBlocked: false };
        }
      } catch (err: any) {
        console.warn('[SetupService.unblockSlot] DB error:', err.message);
      }
    }
    return { success: true, locationCode: String(slotCodeOrId), isBlocked: false };
  }

  public async generateSlots(blockId: string | number, data: any): Promise<any> {
    const db = this.db;
    const numId = Number(blockId);
    const isSafeInt = Number.isFinite(numId) && numId > 0 && numId <= 2147483647;
    const rows = Number(data.rows || 4);
    const bays = Number(data.bays || 8);
    const tiers = Number(data.tiers || 4);

    let prefix = String(blockId).replace('BLOCK-', '');

    if (db) {
      try {
        let block: any = null;
        if (isSafeInt) {
          block = await db.m_yard_location.findUnique({ where: { yard_location_id: numId } });
        }
        if (!block) {
          block = await db.m_yard_location.findFirst({
            where: {
              OR: [
                { location_code: String(blockId) },
                { full_code: String(blockId) },
                { location_code: `BLOCK-${blockId}` },
              ],
            },
          });
        }

        if (block) {
          prefix = block.location_code.replace('BLOCK-', '');
          const siteId = block.site_id;

          // Find already existing slots to avoid duplicates
          const existingSlots = await db.m_yard_location.findMany({
            where: {
              site_id: siteId,
              location_code: { startsWith: prefix + '-' },
            },
            select: { location_code: true },
          });
          const existingSet = new Set(existingSlots.map((s) => s.location_code));

          const slotsToCreate: any[] = [];
          for (let r = 1; r <= rows; r++) {
            for (let b = 1; b <= bays; b++) {
              const rowStr = String(r).padStart(2, '0');
              const bayStr = String(b).padStart(2, '0');
              const slotCode = `${prefix}-${rowStr}-${bayStr}`;

              if (!existingSet.has(slotCode)) {
                slotsToCreate.push({
                  site_id: siteId,
                  parent_id: block.yard_location_id,
                  level_no: 3,
                  location_code: slotCode,
                  full_code: slotCode,
                  location_kind: 'SLOT',
                  is_slot: true,
                  allows_20: data.allows20 ?? true,
                  allows_40: data.allows40 ?? true,
                  allows_45: data.allows45 ?? false,
                  max_tier: tiers,
                  max_weight_kg: data.maxWeightKg || 32500,
                  is_blocked: false,
                  is_active: true,
                  createdby: 'SYSTEM',
                });
              }
            }
          }

          if (slotsToCreate.length > 0) {
            await db.m_yard_location.createMany({
              data: slotsToCreate,
            });
          }

          await db.m_yard_location.update({
            where: { yard_location_id: block.yard_location_id },
            data: {
              max_tier: tiers,
              allows_20: data.allows20 ?? true,
              allows_40: data.allows40 ?? true,
              allows_45: data.allows45 ?? false,
              updatedate: new Date(),
            },
          });
        }
      } catch (err: any) {
        console.warn('[SetupService.generateSlots] DB error:', err.message);
      }
    }

    // Always update in-memory fallback store as well
    const inMemBlock = seedYardNodes.find((n) => n.yardLocationId === numId || String(n.locationCode) === String(blockId) || String(n.locationCode).replace('BLOCK-', '') === prefix);
    if (inMemBlock) {
      inMemBlock.rows = rows;
      inMemBlock.bays = bays;
      inMemBlock.maxTier = tiers;
      inMemBlock.draft = false;
      (inMemBlock as any).childCount = rows;
      if (data.allows20 !== undefined) inMemBlock.allows20 = data.allows20;
      if (data.allows40 !== undefined) inMemBlock.allows40 = data.allows40;
      if (data.allows45 !== undefined) inMemBlock.allows45 = data.allows45;
      if (data.maxWeightKg) inMemBlock.maxWeightKg = data.maxWeightKg;

      for (let r = 1; r <= rows; r++) {
        for (let b = 1; b <= bays; b++) {
          const slotCode = `${prefix}-${String(r).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
          if (!seedYardNodes.some((n) => n.locationCode === slotCode)) {
            const nextSlotId = seedYardNodes.reduce((max, n) => Math.max(max, (n.yardLocationId && n.yardLocationId <= 2000000) ? n.yardLocationId : 0), 1000) + 1;
            seedYardNodes.push({
              yardLocationId: nextSlotId,
              siteId: inMemBlock.siteId,
              parentId: inMemBlock.yardLocationId,
              levelNo: 3,
              locationCode: slotCode,
              fullCode: slotCode,
              name: slotCode,
              kind: 'SLOT',
              locationKind: 'SLOT',
              isSlot: true,
              rows: 1,
              bays: 1,
              maxTier: tiers,
              allows20: inMemBlock.allows20,
              allows40: inMemBlock.allows40,
              allows45: inMemBlock.allows45,
              maxWeightKg: inMemBlock.maxWeightKg,
              isActive: true,
            } as any);
          }
        }
      }
    }

    return { success: true, count: rows * bays, blockCode: prefix, rows, bays, tiers };
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

  public async getGateById(id: number | string): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const num = Number(id);
        const g = await db.m_gate.findFirst({
          where: isNaN(num) ? { gate_code: String(id) } : { OR: [{ gate_id: num }, { gate_code: String(id) }] },
          include: { m_gate_lane: true },
        });
        if (g) {
          return {
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
          };
        }
      } catch (err: any) {
        console.warn('[SetupService.getGateById] DB error:', err.message);
      }
    }
    return null;
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

  public async getVisitTypeById(id: number | string): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const num = Number(id);
        const r = await db.m_visit_type.findFirst({
          where: isNaN(num) ? { visit_type_code: String(id) } : { OR: [{ visit_type_id: num }, { visit_type_code: String(id) }] },
          include: {
            m_visit_type_checkpoint: {
              include: { m_checkpoint: true },
              orderBy: { seq_no: 'asc' },
            },
          },
        });
        if (r) {
          return {
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
          };
        }
      } catch (err: any) {
        console.warn('[SetupService.getVisitTypeById] DB error:', err.message);
      }
    }
    return null;
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

  public async getCheckpointById(id: number | string): Promise<any> {
    const db = this.db;
    if (db) {
      try {
        const num = Number(id);
        const c = await db.m_checkpoint.findFirst({
          where: isNaN(num) ? { checkpoint_code: String(id) } : { OR: [{ checkpoint_id: num }, { checkpoint_code: String(id) }] },
          include: { m_gate: true },
        });
        if (c) {
          return {
            checkpointId: c.checkpoint_id,
            siteId: c.site_id,
            gateId: c.gate_id,
            checkpointCode: c.checkpoint_code,
            checkpointName: c.checkpoint_name,
            checkpointKind: c.checkpoint_kind,
            isActive: c.is_active ?? true,
          };
        }
      } catch (err: any) {
        console.warn('[SetupService.getCheckpointById] DB error:', err.message);
      }
    }
    return null;
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
  public customRoles: Map<string, any> = new Map();
  public customPerms: any[] = [];
  public customDelegations: any[] = [];
  public customHoldTypes: any[] = [];
  public customApprovalPolicies: any[] = [];
  public customExceptionTypes: any[] = [];
  public customInspectionTemplates: any[] = [];
  public customDamageCodes: any[] = [];
  public customDevices: any[] = [];
  public customNumberSequences: any[] = [];
  public customDocumentTypes: any[] = [];
  public customAccountingPeriods: any[] = [];
  public customChargeCodes: any[] = [];
  public customTaxCodes: any[] = [];
  public customPaymentChannels: any[] = [];
  public customGlSettings: any[] = [];

  public async getUsers(filter?: { q?: string; role?: string; siteId?: number | string; active?: string | boolean }): Promise<any[]> {
    let list: any[] = [];
    const db = this.db;
    if (db) {
      try {
        const fetchPromise = db.app_user.findMany({
          include: {
            user_site_role: {
              include: { m_role: true, m_site: true },
            },
          },
          orderBy: { user_id: 'asc' },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('DB_TIMEOUT')), 1200)
        );
        const rows = (await Promise.race([fetchPromise, timeoutPromise])) as any[];
        if (rows.length > 0) {
          list = rows.map((u) => {
            const roleGrants = u.user_site_role.map((ur) => ({
              userRoleId: ur.user_site_role_id || undefined,
              roleCode: ur.m_role?.role_code || 'GATE_OFFICER',
              roleName: ur.m_role?.role_name || 'Gate officer',
              siteId: ur.site_id,
              validFrom: ur.valid_from?.toISOString(),
              validTo: ur.valid_to?.toISOString(),
              grantedBy: 'Admin',
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
    if (!list || list.length === 0) {
      list = seedUsers;
    }

    if (!filter) return list;

    return list.filter((u) => {
      // 1. Text Search (q)
      if (filter.q && filter.q.trim()) {
        const qLower = filter.q.trim().toLowerCase();
        const nameMatch = (u.userName || u.fullName || '').toLowerCase().includes(qLower);
        const emailMatch = (u.email || '').toLowerCase().includes(qLower);
        const phoneMatch = (u.phone || '').toLowerCase().includes(qLower);
        const subMatch = (u.userSub || '').toLowerCase().includes(qLower);
        const titleMatch = (u.title || '').toLowerCase().includes(qLower);
        const roleMatch = (u.roleGrants || []).some((g: any) =>
          (g.roleCode || '').toLowerCase().includes(qLower) ||
          (g.roleName || '').toLowerCase().includes(qLower)
        );
        if (!nameMatch && !emailMatch && !phoneMatch && !subMatch && !titleMatch && !roleMatch) {
          return false;
        }
      }

      // 2. Status Filter (active / inactive / all)
      if (filter.active && filter.active !== 'all') {
        const isActive = filter.active === 'active' || filter.active === true || filter.active === 'true';
        if (Boolean(u.isActive) !== isActive) {
          return false;
        }
      }

      // 3. Role Filter
      if (filter.role && filter.role !== 'all') {
        const hasRole = (u.roleGrants || []).some((g: any) =>
          g.roleCode === filter.role || g.roleName === filter.role
        );
        if (!hasRole) return false;
      }

      // 4. Site Filter
      if (filter.siteId !== undefined && filter.siteId !== 'all' && String(filter.siteId).toLowerCase() !== 'all' && filter.siteId !== '') {
        const targetSiteId = Number(filter.siteId);
        const hasSite = (u.roleGrants || []).some((g: any) =>
          g.siteId === targetSiteId || g.siteId === null || g.siteId === undefined
        ) || (u.siteCodes || []).includes('All sites');
        if (!hasSite) return false;
      }

      return true;
    });
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

  public async grantUserRole(userId: number, grant: any): Promise<any> {
    const user = seedUsers.find((u) => u.userId === Number(userId));
    if (user) {
      if (!(user as any).roleGrants) (user as any).roleGrants = [];
      const newGrant = {
        roleCode: grant.roleCode || 'GATE_OFFICER',
        roleName: grant.roleName || (ROLES[grant.roleCode]?.name ?? grant.roleCode),
        siteId: grant.siteId ? Number(grant.siteId) : null,
        validFrom: grant.validFrom || new Date().toISOString(),
        validTo: grant.validTo || undefined,
        grantedBy: 'Admin',
      };
      (user as any).roleGrants.push(newGrant);
      if (grant.siteCode && !user.siteCodes?.includes(grant.siteCode)) {
        user.siteCodes = [...(user.siteCodes || []), grant.siteCode];
      }
      return newGrant;
    }
    return grant;
  }

  public async revokeUserRole(userId: number, roleGrantIdOrCode: string | number): Promise<any> {
    const user = seedUsers.find((u) => u.userId === Number(userId));
    if (user && user.roleGrants) {
      (user as any).roleGrants = ((user as any).roleGrants || []).filter(
        (g: any) => g.roleCode !== roleGrantIdOrCode && g.userRoleId !== roleGrantIdOrCode
      );
    }
    return { success: true };
  }

  public async activateUser(userId: number): Promise<any> {
    const user = seedUsers.find((u) => u.userId === Number(userId));
    if (user) {
      user.isActive = true;
    }
    const db = this.db;
    if (db) {
      try {
        await db.app_user.update({ where: { user_id: Number(userId) }, data: { is_active: true } });
      } catch (err) { }
    }
    return user || { userId, isActive: true };
  }

  public async deactivateUser(userId: number, reason?: string): Promise<any> {
    const user = seedUsers.find((u) => u.userId === Number(userId));
    if (user) {
      user.isActive = false;
      (user as any).deactivateReason = reason;
    }
    const db = this.db;
    if (db) {
      try {
        await db.app_user.update({ where: { user_id: Number(userId) }, data: { is_active: false } });
      } catch (err) { }
    }
    return user || { userId, isActive: false, deactivateReason: reason };
  }

  public async getDelegations(query?: any): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.approval_delegation.findMany({
          include: {
            app_user_approval_delegation_from_user_idToapp_user: true,
            app_user_approval_delegation_to_user_idToapp_user: true,
          },
          orderBy: { approval_delegation_id: 'desc' },
        });
        if (rows.length > 0) {
          const dbList = rows.map((d) => ({
            approvalDelegationId: d.approval_delegation_id,
            delegationId: d.approval_delegation_id,
            fromUserId: d.from_user_id,
            toUserId: d.to_user_id,
            fromName: d.app_user_approval_delegation_from_user_idToapp_user?.user_name || ('User ' + d.from_user_id),
            toName: d.app_user_approval_delegation_to_user_idToapp_user?.user_name || ('User ' + d.to_user_id),
            permissionCode: d.permission_code,
            siteId: d.site_id,
            validFrom: d.valid_from.toISOString(),
            validTo: d.valid_to.toISOString(),
            reason: d.reason,
            revokedAt: d.revoked_at ? d.revoked_at.toISOString() : undefined,
            logInst: d.log_inst,
          }));
          return [...this.customDelegations, ...dbList];
        }
      } catch (err: any) {
        console.warn('[SetupService.getDelegations] DB error:', err.message);
      }
    }
    const baseList = seedDelegations.map((d: any) => ({ ...d }));
    return [...this.customDelegations, ...baseList];
  }

  public async createDelegation(data: any): Promise<any> {
    const db = this.db;
    const fromId = Number(data.fromUserId);
    const toId = Number(data.toUserId);
    const siteId = data.siteId ? Number(data.siteId) : null;
    const validFrom = data.validFrom ? new Date(data.validFrom) : new Date();
    const validTo = data.validTo ? new Date(data.validTo) : new Date(Date.now() + 7 * 86400000);
    const reason = data.reason || 'Temporary leave delegation';
    const permissionCode = data.permissionCode || null;

    let fromName = data.fromName;
    let toName = data.toName;

    const uFrom = seedUsers.find((u: any) => u.userId === fromId);
    if (uFrom) fromName = uFrom.userName;
    const uTo = seedUsers.find((u: any) => u.userId === toId);
    if (uTo) toName = uTo.userName;

    const newDelegation: any = {
      approvalDelegationId: Date.now(),
      delegationId: Date.now(),
      fromUserId: fromId,
      toUserId: toId,
      fromName: fromName || ('User ' + fromId),
      toName: toName || ('User ' + toId),
      permissionCode,
      siteId,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      reason,
      logInst: 1,
    };

    if (db) {
      try {
        const created = await db.approval_delegation.create({
          data: {
            from_user_id: fromId,
            to_user_id: toId,
            permission_code: permissionCode,
            site_id: siteId,
            valid_from: validFrom,
            valid_to: validTo,
            reason,
            createdby: 'SYSTEM',
          },
        });
        newDelegation.approvalDelegationId = created.approval_delegation_id;
        newDelegation.delegationId = created.approval_delegation_id;
      } catch (err: any) {
        console.warn('[SetupService.createDelegation] DB error:', err.message);
      }
    }

    this.customDelegations.unshift(newDelegation);
    return newDelegation;
  }

  public async revokeDelegation(id: number | string): Promise<any> {
    const numId = Number(id);
    const revokedAt = new Date().toISOString();
    const db = this.db;
    if (db && Number.isFinite(numId)) {
      try {
        await db.approval_delegation.update({
          where: { approval_delegation_id: numId },
          data: { revoked_at: new Date() },
        });
      } catch (err: any) {
        console.warn('[SetupService.revokeDelegation] DB error:', err.message);
      }
    }
    const found = this.customDelegations.find((d: any) => d.approvalDelegationId === numId || String(d.delegationId) === String(id));
    if (found) {
      found.revokedAt = revokedAt;
    }
    return { success: true, delegationId: numId, revokedAt };
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
          const dbRoles = rows.map((r) => {
            let grantsObj: Record<string, string> = {};
            if (this.customRoles.has(r.role_code)) {
              grantsObj = { ...this.customRoles.get(r.role_code).grants };
            } else {
              r.m_role_permission.forEach((rp) => {
                grantsObj[rp.permission_code] = rp.grant_type || 'DO';
              });
            }
            return {
              roleId: r.role_id,
              roleCode: r.role_code,
              roleName: r.role_name,
              code: r.role_code,
              name: r.role_name,
              description: r.description,
              isSystem: r.is_system,
              isActive: r.is_active,
              grants: grantsObj,
              logInst: r.log_inst,
            };
          });

          for (const [code, cr] of this.customRoles.entries()) {
            if (!dbRoles.some((r) => r.code === code)) {
              dbRoles.push(cr);
            }
          }
          return dbRoles;
        }
      } catch (err) {
        console.error('getRoles db error:', err);
      }
    }

    const fallbackRoles = Object.values(ROLES).map((r, i) => {
      const grants = this.customRoles.has(r.code)
        ? { ...this.customRoles.get(r.code).grants }
        : { ...r.grants };
      return {
        roleId: i + 1,
        roleCode: r.code,
        roleName: r.name,
        code: r.code,
        name: r.name,
        description: `Built-in role for ${r.name}`,
        external: !!r.external,
        grants,
        logInst: 1,
      };
    });

    for (const [code, cr] of this.customRoles.entries()) {
      if (!fallbackRoles.some((r) => r.code === code)) {
        fallbackRoles.push(cr);
      }
    }
    return fallbackRoles;
  }

  public async createRole(data: any): Promise<any> {
    const roleCode = (data.roleCode || data.code || `ROLE_${Date.now()}`).toUpperCase().trim();
    const roleName = data.roleName || data.name || roleCode;
    const newRole = {
      roleId: Date.now(),
      roleCode,
      roleName,
      code: roleCode,
      name: roleName,
      description: data.description || '',
      grants: data.grants || {},
      external: !!data.external,
      isSystem: false,
      isActive: true,
      logInst: 1,
    };
    this.customRoles.set(roleCode, newRole);
    ROLES[roleCode] = {
      code: roleCode,
      name: roleName,
      external: !!data.external,
      grants: data.grants || {},
    };
    return newRole;
  }

  public async updateRole(id: any, data: any): Promise<any> {
    const code = String(id).toUpperCase();
    let r = this.customRoles.get(code);
    if (!r) {
      const base = Object.values(ROLES).find((x) => x.code === code);
      r = {
        roleId: Date.now(),
        roleCode: code,
        roleName: base?.name || code,
        code,
        name: base?.name || code,
        description: data.description || '',
        grants: { ...(base?.grants || {}) },
      };
      this.customRoles.set(code, r);
    }
    Object.assign(r, data);
    return r;
  }

  public async updateRolePermissions(roleIdOrCode: string | number, grants: Record<string, string>): Promise<any> {
    const code = String(roleIdOrCode).toUpperCase();
    let existing = this.customRoles.get(code);
    if (!existing) {
      const baseRole = Object.values(ROLES).find((r) => r.code === code);
      existing = {
        roleId: Date.now(),
        roleCode: code,
        roleName: baseRole?.name || code,
        code,
        name: baseRole?.name || code,
        grants: { ...(baseRole?.grants || {}) },
        external: !!baseRole?.external,
      };
      this.customRoles.set(code, existing);
    }
    existing.grants = { ...grants };

    if (ROLES[code]) {
      (ROLES[code] as any).grants = { ...grants };
    }

    return existing;
  }

  public async getPermissions(): Promise<any[]> {
    let perms: any[] = [];
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_permission.findMany({ orderBy: { permission_code: 'asc' } });
        if (rows.length > 0) {
          perms = rows.map((p) => ({
            code: p.permission_code,
            permissionCode: p.permission_code,
            module: p.module_code,
            moduleCode: p.module_code,
            action: p.permission_code.split('.').pop() || 'manage',
            scopeAllowed: 'SITE',
            description: p.description,
            isApproval: p.is_approval,
            supportsLimit: p.supports_limit,
            logInst: p.log_inst,
            ms: 'M0',
          }));
        }
      } catch (err) {
        console.error('getPermissions db error:', err);
      }
    }
    if (!perms || perms.length === 0) {
      perms = seedPerms.map((p: any) => ({
        code: p.code || p.permissionCode,
        permissionCode: p.code || p.permissionCode,
        module: p.module,
        moduleCode: p.module,
        action: (p.code || p.permissionCode || '').split('.').pop() || 'manage',
        description: p.description,
        isApproval: p.isApproval,
        supportsLimit: p.supportsLimit,
        ms: p.ms || 'M0',
      }));
    }

    for (const cp of this.customPerms) {
      if (!perms.some((p) => (p.code || p.permissionCode) === (cp.code || cp.permissionCode))) {
        perms.push(cp);
      }
    }
    return perms;
  }

  public async createPermission(data: any): Promise<any> {
    const code = (data.code || data.permissionCode || '').toLowerCase().trim();
    const newPerm = {
      code,
      permissionCode: code,
      module: data.module || 'admin',
      moduleCode: data.module || 'admin',
      action: code.split('.').pop() || 'manage',
      description: data.description || code,
      isApproval: !!data.isApproval,
      supportsLimit: !!data.supportsLimit,
      ms: data.ms || 'M0',
    };
    this.customPerms.push(newPerm);
    return newPerm;
  }

  // =========================================================================
  // 7. Holds, Release & Approvals
  // =========================================================================
  public async getHoldTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_hold_type.findMany({
          orderBy: { hold_type_id: 'asc' },
        });
        if (rows.length > 0) {
          const dbList = rows.map((h) => ({
            holdTypeId: h.hold_type_id,
            holdCode: h.hold_code,
            holdName: h.hold_name,
            authority: h.authority,
            blocksGateOut: h.blocks_gate_out,
            blocksRelease: h.blocks_release,
            blocksMove: h.blocks_move,
            blocksStuffing: h.blocks_stuffing,
            liftNeedsApproval: h.lift_needs_approval,
            liftNeedsEvidence: h.lift_needs_evidence,
            moveToTagCode: h.move_to_tag_code,
            packTz: h.country_pack_id != null,
            isActive: h.is_active,
            logInst: h.log_inst,
          }));
          return [...this.customHoldTypes, ...dbList];
        }
      } catch (err) {
        console.warn('[SetupService.getHoldTypes] DB error:', err);
      }
    }
    return [...this.customHoldTypes, ...seedHoldTypes];
  }

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
          include: { m_permission: true },
          orderBy: { approval_policy_id: 'asc' },
        });
        if (rows.length > 0) {
          const dbList = rows.map((r) => ({
            approvalPolicyId: r.approval_policy_id,
            permissionCode: r.permission_code,
            description: r.m_permission?.description || (seedPerms.find((p) => p.code === r.permission_code)?.description) || r.permission_code,
            siteId: r.site_id,
            amountFrom: Number(r.amount_from),
            amountCurrency: r.amount_currency || 'USD',
            levelsRequired: r.levels_required,
            expiresAfterHours: r.expires_after_hours,
            isActive: r.is_active,
            logInst: r.log_inst,
          }));
          return [...this.customApprovalPolicies, ...dbList];
        }
      } catch (err) {
        console.warn('[SetupService.getApprovalPolicies] DB error:', err);
      }
    }
    const seedWithDesc = seedApprovalPolicies.map((p) => ({
      ...p,
      description: seedPerms.find((x) => x.code === p.permissionCode)?.description || p.permissionCode,
    }));
    return [...this.customApprovalPolicies, ...seedWithDesc];
  }

  public async getExceptionTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_exception_type.findMany({
          include: {
            m_role_m_exception_type_default_role_idTom_role: true,
            m_role_m_exception_type_escalation_role_idTom_role: true,
            m_hold_type: true,
          },
          orderBy: { exception_code: 'asc' },
        });
        if (rows.length > 0) {
          const dbList = rows.map((e) => ({
            exceptionTypeId: e.exception_type_id,
            exceptionCode: e.exception_code,
            exceptionName: e.exception_name,
            severity: e.severity,
            slaMinutes: e.sla_minutes,
            supervisorClose: e.supervisor_close,
            defaultRoleId: e.default_role_id,
            defaultRoleCode: e.m_role_m_exception_type_default_role_idTom_role?.role_code || (seedExceptionTypes.find((x) => x.exceptionCode === e.exception_code)?.defaultRoleCode) || 'customer.service',
            escalationRoleId: e.escalation_role_id,
            escalationRoleCode: e.m_role_m_exception_type_escalation_role_idTom_role?.role_code || (seedExceptionTypes.find((x) => x.exceptionCode === e.exception_code)?.escalationRoleCode) || 'icd.admin',
            placesHoldTypeId: e.places_hold_type_id,
            placesHoldTypeCode: e.m_hold_type?.hold_code || (seedExceptionTypes.find((x) => x.exceptionCode === e.exception_code)?.placesHoldTypeCode),
            isActive: e.is_active,
            logInst: e.log_inst,
          }));
          return [...this.customExceptionTypes, ...dbList];
        }
      } catch (err) {
        console.error('getExceptionTypes db error:', err);
      }
    }
    return [...this.customExceptionTypes, ...seedExceptionTypes];
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
          const dbList = rows.map((t) => ({
            templateId: t.inspection_template_id,
            inspectionTemplateId: t.inspection_template_id,
            templateCode: t.template_code,
            templateName: t.template_name,
            unitTypeKind: t.unit_category,
            unitCategory: t.unit_category,
            category: t.unit_category || 'CONTAINER',
            inspectionKind: t.inspection_kind || 'GATE_IN',
            versionNo: t.version_no || 1,
            isActive: t.is_active,
            minPhotos: t.min_photos || 4,
            items: t.m_inspection_item.map((i) => ({
              itemId: i.inspection_item_id,
              inspectionItemId: i.inspection_item_id,
              itemCode: i.item_code,
              itemName: i.item_name,
              itemLabel: i.item_name,
              area: i.area || 'EXTERIOR',
              inputType: i.input_type || 'YES_NO',
              isMandatory: !!i.is_mandatory,
              sortOrder: i.sort_order ?? 0,
            })),
            fixedFields: t.unit_category === 'CONTAINER' ? ['Seal number', 'ISO size', 'Tare weight'] : ['Chassis/VIN', 'Odometer', 'Fuel level'],
            logInst: t.log_inst,
          }));
          return [...this.customInspectionTemplates, ...dbList];
        }
      } catch (err) {
        console.error('getInspectionTemplates db error:', err);
      }
    }
    return [...this.customInspectionTemplates, ...seedInspectionTemplates];
  }

  public async getDamageCodes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_damage_code.findMany({ orderBy: { damage_code_id: 'asc' } });
        if (rows.length > 0) {
          const dbList = rows.map((d) => ({
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
          return [...this.customDamageCodes, ...dbList];
        }
      } catch (err) {
        console.error('getDamageCodes db error:', err);
      }
    }
    return [...this.customDamageCodes, ...seedDamageCodes];
  }

  // =========================================================================
  // 9. Finance Setup
  // =========================================================================
  public async getAccountingPeriods(): Promise<any[]> {
    const db = this.db;
    let baseList = seedPeriods;
    if (db) {
      try {
        const rows = await db.accounting_period.findMany({
          orderBy: { period_key: 'desc' },
        });
        if (rows.length > 0) {
          baseList = rows.map((p) => ({
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
    const merged = [...this.customAccountingPeriods];
    for (const b of baseList) {
      if (!merged.some((m) => m.periodKey === b.periodKey)) {
        merged.push(b);
      }
    }
    return merged;
  }

  public async getChargeCodes(): Promise<any[]> {
    const db = this.db;
    let baseList: any[] = seedChargeCodes;
    if (db) {
      try {
        const rows = await db.m_charge_code.findMany({ orderBy: { charge_code_id: 'asc' } });
        if (rows.length > 0) {
          baseList = rows.map((r, i) => {
            const seed = (seedChargeCodes.find((s) => s.chargeCode === r.charge_code) || seedChargeCodes[i] || seedChargeCodes[0]) as any;
            return {
              chargeCodeId: r.charge_code_id,
              chargeCode: r.charge_code,
              chargeName: r.charge_name || seed.chargeName,
              chargeGroup: seed.chargeGroup || 'OTHER',
              defaultTaxCode: seed.defaultTaxCode || 'TZ_VAT_STD',
              isDisbursement: seed.isDisbursement || false,
              printOrder: seed.printOrder || (i + 1) * 10,
              revenueGlAccount: seed.revenueGlAccount || null,
              isActive: r.is_active ?? true,
            };
          });
        }
      } catch (err) {
        console.warn('[SetupService.getChargeCodes] DB error:', err);
      }
    }
    const merged = [...this.customChargeCodes];
    for (const b of baseList) {
      if (!merged.some((m) => m.chargeCode === b.chargeCode)) {
        merged.push(b);
      }
    }
    return merged;
  }

  public async getTaxCodes(): Promise<any[]> {
    const db = this.db;
    let baseList: any[] = seedTaxCodes;
    if (db) {
      try {
        const rows = await db.m_tax_code.findMany({ orderBy: { tax_code_id: 'asc' } });
        if (rows.length > 0) {
          baseList = rows.map((r, i) => {
            const seed = (seedTaxCodes.find((s) => s.taxCode === r.tax_code) || seedTaxCodes[i] || seedTaxCodes[0]) as any;
            return {
              taxCodeId: r.tax_code_id,
              taxCode: r.tax_code,
              taxName: r.tax_name || seed.taxName,
              countryCode: seed.countryCode || 'TZ',
              ratePct: r.rate_pct ? String(r.rate_pct) : (seed.ratePct || '18.000'),
              taxTreatment: seed.taxTreatment || 'STANDARD',
              fiscalTaxClass: seed.fiscalTaxClass || null,
              outputGlAccount: seed.outputGlAccount || null,
              effectiveFrom: seed.effectiveFrom || '2015-07-01',
              isActive: r.is_active ?? true,
              verify: seed.verify,
            };
          });
        }
      } catch (err) {
        console.warn('[SetupService.getTaxCodes] DB error:', err);
      }
    }
    const merged = [...this.customTaxCodes];
    for (const b of baseList) {
      if (!merged.some((m) => m.taxCode === b.taxCode)) {
        merged.push(b);
      }
    }
    return merged;
  }

  public async getPaymentChannels(): Promise<any[]> {
    const db = this.db;
    let baseList: any[] = seedPaymentChannels;
    if (db) {
      try {
        const rows = await db.m_payment_channel.findMany({
          orderBy: { channel_code: 'asc' },
        });
        if (rows.length > 0) {
          baseList = rows.map((pc, i) => {
            const seed = (seedPaymentChannels.find((s) => s.channelCode === pc.channel_code) || seedPaymentChannels[i] || seedPaymentChannels[0]) as any;
            return {
              paymentChannelId: pc.payment_channel_id,
              companyId: pc.company_id,
              channelCode: pc.channel_code,
              channelName: pc.channel_name,
              method: pc.method || seed?.method || 'CASH',
              provider: pc.provider || seed?.provider || null,
              currency: pc.currency || seed?.currency || 'USD',
              glAccount: pc.gl_account || seed?.glAccount || '1010-01',
              referencePattern: pc.reference_pattern || seed?.referencePattern || null,
              example: seed?.example || '—',
              refHint: seed?.refHint || 'Reference format',
              isActive: pc.is_active ?? true,
              logInst: pc.log_inst,
            };
          });
        }
      } catch (err) {
        console.error('getPaymentChannels db error:', err);
      }
    }
    const merged = [...this.customPaymentChannels];
    for (const b of baseList) {
      if (!merged.some((m) => m.channelCode === b.channelCode)) {
        merged.push(b);
      }
    }
    return merged;
  }

  public async getGlSettings(): Promise<any[]> {
    const db = this.db;
    let baseList: any[] = seedGlSettings;
    if (db) {
      try {
        const rows = await db.m_gl_setting.findMany({
          orderBy: { setting_key: 'asc' },
        });
        if (rows.length > 0) {
          baseList = rows.map((g) => ({
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
    const merged = [...this.customGlSettings];
    for (const b of baseList) {
      if (!merged.some((m) => m.settingKey === b.settingKey)) {
        merged.push(b);
      }
    }
    return merged;
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
          const dbList = rows.map((r, i) => {
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
          return [...this.customNumberSequences, ...dbList];
        }
      } catch (err) {
        console.error('getNumberSequences db error:', err);
      }
    }
    return [...this.customNumberSequences, ...seedNumberSequences];
  }

  public async getDocumentTypes(): Promise<any[]> {
    const db = this.db;
    if (db) {
      try {
        const rows = await db.m_document_type.findMany({ orderBy: { document_type_id: 'asc' } });
        const dbList = rows.map((r, i) => {
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
        return [...this.customDocumentTypes, ...dbList];
      } catch (err) {
        console.warn('[SetupService.getDocumentTypes] DB error:', err);
      }
    }
    return [...this.customDocumentTypes, ...seedDocumentTypes];
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
          const dbList = rows.map((r) => ({
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
          return [...this.customDevices, ...dbList];
        }
      } catch (err: any) {
        console.warn('[SetupService.getDevices] DB error:', err.message);
      }
    }
    return [...this.customDevices, ...seedDevices];
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

  public async createModel(data: any): Promise<any> {
    return { modelId: Date.now(), ...data };
  }
  public async updateModel(id: any, data: any): Promise<any> {
    return { modelId: id, ...data };
  }
  public async createCompany(data: any): Promise<any> {
    return { companyId: Date.now(), ...data };
  }
  public async createCountryPack(data: any): Promise<any> {
    return { packCode: data.packCode || 'TZ', ...data };
  }
  public async updateCountryPack(code: any, data: any): Promise<any> {
    return { packCode: code, ...data };
  }
  public async createNotificationTemplate(data: any): Promise<any> {
    return { templateId: Date.now(), ...data };
  }
  public async updateNotificationTemplate(id: any, data: any): Promise<any> {
    return { templateId: id, ...data };
  }
  public async createNotificationRule(data: any): Promise<any> {
    return { ruleId: Date.now(), ...data };
  }
  public async updateNotificationRule(id: any, data: any): Promise<any> {
    return { ruleId: id, ...data };
  }
  public async createPrintTemplate(data: any): Promise<any> {
    return { templateId: Date.now(), ...data };
  }
  public async updatePrintTemplate(id: any, data: any): Promise<any> {
    return { templateId: id, ...data };
  }
  public async createHoldType(data: any): Promise<any> {
    const holdCode = (data.holdCode || ('HOLD_' + Date.now())).toUpperCase().trim();
    const newHold = {
      holdTypeId: Date.now(),
      holdCode,
      holdName: data.holdName || holdCode,
      authority: data.authority || 'ICD',
      blocksGateOut: data.blocksGateOut !== false,
      blocksRelease: data.blocksRelease !== false,
      blocksMove: Boolean(data.blocksMove),
      blocksStuffing: Boolean(data.blocksStuffing),
      liftNeedsApproval: data.liftNeedsApproval !== false,
      liftNeedsEvidence: Boolean(data.liftNeedsEvidence),
      moveToTagCode: data.moveToTagCode || null,
      packTz: Boolean(data.packTz),
      isActive: data.isActive !== false,
    };

    const db = this.db;
    if (db) {
      try {
        const created = await db.m_hold_type.create({
          data: {
            hold_code: newHold.holdCode,
            hold_name: newHold.holdName,
            authority: newHold.authority,
            blocks_gate_out: newHold.blocksGateOut,
            blocks_release: newHold.blocksRelease,
            blocks_move: newHold.blocksMove,
            blocks_stuffing: newHold.blocksStuffing,
            lift_needs_approval: newHold.liftNeedsApproval,
            lift_needs_evidence: newHold.liftNeedsEvidence,
            move_to_tag_code: newHold.moveToTagCode,
            country_pack_id: newHold.packTz ? 1 : null,
            is_active: newHold.isActive,
            createdby: 'Admin',
          },
        });
        newHold.holdTypeId = created.hold_type_id;
      } catch (err) {
        console.warn('[SetupService.createHoldType] DB error:', err);
      }
    }
    this.customHoldTypes.unshift(newHold);
    return newHold;
  }

  public async updateHoldType(id: any, data: any): Promise<any> {
    const numId = Number(id);
    const db = this.db;
    if (db) {
      try {
        const whereClause = !isNaN(numId) && numId > 0
          ? { hold_type_id: numId }
          : { hold_code: String(id) };

        await db.m_hold_type.update({
          where: whereClause,
          data: {
            hold_name: data.holdName,
            authority: data.authority,
            blocks_gate_out: data.blocksGateOut !== undefined ? Boolean(data.blocksGateOut) : undefined,
            blocks_release: data.blocksRelease !== undefined ? Boolean(data.blocksRelease) : undefined,
            blocks_move: data.blocksMove !== undefined ? Boolean(data.blocksMove) : undefined,
            blocks_stuffing: data.blocksStuffing !== undefined ? Boolean(data.blocksStuffing) : undefined,
            lift_needs_approval: data.liftNeedsApproval !== undefined ? Boolean(data.liftNeedsApproval) : undefined,
            lift_needs_evidence: data.liftNeedsEvidence !== undefined ? Boolean(data.liftNeedsEvidence) : undefined,
            move_to_tag_code: data.moveToTagCode !== undefined ? (data.moveToTagCode || null) : undefined,
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
            updatedate: new Date(),
            updatedby: 'Admin',
          },
        });
      } catch (err) {
        console.warn('[SetupService.updateHoldType] DB error:', err);
      }
    }

    const inMem = this.customHoldTypes.find(
      (h) => h.holdTypeId === numId || String(h.holdCode) === String(id)
    );
    if (inMem) {
      Object.assign(inMem, data);
      return inMem;
    }
    const seed = seedHoldTypes.find(
      (h) => (h as any).holdTypeId === numId || String(h.holdCode) === String(id)
    );
    if (seed) Object.assign(seed, data);
    return { holdTypeId: id, ...data };
  }

  public async createReleaseRule(data: any): Promise<any> {
    const numRegimeId = Number(data.cargoRegimeId) || 1;
    const newRule = {
      releaseRuleId: Date.now(),
      cargoRegimeId: numRegimeId,
      regimeCode: data.regimeCode || 'LOCAL',
      conditionCode: data.conditionCode || 'COMMERCIAL',
      unitCategory: data.unitCategory || 'ALL',
      atApproval: Boolean(data.atApproval),
      atGateOut: data.atGateOut !== false,
      canOverride: Boolean(data.canOverride),
      isActive: data.isActive !== false,
    };
    const db = this.db;
    if (db) {
      try {
        const created = await db.m_release_rule.create({
          data: {
            cargo_regime_id: newRule.cargoRegimeId,
            condition_code: newRule.conditionCode,
            unit_category: newRule.unitCategory === 'ALL' ? null : newRule.unitCategory,
            at_approval: newRule.atApproval,
            at_gate_out: newRule.atGateOut,
            can_override: newRule.canOverride,
            is_active: newRule.isActive,
            createdby: 'Admin',
          },
        });
        newRule.releaseRuleId = created.release_rule_id;
      } catch (err) {
        console.warn('[SetupService.createReleaseRule] DB error:', err);
      }
    }
    return newRule;
  }

  public async updateReleaseRule(id: any, data: any): Promise<any> {
    const numId = Number(id);
    const db = this.db;
    if (db) {
      try {
        await db.m_release_rule.update({
          where: { release_rule_id: numId },
          data: {
            at_approval: data.atApproval !== undefined ? Boolean(data.atApproval) : undefined,
            at_gate_out: data.atGateOut !== undefined ? Boolean(data.atGateOut) : undefined,
            can_override: data.canOverride !== undefined ? Boolean(data.canOverride) : undefined,
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
            updatedate: new Date(),
            updatedby: 'Admin',
          },
        });
      } catch (err) {
        console.warn('[SetupService.updateReleaseRule] DB error:', err);
      }
    }
    const seed = seedReleaseRules.find((r) => r.releaseRuleId === numId);
    if (seed) Object.assign(seed, data);
    return { releaseRuleId: id, ...data };
  }

  public async createApprovalPolicy(data: any): Promise<any> {
    const permCode = data.permissionCode || ('billing.policy_' + Date.now());
    const newPolicy = {
      approvalPolicyId: Date.now(),
      permissionCode: permCode,
      description: data.description || permCode,
      siteId: data.siteId ? Number(data.siteId) : null,
      amountFrom: data.amountFrom != null ? Number(data.amountFrom) : 0,
      amountCurrency: Number(data.amountFrom) > 0 ? (data.amountCurrency || 'USD') : null,
      levelsRequired: data.levelsRequired != null ? Number(data.levelsRequired) : 1,
      expiresAfterHours: data.expiresAfterHours != null ? Number(data.expiresAfterHours) : 72,
      isActive: data.isActive !== false,
    };

    const db = this.db;
    if (db) {
      try {
        const existingPerm = await db.m_permission.findUnique({
          where: { permission_code: permCode },
        });
        if (!existingPerm) {
          await db.m_permission.create({
            data: {
              permission_code: permCode,
              module_code: data.moduleCode || 'billing',
              description: newPolicy.description,
              is_approval: true,
              supports_limit: true,
              createdby: 'Admin',
            },
          }).catch(() => {});
        } else if (data.description) {
          await db.m_permission.update({
            where: { permission_code: permCode },
            data: {
              description: data.description,
              updatedate: new Date(),
              updatedby: 'Admin',
            },
          }).catch(() => {});
        }

        const created = await db.m_approval_policy.create({
          data: {
            permission_code: permCode,
            site_id: newPolicy.siteId,
            amount_from: newPolicy.amountFrom,
            amount_currency: newPolicy.amountCurrency,
            levels_required: newPolicy.levelsRequired,
            expires_after_hours: newPolicy.expiresAfterHours,
            is_active: newPolicy.isActive,
            createdby: 'Admin',
          },
        });
        newPolicy.approvalPolicyId = created.approval_policy_id;
      } catch (err) {
        console.warn('[SetupService.createApprovalPolicy] DB error:', err);
      }
    }
    this.customApprovalPolicies.unshift(newPolicy);
    return newPolicy;
  }

  public async updateApprovalPolicy(id: any, data: any): Promise<any> {
    const numId = Number(id);
    const db = this.db;
    if (db) {
      try {
        const existing = await db.m_approval_policy.findUnique({
          where: { approval_policy_id: numId },
        });
        if (existing) {
          await db.m_approval_policy.update({
            where: { approval_policy_id: numId },
            data: {
              amount_from: data.amountFrom != null ? Number(data.amountFrom) : undefined,
              amount_currency: data.amountCurrency !== undefined ? data.amountCurrency : (Number(data.amountFrom) > 0 ? 'USD' : null),
              levels_required: data.levelsRequired != null ? Number(data.levelsRequired) : undefined,
              expires_after_hours: data.expiresAfterHours != null ? Number(data.expiresAfterHours) : undefined,
              is_active: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
              updatedate: new Date(),
              updatedby: 'Admin',
            },
          });
          if (data.description && existing.permission_code) {
            await db.m_permission.update({
              where: { permission_code: existing.permission_code },
              data: {
                description: data.description,
                updatedate: new Date(),
                updatedby: 'Admin',
              },
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[SetupService.updateApprovalPolicy] DB error:', err);
      }
    }

    const inMem = this.customApprovalPolicies.find((p) => p.approvalPolicyId === numId);
    if (inMem) {
      Object.assign(inMem, data);
      return inMem;
    }
    const seed = seedApprovalPolicies.find((p) => p.approvalPolicyId === numId);
    if (seed) {
      Object.assign(seed, data);
      if (data.description) {
        (seed as any).description = data.description;
        const perm = seedPerms.find((p) => p.code === seed.permissionCode);
        if (perm) perm.description = data.description;
      }
      return seed;
    }
    return { approvalPolicyId: id, ...data };
  }

  public async createExceptionType(data: any): Promise<any> {
    const excCode = (data.exceptionCode || ('EXC_' + Date.now())).toUpperCase().trim();
    const newExc = {
      exceptionTypeId: Date.now(),
      exceptionCode: excCode,
      exceptionName: data.exceptionName || excCode,
      severity: data.severity || 'MEDIUM',
      slaMinutes: Number(data.slaMinutes) || 120,
      defaultRoleCode: data.defaultRoleCode || 'customer.service',
      escalationRoleCode: data.escalationRoleCode || 'icd.admin',
      placesHoldTypeCode: data.placesHoldTypeCode || null,
      supervisorClose: Boolean(data.supervisorClose),
      isActive: data.isActive !== false,
    };

    const db = this.db;
    if (db) {
      try {
        let defaultRoleId: number | null = null;
        let escalationRoleId: number | null = null;
        let holdTypeId: number | null = null;

        if (data.defaultRoleCode) {
          const role = await db.m_role.findFirst({ where: { role_code: data.defaultRoleCode } });
          if (role) defaultRoleId = role.role_id;
        }
        if (data.escalationRoleCode) {
          const role = await db.m_role.findFirst({ where: { role_code: data.escalationRoleCode } });
          if (role) escalationRoleId = role.role_id;
        }
        if (data.placesHoldTypeCode) {
          const hold = await db.m_hold_type.findFirst({ where: { hold_code: data.placesHoldTypeCode } });
          if (hold) holdTypeId = hold.hold_type_id;
        }

        const created = await db.m_exception_type.create({
          data: {
            exception_code: newExc.exceptionCode,
            exception_name: newExc.exceptionName,
            severity: newExc.severity,
            sla_minutes: newExc.slaMinutes,
            supervisor_close: newExc.supervisorClose,
            default_role_id: defaultRoleId,
            escalation_role_id: escalationRoleId,
            places_hold_type_id: holdTypeId,
            is_active: newExc.isActive,
            createdby: 'Admin',
          },
        });
        newExc.exceptionTypeId = created.exception_type_id;
      } catch (err) {
        console.warn('[SetupService.createExceptionType] DB error:', err);
      }
    }
    this.customExceptionTypes.unshift(newExc);
    return newExc;
  }

  public async updateExceptionType(id: any, data: any): Promise<any> {
    const numId = Number(id);
    const db = this.db;
    if (db) {
      try {
        let defaultRoleId: number | undefined;
        let escalationRoleId: number | undefined;
        let holdTypeId: number | undefined;

        if (data.defaultRoleCode) {
          const role = await db.m_role.findFirst({ where: { role_code: data.defaultRoleCode } });
          if (role) defaultRoleId = role.role_id;
        }
        if (data.escalationRoleCode) {
          const role = await db.m_role.findFirst({ where: { role_code: data.escalationRoleCode } });
          if (role) escalationRoleId = role.role_id;
        }
        if (data.placesHoldTypeCode !== undefined) {
          if (data.placesHoldTypeCode) {
            const hold = await db.m_hold_type.findFirst({ where: { hold_code: data.placesHoldTypeCode } });
            if (hold) holdTypeId = hold.hold_type_id;
          } else {
            holdTypeId = null as any;
          }
        }

        const whereClause = !isNaN(numId) && numId > 0
          ? { exception_type_id: numId }
          : { exception_code: String(id) };

        await db.m_exception_type.update({
          where: whereClause,
          data: {
            exception_name: data.exceptionName,
            severity: data.severity,
            sla_minutes: data.slaMinutes != null ? Number(data.slaMinutes) : undefined,
            supervisor_close: data.supervisorClose !== undefined ? Boolean(data.supervisorClose) : undefined,
            default_role_id: defaultRoleId,
            escalation_role_id: escalationRoleId,
            places_hold_type_id: holdTypeId,
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
            updatedate: new Date(),
            updatedby: 'Admin',
          },
        });
      } catch (err) {
        console.warn('[SetupService.updateExceptionType] DB error:', err);
      }
    }

    const inMem = this.customExceptionTypes.find(
      (e) => e.exceptionTypeId === numId || String(e.exceptionCode) === String(id)
    );
    if (inMem) {
      Object.assign(inMem, data);
      return inMem;
    }
    const seed = seedExceptionTypes.find(
      (e) => (e as any).exceptionTypeId === numId || String(e.exceptionCode) === String(id)
    );
    if (seed) Object.assign(seed, data);
    return { exceptionTypeId: id, ...data };
  }
  public async updateFieldRule(id: any, data: any): Promise<any> {
    return { ruleId: id, ...data };
  }
  public async createCalendar(data: any): Promise<any> {
    return { calendarId: Date.now(), ...data };
  }
  public async updateCalendar(id: any, data: any): Promise<any> {
    return { calendarId: id, ...data };
  }
  public async createHoliday(data: any): Promise<any> {
    return { holidayId: Date.now(), ...data };
  }
  public async updateHoliday(id: any, data: any): Promise<any> {
    return { holidayId: id, ...data };
  }
  public async createSyncStatus(data: any): Promise<any> {
    return { syncId: Date.now(), ...data };
  }
  public async updateSyncStatus(id: any, data: any): Promise<any> {
    return { syncId: id, ...data };
  }
  public async createOutbox(data: any): Promise<any> {
    return { outboxId: Date.now(), ...data };
  }
  public async updateOutbox(id: any, data: any): Promise<any> {
    return { outboxId: id, ...data };
  }
  public async createDevice(data: any): Promise<any> {
    const siteId = Number(data.siteId) || 1;
    const kind = data.deviceKind || 'TABLET';
    const prefix = kind === 'TABLET' ? 'TAB' : kind === 'PHONE' ? 'HH' : kind === 'KIOSK' ? 'KIOSK' : 'GA';
    const siteCode = siteId === 2 ? 'DAR2' : 'DAR1';
    const deviceCode = data.deviceCode || (prefix + '-' + siteCode + '-' + (Math.floor(Math.random() * 80) + 10).toString().padStart(2, '0'));
    const deviceName = data.deviceName || (kind + ' ' + deviceCode);
    const assignedTo = data.assignedTo || deviceName;

    const newDevice = {
      deviceId: Date.now(),
      siteId,
      deviceCode,
      deviceName,
      deviceKind: kind,
      registeredAt: new Date().toISOString(),
      registeredBy: data.registeredBy || 'Ashok K.',
      lastSeenAt: new Date().toISOString(),
      queue: 0,
      appVersion: '1.4.2',
      assignedTo,
      isActive: true,
      revokedAt: undefined,
      revokedReason: undefined,
    };

    const db = this.db;
    if (db) {
      try {
        const created = await db.m_device.create({
          data: {
            site_id: newDevice.siteId,
            device_code: newDevice.deviceCode,
            device_name: newDevice.deviceName,
            device_kind: newDevice.deviceKind,
            registered_by: newDevice.registeredBy,
            registered_at: new Date(),
            last_seen_at: new Date(),
            createdby: 'Admin',
          },
        });
        newDevice.deviceId = created.device_id;
      } catch (err: any) {
        console.warn('[SetupService.createDevice] DB error:', err.message);
      }
    }

    this.customDevices.unshift(newDevice);
    return newDevice;
  }

  public async updateDevice(id: any, data: any): Promise<any> {
    const numId = Number(id);
    const db = this.db;
    if (db) {
      try {
        const whereClause = !isNaN(numId) && numId > 0
          ? { device_id: numId }
          : { device_code: String(id) };

        await db.m_device.update({
          where: whereClause,
          data: {
            device_name: data.deviceName,
            device_kind: data.deviceKind,
            site_id: data.siteId ? Number(data.siteId) : undefined,
            updatedate: new Date(),
            updatedby: 'Admin',
          },
        });
      } catch (err: any) {
        console.warn('[SetupService.updateDevice] DB error:', err.message);
      }
    }

    const inMem = this.customDevices.find((d) => d.deviceId === numId || String(d.deviceCode) === String(id));
    if (inMem) {
      Object.assign(inMem, data);
      return inMem;
    }
    const seed = seedDevices.find((d) => d.deviceId === numId || String(d.deviceCode) === String(id));
    if (seed) {
      Object.assign(seed, data);
      return seed;
    }
    return { deviceId: id, ...data };
  }

  public async revokeDevice(id: any, reason?: string): Promise<any> {
    const numId = Number(id);
    const revokeDate = new Date();
    const revokedReason = reason || 'Revoked by administrator';

    const db = this.db;
    if (db) {
      try {
        const whereClause = !isNaN(numId) && numId > 0
          ? { device_id: numId }
          : { device_code: String(id) };

        await db.m_device.update({
          where: whereClause,
          data: {
            revoked_at: revokeDate,
            revoked_by: 'Admin',
            revoked_reason: revokedReason,
            updatedate: new Date(),
            updatedby: 'Admin',
          },
        });
      } catch (err: any) {
        console.warn('[SetupService.revokeDevice] DB error:', err.message);
      }
    }

    const inMem = this.customDevices.find((d) => d.deviceId === numId || String(d.deviceCode) === String(id));
    if (inMem) {
      inMem.revokedAt = revokeDate.toISOString();
      inMem.revokedReason = revokedReason;
      inMem.isActive = false;
      return inMem;
    }

    const seed = seedDevices.find((d) => d.deviceId === numId || String(d.deviceCode) === String(id));
    if (seed) {
      seed.revokedAt = revokeDate.toISOString();
      seed.revokedReason = revokedReason;
      (seed as any).isActive = false;
      return seed;
    }

    return { deviceId: id, revokedAt: revokeDate.toISOString(), revokedReason, isActive: false };
  }
  public async createDeviceIntegration(data: any): Promise<any> {
    return { integrationId: Date.now(), ...data };
  }
  public async updateDeviceIntegration(id: any, data: any): Promise<any> {
    return { integrationId: id, ...data };
  }
  public async createNumberSequence(data: any): Promise<any> {
    const prefix = (data.prefix || 'DOC').toUpperCase().trim();
    const documentKind = (data.documentKind || 'CUSTOM').toUpperCase().trim();
    const pattern = data.pattern || '{PREFIX}-{YYYY}-{######}';
    const siteId = data.siteId ? Number(data.siteId) : null;
    const siteCode = siteId === 2 ? 'DAR2' : siteId === 1 ? 'DAR1' : data.siteCode || 'All sites';
    const nextValue = Number(data.nextValue) || 1;
    const resetPolicy = data.resetPolicy || 'YEARLY';
    const currentPeriod = data.currentPeriod || '2026';
    const sample = `${prefix}-${siteCode !== 'All sites' ? siteCode + '-' : ''}26-${String(nextValue).padStart(5, '0')}`;

    const newSeq = {
      numberSequenceId: Date.now(),
      companyId: 1,
      siteId,
      siteCode,
      documentKind,
      prefix,
      pattern,
      nextValue,
      resetPolicy,
      currentPeriod,
      sample,
      logInst: 1,
    };

    const db = this.db;
    if (db) {
      try {
        const created = await db.m_number_sequence.create({
          data: {
            company_id: 1,
            site_id: siteId,
            document_kind: newSeq.documentKind,
            prefix: newSeq.prefix,
            pattern: newSeq.pattern,
            next_value: BigInt(newSeq.nextValue),
            reset_policy: newSeq.resetPolicy,
            current_period: newSeq.currentPeriod,
            createdby: 'Admin',
          },
        });
        newSeq.numberSequenceId = created.number_sequence_id;
      } catch (err: any) {
        console.warn('[SetupService.createNumberSequence] DB error:', err.message);
      }
    }

    this.customNumberSequences.unshift(newSeq);
    return newSeq;
  }

  public async updateNumberSequence(id: any, data: any): Promise<any> {
    const numId = Number(id);
    const db = this.db;
    if (db) {
      try {
        await db.m_number_sequence.update({
          where: { number_sequence_id: numId },
          data: {
            prefix: data.prefix,
            pattern: data.pattern,
            next_value: data.nextValue != null ? BigInt(data.nextValue) : undefined,
            reset_policy: data.resetPolicy,
            current_period: data.currentPeriod,
            site_id: data.siteId !== undefined ? (data.siteId ? Number(data.siteId) : null) : undefined,
            updatedate: new Date(),
            updatedby: 'Admin',
          },
        });
      } catch (err: any) {
        console.warn('[SetupService.updateNumberSequence] DB error:', err.message);
      }
    }

    const inMem = this.customNumberSequences.find((s) => s.numberSequenceId === numId);
    if (inMem) {
      Object.assign(inMem, data);
      return inMem;
    }
    const seed = seedNumberSequences.find((s) => s.numberSequenceId === numId);
    if (seed) {
      Object.assign(seed, data);
      return seed;
    }
    return { numberSequenceId: id, ...data };
  }

  public async createDocumentType(data: any): Promise<any> {
    const docTypeCode = (data.docTypeCode || `DOC_${Date.now().toString().slice(-4)}`).toUpperCase().trim();
    const docTypeName = data.docTypeName || docTypeCode;
    const appliesTo = data.appliesTo || 'CONSIGNMENT';
    const retentionYears = Number(data.retentionYears) || 7;
    const maxSizeMb = Number(data.maxSizeMb) || 20;
    const allowedExt = data.allowedExt || 'pdf,jpg,jpeg,png';
    const requiresApproval = Boolean(data.requiresApproval);
    const requiredFor = Array.isArray(data.requiredFor)
      ? data.requiredFor
      : (typeof data.requiredFor === 'string' && data.requiredFor ? data.requiredFor.split(',').map((s: string) => s.trim()) : []);

    const newDoc = {
      documentTypeId: Date.now(),
      docTypeCode,
      docTypeName,
      appliesTo,
      retentionYears,
      maxSizeMb,
      allowedExt,
      requiresApproval,
      requiredFor,
      isActive: true,
    };

    const db = this.db;
    if (db) {
      try {
        const created = await db.m_document_type.create({
          data: {
            doc_type_code: newDoc.docTypeCode,
            doc_type_name: newDoc.docTypeName,
            applies_to: newDoc.appliesTo,
            retention_years: newDoc.retentionYears,
            max_size_mb: newDoc.maxSizeMb,
            allowed_ext: newDoc.allowedExt,
            requires_approval: newDoc.requiresApproval,
            is_active: true,
            createdby: 'Admin',
          },
        });
        newDoc.documentTypeId = created.document_type_id;
      } catch (err: any) {
        console.warn('[SetupService.createDocumentType] DB error:', err.message);
      }
    }

    this.customDocumentTypes.unshift(newDoc);
    return newDoc;
  }

  public async updateDocumentType(id: any, data: any): Promise<any> {
    const numId = Number(id);
    const db = this.db;
    if (db) {
      try {
        const whereClause = !isNaN(numId) && numId > 0
          ? { document_type_id: numId }
          : { doc_type_code: String(id) };

        await db.m_document_type.update({
          where: whereClause,
          data: {
            doc_type_name: data.docTypeName,
            applies_to: data.appliesTo,
            retention_years: data.retentionYears != null ? Number(data.retentionYears) : undefined,
            max_size_mb: data.maxSizeMb != null ? Number(data.maxSizeMb) : undefined,
            allowed_ext: data.allowedExt,
            requires_approval: data.requiresApproval !== undefined ? Boolean(data.requiresApproval) : undefined,
            is_active: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
            updatedate: new Date(),
            updatedby: 'Admin',
          },
        });
      } catch (err: any) {
        console.warn('[SetupService.updateDocumentType] DB error:', err.message);
      }
    }

    const inMem = this.customDocumentTypes.find((d) => d.documentTypeId === numId || String(d.docTypeCode) === String(id));
    if (inMem) {
      Object.assign(inMem, data);
      return inMem;
    }
    const seed = seedDocumentTypes.find((d) => (d as any).documentTypeId === numId || String(d.docTypeCode) === String(id));
    if (seed) {
      Object.assign(seed, data);
      return seed;
    }
    return { documentTypeId: id, ...data };
  }
  public async createAccountingPeriod(data: any): Promise<any> {
    const periodKey = data.periodKey || ('2026-' + String(new Date().getMonth() + 1).padStart(2, '0'));
    const periodStart = data.periodStart || (periodKey + '-01');
    const periodEnd = data.periodEnd || (periodKey + '-28');
    const newPeriod = {
      accountingPeriodId: Date.now(),
      companyId: data.companyId || 1,
      periodKey,
      periodStart,
      periodEnd,
      status: (data.status || 'OPEN') as 'OPEN' | 'CLOSED',
      closedAt: undefined,
      closedBy: undefined,
      logInst: 1,
    };
    const db = this.db;
    if (db) {
      try {
        const created = await db.accounting_period.create({
          data: {
            company_id: newPeriod.companyId,
            period_key: periodKey,
            period_start: new Date(periodStart),
            period_end: new Date(periodEnd),
            status: newPeriod.status,
            log_inst: 1,
          },
        });
        newPeriod.accountingPeriodId = created.accounting_period_id;
      } catch (err) {
        console.warn('[SetupService.createAccountingPeriod] DB write failed:', err);
      }
    }
    this.customAccountingPeriods.unshift(newPeriod);
    return newPeriod;
  }

  public async updateAccountingPeriod(id: any, data: any): Promise<any> {
    let inMem = this.customAccountingPeriods.find(
      (p) => String(p.accountingPeriodId) === String(id) || p.periodKey === String(id)
    );
    if (inMem) {
      Object.assign(inMem, data);
    } else {
      const seed = seedPeriods.find((p) => String(p.accountingPeriodId) === String(id) || p.periodKey === String(id));
      if (seed) {
        inMem = { ...seed, ...data };
        this.customAccountingPeriods.push(inMem);
      }
    }
    const db = this.db;
    if (db) {
      try {
        const numId = Number(id);
        if (!isNaN(numId)) {
          await db.accounting_period.update({
            where: { accounting_period_id: numId },
            data: {
              status: data.status,
              closed_at: data.closedAt ? new Date(data.closedAt) : undefined,
              closed_by_sub: data.closedBy,
            },
          });
        }
      } catch (err) {
        console.warn('[SetupService.updateAccountingPeriod] DB write failed:', err);
      }
    }
    return inMem || { periodKey: id, ...data };
  }

  public async closeAccountingPeriod(periodKey: string, reason?: string): Promise<any> {
    const now = new Date().toISOString();
    const user = 'Ashok Kumar';
    let inMem = this.customAccountingPeriods.find((p) => p.periodKey === periodKey);
    if (inMem) {
      inMem.status = 'CLOSED';
      inMem.closedAt = now;
      inMem.closedBy = user;
    } else {
      const seed = seedPeriods.find((p) => p.periodKey === periodKey);
      if (seed) {
        inMem = { ...seed, status: 'CLOSED', closedAt: now, closedBy: user };
        this.customAccountingPeriods.push(inMem);
      }
    }
    const db = this.db;
    if (db) {
      try {
        await db.accounting_period.updateMany({
          where: { period_key: periodKey },
          data: { status: 'CLOSED', closed_at: new Date(), closed_by_sub: user },
        });
      } catch (err) {
        console.warn('[SetupService.closeAccountingPeriod] DB update failed:', err);
      }
    }
    return { periodKey, status: 'CLOSED', closedAt: now, closedBy: user, reason };
  }

  public async reopenAccountingPeriod(periodKey: string, reason?: string): Promise<any> {
    let inMem = this.customAccountingPeriods.find((p) => p.periodKey === periodKey);
    if (inMem) {
      inMem.status = 'OPEN';
      inMem.closedAt = undefined;
      inMem.closedBy = undefined;
    } else {
      const seed = seedPeriods.find((p) => p.periodKey === periodKey);
      if (seed) {
        inMem = { ...seed, status: 'OPEN', closedAt: undefined, closedBy: undefined };
        this.customAccountingPeriods.push(inMem);
      }
    }
    const db = this.db;
    if (db) {
      try {
        await db.accounting_period.updateMany({
          where: { period_key: periodKey },
          data: { status: 'OPEN', closed_at: null, closed_by_sub: null },
        });
      } catch (err) {
        console.warn('[SetupService.reopenAccountingPeriod] DB update failed:', err);
      }
    }
    return { periodKey, status: 'OPEN', reason };
  }

  public async createChargeCode(data: any): Promise<any> {
    const code = (data.chargeCode || CHG_).toUpperCase().trim();
    const name = data.chargeName || code;
    const group = (data.chargeGroup || 'OTHER').toUpperCase();
    const defaultTax = data.defaultTaxCode || 'TZ_VAT_STD';
    const isDisb = Boolean(data.isDisbursement);
    const printOrder = Number(data.printOrder || 99);
    const revenueGl = data.revenueGlAccount || (isDisb ? null : '4900-99');

    const newCharge = {
      chargeCodeId: Date.now(),
      chargeCode: code,
      chargeName: name,
      chargeGroup: group,
      defaultTaxCode: defaultTax,
      isDisbursement: isDisb,
      printOrder,
      revenueGlAccount: revenueGl,
      isActive: true,
      logInst: 1,
    };
    const db = this.db;
    if (db) {
      try {
        const created = await db.m_charge_code.create({
          data: {
            charge_code: code,
            charge_name: name,
            is_active: true,
            createdby: 'SYSTEM',
          },
        });
        newCharge.chargeCodeId = created.charge_code_id;
      } catch (err) {
        console.warn('[SetupService.createChargeCode] DB write failed:', err);
      }
    }
    this.customChargeCodes.unshift(newCharge);
    return newCharge;
  }

  public async updateChargeCode(id: any, data: any): Promise<any> {
    let inMem = this.customChargeCodes.find(
      (c) => String(c.chargeCodeId) === String(id) || c.chargeCode === String(id)
    );
    if (inMem) {
      Object.assign(inMem, data);
    } else {
      const seed = seedChargeCodes.find((c) => String(c.chargeCodeId) === String(id) || c.chargeCode === String(id));
      if (seed) {
        inMem = { ...seed, ...data };
        this.customChargeCodes.push(inMem);
      }
    }
    const db = this.db;
    if (db) {
      try {
        const numId = Number(id);
        if (!isNaN(numId)) {
          await db.m_charge_code.update({
            where: { charge_code_id: numId },
            data: {
              charge_name: data.chargeName,
              is_active: data.isActive,
            },
          });
        }
      } catch (err) {
        console.warn('[SetupService.updateChargeCode] DB write failed:', err);
      }
    }
    return inMem || { chargeCodeId: id, ...data };
  }

  public async createTaxCode(data: any): Promise<any> {
    const code = (data.taxCode || TAX_).toUpperCase().trim();
    const name = data.taxName || code;
    const country = (data.countryCode || 'TZ').toUpperCase();
    const rate = String(data.ratePct ?? data.ratePercent ?? '18.000');
    const treatment = data.taxTreatment || 'STANDARD';
    const outputGl = data.outputGlAccount || (treatment === 'STANDARD' ? '2310-00' : null);

    const newTax = {
      taxCodeId: Date.now(),
      taxCode: code,
      taxName: name,
      countryCode: country,
      ratePct: rate,
      taxTreatment: treatment,
      fiscalTaxClass: data.fiscalTaxClass || null,
      outputGlAccount: outputGl,
      effectiveFrom: data.effectiveFrom || new Date().toISOString().split('T')[0],
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      verify: data.verify,
      logInst: 1,
    };
    const db = this.db;
    if (db) {
      try {
        const created = await db.m_tax_code.create({
          data: {
            tax_code: code,
            tax_name: name,
            rate_pct: Number(rate),
            is_active: newTax.isActive,
            createdby: 'SYSTEM',
          },
        });
        newTax.taxCodeId = created.tax_code_id;
      } catch (err) {
        console.warn('[SetupService.createTaxCode] DB write failed:', err);
      }
    }
    this.customTaxCodes.unshift(newTax);
    return newTax;
  }

  public async updateTaxCode(id: any, data: any): Promise<any> {
    let inMem = this.customTaxCodes.find(
      (t) => String(t.taxCodeId) === String(id) || t.taxCode === String(id)
    );
    if (inMem) {
      Object.assign(inMem, data);
    } else {
      const seed = seedTaxCodes.find((t) => String(t.taxCodeId) === String(id) || t.taxCode === String(id));
      if (seed) {
        inMem = { ...seed, ...data };
        this.customTaxCodes.push(inMem);
      }
    }
    const db = this.db;
    if (db) {
      try {
        const numId = Number(id);
        if (!isNaN(numId)) {
          await db.m_tax_code.update({
            where: { tax_code_id: numId },
            data: {
              tax_name: data.taxName,
              rate_pct: data.ratePct ? Number(data.ratePct) : undefined,
              is_active: data.isActive,
            },
          });
        }
      } catch (err) {
        console.warn('[SetupService.updateTaxCode] DB write failed:', err);
      }
    }
    return inMem || { taxCodeId: id, ...data };
  }

  public async createPaymentChannel(data: any): Promise<any> {
    const code = (data.channelCode || CH_).toUpperCase().trim();
    const name = data.channelName || code;
    const method = data.method || 'BANK_TRANSFER';
    const currency = data.currency || 'USD';
    const glAccount = data.glAccount || '1020-01';

    const newChannel = {
      paymentChannelId: Date.now(),
      companyId: data.companyId || 1,
      channelCode: code,
      channelName: name,
      method,
      provider: data.provider || null,
      currency,
      glAccount,
      referencePattern: data.referencePattern || null,
      example: data.example || '—',
      refHint: data.refHint || 'No reference required',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      logInst: 1,
    };
    const db = this.db;
    if (db) {
      try {
        const created = await db.m_payment_channel.create({
          data: {
            company_id: newChannel.companyId,
            channel_code: code,
            channel_name: name,
            method,
            provider: newChannel.provider,
            currency,
            gl_account: glAccount,
            reference_pattern: newChannel.referencePattern,
            is_active: newChannel.isActive,
            createdby: 'SYSTEM',
          },
        });
        newChannel.paymentChannelId = created.payment_channel_id;
      } catch (err) {
        console.warn('[SetupService.createPaymentChannel] DB write failed:', err);
      }
    }
    this.customPaymentChannels.unshift(newChannel);
    return newChannel;
  }

  public async updatePaymentChannel(id: any, data: any): Promise<any> {
    let inMem = this.customPaymentChannels.find(
      (c) => String(c.paymentChannelId) === String(id) || c.channelCode === String(id)
    );
    if (inMem) {
      Object.assign(inMem, data);
    } else {
      const seed = seedPaymentChannels.find((c) => String(c.paymentChannelId) === String(id) || c.channelCode === String(id));
      if (seed) {
        inMem = { ...seed, ...data };
        this.customPaymentChannels.push(inMem);
      }
    }
    const db = this.db;
    if (db) {
      try {
        const numId = Number(id);
        if (!isNaN(numId)) {
          await db.m_payment_channel.update({
            where: { payment_channel_id: numId },
            data: {
              channel_name: data.channelName,
              provider: data.provider,
              currency: data.currency,
              gl_account: data.glAccount,
              reference_pattern: data.referencePattern,
              is_active: data.isActive,
            },
          });
        }
      } catch (err) {
        console.warn('[SetupService.updatePaymentChannel] DB write failed:', err);
      }
    }
    return inMem || { channelId: id, ...data };
  }

  public async createGlSetting(data: any): Promise<any> {
    const key = (data.settingKey || KEY_).toUpperCase().trim();
    const newGl = {
      settingKey: key,
      glAccount: data.glAccount || '1000-00',
      description: data.description || key,
      logInst: 1,
    };
    const db = this.db;
    if (db) {
      try {
        await db.m_gl_setting.create({
          data: {
            company_id: 1,
            setting_key: key,
            gl_account: newGl.glAccount,
            description: newGl.description,
            createdby: 'SYSTEM',
          },
        });
      } catch (err) {
        console.warn('[SetupService.createGlSetting] DB write failed:', err);
      }
    }
    this.customGlSettings.unshift(newGl);
    return newGl;
  }

  public async updateGlSetting(id: any, data: any): Promise<any> {
    let inMem = this.customGlSettings.find(
      (g) => g.settingKey === String(id)
    );
    if (inMem) {
      Object.assign(inMem, data);
    } else {
      const seed = seedGlSettings.find((g) => g.settingKey === String(id));
      if (seed) {
        inMem = { ...seed, ...data };
        this.customGlSettings.push(inMem);
      }
    }
    const db = this.db;
    if (db) {
      try {
        await db.m_gl_setting.updateMany({
          where: { setting_key: String(id) },
          data: {
            gl_account: data.glAccount,
            description: data.description,
          },
        });
      } catch (err) {
        console.warn('[SetupService.updateGlSetting] DB write failed:', err);
      }
    }
    return inMem || { settingKey: id, ...data };
  }
  public async createInspectionTemplate(data: any): Promise<any> {
    const code = (data.templateCode || data.code || ('INSP_' + Date.now())).toUpperCase().trim();
    const name = data.templateName || data.name || code;
    const category = (data.category || data.unitCategory || 'CONTAINER').toUpperCase();
    const inspectionKind = (data.inspectionKind || 'GATE_IN').toUpperCase();
    const minPhotos = Number(data.minPhotos || 4);
    const versionNo = Number(data.versionNo || 1);

    const items = Array.isArray(data.items) && data.items.length > 0 ? data.items.map((it: any, idx: number) => ({
      itemId: it.itemId || it.inspectionItemId || (Date.now() + idx),
      inspectionItemId: it.itemId || it.inspectionItemId || (Date.now() + idx),
      itemCode: (it.itemCode || ('ITEM_' + (idx + 1))).toUpperCase(),
      itemName: it.itemName || it.itemCode,
      itemLabel: it.itemName || it.itemCode,
      area: (it.area || 'EXTERIOR').toUpperCase(),
      inputType: (it.inputType || 'YES_NO').toUpperCase(),
      isMandatory: it.isMandatory !== undefined ? Boolean(it.isMandatory) : true,
      sortOrder: it.sortOrder !== undefined ? Number(it.sortOrder) : (idx + 1) * 10,
    })) : [
      { itemId: 1, inspectionItemId: 1, itemCode: 'DOORS', itemName: 'Doors and locking bars', area: 'DOORS', inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: 10 },
      { itemId: 2, inspectionItemId: 2, itemCode: 'WALLS', itemName: 'Left and right side walls', area: 'WALLS', inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: 20 },
      { itemId: 3, inspectionItemId: 3, itemCode: 'ROOF', itemName: 'Roof condition', area: 'ROOF', inputType: 'OK_DAMAGE', isMandatory: false, sortOrder: 30 },
      { itemId: 4, inspectionItemId: 4, itemCode: 'SEAL', itemName: 'Seal present and intact', area: 'SEAL', inputType: 'YES_NO', isMandatory: true, sortOrder: 40 },
    ];

    const newTemplate: any = {
      templateId: Date.now(),
      inspectionTemplateId: Date.now(),
      templateCode: code,
      templateName: name,
      category,
      unitCategory: category,
      unitTypeKind: category,
      inspectionKind,
      versionNo,
      minPhotos,
      items,
      fixedFields: category === 'CONTAINER' ? ['Seal number', 'ISO size', 'Tare weight'] : ['Chassis/VIN', 'Odometer', 'Fuel level'],
      isActive: true,
      logInst: 1,
    };

    const db = this.db;
    if (db) {
      try {
        const created = await db.m_inspection_template.create({
          data: {
            template_code: code,
            template_name: name,
            unit_category: category,
            inspection_kind: inspectionKind,
            version_no: versionNo,
            min_photos: minPhotos,
            is_active: true,
            createdby: 'SYSTEM',
          },
        });
        newTemplate.templateId = created.inspection_template_id;
        newTemplate.inspectionTemplateId = created.inspection_template_id;

        for (const it of items) {
          try {
            await db.m_inspection_item.create({
              data: {
                inspection_template_id: created.inspection_template_id,
                item_code: it.itemCode,
                item_name: it.itemName,
                area: it.area,
                input_type: it.inputType,
                is_mandatory: it.isMandatory,
                sort_order: it.sortOrder,
                createdby: 'SYSTEM',
              },
            });
          } catch (itemErr: any) {
            console.warn('[SetupService.createInspectionTemplate] Item error:', itemErr.message);
          }
        }
      } catch (err: any) {
        console.warn('[SetupService.createInspectionTemplate] DB error:', err.message);
      }
    }

    this.customInspectionTemplates.unshift(newTemplate);
    return newTemplate;
  }

  public async updateInspectionTemplate(id: any, data: any): Promise<any> {
    const numId = Number(id);
    const inMem = this.customInspectionTemplates.find((t) => t.inspectionTemplateId === numId || String(t.templateCode) === String(id));
    if (inMem) Object.assign(inMem, data);
    return inMem || { inspectionTemplateId: numId, ...data };
  }

  public async createDamageCode(data: any): Promise<any> {
    const code = (data.damageCode || data.code || ('DMG_' + Date.now())).toUpperCase().trim();
    const name = data.damageName || data.name || code;
    const appliesTo = (data.appliesTo || 'ANY').toUpperCase();
    const description = data.description || name;

    const newDamageCode: any = {
      damageCodeId: Date.now(),
      damageCode: code,
      code,
      damageName: name,
      name,
      appliesTo,
      severity: data.severity || 'MOD',
      description,
      isActive: true,
      logInst: 1,
    };

    const db = this.db;
    if (db) {
      try {
        const created = await db.m_damage_code.create({
          data: {
            damage_code: code,
            damage_name: name,
            applies_to: appliesTo,
            createdby: 'SYSTEM',
          },
        });
        newDamageCode.damageCodeId = created.damage_code_id;
      } catch (err: any) {
        console.warn('[SetupService.createDamageCode] DB error:', err.message);
      }
    }

    this.customDamageCodes.unshift(newDamageCode);
    return newDamageCode;
  }

  public async updateDamageCode(id: any, data: any): Promise<any> {
    const numId = Number(id);
    const inMem = this.customDamageCodes.find((d) => d.damageCodeId === numId || String(d.damageCode) === String(id));
    if (inMem) Object.assign(inMem, data);
    return inMem || { damageCodeId: numId, ...data };
  }
}

export const setupService = new SetupService();
