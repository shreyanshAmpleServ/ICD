const fs = require('fs');
let schema = fs.readFileSync('be/prisma/schema.prisma', 'utf8');

// 1. vessel_calls
schema = schema.replace(
  /model vessel_calls \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('discharge_completed_at')) {
      newBody = newBody.replace(
        /status\s+String\?[^\n]*/,
        `$&
  discharge_completed_at DateTime?
  gate_cutoff_at         DateTime?
  doc_cutoff_at          DateTime?
  vgm_cutoff_at          DateTime?
  port_call_ref          String?        @db.NVarChar(50)`
      );
    }
    return `model vessel_calls {${newBody}}`;
  }
);

// 2. manifests
schema = schema.replace(
  /model manifests \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('file_name')) {
      newBody = newBody.replace(
        /imported_at\s+DateTime\?[^\n]*/,
        `$&
  file_name              String?          @db.NVarChar(256)
  source                 String?          @db.NVarChar(32)
  created_count          Int?             @default(0)
  matched_count          Int?             @default(0)
  error_count            Int?             @default(0)`
      );
    }
    return `model manifests {${newBody}}`;
  }
);

// 3. manifest_lines
schema = schema.replace(
  /model manifest_lines \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('unit_type_raw')) {
      newBody = newBody.replace(
        /match_status\s+String\?[^\n]*/,
        `$&
  unit_type_raw    String?   @db.NVarChar(32)
  commodity_raw    String?   @db.NVarChar(128)
  error_text       String?   @db.NVarChar(256)
  issue            String?   @db.NVarChar(64)`
      );
    }
    return `model manifest_lines {${newBody}}`;
  }
);

// 4. consignments
schema = schema.replace(
  /model consignments \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('cargo_description')) {
      newBody = newBody.replace(
        /created_at\s+DateTime\?[^\n]*/,
        `$&
  cargo_description                                    String?             @db.NVarChar(256)
  units_expected                                       Int?                @default(0)
  units_received                                       Int?                @default(0)
  units_delivered                                      Int?                @default(0)
  destination_country                                  String?             @db.NVarChar(64)`
      );
    }
    return `model consignments {${newBody}}`;
  }
);

// 5. consignment_lines
schema = schema.replace(
  /model consignment_lines \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('package_type')) {
      newBody = newBody.replace(
        /description\s+String\?[^\n]*/,
        `$&
  package_type        String?      @db.NVarChar(32)
  package_count       Int?
  goods_description   String?      @db.NVarChar(256)
  gross_weight_kg     Decimal?     @db.Decimal(12, 2)
  volume_cbm          Decimal?     @db.Decimal(10, 2)
  commodity_code      String?      @db.NVarChar(32)
  hs_code             String?      @db.NVarChar(32)`
      );
    }
    return `model consignment_lines {${newBody}}`;
  }
);

// 6. unit_stays
schema = schema.replace(
  /model unit_stays \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('cargo_description')) {
      newBody = newBody.replace(
        /departed_at\s+DateTime\?[^\n]*/,
        `$&
  cargo_description String?             @db.NVarChar(256)
  condition_status  String?             @db.NVarChar(32)
  discharge_at      DateTime?
  gated_in_at       DateTime?
  free_until        DateTime?
  destination_country String?           @db.NVarChar(64)
  reefer_temp_c     Decimal?            @db.Decimal(5, 2)
  imo_class         String?             @db.NVarChar(16)
  un_number         String?             @db.NVarChar(16)`
      );
    }
    return `model unit_stays {${newBody}}`;
  }
);

// 7. holds
schema = schema.replace(
  /model holds \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('authority_ref')) {
      newBody = newBody.replace(
        /lifted_at\s+DateTime\?[^\n]*/,
        `$&
  authority_ref                        String?    @db.NVarChar(100)
  lift_reason                          String?    @db.NVarChar(250)`
      );
    }
    return `model holds {${newBody}}`;
  }
);

// 8. release_orders
schema = schema.replace(
  /model release_orders \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('collector_name')) {
      newBody = newBody.replace(
        /expires_at\s+DateTime\?[^\n]*/,
        `$&
  release_kind          String?      @default("DELIVERY") @db.NVarChar(32)
  collector_name        String?      @db.NVarChar(128)
  collector_id_type     String?      @db.NVarChar(64)
  collector_id_no       String?      @db.NVarChar(64)
  planned_exit_date     DateTime?
  transporter_party_id  Int?
  units_total           Int?         @default(0)
  units_out             Int?         @default(0)
  requested_at          DateTime?`
      );
    }
    return `model release_orders {${newBody}}`;
  }
);

// 9. customs_refs
schema = schema.replace(
  /model customs_refs \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('amount_currency')) {
      newBody = newBody.replace(
        /cleared_at\s+DateTime\?[^\n]*/,
        `$&
  ref_date       DateTime?
  valid_to       DateTime?
  amount         Decimal?     @db.Decimal(14, 2)
  amount_currency String?     @default("USD") @db.NVarChar(8)
  source         String?      @default("MANUAL") @db.NVarChar(32)`
      );
    }
    return `model customs_refs {${newBody}}`;
  }
);

// 10. customs_exams
schema = schema.replace(
  /model customs_exams \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('exam_bay')) {
      newBody = newBody.replace(
        /officer_name\s+String\?[^\n]*/,
        `$&
  exam_bay        String?    @db.NVarChar(32)
  scheduled_date  DateTime?
  scheduled_time  String?    @db.NVarChar(16)
  findings        String?    @db.NVarChar(256)`
      );
    }
    return `model customs_exams {${newBody}}`;
  }
);

// 11. dg_lines
schema = schema.replace(
  /model dg_lines \{([\s\S]*?)\}/,
  (match, body) => {
    let newBody = body;
    if (!newBody.includes('marine_pollutant')) {
      newBody = newBody.replace(
        /proper_shipping_name\s+String\?[^\n]*/,
        `$&
  flashpoint_c         String?    @db.NVarChar(16)
  marine_pollutant     Boolean?   @default(false)
  gross_weight_kg      Decimal?   @db.Decimal(12, 2)
  emergency_contact    String?    @db.NVarChar(128)`
      );
    }
    return `model dg_lines {${newBody}}`;
  }
);

fs.writeFileSync('be/prisma/schema.prisma', schema);
console.log('schema.prisma updated successfully.');

