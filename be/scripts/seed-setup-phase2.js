const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Resuming Setup Phase 2 Seeding ---');

  // 1. Accounting Periods
  console.log('Checking accounting_period...');
  for (let m = 1; m <= 10; m++) {
    const lastDay = new Date(Date.UTC(2026, m, 0)).getUTCDate();
    const periodKey = `2026-${String(m).padStart(2, '0')}`;
    const closed = m <= 8;
    await prisma.accounting_period.upsert({
      where: {
        company_id_period_key: { company_id: 1, period_key: periodKey }
      },
      update: {},
      create: {
        company_id: 1,
        period_key: periodKey,
        period_start: new Date(`2026-${String(m).padStart(2, '0')}-01T00:00:00.000Z`),
        period_end: new Date(`2026-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T00:00:00.000Z`),
        status: closed ? 'CLOSED' : 'OPEN',
        closed_at: closed ? new Date(`2026-${String(m).padStart(2, '0')}-28T14:00:00.000Z`) : null,
        closed_by_sub: closed ? 'Joseph Nyerere' : null,
        createdby: 'SYSTEM'
      }
    });
  }

  // 2. Payment Channels
  console.log('Checking m_payment_channel...');
  const channels = [
    { code: 'CASH_USD', name: 'Cash (USD)', method: 'CASH', provider: null, currency: 'USD', gl: '1010-01', pattern: null },
    { code: 'CASH_TZS', name: 'Cash (TZS)', method: 'CASH', provider: null, currency: 'TZS', gl: '1010-02', pattern: null },
    { code: 'CRDB_USD', name: 'CRDB Bank USD account', method: 'BANK_TRANSFER', provider: 'CRDB Bank', currency: 'USD', gl: '1020-01', pattern: '^[A-Z0-9]{10,16}$' },
    { code: 'CRDB_TZS', name: 'CRDB Bank TZS account', method: 'BANK_TRANSFER', provider: 'CRDB Bank', currency: 'TZS', gl: '1020-02', pattern: '^[A-Z0-9]{10,16}$' },
    { code: 'NMB_TZS', name: 'NMB Bank TZS account', method: 'BANK_TRANSFER', provider: 'NMB Bank', currency: 'TZS', gl: '1020-03', pattern: '^[A-Z0-9]{10,16}$' },
    { code: 'MPESA_TZS', name: 'Vodacom M-Pesa merchant paybill', method: 'MOBILE_MONEY', provider: 'Vodacom', currency: 'TZS', gl: '1030-01', pattern: '^[0-9A-Z]{10}$' },
    { code: 'TIGOPESA_TZS', name: 'Tigo Pesa lipa namba', method: 'MOBILE_MONEY', provider: 'Tigo', currency: 'TZS', gl: '1030-02', pattern: '^[0-9A-Z]{10}$' },
    { code: 'CARD_VISA_MC', name: 'POS Card terminal (Visa/Mastercard)', method: 'CARD', provider: 'CRDB Merchant Services', currency: 'TZS', gl: '1040-01', pattern: '^[0-9]{6,12}$' }
  ];
  for (const c of channels) {
    await prisma.m_payment_channel.upsert({
      where: {
        company_id_channel_code: { company_id: 1, channel_code: c.code }
      },
      update: {},
      create: {
        company_id: 1,
        channel_code: c.code,
        channel_name: c.name,
        method: c.method,
        provider: c.provider,
        currency: c.currency,
        gl_account: c.gl,
        reference_pattern: c.pattern,
        is_active: true,
        createdby: 'SYSTEM'
      }
    });
  }

  // 3. GL Settings
  console.log('Checking m_gl_setting...');
  const glList = [
    { key: 'AR_CONTROL', gl: '1200-00', desc: 'Trade receivables control' },
    { key: 'UNALLOCATED_RECEIPTS', gl: '2150-00', desc: 'Receipts not yet matched to invoices' },
    { key: 'DISBURSEMENT_CLEARING', gl: '1290-00', desc: 'Port and terminal charges paid on behalf' },
    { key: 'FX_GAIN', gl: '7810-00', desc: 'Realised exchange gain' },
    { key: 'FX_LOSS', gl: '7820-00', desc: 'Realised exchange loss' },
    { key: 'ROUNDING', gl: '7890-00', desc: 'TZS rounding on USD invoices' },
    { key: 'CASH_OVER_SHORT', gl: '7850-00', desc: 'Cash-up differences' },
    { key: 'REFUNDS_PAYABLE', gl: '2160-00', desc: 'Approved refunds not yet paid' }
  ];
  for (const g of glList) {
    await prisma.m_gl_setting.upsert({
      where: {
        company_id_setting_key: { company_id: 1, setting_key: g.key }
      },
      update: {},
      create: {
        company_id: 1,
        setting_key: g.key,
        gl_account: g.gl,
        description: g.desc,
        createdby: 'SYSTEM'
      }
    });
  }

  // 4. Print Templates
  console.log('Checking m_print_template...');
  const printTpls = [
    { kind: 'GATE_PASS', name: 'Gate pass (card)', paper: 'A5', copies: 1, watermark: 'REPRINT', status: 'ACTIVE' },
    { kind: 'EIR', name: 'Equipment interchange receipt', paper: 'A4', copies: 2, watermark: 'COPY', status: 'ACTIVE' },
    { kind: 'TAX_INVOICE', name: 'Tax invoice with VFD block', paper: 'A4', copies: 1, watermark: 'COPY', status: 'ACTIVE' },
    { kind: 'RECEIPT', name: 'Cashier receipt (80 mm)', paper: 'THERMAL80', copies: 1, watermark: 'COPY', status: 'ACTIVE' },
    { kind: 'RELEASE_ORDER', name: 'Release order authorisation slip', paper: 'A4', copies: 1, watermark: 'DUPLICATE', status: 'ACTIVE' },
    { kind: 'INSPECTION_REPORT', name: 'Container physical inspection certificate', paper: 'A4', copies: 1, watermark: 'OFFICIAL', status: 'ACTIVE' },
    { kind: 'WEIGHT_TICKET', name: 'Weighbridge ticket (VGM certified)', paper: 'A5', copies: 2, watermark: 'COPY', status: 'ACTIVE' },
    { kind: 'DAMAGE_REPORT', name: 'Container damage and defect report', paper: 'A4', copies: 1, watermark: 'DRAFT', status: 'DRAFT' }
  ];
  for (const pt of printTpls) {
    const existing = await prisma.m_print_template.findFirst({
      where: { doc_kind: pt.kind, template_name: pt.name }
    });
    if (!existing) {
      await prisma.m_print_template.create({
        data: {
          doc_kind: pt.kind,
          company_id: 1,
          site_id: 1,
          language_code: 'en',
          version_no: 1,
          template_name: pt.name,
          template_html: `<html><body><h1>${pt.name}</h1></body></html>`,
          paper_size: pt.paper,
          default_copies: pt.copies,
          reprint_watermark: pt.watermark,
          status: pt.status,
          createdby: 'SYSTEM'
        }
      });
    }
  }

  // 5. Number Sequences
  console.log('Checking m_number_sequence...');
  const sequences = [
    { kind: 'INVOICE', siteId: 1, prefix: 'INV', pattern: '{PREFIX}-DAR1-{YY}-{######}', next: 3319, reset: 'YEARLY' },
    { kind: 'INVOICE', siteId: 2, prefix: 'INV', pattern: '{PREFIX}-DAR2-{YY}-{######}', next: 884, reset: 'YEARLY' },
    { kind: 'CREDIT_NOTE', siteId: null, prefix: 'CN', pattern: '{PREFIX}-{YY}-{#####}', next: 142, reset: 'YEARLY' },
    { kind: 'RECEIPT', siteId: 1, prefix: 'RCT', pattern: '{PREFIX}-DAR1-{YY}-{######}', next: 4472, reset: 'YEARLY' },
    { kind: 'RECEIPT', siteId: 2, prefix: 'RCT', pattern: '{PREFIX}-DAR2-{YY}-{######}', next: 902, reset: 'YEARLY' },
    { kind: 'GATE_PASS', siteId: 1, prefix: 'GP', pattern: '{PREFIX}-DAR1-{YYYYMM}-{######}', next: 12401, reset: 'MONTHLY' },
    { kind: 'RELEASE_ORDER', siteId: null, prefix: 'RO', pattern: '{PREFIX}-{YY}-{#####}', next: 820, reset: 'YEARLY' },
    { kind: 'EIR', siteId: 1, prefix: 'EIR', pattern: '{PREFIX}-DAR1-{YY}-{######}', next: 5120, reset: 'YEARLY' },
    { kind: 'WEIGH_TICKET', siteId: 1, prefix: 'WT', pattern: '{PREFIX}-DAR1-{YY}-{######}', next: 3105, reset: 'YEARLY' }
  ];
  for (const s of sequences) {
    const existing = await prisma.m_number_sequence.findFirst({
      where: { company_id: 1, site_id: s.siteId, document_kind: s.kind }
    });
    if (!existing) {
      await prisma.m_number_sequence.create({
        data: {
          company_id: 1,
          site_id: s.siteId,
          document_kind: s.kind,
          prefix: s.prefix,
          pattern: s.pattern,
          next_value: s.next,
          reset_policy: s.reset,
          current_period: '2026',
          createdby: 'SYSTEM'
        }
      });
    }
  }

  // 6. Device Integrations
  console.log('Seeding m_device_integration...');
  const lanes = await prisma.m_gate_lane.findMany();
  const lane1 = lanes.find(l => l.lane_code.toLowerCase().includes('in 1')) || lanes[0];
  const lane2 = lanes.find(l => l.lane_code.toLowerCase().includes('in 2')) || lanes[1];
  const laneWB = lanes.find(l => l.lane_code.toLowerCase().includes('scale')) || lanes[0];
  const devices = await prisma.m_device.findMany();
  const agentDev = devices.find(d => d.device_code.includes('GA')) || devices[0];

  const integrations = [
    { kind: 'CONTAINER_OCR', laneId: lane1?.gate_lane_id, vendor: 'Camco', model: 'GOS-4', mode: 'ASSISTED', agentId: agentDev?.device_id },
    { kind: 'ANPR', laneId: lane2?.gate_lane_id, vendor: 'Hikvision', model: 'iDS-TCM403', mode: 'MANUAL', agentId: agentDev?.device_id },
    { kind: 'WEIGHBRIDGE', laneId: laneWB?.gate_lane_id, vendor: 'Avery Weigh-Tronix', model: 'ZM405', mode: 'AUTOMATIC', agentId: agentDev?.device_id },
    { kind: 'BARRIER', laneId: lane1?.gate_lane_id, vendor: 'Magnetic Control', model: 'Access Pro', mode: 'AUTOMATIC', agentId: agentDev?.device_id },
    { kind: 'RFID', laneId: lane1?.gate_lane_id, vendor: 'Nedap', model: 'uPASS Target', mode: 'ASSISTED', agentId: agentDev?.device_id }
  ];
  for (const it of integrations) {
    const existing = await prisma.m_device_integration.findFirst({
      where: { site_id: 1, integration_kind: it.kind, gate_lane_id: it.laneId }
    });
    if (!existing) {
      await prisma.m_device_integration.create({
        data: {
          site_id: 1,
          integration_kind: it.kind,
          gate_lane_id: it.laneId,
          vendor: it.vendor,
          model: it.model,
          lane_mode: it.mode,
          gate_agent_device_id: it.agentId,
          config_json: JSON.stringify({ timeoutMs: 3000, triggerMode: 'PHOTOELECTRIC' }),
          is_active: true,
          createdby: 'SYSTEM'
        }
      });
    }
  }

  // 7. Prediction Models (ml_model_version)
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

  // 8. Holidays (m_calendar_holiday)
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

  // 9. Outbox Events (outbox_event)
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

  console.log('--- Phase 2 Seeding Completed Successfully ---');
}

main().catch(e => {
  console.error('Seeding error:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
