const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/modules/cargo/cargo.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/tareWeightKg: Number\(u\.unit_types\?\.tare_weight_kg \|\| 3800\),/g, 'tareWeightKg: 3800,');
content = content.replace('vessel_type: "CONTAINER",\n                flag: "Tanzania",', 'is_active: true,');
content = content.replace('vessel_type: "CONTAINER",\r\n                flag: "Tanzania",', 'is_active: true,');
content = content.replace(
  'operator_party_id: body.shippingLinePartyId || 1,',
  'shipping_line_party_id: body.shippingLinePartyId || 1,'
);
// replace second occurrence in manifests
content = content.replace(
  'operator_party_id: body.shippingLinePartyId || 1,',
  'shipping_line_party_id: body.shippingLinePartyId || 1,'
);

content = content.replace('where: { ref_no: l.bl_no }', 'where: { ref_no: l.bl_no || "BL-UNKNOWN" }');
content = content.replace('ref_no: l.bl_no,', 'ref_no: l.bl_no || "BL-UNKNOWN",');
content = content.replace(
  'placedAt: created.placed_at.toISOString(),',
  'placedAt: created.placed_at ? created.placed_at.toISOString() : new Date().toISOString(),'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched cargo.service.ts');

