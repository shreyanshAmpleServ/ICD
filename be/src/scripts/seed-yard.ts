import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Live Hierarchical Yard Locations in MSSQL ---');

  const site = await prisma.m_site.findFirst();
  const siteId = site?.site_id || 1;

  // 1. Tags in m_location_tag
  const tagsToEnsure = [
    { code: 'IMPORT', name: 'Import' },
    { code: 'EXPORT', name: 'Export' },
    { code: 'TRANSIT', name: 'Transit' },
    { code: 'EMPTY', name: 'Empty' },
    { code: 'REEFER', name: 'Reefer (powered)' },
    { code: 'EXAM', name: 'Examination area' },
    { code: 'CUSTOMS', name: 'Customs hold area' },
    { code: 'HAZARDOUS', name: 'Hazardous (IMDG)' },
    { code: 'DAMAGED', name: 'Damaged units' },
    { code: 'KEYS', name: 'Key cabinet' },
  ];

  const tagIdMap = new Map<string, number>();
  for (const t of tagsToEnsure) {
    let existingTag = await prisma.m_location_tag.findFirst({
      where: { tag_code: t.code },
    });
    if (!existingTag) {
      existingTag = await prisma.m_location_tag.create({
        data: {
          tag_code: t.code,
          tag_name: t.name,
          createdby: 'seed',
        },
      });
    }
    tagIdMap.set(t.code, existingTag.location_tag_id);
  }

  // 2. Main Area (Level 1)
  let mainArea = await prisma.m_yard_location.findFirst({
    where: { site_id: siteId, location_code: 'MAIN', location_kind: 'AREA' },
  });
  if (!mainArea) {
    mainArea = await prisma.m_yard_location.create({
      data: {
        site_id: siteId,
        parent_id: null,
        level_no: 1,
        location_code: 'MAIN',
        full_code: 'MAIN',
        location_kind: 'AREA',
        is_slot: false,
        allows_20: true,
        allows_40: true,
        allows_45: true,
        max_tier: 5,
        map_x: 0,
        map_y: 0,
        map_w: 940,
        map_h: 380,
        is_active: true,
        createdby: 'seed',
      },
    });
  }

  // Key Cabinet (Level 1)
  let keyCabinet = await prisma.m_yard_location.findFirst({
    where: { site_id: siteId, location_code: 'KC1', location_kind: 'KEY_CABINET' },
  });
  if (!keyCabinet) {
    keyCabinet = await prisma.m_yard_location.create({
      data: {
        site_id: siteId,
        parent_id: null,
        level_no: 1,
        location_code: 'KC1',
        full_code: 'KC1',
        location_kind: 'KEY_CABINET',
        is_slot: false,
        allows_20: false,
        allows_40: false,
        allows_45: false,
        is_active: true,
        createdby: 'seed',
      },
    });
  }

  // 3. Blocks (Level 2) under MAIN Area
  const blockDefs = [
    {
      code: 'A',
      fullCode: 'BLOCK-A',
      name: 'Block A · Import Full Containers',
      rows: 6,
      bays: 12,
      tiers: 4,
      x: 20,
      y: 40,
      w: 160,
      h: 120,
      tag: 'IMPORT',
    },
    {
      code: 'B',
      fullCode: 'BLOCK-B',
      name: 'Block B · Heavy & Transit Containers',
      rows: 6,
      bays: 12,
      tiers: 4,
      x: 200,
      y: 40,
      w: 160,
      h: 120,
      tag: 'TRANSIT',
    },
    {
      code: 'C',
      fullCode: 'BLOCK-C',
      name: 'Block C · Export Staging & Rail Transfer',
      rows: 6,
      bays: 12,
      tiers: 4,
      x: 380,
      y: 40,
      w: 160,
      h: 120,
      tag: 'EXPORT',
    },
    {
      code: 'D',
      fullCode: 'BLOCK-D',
      name: 'Block D · Empty Storage & Offhire',
      rows: 6,
      bays: 12,
      tiers: 5,
      x: 560,
      y: 40,
      w: 160,
      h: 120,
      tag: 'EMPTY',
    },
    {
      code: 'R',
      fullCode: 'BLOCK-R',
      name: 'Block R · Reefer Stacks with Power Plugs',
      rows: 4,
      bays: 8,
      tiers: 3,
      x: 560,
      y: 180,
      w: 160,
      h: 120,
      tag: 'REEFER',
      plugs: 'R-01...R-32',
    },
    {
      code: 'EXAM',
      fullCode: 'BLOCK-EXAM',
      name: 'Block EXAM · Customs Inspection Bays',
      rows: 2,
      bays: 6,
      tiers: 2,
      x: 740,
      y: 180,
      w: 160,
      h: 120,
      tag: 'EXAM',
    },
  ];

  const blockMap = new Map<string, any>();

  for (const b of blockDefs) {
    let blockLoc = await prisma.m_yard_location.findFirst({
      where: {
        site_id: siteId,
        location_kind: 'BLOCK',
        OR: [
          { location_code: b.code },
          { location_code: b.fullCode },
          { full_code: b.fullCode },
        ],
      },
    });

    if (!blockLoc) {
      blockLoc = await prisma.m_yard_location.create({
        data: {
          site_id: siteId,
          parent_id: mainArea.yard_location_id,
          level_no: 2,
          location_code: b.code,
          full_code: b.fullCode,
          location_kind: 'BLOCK',
          is_slot: false,
          allows_20: true,
          allows_40: true,
          allows_45: b.tiers >= 4,
          max_tier: b.tiers,
          map_x: b.x,
          map_y: b.y,
          map_w: b.w,
          map_h: b.h,
          reefer_plug_no: b.plugs,
          is_active: true,
          createdby: 'seed',
        },
      });
    } else {
      blockLoc = await prisma.m_yard_location.update({
        where: { yard_location_id: blockLoc.yard_location_id },
        data: {
          parent_id: mainArea.yard_location_id,
          level_no: 2,
          location_code: b.code,
          full_code: b.fullCode,
          max_tier: b.tiers,
          map_x: b.x,
          map_y: b.y,
          map_w: b.w,
          map_h: b.h,
          reefer_plug_no: b.plugs,
          is_active: true,
        },
      });
    }

    blockMap.set(b.code, blockLoc);

    // Link tag
    const tagId = tagIdMap.get(b.tag);
    if (tagId) {
      const existingLocTag = await prisma.m_yard_location_tag.findFirst({
        where: {
          yard_location_id: blockLoc.yard_location_id,
          location_tag_id: tagId,
        },
      });
      if (!existingLocTag) {
        await prisma.m_yard_location_tag.create({
          data: {
            yard_location_id: blockLoc.yard_location_id,
            location_tag_id: tagId,
            createdby: 'seed',
          },
        });
      }
    }
  }

  // 4. Slots under each block
  const slotLocMap = new Map<string, any>();

  for (const b of blockDefs) {
    const parentBlock = blockMap.get(b.code);
    const maxR = Math.min(b.rows, 4);
    const maxB = Math.min(b.bays, 6);

    for (let r = 1; r <= maxR; r++) {
      for (let bay = 1; bay <= maxB; bay++) {
        const rowStr = String(r).padStart(2, '0');
        const bayStr = String(bay).padStart(2, '0');
        const slotCode = `${b.code}-${rowStr}-${bayStr}`;

        let slot = await prisma.m_yard_location.findFirst({
          where: {
            site_id: siteId,
            OR: [
              { location_code: slotCode },
              { full_code: slotCode },
            ],
          },
        });

        if (!slot) {
          slot = await prisma.m_yard_location.create({
            data: {
              site_id: siteId,
              parent_id: parentBlock.yard_location_id,
              level_no: 3,
              location_code: slotCode,
              full_code: slotCode,
              location_kind: 'SLOT',
              is_slot: true,
              allows_20: true,
              allows_40: true,
              allows_45: b.tiers >= 4,
              max_tier: b.tiers,
              max_weight_kg: 32500,
              is_blocked: (b.code === 'A' && r === 2 && bay === 5) || (b.code === 'R' && r === 1 && bay === 4),
              blocked_reason: (b.code === 'A' && r === 2 && bay === 5) ? 'Pavement repair in progress' : (b.code === 'R' && r === 1 && bay === 4) ? 'Plug circuit fault' : null,
              is_active: true,
              createdby: 'seed',
            },
          });
        } else {
          slot = await prisma.m_yard_location.update({
            where: { yard_location_id: slot.yard_location_id },
            data: {
              parent_id: parentBlock.yard_location_id,
              level_no: 3,
              is_slot: true,
              location_kind: 'SLOT',
              max_tier: b.tiers,
            },
          });
        }

        slotLocMap.set(slotCode, slot);
      }
    }
  }

  // 5. Update existing old slots that were flat (like A-01-01, REEFER-01, etc.)
  const flatSlots = await prisma.m_yard_location.findMany({
    where: {
      is_slot: true,
      parent_id: null,
    },
  });

  for (const fs of flatSlots) {
    let targetBlock = blockMap.get('A');
    if (fs.location_code.startsWith('B-')) targetBlock = blockMap.get('B');
    else if (fs.location_code.startsWith('C-')) targetBlock = blockMap.get('C');
    else if (fs.location_code.startsWith('REEFER') || fs.location_code.startsWith('R-')) targetBlock = blockMap.get('R');
    else if (fs.location_code.startsWith('EXAM')) targetBlock = blockMap.get('EXAM');

    if (targetBlock) {
      await prisma.m_yard_location.update({
        where: { yard_location_id: fs.yard_location_id },
        data: {
          parent_id: targetBlock.yard_location_id,
          level_no: 3,
          location_kind: 'SLOT',
        },
      });
      slotLocMap.set(fs.location_code, fs);
    }
  }

  // 6. Map live containers in unit_stay to specific slots
  const unitStays = await prisma.unit_stay.findMany({
    where: { physical_status: { in: ['IN_YARD', 'ON_SITE', 'GATED_IN'] } },
    include: { unit_stay_cargo_units: true },
  });

  console.log(`Found ${unitStays.length} live unit_stays to position in yard.`);

  const slotAllocations = [
    { slot: 'A-01-01', tier: 1 },
    { slot: 'A-01-01', tier: 2 },
    { slot: 'A-01-02', tier: 1 },
    { slot: 'A-01-02', tier: 2 },
    { slot: 'A-02-01', tier: 1 },
    { slot: 'A-02-02', tier: 1 },
    { slot: 'A-02-02', tier: 2 },
    { slot: 'B-01-01', tier: 1 },
    { slot: 'B-01-02', tier: 1 },
    { slot: 'B-02-01', tier: 1 },
    { slot: 'C-01-01', tier: 1 },
    { slot: 'C-01-02', tier: 1 },
    { slot: 'R-01-01', tier: 1 },
    { slot: 'R-01-02', tier: 1 },
    { slot: 'EXAM-01-01', tier: 1 },
    { slot: 'EXAM-01-02', tier: 1 },
  ];

  for (let i = 0; i < unitStays.length; i++) {
    const stay = unitStays[i];
    const alloc = slotAllocations[i % slotAllocations.length];
    const slotCode = alloc.slot;
    const tier = alloc.tier;
    const fullPositionCode = `${slotCode}-${tier}`;

    // Find or create exact slot
    let slotLoc = slotLocMap.get(slotCode) || (await prisma.m_yard_location.findFirst({
      where: { site_id: siteId, location_code: slotCode },
    }));

    if (slotLoc) {
      await prisma.unit_stay.update({
        where: { unit_stay_id: stay.unit_stay_id },
        data: {
          current_location_id: slotLoc.yard_location_id,
        },
      });

      // Also ensure slot full_code matches
      await prisma.m_yard_location.update({
        where: { yard_location_id: slotLoc.yard_location_id },
        data: {
          full_code: fullPositionCode,
        },
      });
      console.log(`Placed unit ${stay.unit_stay_cargo_units?.unit_no || stay.unit_stay_id} at ${fullPositionCode}`);
    }
  }

  console.log('--- Yard Seeding Complete! ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
