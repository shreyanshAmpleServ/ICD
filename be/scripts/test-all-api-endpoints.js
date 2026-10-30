const http = require('http');

const endpoints = [
  // Cargo
  { name: 'Cargo Units', path: '/api/units' },
  { name: 'Cargo Consignments', path: '/api/consignments' },
  { name: 'Cargo Vessel Calls', path: '/api/vessel-calls' },
  { name: 'Cargo Manifests', path: '/api/manifests' },
  { name: 'Cargo Customs Refs', path: '/api/customs/refs' },
  { name: 'Cargo Exams', path: '/api/exams' },
  { name: 'Cargo Holds', path: '/api/holds' },
  { name: 'Cargo Release Orders', path: '/api/release-orders' },
  { name: 'Cargo DG Lines', path: '/api/dg-lines' },

  // Setup / Master Data
  { name: 'Setup Companies', path: '/api/companies' },
  { name: 'Setup Sites', path: '/api/sites' },
  { name: 'Setup Country Packs', path: '/api/country-packs' },
  { name: 'Setup Yard Locations', path: '/api/yard/locations' },
  { name: 'Setup Gates', path: '/api/gates' },
  { name: 'Setup Checkpoints', path: '/api/checkpoints' },
  { name: 'Setup Visit Types', path: '/api/visit-types' },
  { name: 'Setup Unit Types', path: '/api/unit-types' },
  { name: 'Setup Cargo Regimes', path: '/api/cargo-regimes' },
  { name: 'Setup Trucks', path: '/api/trucks' },
  { name: 'Setup Drivers', path: '/api/drivers' },
  { name: 'Setup Vessels', path: '/api/vessels' },
  { name: 'Setup Ports', path: '/api/ports' },
  { name: 'Setup Commodities', path: '/api/commodities' },
  { name: 'Setup Equipment', path: '/api/equipment' },
  { name: 'Setup Users', path: '/api/users' },
  { name: 'Setup Roles', path: '/api/roles' },
  { name: 'Setup Permissions', path: '/api/permissions' },
  { name: 'Setup Hold Types', path: '/api/hold-types' },
  { name: 'Setup Release Rules', path: '/api/release-rules' },
  { name: 'Setup Approval Policies', path: '/api/approval-policies' },
  { name: 'Setup Exception Types', path: '/api/exception-types' },
  { name: 'Setup Inspection Templates', path: '/api/inspection-templates' },
  { name: 'Setup Damage Codes', path: '/api/damage-codes' },
  { name: 'Setup Accounting Periods', path: '/api/accounting-periods' },
  { name: 'Setup Charge Codes', path: '/api/charge-codes' },
  { name: 'Setup Tax Codes', path: '/api/tax-codes' },
  { name: 'Setup Payment Channels', path: '/api/payment-channels' },
  { name: 'Setup GL Settings', path: '/api/gl-settings' },
  { name: 'Setup Notification Templates', path: '/api/notification-templates' },
  { name: 'Setup Notification Rules', path: '/api/notification-rules' },
  { name: 'Setup Print Templates', path: '/api/print-templates' },
  { name: 'Setup Number Sequences', path: '/api/number-sequences' },
  { name: 'Setup Document Types', path: '/api/document-types' },
  { name: 'Setup Devices', path: '/api/devices' },
  { name: 'Setup Device Integrations', path: '/api/device-integrations' },
  { name: 'Setup Sync Status', path: '/api/sync/status' },
  { name: 'Setup Outbox', path: '/api/sync/outbox' },
  { name: 'Setup Models', path: '/api/models' },
  { name: 'Setup Field Rules', path: '/api/field-rules' },
  { name: 'Setup Calendars', path: '/api/calendars' },
  { name: 'Setup Holidays', path: '/api/calendars/1/holidays' }
];

function fetchEndpoint(ep) {
  return new Promise((resolve) => {
    const req = http.get({
      host: 'localhost',
      port: 4000,
      path: ep.path,
      headers: {
        'x-site-id': '1',
        'x-user-sub': 'usr_admin',
        'x-role': 'ADMIN',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const count = Array.isArray(json) ? json.length : (json.items ? json.items.length : (json.total !== undefined ? json.total : 1));
          resolve({ name: ep.name, path: ep.path, status: res.statusCode, count, ok: res.statusCode === 200 });
        } catch (e) {
          resolve({ name: ep.name, path: ep.path, status: res.statusCode, error: 'JSON parse error', raw: data.slice(0, 100), ok: false });
        }
      });
    });
    req.on('error', (e) => {
      resolve({ name: ep.name, path: ep.path, status: 0, error: e.message, ok: false });
    });
  });
}

async function run() {
  console.log('Testing all endpoints on http://localhost:4000...');
  for (const ep of endpoints) {
    const res = await fetchEndpoint(ep);
    const mark = res.ok ? '✓ 200' : `✗ ${res.status}`;
    console.log(`${mark.padEnd(8)} | ${res.name.padEnd(28)} | count: ${String(res.count ?? res.error).padEnd(6)} | ${res.path}`);
  }
}

run();

