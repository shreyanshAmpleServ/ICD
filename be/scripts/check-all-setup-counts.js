const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const models = [
    'm_company', 'm_site', 'm_country_pack',
    'm_yard_location',
    'm_gate', 'm_checkpoint', 'm_visit_type',
    'm_unit_type', 'm_identity_rule', 'm_cargo_regime',
    'm_truck', 'm_driver', 'm_vessel', 'm_port', 'm_commodity', 'm_equipment',
    'app_user', 'm_role', 'm_permission',
    'm_hold_type', 'm_release_rule', 'm_approval_policy', 'm_exception_type',
    'm_inspection_template', 'm_damage_code',
    'accounting_period', 'm_charge_code', 'm_tax_code', 'm_payment_channel', 'm_gl_setting',
    'm_notification_template', 'm_notification_rule', 'm_print_template',
    'm_number_sequence', 'm_document_type',
    'm_device', 'm_device_integration',
    'sync_state', 'outbox_event',
    'ml_model_version',
    'm_field_rule', 'm_calendar', 'm_calendar_holiday'
  ];
  for (const m of models) {
    try {
      const c = await prisma[m].count();
      console.log(m.padEnd(26), c);
    } catch (e) {
      console.log(m.padEnd(26), 'ERROR: ' + e.message.split('\n')[0]);
    }
  }
}
main().finally(() => prisma.$disconnect());
