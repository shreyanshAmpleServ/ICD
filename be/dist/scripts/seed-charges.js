"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCharges = seedCharges;
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const prisma = new client_1.PrismaClient();
async function seedCharges() {
    console.log('🚀 Starting Charges & Billing Seeder...');
    // 1. Seed Tax Codes
    const taxCodes = [
        { taxCode: 'VAT18', taxName: 'Value Added Tax (18%)', ratePct: 18.0, taxTreatment: 'TAXABLE', countryCode: 'TZ' },
        { taxCode: 'VAT0', taxName: 'Zero Rated Exports (0%)', ratePct: 0.0, taxTreatment: 'ZERO_RATED', countryCode: 'TZ' },
        { taxCode: 'EXEMPT', taxName: 'Exempt Services (0%)', ratePct: 0.0, taxTreatment: 'EXEMPT', countryCode: 'TZ' },
    ];
    for (const t of taxCodes) {
        const existing = await prisma.m_tax_code.findFirst({ where: { tax_code: t.taxCode } });
        if (!existing) {
            await prisma.m_tax_code.create({
                data: {
                    tax_code: t.taxCode,
                    tax_name: t.taxName,
                    rate_pct: t.ratePct,
                    tax_treatment: t.taxTreatment,
                    country_code: t.countryCode,
                    effective_from: new Date('2026-01-01'),
                    createdby: 'system',
                },
            });
            console.log(`  + Seeded tax code: ${t.taxCode}`);
        }
    }
    // 2. Seed Charge Codes
    const chargeCodes = [
        { code: 'LIFT_ON_OFF', name: 'Lift on / lift off', group: 'HANDLING' },
        { code: 'STORAGE_IMPORT', name: 'Storage, import container', group: 'STORAGE' },
        { code: 'EXAM_HANDLING', name: 'Customs exam handling', group: 'INSPECTION' },
        { code: 'WEIGHING', name: 'Weighbridge ticket', group: 'HANDLING' },
        { code: 'DOC_FEE', name: 'Documentation fee', group: 'DOCUMENTATION' },
        { code: 'REEFER_POWER', name: 'Reefer electricity power plug-in', group: 'REEFER' },
        { code: 'REEFER_MONITORING', name: 'Reefer temperature monitoring', group: 'REEFER' },
        { code: 'CUSTOMS_SEAL', name: 'Customs security seal verification', group: 'INSPECTION' },
    ];
    for (const c of chargeCodes) {
        const existing = await prisma.m_charge_code.findUnique({ where: { charge_code: c.code } });
        if (!existing) {
            await prisma.m_charge_code.create({
                data: {
                    charge_code: c.code,
                    charge_name: c.name,
                    charge_group: c.group,
                    default_tax_code: 'VAT18',
                    createdby: 'system',
                },
            });
            console.log(`  + Seeded charge code: ${c.code}`);
        }
    }
    // 3. Ensure a Master Tariff exists
    let mainTariff = await prisma.tariff.findFirst({ where: { tariff_code: 'TRF-DAR1-STD' } });
    if (!mainTariff) {
        mainTariff = await prisma.tariff.create({
            data: {
                tariff_code: 'TRF-DAR1-STD',
                tariff_name: 'Dar es Salaam Yard Standard Tariff',
                version_no: 1,
                company_id: 1,
                currency: 'USD',
                effective_from: new Date('2026-01-01'),
                status: 'ACTIVE',
                createdby: 'system',
            },
        });
        console.log(`  + Seeded master tariff: TRF-DAR1-STD`);
    }
    // 4. Seed sample charges for Parties (Bahari Motors, Blue Meridian, Indian Ocean, Kagera Builders)
    const parties = await prisma.m_party.findMany({ take: 10 });
    const vatTax = await prisma.m_tax_code.findFirst({ where: { tax_code: 'VAT18' } });
    const sampleCodes = await prisma.m_charge_code.findMany();
    if (parties.length > 0 && sampleCodes.length > 0) {
        console.log(`  * Checking existing charges in DB...`);
        const existingCount = await prisma.charge.count();
        if (existingCount < 20) {
            console.log(`  + Generating 25 active charges across parties in DB...`);
            for (let i = 0; i < 25; i++) {
                const party = parties[i % parties.length];
                const code = sampleCodes[i % sampleCodes.length];
                const qty = (i % 3) + 1;
                const rate = (code.charge_group === 'STORAGE' ? 16.0 : code.charge_group === 'HANDLING' ? 90.0 : 35.0);
                const subtotal = qty * rate;
                const taxAmt = Math.round(subtotal * 0.18 * 100) / 100;
                // Create Billable Event
                const event = await prisma.billable_event.create({
                    data: {
                        site_id: 1,
                        charge_code_id: code.charge_code_id,
                        dedupe_key: `BE-SEED-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
                        bill_to_party_id: party.party_id,
                        source_entity: 'UNIT_STAY',
                        service_date: new Date(Date.now() - (i % 7) * 86400000),
                        occurred_at: new Date(),
                        quantity: qty,
                        uom: code.charge_group === 'STORAGE' ? 'DAY' : 'UNIT',
                        status: 'RATED',
                        createdby: 'system',
                    },
                });
                // Create Charge
                await prisma.charge.create({
                    data: {
                        billable_event_id: event.billable_event_id,
                        bill_to_party_id: party.party_id,
                        tariff_id: mainTariff.tariff_id,
                        currency: 'USD',
                        quantity: qty,
                        unit_rate: rate,
                        amount: subtotal,
                        tax_code_id: vatTax?.tax_code_id || null,
                        tax_rate_pct: 18.0,
                        tax_amount: taxAmt,
                        charge_kind: i === 24 ? 'MANUAL' : 'NORMAL',
                        status: i === 1 ? 'WAIVER_PENDING' : 'OPEN',
                        createdby: 'system',
                    },
                });
            }
            console.log(`  ✔ Successfully seeded 25 charges into DB!`);
        }
        else {
            console.log(`  ✔ Database already contains ${existingCount} charges.`);
        }
    }
    console.log('✅ Charges seeding complete!');
    await prisma.$disconnect();
}
if (require.main === module) {
    seedCharges().catch((err) => {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    });
}
