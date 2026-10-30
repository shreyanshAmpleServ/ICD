const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ml_model_version...');
  const mlModels = [
    { code: 'YARD_ALLOC', version: 'v3', trained: '2026-09-20', from: '2025-10-01', to: '2026-09-20', active: true, metrics: { top3Acceptance: 0.81, rehandlesPerMove: 0.34, holdout: 4120 } },
    { code: 'YARD_ALLOC', version: 'v4-rc', trained: '2026-10-05', from: '2025-11-01', to: '2026-10-05', active: false, metrics: { top3Acceptance: 0.86, rehandlesPerMove: 0.29, holdout: 4388 } },
    { code: 'DWELL', version: 'v2', trained: '2026-08-31', from: '2025-04-01', to: '2026-08-31', active: true, metrics: { maeDays: 2.4, p90Coverage: 0.88, holdout: 9210 } },
    { code: 'DWELL', version: 'v1', trained: '2026-03-31', from: '2025-01-01', to: '2026-03-31', active: false, metrics: { maeDays: 3.9, p90Coverage: 0.81, holdout: 5200 } },
    { code: 'OCCUPANCY', version: 'v1', trained: '2026-09-30', from: '2025-01-01', to: '2026-09-30', active: true, metrics: { mapePct: 5.1, rmseTeu: 142, horizonDays: 14 } }
  ];
  for (const m of mlModels) {
    await prisma.ml_model_version.upsert({
      where: {
        model_code_version_label: { model_code: m.code, version_label: m.version }
      },
      update: {},
      create: {
        model_code: m.code,
        version_label: m.version,
        trained_at: new Date(m.trained),
        training_window_from: new Date(m.from),
        training_window_to: new Date(m.to),
        metrics_json: JSON.stringify(m.metrics),
        is_active: m.active,
        createdby: 'SYSTEM'
      }
    });
  }

  console.log('Seeding m_calendar_holiday...');
  const cal = await prisma.m_calendar.findFirst();
  const calId = cal?.calendar_id || 1;
  const holidays = [
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
    { date: '2026-10-14', name: 'Nyerere Day' },
    { date: '2026-12-09', name: 'Independence Day' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-26', name: 'Boxing Day' }
  ];
  for (const h of holidays) {
    const d = new Date(h.date);
    await prisma.m_calendar_holiday.upsert({
      where: {
        calendar_id_holiday_date: { calendar_id: calId, holiday_date: d }
      },
      update: {},
      create: {
        calendar_id: calId,
        holiday_date: d,
        holiday_name: h.name,
        createdby: 'SYSTEM'
      }
    });
  }

  console.log('Seeding outbox_event...');
  const existingOutbox = await prisma.outbox_event.count();
  if (existingOutbox === 0) {
    const outboxItems = [
      { type: 'UnitGatedIn', aggType: 'unit_stay', aggId: 5031n, hoursAgo: 0.1, payload: { unitNo: 'MSKU9018241', gate: 'OG1', lane: 'IN1' } },
      { type: 'InvoicePosted', aggType: 'invoice', aggId: 3318n, hoursAgo: 6, payload: { invoiceNo: 'INV-DAR1-26-003318', total: 1840.50 } },
      { type: 'HoldPlaced', aggType: 'hold', aggId: 703n, hoursAgo: 0.4, payload: { holdType: 'CUSTOMS', unitStayId: 5022 } },
      { type: 'ReleaseApproved', aggType: 'release_order', aggId: 801n, hoursAgo: 0.05, payload: { roNumber: 'RO-2026-00801', status: 'RELEASED' } },
      { type: 'PaymentReceived', aggType: 'payment', aggId: 9921n, hoursAgo: 1.3, payload: { receiptNo: 'RCT-DAR1-26-004471', amount: 840.00 } },
      { type: 'UnitGatedOut', aggType: 'unit_stay', aggId: 4980n, hoursAgo: 2, payload: { unitNo: 'TGHU7718290', truck: 'T 124 ABC' } },
      { type: 'CreditNoteIssued', aggType: 'credit_note', aggId: 141n, hoursAgo: 18, payload: { cnNumber: 'CN-26-00141', amount: 220.00 } }
    ];
    for (const ob of outboxItems) {
      const occurred = new Date(Date.now() - ob.hoursAgo * 3600000);
      await prisma.outbox_event.create({
        data: {
          event_type: ob.type,
          event_version: 1,
          site_id: 1,
          aggregate_type: ob.aggType,
          aggregate_id: ob.aggId,
          occurred_at: occurred,
          payload_json: JSON.stringify(ob.payload)
        }
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());

