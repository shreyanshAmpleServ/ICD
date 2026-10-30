import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOpsData() {
  console.log('Seeding operational master data into MSSQL database...');
  const site = await prisma.sites.findFirst();
  const siteId = site?.site_id || 1;

  // 1. Seed Appointment Slot Rules
  const visitPickup = await prisma.visit_types.findFirst({ where: { visit_code: 'IMPORT_PICKUP' } });
  const visitDrop = await prisma.visit_types.findFirst({ where: { visit_code: 'EXPORT_DROP' } }) || visitPickup;

  if (visitPickup) {
    const existingRule1 = await prisma.appointment_slot_rules.findFirst({
      where: { site_id: siteId, visit_type_id: visitPickup.visit_type_id },
    });
    if (!existingRule1) {
      await prisma.appointment_slot_rules.create({
        data: {
          site_id: siteId,
          visit_type_id: visitPickup.visit_type_id,
          slot_duration_min: 60,
          max_trucks_per_slot: 20,
          is_active: true,
        },
      });
      console.log('Created slot rule for IMPORT_PICKUP');
    }
  }

  if (visitDrop) {
    const existingRule2 = await prisma.appointment_slot_rules.findFirst({
      where: { site_id: siteId, visit_type_id: visitDrop.visit_type_id },
    });
    if (!existingRule2) {
      await prisma.appointment_slot_rules.create({
        data: {
          site_id: siteId,
          visit_type_id: visitDrop.visit_type_id,
          slot_duration_min: 60,
          max_trucks_per_slot: 15,
          is_active: true,
        },
      });
      console.log('Created slot rule for EXPORT_DROP');
    }
  }

  // 2. Seed Labour Contractors
  const contractorsData = [
    { name: 'Kilima Labour Services', phone: '+255 712 345 678', contact: 'Juma Kilima' },
    { name: 'Mwambao Stevedores Ltd', phone: '+255 784 987 654', contact: 'Ali Mwambao' },
    { name: 'Kilima Gang', phone: '+255 713 000 111', contact: 'Hamisi Juma' },
  ];

  for (const c of contractorsData) {
    const existing = await prisma.labour_contractors.findFirst({
      where: { site_id: siteId, contractor_name: c.name },
    });
    if (!existing) {
      await prisma.labour_contractors.create({
        data: {
          site_id: siteId,
          contractor_name: c.name,
          phone: c.phone,
          contact_person: c.contact,
          is_active: true,
        },
      });
      console.log(`Created labour contractor: ${c.name}`);
    }
  }

  // 3. Seed Repair Codes
  const repairCodesData = [
    { code: 'RP-PANEL-01', comp: 'PANEL', desc: 'Straighten and paint side panel', hours: 3.5 },
    { code: 'RP-DOOR-02', comp: 'DOOR', desc: 'Replace door gasket and lock rod', hours: 2.0 },
    { code: 'RP-FLOOR-03', comp: 'FLOOR', desc: 'Patch plywood floor section', hours: 4.0 },
    { code: 'RP-01', comp: 'PANEL', desc: 'Straighten and paint side panel', hours: 3.5 },
    { code: 'RP-CORNER-01', comp: 'CORNER', desc: 'Repair corner casting', hours: 5.0 },
  ];

  for (const rc of repairCodesData) {
    const existing = await prisma.repair_codes.findFirst({
      where: { repair_code: rc.code },
    });
    if (!existing) {
      await prisma.repair_codes.create({
        data: {
          repair_code: rc.code,
          component_code: rc.comp,
          description: rc.desc,
          default_hours: rc.hours,
          is_active: true,
        },
      });
      console.log(`Created repair code: ${rc.code}`);
    }
  }

  // 4. Seed Device Integrations
  const integrationsData = [
    { type: 'ANPR', url: 'http://10.160.5.101:8081/anpr/lane1' },
    { type: 'CONTAINER_OCR', url: 'http://10.160.5.101:8082/ocr/lane1' },
    { type: 'WEIGHBRIDGE', url: 'http://10.160.5.101:8083/scale/inbound1' },
  ];

  for (const d of integrationsData) {
    const existing = await prisma.device_integrations.findFirst({
      where: { site_id: siteId, device_type: d.type },
    });
    if (!existing) {
      await prisma.device_integrations.create({
        data: {
          site_id: siteId,
          device_type: d.type,
          endpoint_url: d.url,
          is_active: true,
        },
      });
      console.log(`Created device integration: ${d.type}`);
    }
  }

  // 5. Seed Devices
  const devicesData = [
    { code: 'DEV-ANPR-01', name: 'Main Gate Inbound ANPR Camera', kind: 'CAMERA' },
    { code: 'DEV-OCR-01', name: 'Main Gate Inbound OCR Camera', kind: 'CAMERA' },
    { code: 'DEV-SCALE-01', name: 'Inbound Scale 1', kind: 'WEIGHBRIDGE' },
    { code: 'DEV-TAB-01', name: 'Lane 1 Check-in Tablet', kind: 'TABLET' },
  ];

  for (const dev of devicesData) {
    const existing = await prisma.devices.findFirst({
      where: { device_code: dev.code },
    });
    if (!existing) {
      await prisma.devices.create({
        data: {
          site_id: siteId,
          device_code: dev.code,
          device_name: dev.name,
          device_kind: dev.kind,
          is_active: true,
        },
      });
      console.log(`Created device: ${dev.code}`);
    }
  }

  console.log('🎉 Operational master data seeded successfully in database!');
}

if (require.main === module) {
  seedOpsData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

