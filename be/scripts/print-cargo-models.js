const fs = require('fs');
const schema = fs.readFileSync('be/prisma/schema.prisma', 'utf8');

const modelsToCheck = [
  'vessel_calls',
  'manifests',
  'manifest_lines',
  'consignments',
  'consignment_lines',
  'cargo_units',
  'unit_stays',
  'customs_refs',
  'customs_exams',
  'holds',
  'release_orders',
  'dg_lines'
];

for (const m of modelsToCheck) {
  const start = schema.indexOf('model ' + m + ' {');
  if (start !== -1) {
    const end = schema.indexOf('}', start);
    console.log('==================== ' + m + ' ====================');
    console.log(schema.substring(start, end + 1));
  } else {
    console.log('MODEL NOT FOUND: ' + m);
  }
}

