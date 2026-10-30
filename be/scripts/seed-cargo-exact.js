const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCargo() {
  console.log('--- STARTING ACCURATE CARGO SEEDING ---');

  // 1. Company
  let company = await prisma.m_company.findFirst({ where: { company_code: 'TZ-ICD-CORP' } });
  if (!company) {
    company = await prisma.m_company.create({
      data: {
        company_code: 'TZ-ICD-CORP',
        legal_name: 'Tanzania Inland Container Depot Limited',
        trading_name: 'Dar ICD Logistics Terminal',
        country_code: 'TZ',
        country_pack_id: 1,
        base_currency: 'TZS',
        city: 'Dar es Salaam',
        email: 'info@dar-icd.co.tz',
        phone: '+255 22 2123456',
        createdby: 'system',
      },
    });
  }
  console.log('Company ID:', company.company_id);

  // 2. Site
  let site = await prisma.m_site.findFirst({ where: { site_code: 'DAR-ICD' } });
  if (!site) {
    site = await prisma.m_site.create({
      data: {
        site_code: 'DAR-ICD',
        site_name: 'Dar es Salaam ICD Terminal',
        company_id: company.company_id,
        country_code: 'TZ',
        time_zone: 'Africa/Dar_es_Salaam',
        city: 'Dar es Salaam',
        createdby: 'system',
      },
    });
  }
  console.log('Site ID:', site.site_id);

  // 3. Ports
  let portDar = await prisma.m_port.findFirst({ where: { unlocode: 'TZDAR' } });
  if (!portDar) {
    portDar = await prisma.m_port.create({
      data: {
        unlocode: 'TZDAR',
        port_name: 'Port of Dar es Salaam',
        country_code: 'TZ',
        port_kind: 'SEAPORT',
        createdby: 'system',
      },
    });
  }

  let portMba = await prisma.m_port.findFirst({ where: { unlocode: 'KEMBA' } });
  if (!portMba) {
    portMba = await prisma.m_port.create({
      data: {
        unlocode: 'KEMBA',
        port_name: 'Port of Mombasa',
        country_code: 'KE',
        port_kind: 'SEAPORT',
        createdby: 'system',
      },
    });
  }
  console.log('Ports ready: TZDAR, KEMBA');

  // 4. Parties
  const partiesData = [
    { code: 'MSK', name: 'A.P. Moller - Maersk', short: 'Maersk', credit: 'CREDIT' },
    { code: 'MSC', name: 'Mediterranean Shipping Company', short: 'MSC', credit: 'CREDIT' },
    { code: 'CMA', name: 'CMA CGM Group', short: 'CMA CGM', credit: 'CREDIT' },
    { code: 'BAKHRESA', name: 'Said Salim Bakhresa & Co Ltd', short: 'Bakhresa', credit: 'CREDIT' },
    { code: 'METL', name: 'Mohammed Enterprises Tanzania Limited', short: 'MeTL', credit: 'CREDIT' },
    { code: 'DANGOTE', name: 'Dangote Industries Tanzania Ltd', short: 'Dangote', credit: 'CASH' },
    { code: 'TWIGA', name: 'Twiga Minerals Corporation', short: 'Twiga', credit: 'CREDIT' },
    { code: 'BOLLORE', name: 'Bolloré Transport & Logistics Tanzania', short: 'Bollore', credit: 'CREDIT' },
    { code: 'FFTZ', name: 'Freight Forwarders Tanzania Limited', short: 'FFTZ', credit: 'CASH' },
  ];

  const partyMap = {};
  for (const p of partiesData) {
    let party = await prisma.m_party.findUnique({ where: { party_code: p.code } });
    if (!party) {
      party = await prisma.m_party.create({
        data: {
          party_code: p.code,
          party_name: p.name,
          short_name: p.short,
          country_code: 'TZ',
          credit_status: p.credit,
          default_currency: 'TZS',
          source: 'LOCAL',
          sync_status: 'SYNCED',
          createdby: 'system',
        },
      });
    }
    partyMap[p.code] = party;
  }
  console.log('Parties ready:', Object.keys(partyMap).length);

  // 5. Yard locations
  const locationsData = [
    { code: 'A-01-01', kind: 'SLOT', slot: true },
    { code: 'A-01-02', kind: 'SLOT', slot: true },
    { code: 'A-02-01', kind: 'SLOT', slot: true },
    { code: 'A-02-02', kind: 'SLOT', slot: true },
    { code: 'B-01-01', kind: 'SLOT', slot: true },
    { code: 'B-01-02', kind: 'SLOT', slot: true },
    { code: 'B-02-01', kind: 'SLOT', slot: true },
    { code: 'C-01-01', kind: 'SLOT', slot: true },
    { code: 'REEFER-01', kind: 'SLOT', slot: true },
    { code: 'REEFER-02', kind: 'SLOT', slot: true },
    { code: 'EXAM-BAY-1', kind: 'BAY', slot: true },
  ];

  const locMap = {};
  for (const loc of locationsData) {
    let yloc = await prisma.m_yard_location.findFirst({
      where: { site_id: site.site_id, full_code: loc.code },
    });
    if (!yloc) {
      yloc = await prisma.m_yard_location.create({
        data: {
          site_id: site.site_id,
          level_no: 1,
          location_code: loc.code,
          full_code: loc.code,
          location_kind: loc.kind,
          is_slot: loc.slot,
          allows_20: true,
          allows_40: true,
          createdby: 'system',
        },
      });
    }
    locMap[loc.code] = yloc;
  }
  console.log('Yard locations ready:', Object.keys(locMap).length);

  // 6. Vessels
  const vesselsData = [
    { name: 'Maersk Mc-Kinney Moller', imo: '9619907', sign: 'OWET2', op: partyMap['MSK']?.party_id },
    { name: 'MSC Oscar', imo: '9703291', sign: '3EZL2', op: partyMap['MSC']?.party_id },
    { name: 'CMA CGM Saint Exupery', imo: '9776418', sign: 'FMTB', op: partyMap['CMA']?.party_id },
  ];

  const vesselMap = {};
  for (const v of vesselsData) {
    let vessel = await prisma.m_vessel.findFirst({ where: { vessel_name: v.name } });
    if (!vessel) {
      vessel = await prisma.m_vessel.create({
        data: {
          vessel_name: v.name,
          imo_no: v.imo,
          call_sign: v.sign,
          flag_country: 'TZ',
          operator_party_id: v.op,
          createdby: 'system',
        },
      });
    }
    vesselMap[v.name] = vessel;
  }
  console.log('Vessels ready:', Object.keys(vesselMap).length);

  // 7. Vessel Calls
  const vcallsData = [
    {
      vesselName: 'Maersk Mc-Kinney Moller',
      voyage: 'V.2601',
      shippingLine: partyMap['MSK']?.party_id,
      eta: new Date(Date.now() - 86400000 * 3),
      ata: new Date(Date.now() - 86400000 * 2),
      status: 'ARRIVED',
    },
    {
      vesselName: 'MSC Oscar',
      voyage: 'V.2602',
      shippingLine: partyMap['MSC']?.party_id,
      eta: new Date(Date.now() + 86400000 * 1),
      ata: null,
      status: 'EXPECTED',
    },
    {
      vesselName: 'CMA CGM Saint Exupery',
      voyage: 'V.2603',
      shippingLine: partyMap['CMA']?.party_id,
      eta: new Date(Date.now() - 86400000 * 8),
      ata: new Date(Date.now() - 86400000 * 7),
      status: 'DEPARTED',
    },
  ];

  const vcallMap = {};
  for (const vc of vcallsData) {
    const vessel = vesselMap[vc.vesselName];
    let vcall = await prisma.vessel_call.findFirst({
      where: {
        vessel_id: vessel.vessel_id,
        voyage_no: vc.voyage,
        port_id: portDar.port_id,
      },
    });
    if (!vcall) {
      vcall = await prisma.vessel_call.create({
        data: {
          vessel_id: vessel.vessel_id,
          voyage_no: vc.voyage,
          port_id: portDar.port_id,
          shipping_line_party_id: vc.shippingLine,
          eta: vc.eta,
          ata: vc.ata,
          status: vc.status,
          port_call_ref: `PC-${vc.voyage}`,
          createdby: 'system',
        },
      });
    }
    vcallMap[vc.voyage] = vcall;
  }
  console.log('Vessel Calls ready:', Object.keys(vcallMap).length);

  // 8. Unit Types
  const unitTypes = await prisma.m_unit_type.findMany();
  const type20 = unitTypes.find(t => t.type_code.startsWith('20') || t.type_code === '22G1') || unitTypes[0];
  const type40 = unitTypes.find(t => t.type_code.startsWith('40') || t.type_code === '42G1') || unitTypes[1];
  const typeReefer = unitTypes.find(t => t.is_reefer) || unitTypes[0];

  // 9. Consignments
  const consignmentsData = [
    {
      refNo: 'BL-DAR-2026-001',
      vcall: vcallMap['V.2601'],
      line: partyMap['MSK']?.party_id,
      consignee: partyMap['BAKHRESA']?.party_id,
      shipper: partyMap['BOLLORE']?.party_id,
      regime: 1, // LOCAL
      desc: 'Wheat Flour & Bakery Ingredients in Bags',
      destCountry: 'TZ',
      unitsExpected: 2,
    },
    {
      refNo: 'BL-DAR-2026-002',
      vcall: vcallMap['V.2601'],
      line: partyMap['MSK']?.party_id,
      consignee: partyMap['METL']?.party_id,
      shipper: partyMap['FFTZ']?.party_id,
      regime: 2, // TRANSIT
      desc: 'Industrial Machinery Spares & Automotive Parts',
      destCountry: 'CD',
      unitsExpected: 2,
    },
    {
      refNo: 'BL-DAR-2026-003',
      vcall: vcallMap['V.2602'],
      line: partyMap['MSC']?.party_id,
      consignee: partyMap['DANGOTE']?.party_id,
      shipper: partyMap['BOLLORE']?.party_id,
      regime: 1, // LOCAL
      desc: 'Gypsum & Heavy Clinker Industrial Raw Material',
      destCountry: 'TZ',
      unitsExpected: 2,
    },
    {
      refNo: 'BL-DAR-2026-004',
      vcall: vcallMap['V.2603'],
      line: partyMap['CMA']?.party_id,
      consignee: partyMap['TWIGA']?.party_id,
      shipper: partyMap['FFTZ']?.party_id,
      regime: 4, // BONDED
      desc: 'Mining Equipment, Drill Bits & Chemicals',
      destCountry: 'TZ',
      unitsExpected: 2,
    },
    {
      refNo: 'BL-DAR-2026-005',
      vcall: vcallMap['V.2601'],
      line: partyMap['MSK']?.party_id,
      consignee: partyMap['BAKHRESA']?.party_id,
      shipper: partyMap['BOLLORE']?.party_id,
      regime: 1, // LOCAL
      desc: 'Refrigerated Fresh Fruits & Food Products',
      destCountry: 'TZ',
      unitsExpected: 2,
    },
  ];

  const consignMap = {};
  for (const c of consignmentsData) {
    let consignment = await prisma.consignment.findFirst({
      where: { site_id: site.site_id, ref_type: 'BL', ref_no: c.refNo },
    });
    if (!consignment) {
      consignment = await prisma.consignment.create({
        data: {
          site_id: site.site_id,
          ref_type: 'BL',
          ref_no: c.refNo,
          cargo_regime_id: c.regime,
          vessel_call_id: c.vcall?.vessel_call_id,
          shipping_line_party_id: c.line,
          consignee_party_id: c.consignee,
          shipper_party_id: c.shipper,
          cargo_description: c.desc,
          destination_country: c.destCountry,
          origin_port_id: portDar.port_id,
          units_expected: c.unitsExpected,
          units_received: c.unitsExpected,
          status: 'OPEN',
          createdby: 'system',
        },
      });

      // Add lines
      await prisma.consignment_line.create({
        data: {
          consignment_id: consignment.consignment_id,
          line_no: 1,
          unit_type_id: type40.unit_type_id,
          qty_expected: 1,
          qty_received: 1,
          weight_kg: 21500,
          description: c.desc,
          createdby: 'system',
        },
      });
      await prisma.consignment_line.create({
        data: {
          consignment_id: consignment.consignment_id,
          line_no: 2,
          unit_type_id: type20.unit_type_id,
          qty_expected: 1,
          qty_received: 1,
          weight_kg: 14200,
          description: c.desc,
          createdby: 'system',
        },
      });
    }
    consignMap[c.refNo] = consignment;
  }
  console.log('Consignments ready:', Object.keys(consignMap).length);

  // 10. Cargo Units & Unit Stays
  const unitsData = [
    {
      unitNo: 'MSKU0192834',
      type: type40,
      owner: partyMap['MSK']?.party_id,
      consignment: consignMap['BL-DAR-2026-001'],
      loc: locMap['A-01-01'],
      regime: 1,
      flow: 'IMPORT',
      physicalStatus: 'IN_YARD',
      customsStatus: 'CLEARED',
      releaseStatus: 'APPROVED',
      billingStatus: 'PAID',
      seal: 'SL-TZ-1001',
      weight: 22400,
      desc: 'Wheat Flour in Bags',
      dest: 'TZ',
      dg: false,
      hold: false,
    },
    {
      unitNo: 'MSKU0192835',
      type: type20,
      owner: partyMap['MSK']?.party_id,
      consignment: consignMap['BL-DAR-2026-001'],
      loc: locMap['A-01-02'],
      regime: 1,
      flow: 'IMPORT',
      physicalStatus: 'IN_YARD',
      customsStatus: 'CLEARED',
      releaseStatus: 'REQUESTED',
      billingStatus: 'ACCRUING',
      seal: 'SL-TZ-1002',
      weight: 15300,
      desc: 'Bakery Ingredients',
      dest: 'TZ',
      dg: false,
      hold: false,
    },
    {
      unitNo: 'MSCU9182734',
      type: type40,
      owner: partyMap['MSC']?.party_id,
      consignment: consignMap['BL-DAR-2026-002'],
      loc: locMap['A-02-01'],
      regime: 2,
      flow: 'TRANSIT',
      physicalStatus: 'IN_YARD',
      customsStatus: 'LODGED',
      releaseStatus: 'NONE',
      billingStatus: 'ACCRUING',
      seal: 'SL-TZ-2001',
      weight: 26800,
      desc: 'Industrial Machinery Spares',
      dest: 'CD',
      dg: false,
      hold: true, // Hold applied
    },
    {
      unitNo: 'MSCU9182735',
      type: type20,
      owner: partyMap['MSC']?.party_id,
      consignment: consignMap['BL-DAR-2026-002'],
      loc: locMap['A-02-02'],
      regime: 2,
      flow: 'TRANSIT',
      physicalStatus: 'IN_YARD',
      customsStatus: 'LODGED',
      releaseStatus: 'NONE',
      billingStatus: 'ACCRUING',
      seal: 'SL-TZ-2002',
      weight: 14100,
      desc: 'Automotive Parts',
      dest: 'CD',
      dg: false,
      hold: false,
    },
    {
      unitNo: 'CMAU1238910',
      type: type40,
      owner: partyMap['CMA']?.party_id,
      consignment: consignMap['BL-DAR-2026-003'],
      loc: locMap['B-01-01'],
      regime: 1,
      flow: 'IMPORT',
      physicalStatus: 'EXPECTED',
      customsStatus: 'NOT_LODGED',
      releaseStatus: 'NONE',
      billingStatus: 'ACCRUING',
      seal: 'SL-TZ-3001',
      weight: 28400,
      desc: 'Gypsum Clinker Bulk',
      dest: 'TZ',
      dg: false,
      hold: false,
    },
    {
      unitNo: 'TGHU8273645',
      type: type40,
      owner: partyMap['CMA']?.party_id,
      consignment: consignMap['BL-DAR-2026-004'],
      loc: locMap['EXAM-BAY-1'],
      regime: 4,
      flow: 'IMPORT',
      physicalStatus: 'IN_YARD',
      customsStatus: 'UNDER_EXAM',
      releaseStatus: 'NONE',
      billingStatus: 'ACCRUING',
      seal: 'SL-TZ-4001',
      weight: 24100,
      desc: 'Chemical Solvents & Mining Acids',
      dest: 'TZ',
      dg: true, // Dangerous goods!
      hold: true, // Exam Hold
    },
    {
      unitNo: 'BMOU7364521',
      type: typeReefer,
      owner: partyMap['MSK']?.party_id,
      consignment: consignMap['BL-DAR-2026-005'],
      loc: locMap['REEFER-01'],
      regime: 1,
      flow: 'IMPORT',
      physicalStatus: 'IN_YARD',
      customsStatus: 'CLEARED',
      releaseStatus: 'APPROVED',
      billingStatus: 'PAID',
      seal: 'SL-TZ-5001',
      weight: 19800,
      desc: 'Refrigerated Fresh Fruits',
      dest: 'TZ',
      dg: false,
      hold: false,
      reeferTemp: -18.0,
    },
    {
      unitNo: 'HLXU3829104',
      type: type20,
      owner: partyMap['MSK']?.party_id,
      consignment: consignMap['BL-DAR-2026-005'],
      loc: locMap['REEFER-02'],
      regime: 1,
      flow: 'IMPORT',
      physicalStatus: 'GATED_IN',
      customsStatus: 'CLEARED',
      releaseStatus: 'NONE',
      billingStatus: 'ACCRUING',
      seal: 'SL-TZ-5002',
      weight: 17200,
      desc: 'Chilled Dairy Cargo',
      dest: 'TZ',
      dg: false,
      hold: false,
      reeferTemp: 4.0,
    },
  ];

  const stayList = [];
  for (const u of unitsData) {
    let cargoUnit = await prisma.cargo_unit.findFirst({
      where: { unit_category: 'CONTAINER', unit_no: u.unitNo },
    });
    if (!cargoUnit) {
      cargoUnit = await prisma.cargo_unit.create({
        data: {
          unit_category: 'CONTAINER',
          unit_no: u.unitNo,
          unit_type_id: u.type.unit_type_id,
          owner_party_id: u.owner,
          tare_kg: u.type.default_tare_kg || 2200,
          max_gross_kg: 30480,
          createdby: 'system',
        },
      });
    }

    let unitStay = await prisma.unit_stay.findFirst({
      where: { cargo_unit_id: cargoUnit.cargo_unit_id, site_id: site.site_id },
    });
    if (!unitStay) {
      unitStay = await prisma.unit_stay.create({
        data: {
          cargo_unit_id: cargoUnit.cargo_unit_id,
          site_id: site.site_id,
          consignment_id: u.consignment?.consignment_id,
          cargo_regime_id: u.regime,
          flow: u.flow,
          full_empty: 'F',
          physical_status: u.physicalStatus,
          customs_status: u.customsStatus,
          release_status: u.releaseStatus,
          billing_status: u.billingStatus,
          active_hold_count: u.hold ? 1 : 0,
          current_location_id: u.loc?.yard_location_id,
          line_party_id: u.owner,
          seal_no: u.seal,
          gross_weight_kg: u.weight,
          destination_country: u.dest,
          cargo_description: u.desc,
          reefer_set_temp_c: u.reeferTemp || null,
          discharge_at: new Date(Date.now() - 86400000 * 2),
          gated_in_at: new Date(Date.now() - 86400000 * 2),
          createdby: 'system',
        },
      });
    }
    stayList.push({ ...u, stay: unitStay, cargoUnit });
  }
  console.log('Unit Stays ready:', stayList.length);

  // 11. Manifests & Manifest Lines
  let manifest = await prisma.manifest.findFirst({ where: { manifest_ref: 'MNF-TZ-2026-001' } });
  if (!manifest) {
    manifest = await prisma.manifest.create({
      data: {
        site_id: site.site_id,
        vessel_call_id: vcallMap['V.2601']?.vessel_call_id,
        manifest_ref: 'MNF-TZ-2026-001',
        source: 'EXCEL',
        line_count: 4,
        created_count: 4,
        matched_count: 4,
        error_count: 0,
        status: 'APPLIED',
        createdby: 'system',
      },
    });

    const manifestUnits = stayList.slice(0, 4);
    for (let i = 0; i < manifestUnits.length; i++) {
      const mu = manifestUnits[i];
      await prisma.manifest_line.create({
        data: {
          manifest_id: manifest.manifest_id,
          line_no: i + 1,
          unit_no_raw: mu.unitNo,
          unit_no: mu.unitNo,
          bl_no: mu.consignment?.ref_no,
          consignee_raw: 'Said Salim Bakhresa & Co Ltd',
          agent_raw: 'Bolloré Transport',
          full_empty: 'F',
          seal_no: mu.seal,
          gross_weight_kg: mu.weight,
          commodity_raw: mu.desc,
          match_status: 'MATCHED',
          unit_stay_id: mu.stay.unit_stay_id,
          createdby: 'system',
        },
      });
    }
    console.log('Created Manifest MNF-TZ-2026-001 with 4 lines');
  }

  // 12. Holds
  const heldUnit1 = stayList.find(s => s.unitNo === 'MSCU9182734');
  if (heldUnit1) {
    const existingHold = await prisma.hold.findFirst({ where: { unit_stay_id: heldUnit1.stay.unit_stay_id } });
    if (!existingHold) {
      await prisma.hold.create({
        data: {
          unit_stay_id: heldUnit1.stay.unit_stay_id,
          hold_type_id: 1, // Customs hold
          status: 'ACTIVE',
          authority_ref: 'TRA-CUSTOMS-DAR-8841',
          reason: 'Customs valuation discrepancy and declaration verification audit',
          placed_at: new Date(Date.now() - 86400000 * 1),
          placed_by_sub: 'Customs Officer',
          createdby: 'system',
        },
      });
      console.log('Created Hold on', heldUnit1.unitNo);
    }
  }

  const heldUnit2 = stayList.find(s => s.unitNo === 'TGHU8273645');
  if (heldUnit2) {
    const existingHold2 = await prisma.hold.findFirst({ where: { unit_stay_id: heldUnit2.stay.unit_stay_id } });
    if (!existingHold2) {
      await prisma.hold.create({
        data: {
          unit_stay_id: heldUnit2.stay.unit_stay_id,
          hold_type_id: 2, // Scan / examination hold
          status: 'ACTIVE',
          authority_ref: 'TRA-EXAM-DAR-9012',
          reason: 'Physical inspection and hazardous substance chemical analysis mandated',
          placed_at: new Date(Date.now() - 86400000 * 2),
          placed_by_sub: 'TRA Port Inspector',
          createdby: 'system',
        },
      });
      console.log('Created Exam Hold on', heldUnit2.unitNo);
    }
  }

  // 13. Release Orders
  const roConsignment = consignMap['BL-DAR-2026-001'];
  if (roConsignment) {
    let ro = await prisma.release_order.findFirst({ where: { release_no: 'RO-2026-001' } });
    if (!ro) {
      ro = await prisma.release_order.create({
        data: {
          site_id: site.site_id,
          release_no: 'RO-2026-001',
          release_kind: 'DELIVERY',
          consignment_id: roConsignment.consignment_id,
          status: 'APPROVED',
          units_total: 2,
          units_out: 0,
          requested_by_party_id: partyMap['BAKHRESA']?.party_id,
          transporter_party_id: partyMap['BOLLORE']?.party_id,
          valid_from: new Date(Date.now() - 86400000 * 1),
          valid_to: new Date(Date.now() + 86400000 * 5),
          approved_at: new Date(Date.now() - 86400000 * 1),
          approved_by_sub: 'Release Supervisor',
          collector_name: 'Juma Mwamburi',
          collector_id_type: 'NIDA',
          collector_id_no: 'TZ-NIDA-19850214-9921',
          createdby: 'system',
        },
      });

      const roUnits = stayList.filter(s => s.consignment?.consignment_id === roConsignment.consignment_id);
      for (const ru of roUnits) {
        await prisma.release_order_unit.create({
          data: {
            release_order_id: ro.release_order_id,
            unit_stay_id: ru.stay.unit_stay_id,
            status: 'PENDING',
            createdby: 'system',
          },
        });
      }
      console.log('Created Release Order RO-2026-001');
    }
  }

  // 14. Customs Refs (NOTE: either consignment_id OR unit_stay_id, not both!)
  const customsRefsData = [
    {
      consignmentId: consignMap['BL-DAR-2026-001']?.consignment_id,
      stayId: null,
      typeId: 1, // TANSAD
      refNo: 'TANSAD-2026-DAR-00892',
      date: new Date(Date.now() - 86400000 * 4),
      amount: 14500000.0,
      currency: 'TZS',
      status: 'ACTIVE',
    },
    {
      consignmentId: consignMap['BL-DAR-2026-002']?.consignment_id,
      stayId: null,
      typeId: 2, // Transit declaration
      refNo: 'TR-DECL-2026-0491',
      date: new Date(Date.now() - 86400000 * 3),
      amount: 4800.0,
      currency: 'USD',
      status: 'ACTIVE',
    },
    {
      consignmentId: null,
      stayId: stayList[5]?.stay.unit_stay_id, // For specific held unit TGHU8273645
      typeId: 3, // Transit bond
      refNo: 'BOND-TZ-2026-9021',
      date: new Date(Date.now() - 86400000 * 2),
      amount: 25000000.0,
      currency: 'TZS',
      status: 'ACTIVE',
    },
  ];

  for (const cr of customsRefsData) {
    let ref = await prisma.customs_ref.findFirst({ where: { ref_no: cr.refNo } });
    if (!ref) {
      await prisma.customs_ref.create({
        data: {
          customs_ref_type_id: cr.typeId,
          consignment_id: cr.consignmentId,
          unit_stay_id: cr.stayId,
          ref_no: cr.refNo,
          ref_date: cr.date,
          status: cr.status,
          amount: cr.amount,
          amount_currency: cr.currency,
          valid_to: new Date(Date.now() + 86400000 * 30),
          source: 'MANUAL',
          createdby: 'system',
        },
      });
    }
  }
  console.log('Customs Refs ready');

  // 15. Customs Exams
  const examUnit = stayList.find(s => s.unitNo === 'TGHU8273645');
  if (examUnit) {
    let exam = await prisma.exam.findFirst({ where: { unit_stay_id: examUnit.stay.unit_stay_id } });
    if (!exam) {
      await prisma.exam.create({
        data: {
          unit_stay_id: examUnit.stay.unit_stay_id,
          exam_type: 'PHYSICAL',
          notice_ref: 'EXAM-NOT-2026-0041',
          authority: 'CUSTOMS',
          status: 'SCHEDULED',
          scheduled_at: new Date(Date.now() + 86400000 * 1),
          exam_location_id: locMap['EXAM-BAY-1']?.yard_location_id,
          officers_present: 'Inspector Daudi M., TRA Officer Hassan K.',
          remarks: 'Mandatory joint verification of chemical contents with TBS & GCLA experts.',
          createdby: 'system',
        },
      });
      console.log('Created Physical Exam for unit', examUnit.unitNo);
    }
  }

  // 16. Dangerous Goods
  const dgUnit = stayList.find(s => s.unitNo === 'TGHU8273645');
  if (dgUnit) {
    let dgLine = await prisma.unit_dg_line.findFirst({ where: { unit_stay_id: dgUnit.stay.unit_stay_id } });
    if (!dgLine) {
      await prisma.unit_dg_line.create({
        data: {
          unit_stay_id: dgUnit.stay.unit_stay_id,
          un_no: '1203',
          imo_class: '3',
          packing_group: 'II',
          proper_shipping_name: 'MOTOR SPIRIT / GASOLINE FLAMMABLE LIQUID',
          flashpoint_c: -40.0,
          marine_pollutant: true,
          gross_weight_kg: 24100.0,
          emergency_contact: '+255 22 2110000 (Dar Emergency Response)',
          createdby: 'system',
        },
      });
      console.log('Created Dangerous Goods Line for', dgUnit.unitNo);
    }
  }

  console.log('==============================================');
  console.log('ALL CARGO SECTIONS SEEDED SUCCESSFULLY!');
  console.log('==============================================');
  await prisma.$disconnect();
}

seedCargo().catch(e => {
  console.error('Seeding error:', e);
  process.exit(1);
});
