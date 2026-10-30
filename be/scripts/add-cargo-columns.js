const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumnsIfMissing() {
  const migrations = [
    // vessel_calls
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vessel_calls') AND name = 'discharge_completed_at')
     ALTER TABLE vessel_calls ADD discharge_completed_at DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vessel_calls') AND name = 'gate_cutoff_at')
     ALTER TABLE vessel_calls ADD gate_cutoff_at DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vessel_calls') AND name = 'doc_cutoff_at')
     ALTER TABLE vessel_calls ADD doc_cutoff_at DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vessel_calls') AND name = 'vgm_cutoff_at')
     ALTER TABLE vessel_calls ADD vgm_cutoff_at DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('vessel_calls') AND name = 'port_call_ref')
     ALTER TABLE vessel_calls ADD port_call_ref NVARCHAR(50) NULL;`,

    // consignments
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignments') AND name = 'cargo_description')
     ALTER TABLE consignments ADD cargo_description NVARCHAR(256) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignments') AND name = 'units_expected')
     ALTER TABLE consignments ADD units_expected INT NULL DEFAULT 0;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignments') AND name = 'units_received')
     ALTER TABLE consignments ADD units_received INT NULL DEFAULT 0;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignments') AND name = 'units_delivered')
     ALTER TABLE consignments ADD units_delivered INT NULL DEFAULT 0;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignments') AND name = 'destination_country')
     ALTER TABLE consignments ADD destination_country NVARCHAR(64) NULL;`,

    // manifests
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('manifests') AND name = 'file_name')
     ALTER TABLE manifests ADD file_name NVARCHAR(256) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('manifests') AND name = 'source')
     ALTER TABLE manifests ADD source NVARCHAR(32) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('manifests') AND name = 'created_count')
     ALTER TABLE manifests ADD created_count INT NULL DEFAULT 0;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('manifests') AND name = 'matched_count')
     ALTER TABLE manifests ADD matched_count INT NULL DEFAULT 0;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('manifests') AND name = 'error_count')
     ALTER TABLE manifests ADD error_count INT NULL DEFAULT 0;`,

    // manifest_lines
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('manifest_lines') AND name = 'unit_type_raw')
     ALTER TABLE manifest_lines ADD unit_type_raw NVARCHAR(32) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('manifest_lines') AND name = 'commodity_raw')
     ALTER TABLE manifest_lines ADD commodity_raw NVARCHAR(128) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('manifest_lines') AND name = 'error_text')
     ALTER TABLE manifest_lines ADD error_text NVARCHAR(256) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('manifest_lines') AND name = 'issue')
     ALTER TABLE manifest_lines ADD issue NVARCHAR(64) NULL;`,

    // consignment_lines
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignment_lines') AND name = 'package_type')
     ALTER TABLE consignment_lines ADD package_type NVARCHAR(32) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignment_lines') AND name = 'package_count')
     ALTER TABLE consignment_lines ADD package_count INT NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignment_lines') AND name = 'goods_description')
     ALTER TABLE consignment_lines ADD goods_description NVARCHAR(256) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignment_lines') AND name = 'gross_weight_kg')
     ALTER TABLE consignment_lines ADD gross_weight_kg DECIMAL(12,2) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignment_lines') AND name = 'volume_cbm')
     ALTER TABLE consignment_lines ADD volume_cbm DECIMAL(10,2) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignment_lines') AND name = 'commodity_code')
     ALTER TABLE consignment_lines ADD commodity_code NVARCHAR(32) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('consignment_lines') AND name = 'hs_code')
     ALTER TABLE consignment_lines ADD hs_code NVARCHAR(32) NULL;`,

    // unit_stays
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('unit_stays') AND name = 'cargo_description')
     ALTER TABLE unit_stays ADD cargo_description NVARCHAR(256) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('unit_stays') AND name = 'condition_status')
     ALTER TABLE unit_stays ADD condition_status NVARCHAR(32) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('unit_stays') AND name = 'discharge_at')
     ALTER TABLE unit_stays ADD discharge_at DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('unit_stays') AND name = 'gated_in_at')
     ALTER TABLE unit_stays ADD gated_in_at DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('unit_stays') AND name = 'free_until')
     ALTER TABLE unit_stays ADD free_until DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('unit_stays') AND name = 'destination_country')
     ALTER TABLE unit_stays ADD destination_country NVARCHAR(64) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('unit_stays') AND name = 'reefer_temp_c')
     ALTER TABLE unit_stays ADD reefer_temp_c DECIMAL(5,2) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('unit_stays') AND name = 'imo_class')
     ALTER TABLE unit_stays ADD imo_class NVARCHAR(16) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('unit_stays') AND name = 'un_number')
     ALTER TABLE unit_stays ADD un_number NVARCHAR(16) NULL;`,

    // holds
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('holds') AND name = 'authority_ref')
     ALTER TABLE holds ADD authority_ref NVARCHAR(100) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('holds') AND name = 'lift_reason')
     ALTER TABLE holds ADD lift_reason NVARCHAR(250) NULL;`,

    // release_orders
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('release_orders') AND name = 'release_kind')
     ALTER TABLE release_orders ADD release_kind NVARCHAR(32) NULL DEFAULT 'DELIVERY';`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('release_orders') AND name = 'collector_name')
     ALTER TABLE release_orders ADD collector_name NVARCHAR(128) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('release_orders') AND name = 'collector_id_type')
     ALTER TABLE release_orders ADD collector_id_type NVARCHAR(64) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('release_orders') AND name = 'collector_id_no')
     ALTER TABLE release_orders ADD collector_id_no NVARCHAR(64) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('release_orders') AND name = 'planned_exit_date')
     ALTER TABLE release_orders ADD planned_exit_date DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('release_orders') AND name = 'transporter_party_id')
     ALTER TABLE release_orders ADD transporter_party_id INT NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('release_orders') AND name = 'units_total')
     ALTER TABLE release_orders ADD units_total INT NULL DEFAULT 0;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('release_orders') AND name = 'units_out')
     ALTER TABLE release_orders ADD units_out INT NULL DEFAULT 0;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('release_orders') AND name = 'requested_at')
     ALTER TABLE release_orders ADD requested_at DATETIME2 NULL;`,

    // release_order_units table
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'release_order_units')
     CREATE TABLE release_order_units (
       release_order_unit_id INT IDENTITY(1,1) PRIMARY KEY,
       release_order_id INT NOT NULL FOREIGN KEY REFERENCES release_orders(release_order_id),
       unit_stay_id INT NOT NULL FOREIGN KEY REFERENCES unit_stays(unit_stay_id),
       status NVARCHAR(30) NULL DEFAULT 'PENDING'
     );`,

    // customs_refs
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('customs_refs') AND name = 'ref_date')
     ALTER TABLE customs_refs ADD ref_date DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('customs_refs') AND name = 'valid_to')
     ALTER TABLE customs_refs ADD valid_to DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('customs_refs') AND name = 'amount')
     ALTER TABLE customs_refs ADD amount DECIMAL(14,2) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('customs_refs') AND name = 'amount_currency')
     ALTER TABLE customs_refs ADD amount_currency NVARCHAR(8) NULL DEFAULT 'USD';`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('customs_refs') AND name = 'source')
     ALTER TABLE customs_refs ADD source NVARCHAR(32) NULL DEFAULT 'MANUAL';`,

    // customs_exams
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('customs_exams') AND name = 'exam_bay')
     ALTER TABLE customs_exams ADD exam_bay NVARCHAR(32) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('customs_exams') AND name = 'scheduled_date')
     ALTER TABLE customs_exams ADD scheduled_date DATETIME2 NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('customs_exams') AND name = 'scheduled_time')
     ALTER TABLE customs_exams ADD scheduled_time NVARCHAR(16) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('customs_exams') AND name = 'findings')
     ALTER TABLE customs_exams ADD findings NVARCHAR(256) NULL;`,

    // dg_lines
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dg_lines') AND name = 'flashpoint_c')
     ALTER TABLE dg_lines ADD flashpoint_c NVARCHAR(16) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dg_lines') AND name = 'marine_pollutant')
     ALTER TABLE dg_lines ADD marine_pollutant BIT NULL DEFAULT 0;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dg_lines') AND name = 'gross_weight_kg')
     ALTER TABLE dg_lines ADD gross_weight_kg DECIMAL(12,2) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dg_lines') AND name = 'emergency_contact')
     ALTER TABLE dg_lines ADD emergency_contact NVARCHAR(128) NULL;`
  ];

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.warn('Migration step warning:', e.message);
    }
  }

  console.log('SQL column migration completed successfully.');
  await prisma.$disconnect();
}

addColumnsIfMissing().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});

