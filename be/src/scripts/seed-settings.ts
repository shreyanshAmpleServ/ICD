import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

export async function seedSettings() {
  console.log('🚀 Starting Field Rules, Calendars & Holidays Seeder...');

  // 1. Ensure Country TZ exists
  const country = await prisma.m_country.upsert({
    where: { country_code: 'TZ' },
    update: {},
    create: {
      country_code: 'TZ',
      country_name: 'Tanzania',
      is_active: true,
      createdby: 'SYSTEM',
    },
  });
  console.log('✅ Country TZ verified:', country.country_code);

  // 2. Ensure Calendar TZ_PUBLIC exists
  const calendar = await prisma.m_calendar.upsert({
    where: { calendar_code: 'TZ_PUBLIC' },
    update: {
      calendar_name: 'Tanzania public holidays',
      country_code: 'TZ',
    },
    create: {
      calendar_code: 'TZ_PUBLIC',
      calendar_name: 'Tanzania public holidays',
      country_code: 'TZ',
      createdby: 'SYSTEM',
    },
  });
  console.log('✅ Calendar verified:', calendar.calendar_name, '(ID:', calendar.calendar_id, ')');

  // 3. Official 2026 Tanzania Holidays (16 days)
  const holidays2026 = [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-01-12', name: 'Zanzibar Revolution Day' },
    { date: '2026-03-20', name: 'Eid al-Fitr' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-04-06', name: 'Easter Monday' },
    { date: '2026-04-07', name: 'Karume Day' },
    { date: '2026-04-26', name: 'Union Day' },
    { date: '2026-05-01', name: "Workers' Day" },
    { date: '2026-05-27', name: 'Eid al-Adha' },
    { date: '2026-07-07', name: 'Saba Saba (Industry Day)' },
    { date: '2026-08-08', name: 'Nane Nane (Farmers Day)' },
    { date: '2026-08-26', name: "Maulid (Prophet's Birthday)" },
    { date: '2026-10-14', name: 'Mwalimu Nyerere Day' },
    { date: '2026-12-09', name: 'Independence Day' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-26', name: 'Boxing Day' },
  ];

  // Remove test/scratch holidays if any exist (e.g. Diwali test)
  await prisma.m_calendar_holiday.deleteMany({
    where: {
      calendar_id: calendar.calendar_id,
      holiday_name: {
        notIn: holidays2026.map((h) => h.name),
      },
    },
  });

  for (const h of holidays2026) {
    const d = new Date(h.date + 'T00:00:00.000Z');
    await prisma.m_calendar_holiday.upsert({
      where: {
        calendar_id_holiday_date: {
          calendar_id: calendar.calendar_id,
          holiday_date: d,
        },
      },
      update: {
        holiday_name: h.name,
        updatedate: new Date(),
        updatedby: 'SYSTEM',
      },
      create: {
        calendar_id: calendar.calendar_id,
        holiday_date: d,
        holiday_name: h.name,
        createdby: 'SYSTEM',
      },
    });
  }
  const totalHols = await prisma.m_calendar_holiday.count({
    where: { calendar_id: calendar.calendar_id },
  });
  console.log(`✅ Seeded ${totalHols} official holidays in m_calendar_holiday.`);

  // 4. Field Rules (10 standard rules)
  const rulesToSeed = [
    { roleCode: 'GATE_OFFICER', entityName: 'invoice_line', fieldName: 'unit_rate', accessLevel: 'HIDDEN' },
    { roleCode: 'YARD_OFFICER', entityName: 'invoice_line', fieldName: 'unit_rate', accessLevel: 'HIDDEN' },
    { roleCode: 'EQUIPMENT_OPERATOR', entityName: 'invoice_line', fieldName: 'unit_rate', accessLevel: 'HIDDEN' },
    { roleCode: 'INSPECTION_OFFICER', entityName: 'invoice_line', fieldName: 'unit_rate', accessLevel: 'HIDDEN' },
    { roleCode: 'WEIGHBRIDGE_OFFICER', entityName: 'invoice_line', fieldName: 'unit_rate', accessLevel: 'HIDDEN' },
    { roleCode: 'CUSTOMER_SERVICE', entityName: 'party', fieldName: 'credit_limit', accessLevel: 'READONLY' },
    { roleCode: 'BILLING_OFFICER', entityName: 'invoice_line', fieldName: 'discount_pct', accessLevel: 'READONLY' },
    { roleCode: 'GATE_OFFICER', entityName: 'truck_visit', fieldName: 'seal_no', accessLevel: 'READONLY' },
    { roleCode: 'INSPECTION_OFFICER', entityName: 'inspection', fieldName: 'odometer_km', accessLevel: 'READONLY' },
    { roleCode: 'GATE_OFFICER', entityName: 'release_order', fieldName: 'collector_id_no', accessLevel: 'HIDDEN' },
  ];

  // Clean existing field rules to sync exactly with standard mock rules
  await prisma.m_field_rule.deleteMany({});

  for (const r of rulesToSeed) {
    const role = await prisma.m_role.findFirst({ where: { role_code: r.roleCode } });
    if (!role) {
      console.warn(`Role ${r.roleCode} not found, skipping rule`);
      continue;
    }
    await prisma.m_field_rule.create({
      data: {
        role_id: role.role_id,
        entity_name: r.entityName,
        field_name: r.fieldName,
        access_level: r.accessLevel,
        createdby: 'SYSTEM',
      },
    });
  }

  const totalRules = await prisma.m_field_rule.count();
  console.log(`✅ Seeded ${totalRules} field rules in m_field_rule.`);
  console.log('🎉 Settings seeding completed successfully!');
}

if (require.main === module || (process.argv[1] && /seed-settings/i.test(process.argv[1]))) {
  seedSettings()
    .catch((err) => {
      console.error('❌ Error seeding settings:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
