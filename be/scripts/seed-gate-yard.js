const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding Gate & Yard data...');

  // 1. Ensure Yard Blocks exist in m_yard_location
  const existingBlockA = await prisma.m_yard_location.findFirst({ where: { location_code: 'BLOCK-A' } });
  if (!existingBlockA) {
    await prisma.m_yard_location.create({
      data: {
        site_id: 1,
        level_no: 1,
        location_code: 'BLOCK-A',
        full_code: 'BLOCK-A',
        location_kind: 'BLOCK',
        is_slot: false,
        map_x: 20,
        map_y: 40,
        map_w: 180,
        map_h: 120,
        createdby: 'seed',
      },
    });
  }

  const existingBlockB = await prisma.m_yard_location.findFirst({ where: { location_code: 'BLOCK-B' } });
  if (!existingBlockB) {
    await prisma.m_yard_location.create({
      data: {
        site_id: 1,
        level_no: 1,
        location_code: 'BLOCK-B',
        full_code: 'BLOCK-B',
        location_kind: 'BLOCK',
        is_slot: false,
        map_x: 220,
        map_y: 40,
        map_w: 180,
        map_h: 120,
        createdby: 'seed',
      },
    });
  }

  const existingBlockR = await prisma.m_yard_location.findFirst({ where: { location_code: 'BLOCK-R' } });
  if (!existingBlockR) {
    await prisma.m_yard_location.create({
      data: {
        site_id: 1,
        level_no: 1,
        location_code: 'BLOCK-R',
        full_code: 'BLOCK-R',
        location_kind: 'BLOCK',
        is_slot: false,
        map_x: 420,
        map_y: 40,
        map_w: 120,
        map_h: 120,
        createdby: 'seed',
      },
    });
  }

  // 2. Link truck_visit to visit_unit_txn
  const visits = await prisma.truck_visit.findMany({ take: 7 });
  const stays = await prisma.unit_stay.findMany({ take: 7 });

  for (let i = 0; i < visits.length; i++) {
    const v = visits[i];
    const s = stays[i % stays.length];
    const existing = await prisma.visit_unit_txn.findFirst({
      where: { truck_visit_id: v.truck_visit_id, unit_stay_id: s.unit_stay_id },
    });
    if (!existing) {
      await prisma.visit_unit_txn.create({
        data: {
          truck_visit_id: v.truck_visit_id,
          unit_stay_id: s.unit_stay_id,
          direction: i % 2 === 0 ? 'DROP' : 'PICK',
          status: i < 4 ? 'IN_PROGRESS' : 'PLANNED',
          truck_position: 'CENTER',
          seal_status: 'MATCH',
          createdby: 'seed',
        },
      });
    }
  }

  // Fetch real master records for foreign keys
  const dbTrucks = await prisma.m_truck.findMany({ take: 10 });
  const dbDrivers = await prisma.m_driver.findMany({ take: 10 });
  const dbParties = await prisma.m_party.findMany({ take: 10 });
  const dbVisitTypes = await prisma.m_visit_type.findMany({ take: 10 });
  const dbEquipment = await prisma.m_equipment.findMany({ take: 10 });
  const locs = await prisma.m_yard_location.findMany({ take: 10 });

  // 3. Seed Appointments
  const apptCount = await prisma.appointment.count();
  if (apptCount === 0 && dbTrucks.length > 0 && dbDrivers.length > 0) {
    const today = new Date();
    const appts = [
      {
        site_id: 1,
        appointment_no: 'APT-26-04101',
        visit_type_id: dbVisitTypes[0]?.visit_type_id || 1,
        slot_start: new Date(today.getTime() + 1000 * 60 * 30),
        slot_end: new Date(today.getTime() + 1000 * 60 * 90),
        transporter_party_id: dbParties[0]?.party_id || 1,
        truck_id: dbTrucks[0]?.truck_id,
        driver_id: dbDrivers[0]?.driver_id,
        status: 'BOOKED',
        booked_via: 'PORTAL',
        createdby: 'seed',
      },
      {
        site_id: 1,
        appointment_no: 'APT-26-04102',
        visit_type_id: dbVisitTypes[1 % dbVisitTypes.length]?.visit_type_id || 1,
        slot_start: new Date(today.getTime() + 1000 * 60 * 120),
        slot_end: new Date(today.getTime() + 1000 * 60 * 180),
        transporter_party_id: dbParties[1 % dbParties.length]?.party_id || 1,
        truck_id: dbTrucks[1 % dbTrucks.length]?.truck_id,
        driver_id: dbDrivers[1 % dbDrivers.length]?.driver_id,
        status: 'BOOKED',
        booked_via: 'PORTAL',
        createdby: 'seed',
      },
      {
        site_id: 1,
        appointment_no: 'APT-26-04103',
        visit_type_id: dbVisitTypes[2 % dbVisitTypes.length]?.visit_type_id || 1,
        slot_start: new Date(today.getTime() - 1000 * 60 * 60),
        slot_end: new Date(today.getTime() + 1000 * 60 * 30),
        transporter_party_id: dbParties[2 % dbParties.length]?.party_id || 1,
        truck_id: dbTrucks[2 % dbTrucks.length]?.truck_id,
        driver_id: dbDrivers[2 % dbDrivers.length]?.driver_id,
        status: 'ARRIVED',
        booked_via: 'PORTAL',
        truck_visit_id: visits[0]?.truck_visit_id,
        createdby: 'seed',
      },
      {
        site_id: 1,
        appointment_no: 'APT-26-04104',
        visit_type_id: dbVisitTypes[0]?.visit_type_id || 1,
        slot_start: new Date(today.getTime() - 1000 * 60 * 180),
        slot_end: new Date(today.getTime() - 1000 * 60 * 120),
        transporter_party_id: dbParties[3 % dbParties.length]?.party_id || 1,
        truck_id: dbTrucks[3 % dbTrucks.length]?.truck_id,
        driver_id: dbDrivers[3 % dbDrivers.length]?.driver_id,
        status: 'COMPLETED',
        booked_via: 'DESK',
        truck_visit_id: visits[1]?.truck_visit_id,
        createdby: 'seed',
      },
      {
        site_id: 1,
        appointment_no: 'APT-26-04105',
        visit_type_id: dbVisitTypes[1 % dbVisitTypes.length]?.visit_type_id || 1,
        slot_start: new Date(today.getTime() + 1000 * 60 * 240),
        slot_end: new Date(today.getTime() + 1000 * 60 * 300),
        transporter_party_id: dbParties[4 % dbParties.length]?.party_id || 1,
        truck_id: dbTrucks[4 % dbTrucks.length]?.truck_id,
        driver_id: dbDrivers[4 % dbDrivers.length]?.driver_id,
        status: 'BOOKED',
        booked_via: 'API',
        createdby: 'seed',
      },
    ];

    for (const a of appts) {
      await prisma.appointment.create({ data: a });
    }
    console.log(`Created ${appts.length} appointments.`);
  }

  // 4. Seed Move Orders
  const moveCount = await prisma.move_order.count();
  if (moveCount === 0 && stays.length > 0 && locs.length >= 2) {
    const eq1 = dbEquipment[0]?.equipment_id;
    const eq2 = dbEquipment[1 % dbEquipment.length]?.equipment_id;
    const eq3 = dbEquipment[2 % dbEquipment.length]?.equipment_id;
    const moves = [
      {
        site_id: 1,
        unit_stay_id: stays[0].unit_stay_id,
        move_kind: 'PLACE',
        from_location_id: locs[0]?.yard_location_id,
        to_location_id: locs[1]?.yard_location_id,
        suggestion_rank: 1,
        priority: 5,
        status: 'OPEN',
        assigned_equipment_id: eq1,
        assigned_operator_sub: 'Ibrahim N.',
        requested_at: new Date(),
        createdby: 'seed',
      },
      {
        site_id: 1,
        unit_stay_id: stays[1 % stays.length].unit_stay_id,
        move_kind: 'RESHUFFLE',
        from_location_id: locs[0]?.yard_location_id,
        to_location_id: locs[1]?.yard_location_id,
        suggestion_rank: 2,
        priority: 4,
        status: 'ASSIGNED',
        assigned_equipment_id: eq2,
        assigned_operator_sub: 'Halima S.',
        requested_at: new Date(),
        createdby: 'seed',
      },
      {
        site_id: 1,
        unit_stay_id: stays[2 % stays.length].unit_stay_id,
        move_kind: 'PICK_FOR_VISIT',
        from_location_id: locs[0]?.yard_location_id,
        to_location_id: locs[1]?.yard_location_id,
        suggestion_rank: 1,
        truck_visit_id: visits[0]?.truck_visit_id,
        priority: 5,
        status: 'IN_PROGRESS',
        assigned_equipment_id: eq1,
        assigned_operator_sub: 'Ibrahim N.',
        requested_at: new Date(),
        createdby: 'seed',
      },
      {
        site_id: 1,
        unit_stay_id: stays[3 % stays.length].unit_stay_id,
        move_kind: 'RELOCATE',
        from_location_id: locs[0]?.yard_location_id,
        to_location_id: locs[1]?.yard_location_id,
        suggestion_rank: 1,
        priority: 3,
        status: 'DONE',
        assigned_equipment_id: eq3,
        assigned_operator_sub: 'Juma M.',
        requested_at: new Date(Date.now() - 3600000),
        completed_at: new Date(),
        createdby: 'seed',
      },
      {
        site_id: 1,
        unit_stay_id: stays[4 % stays.length].unit_stay_id,
        move_kind: 'TO_ACTIVITY',
        from_location_id: locs[0]?.yard_location_id,
        to_location_id: locs[1]?.yard_location_id,
        suggestion_rank: 1,
        priority: 5,
        status: 'OPEN',
        assigned_equipment_id: eq2,
        assigned_operator_sub: 'Halima S.',
        requested_at: new Date(),
        createdby: 'seed',
      },
    ];

    for (const m of moves) {
      await prisma.move_order.create({ data: m });
    }
    console.log(`Created ${moves.length} move orders.`);
  }

  // 5. Seed Yard Move records
  const ymCount = await prisma.yard_move.count();
  if (ymCount === 0 && stays.length > 0 && locs.length >= 2) {
    await prisma.yard_move.create({
      data: {
        site_id: 1,
        unit_stay_id: stays[0].unit_stay_id,
        move_kind: 'RELOCATE',
        from_location_id: locs[0]?.yard_location_id,
        to_location_id: locs[1]?.yard_location_id,
        equipment_id: dbEquipment[0]?.equipment_id,
        operator_sub: 'Juma M.',
        occurred_at: new Date(),
        createdby: 'seed',
      },
    });
    console.log('Created 1 yard move.');
  }

  console.log('Seeding Gate & Yard finished successfully!');
  await prisma.$disconnect();
}

seed().catch(console.error);
