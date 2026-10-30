import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

export const SEED_PARTIES = [
  {
    partyCode: 'C-MZIZI',
    partyName: 'Mzizi Traders Ltd',
    shortName: 'Mzizi',
    roles: ['CUSTOMER', 'IMPORTER', 'CONSIGNEE'],
    creditStatus: 'CREDIT',
    creditLimit: 25000.0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    vatNo: '40-012345-A',
    taxId: '112-233-445',
    phone: '+255 22 211 0401',
    email: 'imports@mzizi.example',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    disbursementService: false,
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1001',
    contacts: [
      { contactName: 'Juma Mzizi', jobTitle: 'Managing Director', email: 'imports@mzizi.example', phone: '+255 22 211 0401', isPrimary: true },
      { contactName: 'Finance Desk', jobTitle: 'Accounts Officer', email: 'accounts@mzizi.example', phone: '+255 22 211 0402', isPrimary: false },
    ],
  },
  {
    partyCode: 'C-KILELE',
    partyName: 'Kilele Clearing & Forwarding',
    shortName: 'Kilele',
    roles: ['CLEARING_AGENT', 'CUSTOMER'],
    creditStatus: 'CREDIT',
    creditLimit: 40000.0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    disbursementService: true,
    phone: '+255 75 412 3456',
    email: 'ops@kilele.example',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1002',
    contacts: [
      { contactName: 'Grace Peter', jobTitle: 'Operations Manager', email: 'ops@kilele.example', phone: '+255 75 412 3456', isPrimary: true },
      { contactName: 'Accounts Desk', jobTitle: 'Billing & Disbursement', email: 'finance@kilele.example', phone: '+255 75 412 3457', isPrimary: false },
    ],
  },
  {
    partyCode: 'C-BAHARI',
    partyName: 'Bahari Motors Ltd',
    shortName: 'Bahari',
    roles: ['CUSTOMER', 'IMPORTER', 'CONSIGNEE'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    phone: '+255 22 211 8899',
    email: 'yard@baharimotors.example',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1003',
    contacts: [
      { contactName: 'Amani Bakari', jobTitle: 'Logistics Supervisor', email: 'yard@baharimotors.example', phone: '+255 22 211 8899', isPrimary: true },
    ],
  },
  {
    partyCode: 'L-BML',
    partyName: 'Blue Meridian Line',
    shortName: 'BML',
    roles: ['SHIPPING_LINE'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'AE',
    city: 'Dubai',
    email: 'ops.tanzania@bluemeridian.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1004',
    contacts: [
      { contactName: 'Line Agency Desk', jobTitle: 'Principal Representative', email: 'ops.tanzania@bluemeridian.example', phone: '+971 4 200 1122', isPrimary: true },
    ],
  },
  {
    partyCode: 'L-IOS',
    partyName: 'Indian Ocean Shipping',
    shortName: 'IOS',
    roles: ['SHIPPING_LINE'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'KE',
    city: 'Mombasa',
    email: 'dar.desk@indianocean.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1005',
    contacts: [
      { contactName: 'Operations Desk', jobTitle: 'Shipping Line Desk', email: 'dar.desk@indianocean.example', phone: '+254 41 222 3344', isPrimary: true },
    ],
  },
  {
    partyCode: 'L-SCL',
    partyName: 'Southern Cross Lines',
    shortName: 'SCL',
    roles: ['SHIPPING_LINE'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'ZA',
    city: 'Durban',
    email: 'info@southerncross.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1006',
    contacts: [
      { contactName: 'Port Operations', jobTitle: 'Line Coordinator', email: 'info@southerncross.example', phone: '+27 31 300 4455', isPrimary: true },
    ],
  },
  {
    partyCode: 'T-UPEPO',
    partyName: 'Upepo Transporters',
    shortName: 'Upepo',
    roles: ['TRANSPORTER'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    phone: '+255 71 300 9988',
    email: 'fleet@upepo.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1007',
    contacts: [
      { contactName: 'Fleet Dispatcher', jobTitle: 'Fleet Manager', email: 'fleet@upepo.example', phone: '+255 71 300 9988', isPrimary: true },
    ],
  },
  {
    partyCode: 'T-SIMBA',
    partyName: 'Simba Haulage Co.',
    shortName: 'Simba',
    roles: ['TRANSPORTER'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    phone: '+255 78 400 1122',
    email: 'dispatch@simbahaulage.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1008',
    contacts: [
      { contactName: 'Hamisi Simba', jobTitle: 'Transport Manager', email: 'dispatch@simbahaulage.example', phone: '+255 78 400 1122', isPrimary: true },
    ],
  },
  {
    partyCode: 'C-ZAMLINK',
    partyName: 'Zamlink Distributors (Lusaka)',
    shortName: 'Zamlink',
    roles: ['CUSTOMER', 'CONSIGNEE'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'ZM',
    city: 'Lusaka',
    email: 'imports@zamlink.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1009',
    contacts: [
      { contactName: 'Transit Desk', jobTitle: 'Regional Coordinator', email: 'imports@zamlink.example', phone: '+260 21 123 4567', isPrimary: true },
    ],
  },
  {
    partyCode: 'C-NYOTA',
    partyName: 'Nyota Agro Exports',
    shortName: 'Nyota',
    roles: ['CUSTOMER', 'EXPORTER'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    email: 'export@nyotaagro.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1010',
    contacts: [
      { contactName: 'Agro Desk', jobTitle: 'Export Manager', email: 'export@nyotaagro.example', phone: '+255 22 244 5566', isPrimary: true },
    ],
  },
  {
    partyCode: 'C-PWANIHW',
    partyName: 'Pwani Hardware Wholesalers',
    shortName: 'Pwani',
    roles: ['CUSTOMER', 'CONSIGNEE'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    email: 'info@pwanihardware.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1011',
    contacts: [
      { contactName: 'Receiving Officer', jobTitle: 'Warehouse Head', email: 'info@pwanihardware.example', phone: '+255 22 288 9900', isPrimary: true },
    ],
  },
  {
    partyCode: 'A-MSAADA',
    partyName: 'Msaada Shipping Agency',
    shortName: 'Msaada',
    roles: ['SHIPPING_AGENT'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    email: 'agent@msaada.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1012',
    contacts: [
      { contactName: 'Agency Desk', jobTitle: 'Agency Coordinator', email: 'agent@msaada.example', phone: '+255 22 213 4567', isPrimary: true },
    ],
  },
  {
    partyCode: 'C-NEWCO',
    partyName: 'Tanzanite Pharma Distributors',
    shortName: 'Tanzanite Pharma',
    roles: ['CUSTOMER', 'CONSIGNEE'],
    creditStatus: 'CASH',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    email: 'pharma@tanzanite.example',
    source: 'LOCAL',
    syncStatus: 'PROVISIONAL',
    ngRefId: null,
    contacts: [
      { contactName: 'Dr. Mwita', jobTitle: 'Import Pharmacist', email: 'pharma@tanzanite.example', phone: '+255 75 999 8877', isPrimary: true },
    ],
  },
  {
    partyCode: 'C-KAGERA',
    partyName: 'Kagera Builders Supply',
    shortName: 'Kagera',
    roles: ['CUSTOMER', 'CONSIGNEE'],
    creditStatus: 'BLOCKED',
    creditLimit: 0,
    creditCurrency: 'USD',
    defaultCurrency: 'USD',
    countryCode: 'TZ',
    city: 'Dar es Salaam',
    email: 'procurement@kagerabuilders.example',
    source: 'NG',
    syncStatus: 'SYNCED',
    ngRefId: 'NG-C1014',
    contacts: [
      { contactName: 'Finance Head', jobTitle: 'Credit Controller', email: 'procurement@kagerabuilders.example', phone: '+255 22 277 8899', isPrimary: true },
    ],
  },
];

export async function seedPartiesData() {
  console.log('🌱 Seeding Master Parties into Database...');

  // Ensure reference countries exist
  const countries = [
    { code: 'TZ', name: 'Tanzania' },
    { code: 'KE', name: 'Kenya' },
    { code: 'UG', name: 'Uganda' },
    { code: 'ZM', name: 'Zambia' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'BI', name: 'Burundi' },
    { code: 'CD', name: 'DR Congo' },
  ];

  for (const c of countries) {
    await prisma.m_country.upsert({
      where: { country_code: c.code },
      update: {},
      create: {
        country_code: c.code,
        country_name: c.name,
        is_active: true,
        createdby: 'system',
      },
    });
  }

  for (const item of SEED_PARTIES) {
    let party = await prisma.m_party.findUnique({
      where: { party_code: item.partyCode },
    });

    if (party) {
      party = await prisma.m_party.update({
        where: { party_id: party.party_id },
        data: {
          party_name: item.partyName,
          short_name: item.shortName,
          credit_status: item.creditStatus,
          credit_limit: item.creditLimit,
          credit_currency: item.creditCurrency,
          default_currency: item.defaultCurrency,
          vat_no: item.vatNo,
          tax_id: item.taxId,
          phone: item.phone,
          email: item.email,
          country_code: item.countryCode,
          city: item.city,
          disbursement_service: item.disbursementService ?? false,
          source: item.source,
          sync_status: item.syncStatus,
          ng_ref_id: item.ngRefId,
          is_active: true,
          updatedby: 'system',
        },
      });
      console.log(`✅ Updated party: ${party.party_code} (${party.party_name}) [ID: ${party.party_id}]`);
    } else {
      party = await prisma.m_party.create({
        data: {
          party_code: item.partyCode,
          party_name: item.partyName,
          short_name: item.shortName,
          credit_status: item.creditStatus,
          credit_limit: item.creditLimit,
          credit_currency: item.creditCurrency,
          default_currency: item.defaultCurrency,
          vat_no: item.vatNo,
          tax_id: item.taxId,
          phone: item.phone,
          email: item.email,
          country_code: item.countryCode,
          city: item.city,
          disbursement_service: item.disbursementService ?? false,
          source: item.source,
          sync_status: item.syncStatus,
          ng_ref_id: item.ngRefId,
          is_active: true,
          createdby: 'system',
        },
      });
      console.log(`✨ Created party: ${party.party_code} (${party.party_name}) [ID: ${party.party_id}]`);
    }

    // Seed Roles
    for (const roleCode of item.roles) {
      const existingRole = await prisma.m_party_role.findUnique({
        where: {
          party_id_role_code: {
            party_id: party.party_id,
            role_code: roleCode,
          },
        },
      });

      if (!existingRole) {
        await prisma.m_party_role.create({
          data: {
            party_id: party.party_id,
            role_code: roleCode,
            createdby: 'system',
          },
        });
      }
    }

    // Seed Contacts
    for (const c of item.contacts) {
      const existingContact = await prisma.m_party_contact.findFirst({
        where: {
          party_id: party.party_id,
          contact_name: c.contactName,
        },
      });

      if (!existingContact) {
        await prisma.m_party_contact.create({
          data: {
            party_id: party.party_id,
            contact_name: c.contactName,
            job_title: c.jobTitle,
            email: c.email,
            phone: c.phone,
            is_primary: c.isPrimary,
            createdby: 'system',
          },
        });
      }
    }
  }

  const count = await prisma.m_party.count();
  const roleCount = await prisma.m_party_role.count();
  const contactCount = await prisma.m_party_contact.count();
  console.log(`🎉 Parties Seed Complete! Total Parties: ${count}, Roles: ${roleCount}, Contacts: ${contactCount}`);
}

if (require.main === module) {
  seedPartiesData()
    .catch((err) => {
      console.error('❌ Error seeding parties:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
