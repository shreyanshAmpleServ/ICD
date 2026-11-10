"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('--- Seeding Live Appointment Rules & Appointments in MSSQL ---');
    const site = await prisma.m_site.findFirst();
    const siteId = site?.site_id || 1;
    // 1. Visit Types mapping
    const visitTypes = await prisma.m_visit_type.findMany();
    const vtMap = new Map();
    for (const vt of visitTypes) {
        vtMap.set(vt.visit_type_code, vt.visit_type_id);
    }
    // 2. Transporter Parties
    const parties = await prisma.m_party.findMany();
    const partyIds = parties.map((p) => p.party_id);
    const defaultPartyId = partyIds[0] || 1;
    // 3. Seed Trucks if needed
    const plates = [
        'T 412 DKL', 'T 902 DMB', 'T 118 DPE', 'T 771 DGH', 'T 340 DRC',
        'T 655 DQA', 'T 882 DJK', 'T 234 DLM', 'T 519 DGT', 'T 108 DHN',
        'T 721 DKA', 'T 443 DMB', 'T 319 DPE', 'T 962 DRC', 'T 558 DQA',
    ];
    for (const pl of plates) {
        const exists = await prisma.m_truck.findFirst({ where: { plate_no: pl } });
        if (!exists) {
            await prisma.m_truck.create({
                data: {
                    plate_no: pl,
                    plate_display: pl,
                    vehicle_kind: 'TRUCK',
                    createdby: 'seed',
                },
            });
        }
    }
    const dbTrucks = await prisma.m_truck.findMany();
    // 4. Seed Drivers if needed
    const driverNames = [
        { name: 'Baraka Mwita', phone: '+255 712 111 222' },
        { name: 'Musa Rajabu', phone: '+255 714 333 444' },
        { name: 'Said Omari', phone: '+255 754 555 666' },
        { name: 'John Massawe', phone: '+255 757 134 242' },
        { name: 'Abdul Kombo', phone: '+255 784 777 888' },
        { name: 'Juma Selemani', phone: '+255 713 999 000' },
        { name: 'Athumani Said', phone: '+255 765 123 456' },
        { name: 'Godfrey Mollel', phone: '+255 782 234 567' },
        { name: 'Ramadhani Issa', phone: '+255 716 345 678' },
        { name: 'Emmanuel Mushi', phone: '+255 758 456 789' },
    ];
    for (const dr of driverNames) {
        const exists = await prisma.m_driver.findFirst({ where: { driver_name: dr.name } });
        if (!exists) {
            const lic = `LIC-${Math.floor(100000 + Math.random() * 900000)}`;
            await prisma.m_driver.create({
                data: {
                    driver_name: dr.name,
                    licence_no: lic,
                    phone: dr.phone,
                    createdby: 'seed',
                },
            });
        }
    }
    const dbDrivers = await prisma.m_driver.findMany();
    // 5. Seed Slot Rules for Weekdays 1-6 (Mon-Sat)
    const apptTypes = ['IMPORT_PICKUP', 'EXPORT_DROP', 'EMPTY_RETURN', 'EMPTY_PICKUP', 'TRANSFER_IN'];
    const capFor = {
        IMPORT_PICKUP: 6,
        EXPORT_DROP: 4,
        EMPTY_RETURN: 4,
        EMPTY_PICKUP: 3,
        TRANSFER_IN: 8,
    };
    const existingRules = await prisma.m_appointment_slot_rule.count();
    if (existingRules === 0) {
        console.log('Seeding m_appointment_slot_rule...');
        for (let wd = 1; wd <= 6; wd++) {
            const isSat = wd === 6;
            for (const t of apptTypes) {
                const vtId = vtMap.get(t) || 1;
                const capacity = isSat ? Math.max(2, capFor[t] - 2) : capFor[t];
                const lateGrace = t === 'IMPORT_PICKUP' ? 30 : 45;
                // Times
                const startHour = t === 'TRANSFER_IN' ? 6 : 7;
                const endHour = isSat ? 12 : t === 'EMPTY_RETURN' ? 16 : t === 'TRANSFER_IN' ? 22 : 17;
                await prisma.m_appointment_slot_rule.create({
                    data: {
                        site_id: siteId,
                        visit_type_id: vtId,
                        weekday: wd,
                        slot_start: new Date(`1970-01-01T${String(startHour).padStart(2, '0')}:00:00Z`),
                        slot_end: new Date(`1970-01-01T${String(endHour).padStart(2, '0')}:00:00Z`),
                        capacity_trucks: capacity,
                        late_grace_min: lateGrace,
                        is_active: true,
                        createdby: 'seed',
                    },
                });
            }
        }
        console.log('Created slot rules for all weekdays and visit types.');
    }
    else {
        console.log(`Found ${existingRules} existing slot rules in database.`);
    }
    // 6. Seed Appointments across rolling dates
    // Target dates: today (2026-11-02) and offsets -2, -1, 0, +1, +2, +3, +4, +5, +6
    const baseDate = new Date();
    baseDate.setHours(12, 0, 0, 0);
    const targetDates = [];
    for (let offset = -2; offset <= 7; offset++) {
        const d = new Date(baseDate.getTime() + offset * 86400000);
        targetDates.push(d.toISOString().slice(0, 10));
    }
    // Also include 2026-10-07 for mock anchor compatibility
    if (!targetDates.includes('2026-10-07')) {
        targetDates.push('2026-10-07');
    }
    const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    let apptSeq = 4105;
    let totalCreated = 0;
    for (const dateStr of targetDates) {
        const dateObj = new Date(`${dateStr}T12:00:00Z`);
        const wd = dateObj.getUTCDay();
        if (wd === 0)
            continue; // Closed on Sundays
        // Check existing appointments on this date
        const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
        const existingCount = await prisma.appointment.count({
            where: { slot_start: { gte: dayStart, lte: dayEnd } },
        });
        if (existingCount >= 5) {
            console.log(`Date ${dateStr} already has ${existingCount} appointments. Skipping.`);
            continue;
        }
        console.log(`Generating appointments for ${dateStr}...`);
        for (const h of hours) {
            const isSat = wd === 6;
            if (isSat && h >= 12)
                continue; // Sat ends at 12
            // Pick 1 to 3 visit types per hour
            const typesForHour = ['IMPORT_PICKUP', 'EXPORT_DROP', 'EMPTY_RETURN'].slice(0, 1 + (h % 3));
            for (const vtCode of typesForHour) {
                const vtId = vtMap.get(vtCode) || 1;
                const truck = dbTrucks[(h + apptSeq) % dbTrucks.length];
                const driver = dbDrivers[(h * 2 + apptSeq) % dbDrivers.length];
                const partyId = partyIds[(h + apptSeq) % partyIds.length] || defaultPartyId;
                const slotStart = new Date(`${dateStr}T${String(h).padStart(2, '0')}:00:00.000Z`);
                const slotEnd = new Date(slotStart.getTime() + 3600000);
                // Determine realistic status
                const isPast = slotStart.getTime() < Date.now();
                let status = 'BOOKED';
                if (isPast) {
                    const rand = (h + apptSeq) % 10;
                    if (rand < 2)
                        status = 'CANCELLED';
                    else if (rand < 4)
                        status = 'MISSED';
                    else if (rand < 7)
                        status = 'COMPLETED';
                    else
                        status = 'ARRIVED';
                }
                const apptNo = `APT-26-0${apptSeq++}`;
                await prisma.appointment.create({
                    data: {
                        site_id: siteId,
                        appointment_no: apptNo,
                        visit_type_id: vtId,
                        transporter_party_id: partyId,
                        truck_id: truck?.truck_id,
                        driver_id: driver?.driver_id,
                        slot_start: slotStart,
                        slot_end: slotEnd,
                        status,
                        booked_via: (h % 3 === 0) ? 'DESK' : (h % 5 === 0) ? 'API' : 'PORTAL',
                        createdby: 'seed_script',
                    },
                });
                totalCreated++;
            }
        }
    }
    console.log(`Successfully seeded ${totalCreated} new appointments across target dates.`);
}
main()
    .catch((e) => {
    console.error('Error seeding appointments:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
