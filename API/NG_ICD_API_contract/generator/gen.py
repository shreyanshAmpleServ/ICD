"""Generate the DCC NG ICD API contract (OpenAPI 3.1), the NG-side contract
and a readable endpoint catalogue from one compact definition.

    python3 gen.py  ->  out/ng_icd_api.yaml, out/ng_icd_ng_side.yaml,
                        out/NG_ICD_API_catalogue.md
"""
import os, re, copy, yaml
from collections import OrderedDict, defaultdict
import gen_schemas as G

OUT = os.path.join(os.path.dirname(__file__), 'out')
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------------ schema conversion
BASE = {
    'id': {'type': 'integer', 'format': 'int64'},
    'int': {'type': 'integer', 'format': 'int32'},
    'str': {'type': 'string'},
    'text': {'type': 'string', 'maxLength': 4000},
    'bool': {'type': 'boolean'},
    'dec': {'type': 'string', 'format': 'decimal', 'pattern': r'^-?\d+(\.\d+)?$'},
    'money': {'type': 'string', 'format': 'decimal', 'pattern': r'^-?\d+(\.\d{1,4})?$',
              'description': 'Decimal amount as a string (no floating point).'},
    'date': {'type': 'string', 'format': 'date'},
    'datetime': {'type': 'string', 'format': 'date-time'},
    'time': {'type': 'string', 'pattern': r'^\d{2}:\d{2}(:\d{2})?$'},
    'uuid': {'type': 'string', 'format': 'uuid'},
    'json': {'type': 'object', 'additionalProperties': True},
    'binary': {'type': 'string', 'contentMediaType': 'application/octet-stream'},
    'any': {},
}
REFS_USED = set()

def conv_type(t):
    """Convert a mini-language type (without suffixes) to a JSON schema."""
    if t.startswith('enum(') and t.endswith(')'):
        return {'type': 'string', 'enum': t[5:-1].split('|')}
    if t.startswith('ref(') and t.endswith(')'):
        n = t[4:-1]
        REFS_USED.add(n)
        return {'$ref': f'#/components/schemas/{n}'}
    if t.startswith('list(') and t.endswith(')'):
        return {'type': 'array', 'items': conv_type(t[5:-1])}
    if t not in BASE:
        raise ValueError(f'unknown type {t!r}')
    return copy.deepcopy(BASE[t])

def conv_field(spec):
    req = nullable = ro = False
    while spec and spec[-1] in '!?~':
        c, spec = spec[-1], spec[:-1]
        req |= c == '!'; nullable |= c == '?'; ro |= c == '~'
    s = conv_type(spec)
    if nullable:
        if '$ref' in s:
            s = {'oneOf': [s, {'type': 'null'}]}
        elif 'type' in s:
            s['type'] = [s['type'], 'null']
            if 'enum' in s:
                s['enum'] = s['enum'] + [None]
    if ro:
        s['readOnly'] = True
    return s, req

AUDIT_FIELDS = OrderedDict(logInst='int~', createdAt='datetime~', createdBy='str~', updatedAt='datetime?~')

def build_schemas(src, audited):
    out = OrderedDict()
    for name, fields in src.items():
        props, required = OrderedDict(), []
        allf = OrderedDict(fields)
        if name in audited:
            allf.update(AUDIT_FIELDS)
        for fname, spec in allf.items():
            key = 'from' if fname == 'from_' else fname
            s, r = conv_field(spec)
            if key == 'logInst':
                s['description'] = 'Concurrency counter. Send it back in If-Match when updating.'
            props[key] = s
            if r:
                required.append(key)
        sch = {'type': 'object', 'properties': props}
        if required:
            sch['required'] = required
        out[name] = sch
    return out

# ------------------------------------------------------------------ operations
OPS = []          # list of dicts
TAGS = OrderedDict()
PERMS_KNOWN = set()  # collected for the catalogue

def tag(name, desc, ms):
    TAGS[name] = {'name': name, 'description': desc, 'x-milestone': ms}

def _opid(method, path):
    parts = [p for p in path.strip('/').split('/') if p]
    words = []
    for p in parts:
        for seg in re.split(r'[-:]', p):
            if not seg:
                continue
            if seg.startswith('{'):
                seg = seg[1:-1]
                words.append('By' + seg[0].upper() + seg[1:])
            else:
                words.append(seg[0].upper() + seg[1:])
    verb = {'get': 'get', 'post': 'post', 'patch': 'update', 'put': 'replace', 'delete': 'delete'}[method]
    return verb + ''.join(words)

def op(tg, method, path, summary, perm=None, ms=None, req=None, resp=None, site=True, idem=None,
       ifmatch=None, query=None, status=None, desc=None, req_type='application/json',
       resp_type='application/json', errors=None, public=False):
    """resp: 'Name' | 'page:Name' | 'array:Name' | None (204) | ('raw', schema)."""
    ms = ms or TAGS[tg]['x-milestone']
    if ifmatch is None:
        ifmatch = method == 'patch' or (method == 'put' and '{' in path)
    if idem is None:
        idem = 'optional' if method == 'post' else None
    if status is None:
        status = 204 if resp is None else (201 if method == 'post' and summary.lower().startswith(('create', 'add', 'upload', 'record', 'announce', 'issue', 'open', 'place', 'book', 'register', 'invite', 'submit')) else 200)
    OPS.append(dict(tag=tg, method=method, path=path, summary=summary, perm=perm, ms=ms, req=req,
                    resp=resp, site=site, idem=idem, ifmatch=ifmatch, query=query or [],
                    status=status, desc=desc, req_type=req_type, resp_type=resp_type,
                    errors=errors, public=public))
    if perm:
        PERMS_KNOWN.add(perm)

def crud(tg, base, schema, idname, view, edit, ms=None, site=True, delete=False, query=None,
         noun=None, create=True, update=True):
    noun = noun or re.sub(r'(?<!^)(?=[A-Z])', ' ', schema).lower()
    plural = noun + ('es' if noun.endswith(('s', 'x', 'ch')) else 's')
    if plural.endswith('ys') and not plural.endswith(('ays', 'eys')):
        plural = plural[:-2] + 'ies'
    op(tg, 'get', base, f'List {plural}', view, ms, resp=f'page:{schema}', site=site,
       query=(query or []) + ['q', 'isActive'])
    if create:
        op(tg, 'post', base, f'Create a {noun}', edit, ms, req=schema, resp=schema, site=site)
    op(tg, 'get', f'{base}/{{{idname}}}', f'Get a {noun}', view, ms, resp=schema, site=site)
    if update:
        op(tg, 'patch', f'{base}/{{{idname}}}', f'Update a {noun}', edit, ms, req=schema, resp=schema,
           site=site, desc='Partial update (JSON merge). Send the current logInst in If-Match. '
                           'Deactivate by setting isActive to false; masters are never hard-deleted.')
    if delete:
        op(tg, 'delete', f'{base}/{{{idname}}}', f'Delete a {noun}', edit, ms, site=site)

# ================================================================== M0 Foundations
tag('Session', 'Signed-in user, sites and effective permissions.', 'M0')
tag('Setup', 'Company, sites, calendars, numbering, field rules.', 'M0')
tag('Yard design', 'Yard levels, locations, bulk generation, map geometry, tags.', 'M0')
tag('Gate setup', 'Gates, lanes, checkpoints, visit types.', 'M0')
tag('Unit setup', 'Unit types, identity rules, cargo regimes.', 'M0')
tag('Masters', 'Parties, trucks, drivers, vessels, ports, commodities, equipment. NG-sourced masters are read-only here except local fields.', 'M0')
tag('Access', 'Users, roles, permissions, devices.', 'M0')
tag('Documents', 'Document types, uploads and downloads for any entity.', 'M0')
tag('Audit', 'Field-level audit trail.', 'M0')
tag('Sync', 'Master data sync from NG and outbox status.', 'M0')

op('Session', 'get', '/me', 'Get the signed-in user', None, resp='Me', site=False,
   desc='Returns the user, the sites they may work at and their effective permissions per site '
        '(after delegations). The UI calls this on start and after a site switch.')

crud('Setup', '/companies', 'Company', 'companyId', 'masters.view', 'admin.site.manage', site=False)
crud('Setup', '/sites', 'Site', 'siteId', 'masters.view', 'admin.site.manage', site=False)
crud('Setup', '/calendars', 'Calendar', 'calendarId', 'masters.view', 'admin.config.manage', site=False)
op('Setup', 'get', '/calendars/{calendarId}/holidays', 'List holidays in a calendar', 'masters.view',
   resp='array:Holiday', site=False, query=['year'])
op('Setup', 'post', '/calendars/{calendarId}/holidays', 'Add a holiday', 'admin.config.manage',
   req='Holiday', resp='Holiday', site=False)
op('Setup', 'delete', '/calendars/{calendarId}/holidays/{calendarHolidayId}', 'Remove a holiday',
   'admin.config.manage', site=False)
crud('Setup', '/number-sequences', 'NumberSequence', 'numberSequenceId', 'admin.config.manage',
     'admin.config.manage', site=False, query=['companyId', 'documentKind'])
op('Setup', 'get', '/field-rules', 'List field rules (mandatory, hidden, read-only per screen)',
   'masters.view', resp='array:FieldRule', query=['screenCode'])
op('Setup', 'put', '/field-rules/{screenCode}', 'Replace the field rules for a screen',
   'admin.config.manage', req='array:FieldRule', resp='array:FieldRule', ifmatch=False)

crud('Yard design', '/yard/levels', 'YardLevel', 'yardLevelId', 'yard.map.view', 'admin.yard.design')
crud('Yard design', '/yard/locations', 'YardLocation', 'yardLocationId', 'yard.map.view',
     'admin.yard.design', query=['parentId', 'kind', 'levelNo', 'tag', 'isSlot'])
op('Yard design', 'get', '/yard/locations/{yardLocationId}/children', 'List child locations',
   'yard.map.view', resp='page:YardLocation')
op('Yard design', 'post', '/yard/locations:generate', 'Generate rows, bays and tiers in bulk',
   'admin.yard.design', req='YardGenerateRequest', resp='YardGenerateResult', status=200,
   query=['dryRun'], desc='With dryRun=true nothing is saved; the response shows the count and sample codes.')
op('Yard design', 'post', '/yard/locations/{yardLocationId}:block', 'Block a location',
   'admin.yard.design', req='ReasonRequest', resp='YardLocation', status=200)
op('Yard design', 'post', '/yard/locations/{yardLocationId}:unblock', 'Unblock a location',
   'admin.yard.design', resp='YardLocation', status=200)
crud('Yard design', '/yard/tags', 'LocationTag', 'locationTagId', 'yard.map.view', 'admin.yard.design')

crud('Gate setup', '/gates', 'Gate', 'gateId', 'masters.view', 'admin.gate.configure')
crud('Gate setup', '/checkpoints', 'Checkpoint', 'checkpointId', 'masters.view', 'admin.gate.configure')
crud('Gate setup', '/visit-types', 'VisitType', 'visitTypeId', 'masters.view', 'admin.gate.configure')

crud('Unit setup', '/unit-types', 'UnitType', 'unitTypeId', 'masters.view', 'admin.config.manage',
     site=False, query=['category'])
op('Unit setup', 'get', '/identity-rules', 'List identity rules', 'masters.view',
   resp='array:IdentityRule', site=False)
op('Unit setup', 'post', '/identity:validate', 'Validate a container number, VIN or lot reference',
   'masters.view', req='IdentityCheckRequest', resp='IdentityCheckResult', status=200, site=True,
   desc='Checks format and check digit (ISO 6346 / VIN) and reports an open stay for the same unit at this site.')
op('Unit setup', 'get', '/cargo-regimes', 'List cargo regimes', 'masters.view',
   resp='array:CargoRegime', site=False)

crud('Masters', '/parties', 'Party', 'partyId', 'masters.view', 'masters.local.edit', site=False,
     query=['role', 'source', 'syncStatus'],
     )
op('Masters', 'post', '/parties:provisional', 'Create a provisional party (pending NG)',
   'masters.local.edit', req='Party', resp='Party', site=False, status=201,
   desc='For a customer not yet in NG. It is usable at once and flagged PROVISIONAL until matched.')
op('Masters', 'post', '/parties/{partyId}:match', 'Match a provisional party to its NG record',
   'masters.local.edit', req='PartyMatch', resp='Party', site=False, status=200,
   desc='Re-points every reference from the provisional record to the NG record.')
op('Masters', 'get', '/parties/{partyId}/contacts', 'List party contacts', 'masters.view',
   resp='array:PartyContact', site=False)
op('Masters', 'put', '/parties/{partyId}/contacts', 'Replace party contacts', 'masters.local.edit',
   req='array:PartyContact', resp='array:PartyContact', site=False)
crud('Masters', '/trucks', 'Truck', 'truckId', 'masters.view', 'masters.local.edit', site=False,
     query=['plateNo', 'transporterPartyId'])
crud('Masters', '/drivers', 'Driver', 'driverId', 'masters.view', 'masters.local.edit', site=False,
     query=['licenceNo', 'transporterPartyId'])
crud('Masters', '/vessels', 'Vessel', 'vesselId', 'masters.view', 'masters.local.edit', site=False)
crud('Masters', '/ports', 'Port', 'portId', 'masters.view', 'admin.config.manage', site=False)
crud('Masters', '/commodities', 'Commodity', 'commodityId', 'masters.view', 'admin.config.manage', site=False)
crud('Masters', '/equipment', 'Equipment', 'equipmentId', 'masters.view', 'admin.config.manage',
     noun='equipment item')

crud('Access', '/users', 'User', 'userId', 'admin.users.manage', 'admin.users.manage', site=False,
     create=False)
op('Access', 'post', '/users', 'Create a user (link an NG identity)', 'admin.users.manage',
   req='UserCreate', resp='User', site=False)
op('Access', 'post', '/users/{userId}/roles', 'Grant a role at a site', 'admin.roles.manage',
   req='RoleGrant', resp='User', site=False, status=200)
op('Access', 'delete', '/users/{userId}/roles/{userRoleId}', 'Revoke a role', 'admin.roles.manage',
   site=False)
crud('Access', '/roles', 'Role', 'roleId', 'admin.roles.manage', 'admin.roles.manage', site=False)
op('Access', 'put', '/roles/{roleId}/permissions', 'Replace a role\'s permissions', 'admin.roles.manage',
   req='array:RolePermission', resp='array:RolePermission', site=False)
op('Access', 'get', '/permissions', 'List permissions', 'admin.roles.manage', resp='array:Permission',
   site=False, query=['moduleCode'])
op('Access', 'get', '/devices', 'List registered devices', 'admin.device.manage', resp='page:Device')
op('Access', 'post', '/devices', 'Register a device (gate tablet, handheld, gate agent)',
   'admin.device.manage', req='Device', resp='Device')
op('Access', 'post', '/devices/{deviceId}:revoke', 'Revoke a device', 'admin.device.manage',
   req='ReasonRequest', resp='Device', status=200,
   desc='Revoked devices cannot sync their offline queue; queued items are kept for review.')

crud('Documents', '/document-types', 'DocumentType', 'documentTypeId', 'masters.view',
     'admin.config.manage', site=False)
op('Documents', 'post', '/documents', 'Upload a document', None, req='DocumentUpload',
   req_type='multipart/form-data', resp='Document',
   desc='Permission is that of the entity it is attached to. Files are virus-scanned; '
        'status stays PENDING_SCAN until clean.')
op('Documents', 'get', '/documents', 'List documents for an entity', None, resp='array:Document',
   query=['entityName!', 'entityId!', 'documentTypeCode'])
op('Documents', 'get', '/documents/{documentId}', 'Get document metadata', None, resp='Document')
op('Documents', 'get', '/documents/{documentId}/content', 'Download the file', None,
   resp=('raw', {'type': 'string', 'contentMediaType': 'application/octet-stream'}),
   resp_type='application/octet-stream')
op('Documents', 'delete', '/documents/{documentId}', 'Void a document', None,
   desc='Soft delete with reason (query parameter); the file is retained for audit.', query=['reason!'])

op('Audit', 'get', '/audit-log', 'Search the audit trail', 'admin.audit.view', resp='page:AuditEntry',
   query=['entityName', 'entityId', 'userSub', 'from', 'to'])
op('Audit', 'get', '/audit-log/{entityName}/{entityId}', 'Audit history of one record', None,
   resp='page:AuditEntry', desc='Requires view permission on the entity.')

op('Sync', 'get', '/sync/status', 'Master sync and outbox status', 'admin.config.manage',
   resp='SyncStatus', site=False)
op('Sync', 'post', '/sync/{masterCode}:run', 'Run a master sync now', 'admin.config.manage',
   resp='SyncStatus', site=False, status=202, desc='masterCode: PARTY, TRUCK, DRIVER, VESSEL or ALL.')

# ================================================================== M1 Inbound operations
tag('Vessel calls', 'Vessel calls with discharge dates (storage clock start).', 'M1')
tag('Manifests', 'Manifest import, line review and apply.', 'M1')
tag('Consignments', 'Bills of lading / bookings and their lines.', 'M1')
tag('Units', 'Cargo units, stays, the one-search and the timeline.', 'M1')
tag('Gate', 'Truck visits, checkpoints and the gate queue. Works offline via the PWA queue.', 'M1')
tag('Inspections', 'Templates, damage codes, inspections and findings.', 'M1')
tag('Yard', 'Yard map, occupancy, allocation, move orders, moves.', 'M1')
tag('Weighbridge', 'Weighing tickets and tolerance checks.', 'M1')
tag('Keys', 'Vehicle key custody (ICDV).', 'M1')

crud('Vessel calls', '/vessel-calls', 'VesselCall', 'vesselCallId', 'consignment.view',
     'consignment.edit', site=False, query=['vesselId', 'from', 'to'])

op('Manifests', 'post', '/manifests', 'Upload a manifest file', 'manifest.import', req='ManifestUpload',
   req_type='multipart/form-data', resp='Manifest',
   desc='Parsing runs in the background; poll the manifest or listen for the socket event.')
op('Manifests', 'get', '/manifests', 'List manifests', 'manifest.import', resp='page:Manifest',
   query=['vesselCallId', 'status'])
op('Manifests', 'get', '/manifests/{manifestId}', 'Get a manifest', 'manifest.import', resp='Manifest')
op('Manifests', 'get', '/manifests/{manifestId}/lines', 'List manifest lines with validation results',
   'manifest.import', resp='page:ManifestLine', query=['hasErrors'])
op('Manifests', 'patch', '/manifests/{manifestId}/lines/{manifestLineId}', 'Correct a manifest line',
   'manifest.import', req='ManifestLine', resp='ManifestLine')
op('Manifests', 'post', '/manifests/{manifestId}:apply', 'Apply manifest (create consignments and expected units)',
   'manifest.import', req='ManifestApplyRequest', resp='ManifestApplyResult', status=200, idem='required')
op('Manifests', 'post', '/manifests/{manifestId}:cancel', 'Cancel an unapplied manifest',
   'manifest.import', req='ReasonRequest', resp='Manifest', status=200)

crud('Consignments', '/consignments', 'Consignment', 'consignmentId', 'consignment.view',
     'consignment.edit', query=['blNo', 'vesselCallId', 'consigneePartyId', 'agentPartyId', 'flow'])
op('Consignments', 'get', '/consignments/{consignmentId}/lines', 'List consignment lines',
   'consignment.view', resp='array:ConsignmentLine')
op('Consignments', 'put', '/consignments/{consignmentId}/lines', 'Replace consignment lines',
   'consignment.edit', req='array:ConsignmentLine', resp='array:ConsignmentLine')
op('Consignments', 'get', '/consignments/{consignmentId}/units', 'List units of a consignment',
   'consignment.view', resp='page:UnitSummary')

op('Units', 'get', '/search', 'One search across units, consignments, visits, invoices and parties',
   'consignment.view', resp='SearchResult', query=['q!', 'limit'],
   desc='Accepts container no., VIN, plate, BL, invoice, release order or customer name; results are grouped and permission-filtered.')
op('Units', 'get', '/units', 'Search units at the site', 'consignment.view', resp='page:UnitSummary',
   query=['q', 'category', 'physicalStatus', 'customsStatus', 'billingStatus', 'releaseStatus',
          'consignmentId', 'blockId', 'hasHold', 'dwellDaysMin', 'flow'])
op('Units', 'post', '/units', 'Create an expected unit manually', 'consignment.edit', req='CargoUnit',
   resp='UnitStay', desc='For units not on a manifest. The identity is validated first.')
op('Units', 'get', '/units/{unitStayId}', 'Get a unit stay (the unit card)', 'consignment.view',
   resp='UnitStay', desc='Includes the four status tracks, holds, location and storage clock.')
op('Units', 'patch', '/units/{unitStayId}', 'Update a unit stay', 'consignment.edit', req='UnitStay',
   resp='UnitStay')
op('Units', 'get', '/units/{unitStayId}/timeline', 'Unit timeline', 'consignment.view',
   resp='page:TimelineEntry', desc='Every event on the stay in time order: gate, moves, inspections, holds, customs, billing, release.')
op('Units', 'get', '/cargo-units/{cargoUnitId}/stays', 'History of stays for a physical unit',
   'consignment.view', resp='array:UnitSummary', site=False)

op('Gate', 'post', '/truck-visits', 'Announce a truck visit', 'gate.visit.checkin', req='TruckVisitCreate',
   resp='TruckVisit', idem='required',
   desc='Pre-announcement by the agent/transporter or registration at the outer gate. Returns a pass token for the QR.')
op('Gate', 'get', '/truck-visits', 'Gate queue and visit search', 'gate.visit.checkin',
   resp='page:TruckVisit', query=['status', 'visitTypeCode', 'checkpointCode', 'plateNo', 'from', 'to'])
op('Gate', 'get', '/truck-visits/{truckVisitId}', 'Get a truck visit', 'gate.visit.checkin', resp='TruckVisit')
op('Gate', 'get', '/gate-passes/{passToken}', 'Find a visit by its gate pass QR', 'gate.visit.checkin',
   resp='TruckVisit')
op('Gate', 'post', '/truck-visits/{truckVisitId}/checkpoint-events', 'Pass a checkpoint',
   'gate.visit.checkin', req='CheckpointPassRequest', resp='CheckpointResult', status=200, idem='required',
   desc='Runs the checks for that checkpoint (identity, documents, release engine at OUT). '
        'Offline events carry isOffline and occurredAt and are reconciled on sync. Outbound checkpoints need gate.visit.checkout.')
op('Gate', 'get', '/truck-visits/{truckVisitId}/checkpoint-events', 'List checkpoint events',
   'gate.visit.checkin', resp='array:CheckpointEvent')
op('Gate', 'post', '/truck-visits/{truckVisitId}/units', 'Add a unit to a visit', 'gate.visit.checkin',
   req='VisitUnitPlan', resp='VisitUnit')
op('Gate', 'delete', '/truck-visits/{truckVisitId}/units/{visitUnitId}', 'Remove a planned unit',
   'gate.visit.checkin')
op('Gate', 'post', '/truck-visits/{truckVisitId}/units/{visitUnitId}:complete',
   'Complete drop-off or pick-up of a unit', 'gate.visit.checkin', req='VisitUnitComplete',
   resp='VisitUnit', status=200, idem='required', desc='For lots, lotQty records a partial delivery.')
op('Gate', 'post', '/truck-visits/{truckVisitId}:cancel', 'Cancel a visit', 'gate.visit.checkin',
   req='ReasonRequest', resp='TruckVisit', status=200)
op('Gate', 'post', '/truck-visits/{truckVisitId}/gate-pass:print', 'Print the gate pass',
   'gate.pass.print', resp='PrintResult', status=200)

crud('Inspections', '/inspection-templates', 'InspectionTemplate', 'inspectionTemplateId',
     'inspection.perform', 'admin.config.manage', site=False, query=['category'])
crud('Inspections', '/damage-codes', 'DamageCode', 'damageCodeId', 'inspection.perform',
     'admin.config.manage', site=False)
op('Inspections', 'post', '/inspections', 'Start an inspection', 'inspection.perform', req='Inspection',
   resp='Inspection', idem='required')
op('Inspections', 'get', '/inspections', 'List inspections', 'inspection.perform', resp='page:Inspection',
   query=['unitStayId', 'status', 'kind', 'from', 'to'])
op('Inspections', 'get', '/inspections/{inspectionId}', 'Get an inspection', 'inspection.perform',
   resp='Inspection')
op('Inspections', 'put', '/inspections/{inspectionId}/results', 'Save checklist results',
   'inspection.perform', req='array:InspectionResult', resp='array:InspectionResult')
op('Inspections', 'post', '/inspections/{inspectionId}/findings', 'Add a damage finding',
   'inspection.perform', req='InspectionFinding', resp='InspectionFinding',
   desc='Photos are uploaded via /documents with entityName=inspection_finding.')
op('Inspections', 'delete', '/inspections/{inspectionId}/findings/{inspectionFindingId}',
   'Remove a finding', 'inspection.perform')
op('Inspections', 'post', '/inspections/{inspectionId}:complete', 'Complete an inspection (sign)',
   'inspection.perform', req='InspectionComplete', resp='Inspection', status=200, idem='required',
   desc='Signature on screen or reference to a scanned paper form, per the site signature mode.')
op('Inspections', 'post', '/inspections/{inspectionId}:approve', 'Approve major damage',
   'inspection.damage.approve', resp='Inspection', status=200)

op('Yard', 'get', '/yard/map', 'Yard map for a level or block', 'yard.map.view', resp='array:YardBlockView',
   query=['levelNo', 'blockId', 'overlay'],
   desc='overlay: none, dwell, holds, customs, billing, reefer, dg, forecast. Geometry plus slot occupancy.')
op('Yard', 'get', '/yard/blocks/{blockId}/slots', 'Slots of a block with units', 'yard.map.view',
   resp='array:SlotView')
op('Yard', 'get', '/yard/occupancy', 'Occupancy summary', 'yard.map.view', resp='OccupancySummary',
   query=['groupBy'])
op('Yard', 'post', '/yard/suggestions', 'Suggest slots for a unit', 'yard.allocate',
   req='AllocationSuggestRequest', resp='AllocationSuggestion', status=200,
   desc='Rules engine in Phase 1; ML ranking in Phase 2. Every suggestion is logged.')
op('Yard', 'post', '/move-orders', 'Create a move order', 'yard.allocate', req='MoveOrder', resp='MoveOrder')
op('Yard', 'get', '/move-orders', 'Move order list (driver/handheld view)', 'yard.move.execute',
   resp='page:MoveOrder', query=['status', 'equipmentId', 'mine', 'truckVisitId'])
op('Yard', 'get', '/move-orders/{moveOrderId}', 'Get a move order', 'yard.move.execute', resp='MoveOrder')
op('Yard', 'post', '/move-orders/{moveOrderId}:assign', 'Assign equipment and operator', 'yard.allocate',
   req='MoveAssign', resp='MoveOrder', status=200)
op('Yard', 'post', '/move-orders/{moveOrderId}:start', 'Start a move', 'yard.move.execute',
   resp='MoveOrder', status=200, idem='required')
op('Yard', 'post', '/move-orders/{moveOrderId}:complete', 'Complete a move', 'yard.move.execute',
   req='MoveComplete', resp='MoveOrder', status=200, idem='required',
   desc='Placing outside the suggested slot needs a reason; an occupied or blocked slot needs yard.move.override.')
op('Yard', 'post', '/move-orders/{moveOrderId}:cancel', 'Cancel a move order', 'yard.allocate',
   req='ReasonRequest', resp='MoveOrder', status=200)
op('Yard', 'get', '/yard-moves', 'Move history', 'yard.map.view', resp='page:YardMove',
   query=['unitStayId', 'from', 'to', 'equipmentId'])

op('Weighbridge', 'post', '/weighings', 'Record a weighing ticket', 'weighbridge.ticket', req='Weighing',
   resp='Weighing', idem='required', desc='Out-of-tolerance tickets need weighbridge.override (approval).')
op('Weighbridge', 'get', '/weighings', 'List weighings', 'weighbridge.ticket', resp='page:Weighing',
   query=['truckVisitId', 'unitStayId', 'from', 'to', 'withinTolerance'])
op('Weighbridge', 'get', '/weighings/{weighingId}', 'Get a weighing', 'weighbridge.ticket', resp='Weighing')

op('Keys', 'get', '/keys', 'List key custody records', 'yard.key.custody', resp='page:KeyCustody',
   query=['unitStayId', 'keyTagNo', 'status'])
op('Keys', 'post', '/keys', 'Register keys received', 'yard.key.custody', req='KeyCustody', resp='KeyCustody')
op('Keys', 'post', '/keys/{keyCustodyId}/movements', 'Record a key movement', 'yard.key.custody',
   req='KeyMovement', resp='KeyCustody', status=200, idem='required')
op('Keys', 'get', '/keys/{keyCustodyId}/movements', 'Key movement history', 'yard.key.custody',
   resp='array:KeyMovement')

# ================================================================== M2 Control
tag('Customs', 'Customs references and examinations.', 'M2')
tag('Holds', 'Holds as overlays on stays; place and lift with reasons.', 'M2')
tag('Release', 'Release orders and the eight-condition release engine.', 'M2')
tag('Approvals', 'Maker-checker approvals, policies and delegations.', 'M2')
tag('Exceptions', 'Exception cases with assignment, comments and resolution.', 'M2')

op('Customs', 'get', '/customs/ref-types', 'Customs reference types for the country pack',
   'consignment.view', resp='array:CustomsRefType', site=False)
op('Customs', 'post', '/customs/refs', 'Record a customs reference', 'customs.ref.edit', req='CustomsRef',
   resp='CustomsRef', desc='May change the customs status of the linked stays (e.g. release sets CLEARED).')
op('Customs', 'get', '/customs/refs', 'List customs references', 'consignment.view', resp='page:CustomsRef',
   query=['consignmentId', 'unitStayId', 'refTypeCode', 'refNo'])
op('Customs', 'get', '/customs/refs/{customsRefId}', 'Get a customs reference', 'consignment.view',
   resp='CustomsRef')
op('Customs', 'patch', '/customs/refs/{customsRefId}', 'Update a customs reference', 'customs.ref.edit',
   req='CustomsRef', resp='CustomsRef')
op('Customs', 'post', '/customs/refs/{customsRefId}:cancel', 'Cancel a customs reference',
   'customs.ref.edit', req='ReasonRequest', resp='CustomsRef', status=200)
op('Customs', 'post', '/exams', 'Schedule an examination', 'customs.exam.record', req='Exam', resp='Exam')
op('Customs', 'get', '/exams', 'List examinations', 'consignment.view', resp='page:Exam',
   query=['status', 'date', 'unitStayId'])
op('Customs', 'post', '/exams/{examId}:complete', 'Record the examination result', 'customs.exam.record',
   req='ExamComplete', resp='Exam', status=200)

crud('Holds', '/hold-types', 'HoldType', 'holdTypeId', 'consignment.view', 'admin.config.manage', site=False)
op('Holds', 'post', '/holds', 'Place holds on one or more stays', 'customs.hold.place', req='HoldPlace',
   resp='array:Hold', desc='The permission checked is the hold type\'s own place permission.')
op('Holds', 'get', '/holds', 'List holds', 'consignment.view', resp='page:Hold',
   query=['unitStayId', 'holdTypeCode', 'status', 'placedBy'])
op('Holds', 'get', '/holds/{holdId}', 'Get a hold', 'consignment.view', resp='Hold')
op('Holds', 'post', '/holds/{holdId}:lift', 'Lift a hold', 'customs.hold.lift', req='HoldLift',
   resp='HoldLiftResult', status=200,
   desc='Hold types flagged for approval create an approval request instead of lifting at once.')

op('Release', 'get', '/release-conditions', 'The release conditions', 'consignment.view',
   resp='array:ReleaseCondition', site=False)
crud('Release', '/release-rules', 'ReleaseRule', 'releaseRuleId', 'consignment.view', 'admin.config.manage',
     query=['flow', 'category'])
op('Release', 'post', '/release-orders', 'Request a release order', 'release.issue', req='ReleaseOrderCreate',
   resp='ReleaseOrder', idem='required')
op('Release', 'get', '/release-orders', 'List release orders', 'consignment.view', resp='page:ReleaseOrder',
   query=['status', 'consignmentId', 'unitStayId', 'validOn'])
op('Release', 'get', '/release-orders/{releaseOrderId}', 'Get a release order', 'consignment.view',
   resp='ReleaseOrder')
op('Release', 'get', '/release-qr/{qrToken}', 'Find a release order by its QR', 'gate.visit.checkout',
   resp='ReleaseOrder')
op('Release', 'post', '/release-orders/{releaseOrderId}:evaluate', 'Evaluate release conditions',
   'consignment.view', resp='ReleaseEvaluation', status=200,
   desc='Runs IDENTITY, RELEASE_VALID, NO_HOLD, CUSTOMS, COMMERCIAL, COLLECTOR, KEYS and PHYSICAL per unit, read-only.')
op('Release', 'post', '/release-orders/{releaseOrderId}:approve', 'Approve and issue the release order',
   'release.issue', req='ReleaseApprove', resp='ReleaseOrder', status=200, idem='required',
   desc='Overriding a failed condition needs release.exception.approve and a reason (maker-checker).')
op('Release', 'post', '/release-orders/{releaseOrderId}:cancel', 'Cancel a release order', 'release.issue',
   req='ReasonRequest', resp='ReleaseOrder', status=200)
op('Release', 'post', '/release-orders/{releaseOrderId}:revalidate', 'Extend validity after further payment',
   'release.issue', req='ReleaseRevalidate', resp='ReleaseRevalidateResult', status=200,
   desc='Validity runs to the paid-through date; extending re-rates storage first.')
op('Release', 'post', '/release-orders/{releaseOrderId}/units:change', 'Add or remove units',
   'release.issue', req='ReleaseUnitsChange', resp='ReleaseOrder', status=200)
op('Release', 'post', '/gate-out-checks', 'Check whether units may leave', 'gate.visit.checkout',
   req='GateOutCheckRequest', resp='array:ReleaseCheck', status=200)
op('Release', 'get', '/units/{unitStayId}/gate-out-explanation', 'Explain why a unit can or cannot leave',
   'consignment.view', resp='GateOutExplanation',
   desc='Plain-language reasons per condition with the action that clears each one. Used by the gate screen and Aiva.')

op('Approvals', 'get', '/approvals', 'Approval inbox', None, resp='page:ApprovalRequest',
   query=['box', 'status', 'permissionCode'], desc='box: mine (to decide), requested (by me), all (with permission).')
op('Approvals', 'get', '/approvals/{approvalRequestId}', 'Get an approval request', None,
   resp='ApprovalRequest')
op('Approvals', 'post', '/approvals/{approvalRequestId}:decide', 'Approve or reject', None,
   req='ApprovalDecision', resp='ApprovalRequest', status=200, idem='required',
   desc='The requester can never approve their own request. Needs APPR on the request\'s permission within the limit.')
op('Approvals', 'post', '/approvals/{approvalRequestId}:cancel', 'Withdraw a request', None,
   req='ReasonRequest', resp='ApprovalRequest', status=200)
crud('Approvals', '/approval-policies', 'ApprovalPolicy', 'approvalPolicyId', 'admin.config.manage',
     'admin.config.manage', site=False, query=['permissionCode'])
op('Approvals', 'get', '/delegations', 'List delegations', None, resp='page:Delegation', query=['mine'])
op('Approvals', 'post', '/delegations', 'Create a delegation (cover during leave)', None,
   req='Delegation', resp='Delegation', desc='Only permissions the delegator holds; time-boxed.')
op('Approvals', 'post', '/delegations/{delegationId}:revoke', 'Revoke a delegation', None,
   resp='Delegation', status=200)

crud('Exceptions', '/exception-types', 'ExceptionType', 'exceptionTypeId', 'exception.view',
     'admin.config.manage', site=False)
crud('Exceptions', '/resolution-codes', 'ResolutionCode', 'resolutionCodeId', 'exception.view',
     'admin.config.manage', site=False)
op('Exceptions', 'post', '/exceptions', 'Open an exception case', 'exception.manage', req='ExceptionCase',
   resp='ExceptionCase')
op('Exceptions', 'get', '/exceptions', 'List exception cases', 'exception.view', resp='page:ExceptionCase',
   query=['status', 'severity', 'typeCode', 'assignee', 'overdue', 'entityName', 'entityId'])
op('Exceptions', 'get', '/exceptions/{exceptionCaseId}', 'Get an exception case', 'exception.view',
   resp='ExceptionCase')
op('Exceptions', 'post', '/exceptions/{exceptionCaseId}:assign', 'Assign a case', 'exception.manage',
   req='ExceptionAssign', resp='ExceptionCase', status=200)
op('Exceptions', 'get', '/exceptions/{exceptionCaseId}/comments', 'List comments', 'exception.view',
   resp='array:ExceptionComment')
op('Exceptions', 'post', '/exceptions/{exceptionCaseId}/comments', 'Add a comment', 'exception.view',
   req='ExceptionComment', resp='ExceptionComment')
op('Exceptions', 'post', '/exceptions/{exceptionCaseId}:resolve', 'Resolve a case', 'exception.manage',
   req='ExceptionResolve', resp='ExceptionCase', status=200)
op('Exceptions', 'post', '/exceptions/{exceptionCaseId}:close', 'Close a resolved case', 'exception.manage',
   resp='ExceptionCase', status=200)
op('Exceptions', 'post', '/exceptions/{exceptionCaseId}:reopen', 'Reopen a case', 'exception.manage',
   req='ReasonRequest', resp='ExceptionCase', status=200)

# ================================================================== M3 Commercial
tag('Finance setup', 'Periods, GL mapping, exchange rates, tax codes, charge codes, payment channels.', 'M3')
tag('Tariffs', 'Tariffs with versioned rules and slabs; rating preview.', 'M3')
tag('Charges', 'Billable events, charges and waivers.', 'M3')
tag('Invoicing', 'Proformas, invoices, credit and debit notes, fiscal receipts.', 'M3')
tag('Cashier', 'Cashier shifts, payments, allocations, refunds.', 'M3')
tag('Disbursements', 'Charges paid on behalf of the customer (port, shipping line, customs).', 'M3')
tag('Accounting', 'GL postings to NG and customer statements.', 'M3')

op('Finance setup', 'get', '/accounting-periods', 'List accounting periods', 'finance.period.close',
   resp='array:AccountingPeriod', site=False, query=['companyId', 'year'])
op('Finance setup', 'post', '/accounting-periods/{accountingPeriodId}:close', 'Close a period',
   'finance.period.close', resp='AccountingPeriod', site=False, status=200)
op('Finance setup', 'post', '/accounting-periods/{accountingPeriodId}:reopen', 'Reopen a period',
   'finance.period.close', req='ReasonRequest', resp='AccountingPeriod', site=False, status=200)
op('Finance setup', 'get', '/gl-settings', 'GL account mapping', 'finance.period.close', resp='array:GlSetting',
   site=False, query=['companyId'])
op('Finance setup', 'put', '/gl-settings', 'Replace GL account mapping', 'finance.period.close',
   req='array:GlSetting', resp='array:GlSetting', site=False, query=['companyId!'])
op('Finance setup', 'get', '/exchange-rates', 'List exchange rates', 'billing.rates.view',
   resp='page:ExchangeRate', site=False, query=['fromCurrency', 'toCurrency', 'from', 'to'])
op('Finance setup', 'get', '/exchange-rates/effective', 'Rate in force on a date', 'billing.rates.view',
   resp='ExchangeRate', site=False, query=['fromCurrency!', 'toCurrency!', 'onDate'])
op('Finance setup', 'post', '/exchange-rates', 'Enter an exchange rate (daily or monthly)',
   'finance.exchange_rate.edit', req='ExchangeRate', resp='ExchangeRate', site=False, status=201)
op('Finance setup', 'patch', '/exchange-rates/{exchangeRateId}', 'Correct an unused exchange rate',
   'finance.exchange_rate.edit', req='ExchangeRate', resp='ExchangeRate', site=False,
   desc='Rejected (409) once a posted document used the rate.')
crud('Finance setup', '/tax-codes', 'TaxCode', 'taxCodeId', 'billing.rates.view', 'admin.config.manage',
     site=False, query=['countryCode'])
crud('Finance setup', '/charge-codes', 'ChargeCode', 'chargeCodeId', 'billing.rates.view',
     'billing.tariff.change', site=False)
crud('Finance setup', '/payment-channels', 'PaymentChannel', 'paymentChannelId', 'billing.rates.view',
     'admin.config.manage')

crud('Tariffs', '/tariffs', 'Tariff', 'tariffId', 'billing.rates.view', 'billing.tariff.change',
     query=['status', 'partyId', 'effectiveOn'])
op('Tariffs', 'get', '/tariffs/{tariffId}/rules', 'List tariff rules', 'billing.rates.view',
   resp='array:TariffRule')
op('Tariffs', 'put', '/tariffs/{tariffId}/rules', 'Replace tariff rules (draft only)', 'billing.tariff.change',
   req='array:TariffRule', resp='array:TariffRule')
op('Tariffs', 'post', '/tariffs/{tariffId}:submit', 'Submit a draft tariff for approval',
   'billing.tariff.change', resp='Tariff', status=200)
op('Tariffs', 'post', '/tariffs/{tariffId}:new-version', 'Create a new draft version',
   'billing.tariff.change', req='TariffNewVersion', resp='Tariff', status=201)
op('Tariffs', 'post', '/rating/preview', 'Preview charges for a unit or consignment up to a date',
   'billing.rates.view', req='RatingPreviewRequest', resp='RatingPreview', status=200,
   desc='Read-only. Shows free days, slabs, holidays counted, rate and exchange rate used per line.')

op('Charges', 'get', '/billable-events', 'List billable events', 'billing.invoice.view',
   resp='page:BillableEvent', query=['unitStayId', 'consignmentId', 'status', 'chargeCode'])
op('Charges', 'post', '/billable-events:manual', 'Add a manual charge', 'billing.invoice.create',
   req='ManualChargeRequest', resp='BillableEvent', status=201)
op('Charges', 'get', '/charges', 'Uninvoiced and invoiced charges', 'billing.invoice.view', resp='page:Charge',
   query=['billToPartyId', 'consignmentId', 'unitStayId', 'status'])
op('Charges', 'post', '/charges/{chargeId}:waive', 'Request a waiver or discount', 'billing.waiver',
   req='WaiverRequest', resp='Charge', status=200,
   desc='Above the user\'s limit this creates an approval request (exception-based).')
op('Charges', 'post', '/free-day-extensions', 'Extend free days for a stay or consignment',
   'billing.freeday.extend', req='WaiverRequest', resp='ApprovalRequest', status=201)

op('Invoicing', 'post', '/proformas', 'Create a proforma', 'billing.invoice.create', req='ProformaCreate',
   resp='Invoice')
op('Invoicing', 'post', '/invoices', 'Create a draft invoice', 'billing.invoice.create', req='InvoiceCreate',
   resp='Invoice')
op('Invoicing', 'post', '/invoices:from-proforma', 'Convert a proforma to an invoice', 'billing.invoice.create',
   req='InvoiceFromProforma', resp='Invoice', status=201)
op('Invoicing', 'get', '/invoices', 'List invoices, proformas and notes', 'billing.invoice.view',
   resp='page:Invoice', query=['docKind', 'status', 'billToPartyId', 'consignmentId', 'from', 'to',
                               'unpaid', 'fiscalStatus'])
op('Invoicing', 'get', '/invoices/{invoiceId}', 'Get an invoice', 'billing.invoice.view', resp='Invoice')
op('Invoicing', 'patch', '/invoices/{invoiceId}', 'Edit a draft', 'billing.invoice.create', req='Invoice',
   resp='Invoice')
op('Invoicing', 'post', '/invoices/{invoiceId}:post', 'Post an invoice', 'billing.invoice.post',
   resp='Invoice', status=200, idem='required',
   desc='Assigns the number, freezes the exchange rate, queues the fiscal receipt and the GL posting.')
op('Invoicing', 'post', '/invoices/{invoiceId}:cancel', 'Cancel a draft or proforma', 'billing.invoice.create',
   req='ReasonRequest', resp='Invoice', status=200, desc='Posted invoices are reversed by a credit note.')
op('Invoicing', 'get', '/invoices/{invoiceId}/pdf', 'Invoice PDF', 'billing.invoice.view',
   resp=('raw', {'type': 'string', 'contentMediaType': 'application/pdf'}), resp_type='application/pdf',
   query=['copy'])
op('Invoicing', 'post', '/credit-notes', 'Issue a credit note', 'billing.creditnote', req='CreditNoteCreate',
   resp='Invoice', idem='required', desc='Above the limit this creates an approval request first.')
op('Invoicing', 'post', '/debit-notes', 'Issue a debit note', 'billing.invoice.post', req='CreditNoteCreate',
   resp='Invoice', idem='required')
op('Invoicing', 'get', '/fiscal-receipts', 'Fiscal receipt (VFD) log', 'billing.invoice.view',
   resp='page:FiscalReceipt', query=['status', 'from', 'to'])
op('Invoicing', 'post', '/fiscal-receipts/{fiscalReceiptId}:retry', 'Retry a failed fiscal receipt',
   'billing.invoice.post', resp='FiscalReceipt', status=200)

op('Cashier', 'post', '/cashier-shifts', 'Open a cashier shift', 'payment.record', req='CashierShift',
   resp='CashierShift')
op('Cashier', 'get', '/cashier-shifts', 'List shifts', 'payment.record', resp='page:CashierShift',
   query=['status', 'cashierSub', 'date'])
op('Cashier', 'get', '/cashier-shifts/current', 'My open shift', 'payment.record', resp='CashierShift')
op('Cashier', 'post', '/cashier-shifts/{cashierShiftId}:close', 'Close a shift with counted totals',
   'payment.record', req='ShiftClose', resp='CashierShift', status=200)
op('Cashier', 'post', '/cashier-shifts/{cashierShiftId}:approve', 'Approve a shift cash-up',
   'payment.cashup.approve', resp='CashierShift', status=200)
op('Cashier', 'post', '/payments', 'Record a payment', 'payment.record', req='Payment', resp='Payment',
   idem='required', desc='Cash needs an open shift. Bank and mobile money need the channel reference; duplicates are rejected.')
op('Cashier', 'get', '/payments', 'List payments', 'payment.record', resp='page:Payment',
   query=['partyId', 'channelCode', 'from', 'to', 'unallocated'])
op('Cashier', 'get', '/payments/{paymentId}', 'Get a payment', 'payment.record', resp='Payment')
op('Cashier', 'post', '/payments/{paymentId}:allocate', 'Allocate a payment to invoices', 'payment.record',
   req='AllocationRequest', resp='Payment', status=200, idem='required')
op('Cashier', 'post', '/payments/{paymentId}:reverse', 'Reverse a payment', 'payment.refund',
   req='ReasonRequest', resp='Payment', status=200)
op('Cashier', 'get', '/payments/{paymentId}/receipt', 'Payment receipt PDF', 'payment.record',
   resp=('raw', {'type': 'string', 'contentMediaType': 'application/pdf'}), resp_type='application/pdf')
op('Cashier', 'post', '/refunds', 'Request a refund', 'payment.refund', req='Refund', resp='Refund',
   desc='Refunds above USD 500 (seeded) need approval.')
op('Cashier', 'get', '/refunds', 'List refunds', 'payment.refund', resp='page:Refund', query=['status', 'partyId'])
op('Cashier', 'post', '/refunds/{refundId}:mark-paid', 'Mark a refund paid', 'payment.refund',
   req='RefundPaid', resp='Refund', status=200)

op('Disbursements', 'post', '/disbursements', 'Record a disbursement', 'finance.disbursement.record',
   req='Disbursement', resp='Disbursement')
op('Disbursements', 'get', '/disbursements', 'List disbursements', 'finance.disbursement.record',
   resp='page:Disbursement', query=['partyId', 'status', 'consignmentId'])
op('Disbursements', 'get', '/disbursements/{disbursementId}', 'Get a disbursement',
   'finance.disbursement.record', resp='Disbursement')
op('Disbursements', 'post', '/disbursements/{disbursementId}:write-off', 'Write off an unrecovered disbursement',
   'finance.disbursement.record', req='ReasonRequest', resp='Disbursement', status=200)

op('Accounting', 'get', '/gl-postings', 'GL postings to NG', 'finance.period.close', resp='page:GlPosting',
   query=['status', 'sourceKind', 'from', 'to'])
op('Accounting', 'post', '/gl-postings/{glPostingId}:retry', 'Retry a failed posting', 'finance.period.close',
   resp='GlPosting', status=200)
op('Accounting', 'get', '/statements/{partyId}', 'Customer statement with ageing', 'billing.invoice.view',
   resp='Statement', query=['from', 'to', 'currency'])
op('Accounting', 'get', '/statements/{partyId}/pdf', 'Customer statement PDF', 'billing.invoice.view',
   resp=('raw', {'type': 'string', 'contentMediaType': 'application/pdf'}), resp_type='application/pdf',
   query=['from', 'to', 'currency'])

# ================================================================== M4 Insight & pilot
tag('Dashboards', 'Control tower, role dashboards and KPIs.', 'M4')
tag('Reports', 'Report catalogue, runs, exports and saved reports.', 'M4')
tag('Notifications', 'In-app inbox, templates and routing rules.', 'M4')
tag('Printing', 'Print templates and logged printing with reprint watermark.', 'M4')
tag('Aiva', 'Aiva assistant on Claude: conversations (SSE), tools, feedback.', 'M4')

op('Dashboards', 'get', '/dashboards/control-tower', 'Control tower snapshot', 'dashboard.control_tower',
   resp='ControlTower', desc='Live updates arrive over the socket channel site:{siteId}:control-tower.')
op('Dashboards', 'get', '/dashboards/{dashboardCode}', 'Role dashboard (gate, yard, cashier, executive...)',
   None, resp='Dashboard', query=['date'])
op('Dashboards', 'get', '/kpis', 'KPI series for trend charts', 'dashboard.executive', resp='array:KpiSeries',
   query=['codes!', 'from!', 'to!', 'grain'])

op('Reports', 'get', '/reports', 'Report catalogue (filtered by permission)', None,
   resp='array:ReportDefinition', site=False)
op('Reports', 'post', '/reports/{reportCode}/runs', 'Run or export a report', None, req='ReportRunRequest',
   resp='ReportRun', status=202,
   desc='Small results return inline (status DONE); large ones run in the background. Every export is logged.')
op('Reports', 'get', '/report-runs/{reportRunId}', 'Get a report run', None, resp='ReportRun')
op('Reports', 'get', '/report-runs/{reportRunId}/file', 'Download the exported file', None,
   resp=('raw', {'type': 'string', 'contentMediaType': 'application/octet-stream'}),
   resp_type='application/octet-stream')
crud('Reports', '/saved-reports', 'SavedReport', 'savedReportId', None, None, delete=True,
     query=['reportCode'])

op('Notifications', 'get', '/notifications/inbox', 'My in-app notifications', None,
   resp='page:InboxNotification', site=False, query=['unread'])
op('Notifications', 'post', '/notifications/{notificationId}:read', 'Mark one read', None,
   resp='InboxNotification', site=False, status=200)
op('Notifications', 'post', '/notifications:read-all', 'Mark all read', None, site=False, status=204)
crud('Notifications', '/notification-templates', 'NotificationTemplate', 'notificationTemplateId',
     'admin.config.manage', 'admin.config.manage', site=False, query=['eventType', 'channel', 'languageCode'])
crud('Notifications', '/notification-rules', 'NotificationRule', 'notificationRuleId',
     'admin.config.manage', 'admin.config.manage', site=False, query=['eventType'])

crud('Printing', '/print-templates', 'PrintTemplate', 'printTemplateId', 'admin.config.manage',
     'admin.config.manage', site=False, query=['documentKind'])
op('Printing', 'post', '/print', 'Print a document (logged)', None, req='PrintRequest', resp='PrintResult',
   status=200, desc='Reprints need a reason and carry a watermark. Permission is that of the document printed.')

op('Aiva', 'get', '/aiva/conversations', 'My conversations', 'aiva.use', resp='page:AivaConversation')
op('Aiva', 'post', '/aiva/conversations', 'Start a conversation', 'aiva.use', req='AivaConversation',
   resp='AivaConversation', status=201)
op('Aiva', 'get', '/aiva/conversations/{aivaConversationId}/messages', 'Conversation messages', 'aiva.use',
   resp='array:AivaMessage')
op('Aiva', 'post', '/aiva/conversations/{aivaConversationId}/messages', 'Ask Aiva (streamed answer)',
   'aiva.use', req='AivaMessageRequest',
   resp=('raw', {'type': 'string', 'description': 'Server-sent events: token, tool_call, tool_result, '
                 'draft, done, error. The final done event carries the AivaMessage JSON.'}),
   resp_type='text/event-stream', status=200,
   desc='Aiva calls only read tools with the user\'s own permissions; "prepare" outputs a draft the user submits.')
op('Aiva', 'post', '/aiva/messages/{aivaMessageId}/feedback', 'Rate an answer', 'aiva.use',
   req='AivaFeedback', status=204)
op('Aiva', 'get', '/aiva/messages/{aivaMessageId}/tool-calls', 'Tool calls behind an answer', 'aiva.use',
   resp='array:AivaToolCall')
op('Aiva', 'get', '/aiva/tools', 'Tools available to the signed-in user', 'aiva.use',
   resp=('raw', {'type': 'array', 'items': {'type': 'object', 'additionalProperties': True}}),
   desc='Name, description and JSON input schema of each tool, filtered by permission.')

# ================================================================== M5 Depth (Phase 2)
tag('Appointments', 'Truck appointment slots and bookings.', 'M5')
tag('CFS', 'Stuffing, de-stuffing, tally and lot balances.', 'M5')
tag('Portal', 'Customer and agent portal: invitations and service requests.', 'M5')
tag('Reefer', 'Reefer plug sessions and temperature readings.', 'M5')
tag('Dangerous goods', 'IMO classes, segregation rules and DG lines.', 'M5')
tag('M&R', 'Repair codes and repair estimates for empty depots.', 'M5')
tag('Devices', 'ANPR, OCR, weighbridge, RFID, barrier and reefer IoT integrations.', 'M5')
tag('EDI', 'Inbound and outbound integration messages.', 'M5')

crud('Appointments', '/appointment-slot-rules', 'AppointmentSlotRule', 'appointmentSlotRuleId',
     'appointment.manage', 'appointment.manage', query=['visitTypeCode', 'weekday'])
op('Appointments', 'get', '/appointments/availability', 'Free capacity per slot', 'appointment.book',
   resp='AppointmentAvailability', query=['date!', 'visitTypeCode!'])
op('Appointments', 'post', '/appointments', 'Book an appointment', 'appointment.book', req='Appointment',
   resp='Appointment', idem='required')
op('Appointments', 'get', '/appointments', 'List appointments', 'appointment.book', resp='page:Appointment',
   query=['date', 'status', 'partyId', 'plateNo'])
op('Appointments', 'get', '/appointments/{appointmentId}', 'Get an appointment', 'appointment.book',
   resp='Appointment')
op('Appointments', 'post', '/appointments/{appointmentId}:cancel', 'Cancel an appointment', 'appointment.book',
   req='ReasonRequest', resp='Appointment', status=200)
op('Appointments', 'post', '/appointments/{appointmentId}:reschedule', 'Move to another slot',
   'appointment.book', req='Appointment', resp='Appointment', status=200)

crud('CFS', '/labour-contractors', 'LabourContractor', 'labourContractorId', 'cfs.job.manage',
     'cfs.job.manage', site=False)
op('CFS', 'post', '/handling-jobs', 'Plan a handling job', 'cfs.job.manage', req='HandlingJob', resp='HandlingJob')
op('CFS', 'get', '/handling-jobs', 'List handling jobs', 'cfs.job.manage', resp='page:HandlingJob',
   query=['status', 'jobKind', 'date', 'unitStayId'])
op('CFS', 'get', '/handling-jobs/{handlingJobId}', 'Get a handling job', 'cfs.job.manage', resp='HandlingJob')
op('CFS', 'patch', '/handling-jobs/{handlingJobId}', 'Update a planned job', 'cfs.job.manage',
   req='HandlingJob', resp='HandlingJob')
op('CFS', 'put', '/handling-jobs/{handlingJobId}/lines', 'Save tally lines', 'cfs.job.manage',
   req='array:HandlingJobLine', resp='array:HandlingJobLine')
op('CFS', 'post', '/handling-jobs/{handlingJobId}:start', 'Start a job', 'cfs.job.manage', resp='HandlingJob',
   status=200)
op('CFS', 'post', '/handling-jobs/{handlingJobId}:complete', 'Complete a job (sign tally)', 'cfs.job.manage',
   req='InspectionComplete', resp='HandlingJob', status=200, idem='required',
   desc='Creates lots for de-stuffed cargo. Shortages, excess or damage route to approval.')
op('CFS', 'post', '/handling-jobs/{handlingJobId}:approve', 'Approve a completed job', 'cfs.job.approve',
   resp='HandlingJob', status=200)
op('CFS', 'get', '/lots/{unitStayId}/balance', 'Lot balance and deliveries', 'consignment.view',
   resp='LotBalance')

op('Portal', 'post', '/portal/invitations', 'Invite a customer or agent user', 'portal.invite',
   req='PortalInvitation', resp='PortalInvitation', site=False)
op('Portal', 'get', '/portal/invitations', 'List invitations', 'portal.invite', resp='page:PortalInvitation',
   site=False, query=['status', 'partyId'])
op('Portal', 'post', '/portal/invitations/{invitationId}:revoke', 'Revoke an invitation', 'portal.invite',
   resp='PortalInvitation', site=False, status=200)
op('Portal', 'post', '/portal/invitations:accept', 'Accept an invitation', None, req='InvitationAccept',
   resp='Me', site=False, status=200, public=True,
   desc='Called after the invitee signs in through NG identity; links their identity to the party.')
op('Portal', 'post', '/service-requests', 'Submit a service request', 'portal.request.submit',
   req='ServiceRequest', resp='ServiceRequest')
op('Portal', 'get', '/service-requests', 'List service requests', 'portal.request.submit',
   resp='page:ServiceRequest', query=['status', 'requestKind', 'partyId'],
   desc='Portal users see only their own party\'s requests.')
op('Portal', 'get', '/service-requests/{serviceRequestId}', 'Get a service request', 'portal.request.submit',
   resp='ServiceRequest')
op('Portal', 'post', '/service-requests/{serviceRequestId}:respond', 'Respond to a service request',
   'portal.request.handle', req='ServiceRequestRespond', resp='ServiceRequest', status=200)

op('Reefer', 'post', '/reefer-sessions', 'Plug in a reefer', 'reefer.manage', req='ReeferSession',
   resp='ReeferSession', idem='required')
op('Reefer', 'get', '/reefer-sessions', 'Reefer monitor list', 'reefer.manage', resp='page:ReeferSession',
   query=['status', 'alarm', 'blockId'])
op('Reefer', 'get', '/reefer-sessions/{reeferSessionId}', 'Get a reefer session', 'reefer.manage',
   resp='ReeferSession')
op('Reefer', 'post', '/reefer-sessions/{reeferSessionId}:unplug', 'Unplug a reefer', 'reefer.manage',
   req='ReeferUnplug', resp='ReeferSession', status=200, idem='required')
op('Reefer', 'post', '/reefer-sessions/{reeferSessionId}/readings', 'Record a temperature reading',
   'reefer.manage', req='ReeferReading', resp='ReeferReading', idem='required')
op('Reefer', 'get', '/reefer-sessions/{reeferSessionId}/readings', 'Temperature log', 'reefer.manage',
   resp='array:ReeferReading')

op('Dangerous goods', 'get', '/imo-classes', 'IMO hazard classes', 'masters.view', resp='array:ImoClass',
   site=False)
op('Dangerous goods', 'get', '/segregation-rules', 'Segregation rules', 'masters.view',
   resp='array:SegregationRule', site=False)
op('Dangerous goods', 'put', '/segregation-rules', 'Replace segregation rules (load from IMDG Code)',
   'admin.config.manage', req='array:SegregationRule', resp='array:SegregationRule', site=False)
op('Dangerous goods', 'get', '/units/{unitStayId}/dg-lines', 'DG lines of a unit', 'consignment.view',
   resp='array:DgLine')
op('Dangerous goods', 'put', '/units/{unitStayId}/dg-lines', 'Replace DG lines of a unit', 'dg.manage',
   req='array:DgLine', resp='array:DgLine')

crud('M&R', '/repair-codes', 'RepairCode', 'repairCodeId', 'repair.estimate', 'admin.config.manage', site=False)
op('M&R', 'post', '/repair-estimates', 'Create a repair estimate (from inspection findings)',
   'repair.estimate', req='RepairEstimate', resp='RepairEstimate')
op('M&R', 'get', '/repair-estimates', 'List repair estimates', 'repair.estimate', resp='page:RepairEstimate',
   query=['status', 'linePartyId', 'unitStayId'])
op('M&R', 'get', '/repair-estimates/{repairEstimateId}', 'Get a repair estimate', 'repair.estimate',
   resp='RepairEstimate')
op('M&R', 'patch', '/repair-estimates/{repairEstimateId}', 'Edit a draft estimate', 'repair.estimate',
   req='RepairEstimate', resp='RepairEstimate')
op('M&R', 'post', '/repair-estimates/{repairEstimateId}:send', 'Send to the line', 'repair.estimate',
   resp='RepairEstimate', status=200)
op('M&R', 'post', '/repair-estimates/{repairEstimateId}:decision', 'Record the line\'s decision',
   'repair.estimate', req='EstimateDecision', resp='RepairEstimate', status=200)
op('M&R', 'post', '/repair-estimates/{repairEstimateId}:complete', 'Mark repairs done', 'repair.estimate',
   resp='RepairEstimate', status=200, desc='Creates billable events for approved lines by responsibility.')

crud('Devices', '/device-integrations', 'DeviceIntegration', 'deviceIntegrationId', 'device.configure',
     'device.configure', query=['integrationKind', 'gateLaneId'])
op('Devices', 'post', '/device-reads:ingest', 'Ingest device reads (gate agent)', None,
   req='DeviceReadIngest', resp='DeviceIngestResult', status=200, idem='required',
   desc='Called by the on-site gate agent with its device credential (scope device:ingest), not a user token.')
op('Devices', 'get', '/device-reads', 'List device reads', 'device.configure', resp='page:DeviceRead',
   query=['deviceIntegrationId', 'matchStatus', 'from', 'to'])
op('Devices', 'post', '/device-reads/{deviceReadId}:match', 'Match a read to a visit manually',
   'gate.visit.checkin', req='EntityLink', resp='DeviceRead', status=200)

op('EDI', 'get', '/integration-messages', 'Integration message log', 'integration.monitor',
   resp='page:IntegrationMessage', site=False,
   query=['partnerSystem', 'direction', 'status', 'messageType', 'from', 'to'])
op('EDI', 'get', '/integration-messages/{integrationMessageId}', 'Get a message', 'integration.monitor',
   resp='IntegrationMessage', site=False)
op('EDI', 'post', '/integration-messages/{integrationMessageId}:retry', 'Retry a failed message',
   'integration.monitor', resp='IntegrationMessage', site=False, status=200)
op('EDI', 'post', '/edi/inbound/{partnerCode}', 'Receive an inbound message (CODECO, COARRI, BAPLIE, customs...)',
   None, req=('raw', {'type': 'string'}), req_type='text/plain', resp='IntegrationMessage', site=False,
   status=202, idem='required',
   desc='Partner credential (scope edi:inbound). Duplicate messages return the original record.')

# ================================================================== M6 Intelligence (Phase 2)
tag('Intelligence', 'Model versions, dwell predictions, occupancy forecasts, suggestion log.', 'M6')

op('Intelligence', 'get', '/models', 'Model versions', 'admin.config.manage', resp='array:ModelVersion',
   site=False, query=['modelCode'])
op('Intelligence', 'post', '/models/{mlModelVersionId}:activate', 'Activate a model version',
   'admin.config.manage', resp='ModelVersion', site=False, status=200)
op('Intelligence', 'get', '/predictions/dwell', 'Dwell predictions', 'yard.map.view',
   resp='page:DwellPrediction', query=['unitStayId', 'exitBefore'])
op('Intelligence', 'get', '/forecasts/occupancy', 'Occupancy forecast', 'yard.map.view',
   resp='array:OccupancyForecast', query=['from!', 'to!', 'blockId'])
op('Intelligence', 'get', '/yard/suggestion-log', 'Allocation suggestions versus choices', 'yard.allocate',
   resp='page:YardSuggestionLog', query=['from', 'to', 'engine', 'overridden'])
op('Aiva', 'get', '/aiva/drafts', 'My Aiva drafts', 'aiva.use', resp='page:AivaDraft', query=['status'],
   ms='M6')
op('Aiva', 'post', '/aiva/drafts/{aivaDraftActionId}:submit', 'Submit an Aiva draft', 'aiva.use',
   req='AivaDraft', resp='AivaDraft', status=200, ms='M6', idem='required',
   desc='Re-checks the user\'s permission for the target action and runs it through the normal approval rules.')
op('Aiva', 'post', '/aiva/drafts/{aivaDraftActionId}:discard', 'Discard an Aiva draft', 'aiva.use',
   resp='AivaDraft', status=200, ms='M6')

# ------------------------------------------------------------------ query parameter catalogue
QP = {
    'q': ('string', 'Free-text search.'), 'isActive': ('boolean', 'Filter by active flag.'),
    'from': ('date-time', 'From (inclusive).'), 'to': ('date-time', 'To (exclusive).'),
    'date': ('date', 'Business date (site time zone).'), 'year': ('integer', None),
    'limit': ('integer', None), 'dryRun': ('boolean', None), 'reason': ('string', None),
    'onDate': ('date', None), 'effectiveOn': ('date', None), 'validOn': ('date', None),
    'exitBefore': ('date', None), 'weekday': ('integer', 'ISO weekday 1-7.'),
    'dwellDaysMin': ('integer', None), 'hasHold': ('boolean', None), 'hasErrors': ('boolean', None),
    'mine': ('boolean', None), 'overdue': ('boolean', None), 'unread': ('boolean', None),
    'unpaid': ('boolean', None), 'unallocated': ('boolean', None), 'alarm': ('boolean', None),
    'overridden': ('boolean', None), 'withinTolerance': ('boolean', None), 'isSlot': ('boolean', None),
    'copy': ('boolean', 'true prints a watermarked copy.'), 'levelNo': ('integer', None),
    'codes': ('csv', 'Comma-separated KPI codes.'), 'grain': ('enum:DAY|WEEK|MONTH', None),
    'box': ('enum:mine|requested|all', None),
    'overlay': ('enum:none|dwell|holds|customs|billing|reefer|dg|forecast', None),
    'groupBy': ('enum:site|block|area|category', None),
    'category': ('enum:CONTAINER|VEHICLE|LOT', None),
}
def qparam(spec):
    req = spec.endswith('!')
    name = spec.rstrip('!')
    t, d = QP.get(name, ('id' if name.endswith('Id') else 'string', None))
    if t == 'id':
        s = {'type': 'integer', 'format': 'int64'}
    elif t in ('integer', 'boolean', 'string'):
        s = {'type': t}
    elif t in ('date', 'date-time'):
        s = {'type': 'string', 'format': t}
    elif t == 'csv':
        s = {'type': 'string'}
    elif t.startswith('enum:'):
        s = {'type': 'string', 'enum': t[5:].split('|')}
    p = {'name': name, 'in': 'query', 'required': req, 'schema': s}
    if d:
        p['description'] = d
    return p

# ------------------------------------------------------------------ assembly
def body_schema(r):
    if isinstance(r, tuple) and r[0] == 'raw':
        return r[1]
    if r.startswith('page:'):
        n = r[5:]; REFS_USED.add(n)
        return {'type': 'object', 'required': ['items'],
                'properties': {'items': {'type': 'array', 'items': {'$ref': f'#/components/schemas/{n}'}},
                               'nextCursor': {'type': ['string', 'null'],
                                              'description': 'Pass as cursor for the next page; null at the end.'}}}
    if r.startswith('array:'):
        n = r[6:]; REFS_USED.add(n)
        return {'type': 'array', 'items': {'$ref': f'#/components/schemas/{n}'}}
    REFS_USED.add(r)
    return {'$ref': f'#/components/schemas/{r}'}

def path_param(name):
    is_str = name.endswith(('Token', 'Code')) or name in ('entityName',)
    s = {'type': 'string'} if is_str else {'type': 'integer', 'format': 'int64'}
    return {'name': name, 'in': 'path', 'required': True, 'schema': s}

ERR_STD = {
    '400': 'BadRequest', '401': 'Unauthorized', '403': 'Forbidden', '404': 'NotFound',
    '409': 'Conflict', '422': 'Unprocessable',
}

def build_paths(ops, err_extra=True):
    paths = OrderedDict()
    seen_ids = set()
    for o in ops:
        oid = _opid(o['method'], o['path'])
        assert oid not in seen_ids, f'duplicate operationId {oid}'
        seen_ids.add(oid)
        item = paths.setdefault(o['path'], OrderedDict())
        assert o['method'] not in item, f"duplicate {o['method']} {o['path']}"
        params = [path_param(n) for n in re.findall(r'\{(\w+)\}', o['path'])]
        if o['site']:
            params.append({'$ref': '#/components/parameters/SiteId'})
        if o['idem'] == 'required':
            params.append({'$ref': '#/components/parameters/IdempotencyKeyRequired'})
        elif o['idem'] == 'optional':
            params.append({'$ref': '#/components/parameters/IdempotencyKey'})
        if o['ifmatch']:
            params.append({'$ref': '#/components/parameters/IfMatch'})
        is_page = isinstance(o['resp'], str) and o['resp'].startswith('page:')
        if is_page:
            params += [{'$ref': '#/components/parameters/Cursor'}, {'$ref': '#/components/parameters/Limit'},
                       {'$ref': '#/components/parameters/Sort'}]
        params += [qparam(q) for q in o['query'] if not (is_page and q.rstrip('!') == 'limit')]
        desc = []
        if o['desc']:
            desc.append(o['desc'])
        desc.append(f"**Permission:** `{o['perm']}`" if o['perm'] else
                    '**Permission:** see description / entity permission')
        desc.append(f"**Milestone:** {o['ms']}")
        node = OrderedDict(tags=[o['tag']], operationId=oid, summary=o['summary'],
                           description='\n\n'.join(desc))
        if params:
            node['parameters'] = params
        if o['req']:
            node['requestBody'] = {'required': True,
                                   'content': {o['req_type']: {'schema': body_schema(o['req'])}}}
        resps = OrderedDict()
        st = str(o['status'])
        if o['resp'] is None:
            resps[st] = {'description': 'Done'}
        else:
            resps[st] = {'description': 'OK' if st == '200' else ('Created' if st == '201' else 'Accepted'),
                         'content': {o['resp_type']: {'schema': body_schema(o['resp'])}}}
            if o['method'] == 'post' and st == '201' and not (isinstance(o['resp'], tuple)):
                resps[st]['headers'] = {'Location': {'schema': {'type': 'string'}}}
        if err_extra:
            codes = ['400', '401', '403', '404']
            if o['method'] in ('post', 'put', 'patch', 'delete'):
                codes += ['409', '422']
            if o['ifmatch']:
                codes += ['412', '428']
            for c in codes:
                resps[c] = {'$ref': f'#/components/responses/{ERR_NAMES[c]}'}
        node['responses'] = resps
        if o['public']:
            node['security'] = [{'bearerAuth': []}]
        if o['path'] in ('/device-reads:ingest',):
            node['security'] = [{'deviceToken': []}]
        if o['path'].startswith('/edi/inbound'):
            node['security'] = [{'partnerToken': []}]
        node['x-milestone'] = o['ms']
        if o['perm']:
            node['x-permission'] = o['perm']
        item[o['method']] = node
    return paths

ERR_NAMES = {'400': 'BadRequest', '401': 'Unauthorized', '403': 'Forbidden', '404': 'NotFound',
             '409': 'Conflict', '412': 'PreconditionFailed', '422': 'Unprocessable', '428': 'PreconditionRequired'}
ERR_DESC = {
    '400': 'Malformed request or invalid parameter.',
    '401': 'Missing or expired token.',
    '403': 'No permission for this action at this site (code FORBIDDEN or APPROVAL_REQUIRED).',
    '404': 'Not found, or not visible to this user.',
    '409': 'State conflict, e.g. the unit already left or the period is closed. code tells which rule.',
    '412': 'logInst in If-Match is stale; reload and retry.',
    '422': 'Validation failed; errors lists each field.',
    '428': 'If-Match is required for this update.',
}

def components(schemas):
    params = OrderedDict(
        SiteId={'name': 'X-Site-Id', 'in': 'header', 'required': True,
                'description': 'Site the call acts on. Must be one of the user\'s sites from /me.',
                'schema': {'type': 'integer', 'format': 'int32'}},
        IdempotencyKey={'name': 'Idempotency-Key', 'in': 'header', 'required': False,
                        'description': 'Client-generated UUID. A retry with the same key returns the first result (kept 24 h).',
                        'schema': {'type': 'string', 'format': 'uuid'}},
        IdempotencyKeyRequired={'name': 'Idempotency-Key', 'in': 'header', 'required': True,
                                'description': 'Required: this command may be retried from the offline queue or a flaky network.',
                                'schema': {'type': 'string', 'format': 'uuid'}},
        IfMatch={'name': 'If-Match', 'in': 'header', 'required': True,
                 'description': 'Current logInst of the record (optimistic concurrency).',
                 'schema': {'type': 'string'}},
        Cursor={'name': 'cursor', 'in': 'query', 'required': False, 'schema': {'type': 'string'},
                'description': 'Opaque cursor from the previous page.'},
        Limit={'name': 'limit', 'in': 'query', 'required': False,
               'schema': {'type': 'integer', 'minimum': 1, 'maximum': 500, 'default': 50}},
        Sort={'name': 'sort', 'in': 'query', 'required': False, 'schema': {'type': 'string'},
              'description': 'Field name, prefix with - for descending, e.g. -createdAt.'},
    )
    responses = OrderedDict()
    for c, n in ERR_NAMES.items():
        responses[n] = {'description': ERR_DESC[c],
                        'content': {'application/problem+json': {'schema': {'$ref': '#/components/schemas/Problem'}}}}
    sec = OrderedDict(
        bearerAuth={'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT',
                    'description': 'Access token from the NG identity server (OIDC, PKCE). Audience: ng-icd-api.'},
        deviceToken={'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT',
                     'description': 'Client-credentials token of a registered gate agent; scope device:ingest.'},
        partnerToken={'type': 'apiKey', 'in': 'header', 'name': 'X-Partner-Key',
                      'description': 'Per-partner key for inbound EDI, rotated by the admin; IP allow-list applies.'},
    )
    return OrderedDict(schemas=schemas, parameters=params, responses=responses, securitySchemes=sec)

INTRO = """The REST API of DCC NG ICD (ICD, ICDV, CFS, empty depot and warehouse), both phases (M0-M6).

## Conventions
- **Base path** `/api/v1`, one deployment per region; the tenant comes from the token (`tenant` claim), never from the URL.
- **Site scope**: operational calls carry `X-Site-Id`. The server checks the user holds the permission at that site.
- **Permissions** use the codes in `m_permission`. Each operation shows its code in `x-permission`.
  An action above the user's limit returns `403` with code `APPROVAL_REQUIRED` and the approval request id,
  unless the endpoint itself creates the approval request (exception-based approvals).
- **Commands** are `POST /resource/{id}:verb`. Plain CRUD uses `GET/POST/PATCH`; masters are deactivated, never deleted.
- **Concurrency**: updates send the record's `logInst` in `If-Match`; a stale value gives `412`.
- **Idempotency**: commands send `Idempotency-Key` (UUID). It is required on gate, yard, payment, device
  and other edge commands that the offline queue may replay.
- **Offline**: queued gate and yard events carry `occurredAt` and `isOffline=true`; the server orders them by
  `occurredAt`, and anything that conflicts opens an exception case instead of failing silently.
- **Lists** use cursor paging: `?cursor=&limit=` returning `{items, nextCursor}`; `sort=-field`.
- **Money and decimals** are strings (`"1250.00"`) with a currency code; never floats. Dates are ISO 8601; times
  in UTC with the site time zone in `/me`.
- **Errors** are `application/problem+json` (RFC 9457) with a stable `code` and `correlationId`.
- **Real time**: Socket.IO namespace `/rt`, rooms `site:{siteId}:{channel}` (gate-queue, yard, control-tower,
  approvals, notifications). Payloads are the same `EventEnvelope` as the webhooks below.
- **Events** to NG and subscribers are listed under `webhooks` (delivered from the outbox, at least once;
  dedupe on `eventId`).
"""

def build_main():
    paths = build_paths(OPS)
    schemas = build_schemas(G.S, G.AUDITED)
    missing = REFS_USED - set(schemas)
    assert not missing, f'missing schemas: {missing}'
    hooks = OrderedDict()
    ev = G.E_EVENT[5:-1].split('|')
    for e in ev:
        hooks[e] = {'post': {
            'summary': f'{e} event', 'operationId': f'event{e}', 'tags': ['Events'],
            'requestBody': {'required': True, 'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/EventEnvelope'}}}},
            'responses': {'202': {'description': 'Accepted; duplicates by eventId are ignored.'}}}}
    tags = [{'name': t['name'], 'description': t['description'], 'x-milestone': t['x-milestone']}
            for t in TAGS.values()] + [{'name': 'Events', 'description': 'Outbound domain events (outbox).'}]
    doc = OrderedDict(
        openapi='3.1.0',
        info={'title': 'DCC NG ICD API', 'version': '1.0.0-design',
              'license': {'name': 'Proprietary - Double Click', 'identifier': 'LicenseRef-Proprietary'},
              'description': INTRO,
              'x-confidential': 'Internal design document of Double Click. Do not distribute.'},
        servers=[{'url': 'https://{host}/api/v1', 'variables': {'host': {'default': 'icd.example.com'}}}],
        security=[{'bearerAuth': []}],
        tags=tags,
        paths=paths,
        webhooks=hooks,
        components=components(schemas),
    )
    doc['x-tagGroups'] = [
        {'name': f'{ms}', 'tags': [t for t, v in TAGS.items() if v['x-milestone'] == ms]}
        for ms in ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'] if any(v['x-milestone'] == ms for v in TAGS.values())]
    return doc

# ------------------------------------------------------------------ NG side
def build_ng_side():
    sch = OrderedDict()
    sch['Problem'] = build_schemas({'Problem': G.S['Problem'], 'FieldError': G.S['FieldError']}, set())['Problem']
    sch['FieldError'] = build_schemas({'FieldError': G.S['FieldError']}, set())['FieldError']
    sch['EventEnvelope'] = build_schemas({'EventEnvelope': G.S['EventEnvelope']}, set())['EventEnvelope']
    common = {'ngRefId': {'type': 'string', 'description': 'Stable NG primary key.'},
              'updatedAt': {'type': 'string', 'format': 'date-time'},
              'isActive': {'type': 'boolean'}, 'isDeleted': {'type': 'boolean',
                                                             'description': 'Tombstone: ICD deactivates its copy.'}}
    def master(name, props, req):
        p = OrderedDict(common); p.update(props)
        sch[name] = {'type': 'object', 'required': ['ngRefId', 'updatedAt'] + req, 'properties': p}
        sch[name + 'Page'] = {'type': 'object', 'required': ['items'], 'properties': {
            'items': {'type': 'array', 'items': {'$ref': f'#/components/schemas/{name}'}},
            'hasMore': {'type': 'boolean'}}}
    s, n = {'type': 'string'}, {'type': ['string', 'null']}
    master('NgParty', {'partyCode': s, 'partyName': s, 'roles': {'type': 'array', 'items': s},
                       'taxId': n, 'vatNo': n, 'countryCode': n, 'addressLine1': n, 'city': n, 'phone': n,
                       'email': n, 'defaultCurrency': n,
                       'creditStatus': {'type': 'string', 'enum': ['CASH', 'CREDIT', 'BLOCKED']},
                       'creditLimit': {'type': ['string', 'null'], 'format': 'decimal'},
                       'contacts': {'type': 'array', 'items': {'type': 'object', 'additionalProperties': True}}},
           ['partyCode', 'partyName'])
    master('NgTruck', {'plateNo': s, 'transporterNgRefId': n, 'countryCode': n, 'makeModel': n,
                       'tareKg': {'type': ['integer', 'null']}}, ['plateNo'])
    master('NgDriver', {'driverName': s, 'licenceNo': s, 'licenceExpiry': {'type': ['string', 'null'], 'format': 'date'},
                        'licenceCountry': n, 'phone': n, 'transporterNgRefId': n}, ['driverName', 'licenceNo'])
    sch['JournalLine'] = {'type': 'object', 'required': ['lineNo', 'glAccount', 'debit', 'credit'], 'properties': {
        'lineNo': {'type': 'integer'}, 'glAccount': s, 'costCentre': n, 'partyNgRefId': n,
        'debit': {'type': 'string', 'format': 'decimal'}, 'credit': {'type': 'string', 'format': 'decimal'},
        'narration': n, 'taxCode': n}}
    sch['Journal'] = {'type': 'object',
                      'required': ['sourceRef', 'sourceKind', 'companyCode', 'documentDate', 'currency', 'lines'],
                      'properties': {
                          'sourceRef': {'type': 'string', 'description': 'Unique ICD reference, e.g. INV-DAR-2026-000123. Idempotency key.'},
                          'sourceKind': {'type': 'string', 'enum': ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PAYMENT',
                                                                    'REFUND', 'DISBURSEMENT', 'WRITE_OFF', 'SHIFT_VARIANCE']},
                          'companyCode': s, 'siteCode': s,
                          'documentDate': {'type': 'string', 'format': 'date'},
                          'currency': s, 'exchangeRate': {'type': 'string', 'format': 'decimal',
                                                          'description': 'To base currency, as frozen on the ICD document.'},
                          'baseCurrency': s, 'narration': n,
                          'lines': {'type': 'array', 'minItems': 2, 'items': {'$ref': '#/components/schemas/JournalLine'}}},
                      'description': 'Balanced journal: sum(debit) = sum(credit) in document currency.'}
    sch['JournalResult'] = {'type': 'object', 'required': ['sourceRef', 'status'], 'properties': {
        'sourceRef': s, 'status': {'type': 'string', 'enum': ['POSTED', 'PENDING', 'REJECTED']},
        'ngDocumentNo': n, 'postedAt': {'type': ['string', 'null'], 'format': 'date-time'}, 'message': n}}
    err = {'description': 'Error', 'content': {'application/problem+json': {'schema': {'$ref': '#/components/schemas/Problem'}}}}
    def sync_op(name, schema):
        return {'get': {
            'tags': ['Master sync'], 'operationId': f'sync{name}', 'summary': f'{name} changed since a point',
            'description': 'Ordered by (updatedAt, ngRefId). ICD stores the last pair and asks again with it. '
                           'Deleted or merged records come back as tombstones.',
            'parameters': [
                {'name': 'updatedSince', 'in': 'query', 'required': True, 'schema': {'type': 'string', 'format': 'date-time'}},
                {'name': 'afterRefId', 'in': 'query', 'required': False, 'schema': {'type': 'string'},
                 'description': 'Tie-breaker for rows with the same updatedAt.'},
                {'name': 'limit', 'in': 'query', 'required': False,
                 'schema': {'type': 'integer', 'default': 500, 'maximum': 2000}}],
            'responses': {'200': {'description': 'OK', 'content': {'application/json': {
                'schema': {'$ref': f'#/components/schemas/{schema}Page'}}}}, '401': err}}}
    paths = OrderedDict()
    paths['/icd-sync/parties'] = sync_op('Parties', 'NgParty')
    paths['/icd-sync/trucks'] = sync_op('Trucks', 'NgTruck')
    paths['/icd-sync/drivers'] = sync_op('Drivers', 'NgDriver')
    paths['/icd-events'] = {'post': {
        'tags': ['Events'], 'operationId': 'receiveIcdEvent', 'summary': 'Receive an ICD domain event',
        'description': 'At-least-once delivery from the ICD outbox. NG must dedupe on eventId and return 202 fast; '
                       'processing is asynchronous. Retries back off up to 24 h, then the event is parked for an admin.',
        'requestBody': {'required': True, 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/EventEnvelope'}}}},
        'responses': {'202': {'description': 'Accepted (also for a duplicate)'}, '400': err, '401': err}}}
    paths['/billing/icd-journals'] = {'post': {
        'tags': ['Billing'], 'operationId': 'postIcdJournal', 'summary': 'Post an ICD journal to the NG ledger',
        'description': 'Idempotent on sourceRef: a repeat returns the first result. Reject (422) if unbalanced, '
                       'the account is unknown or the NG period is closed; ICD marks the posting FAILED and an admin retries.',
        'requestBody': {'required': True, 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Journal'}}}},
        'responses': {'200': {'description': 'Posted or already posted', 'content': {'application/json': {
            'schema': {'$ref': '#/components/schemas/JournalResult'}}}},
            '202': {'description': 'Queued in NG', 'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/JournalResult'}}}},
            '401': err, '422': err}}}
    paths['/billing/icd-journals/{sourceRef}'] = {'get': {
        'tags': ['Billing'], 'operationId': 'getIcdJournal', 'summary': 'Status of a posted journal',
        'parameters': [{'name': 'sourceRef', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
        'responses': {'200': {'description': 'OK', 'content': {'application/json': {
            'schema': {'$ref': '#/components/schemas/JournalResult'}}}}, '404': err}}}
    return OrderedDict(
        openapi='3.1.0',
        info={'title': 'NG endpoints used by NG ICD', 'version': '1.0.0-design',
              'license': {'name': 'Proprietary - Double Click', 'identifier': 'LicenseRef-Proprietary'},
              'description': 'What the NG team implements so NG ICD can sync masters, send events and post journals.\n\n'
                             'Authentication: client-credentials token from the NG identity server for client `ng-icd-service`, '
                             'one per tenant database; scopes `icd.sync.read`, `icd.events.write`, `icd.journals.write`.\n\n'
                             'Users and roles are not synced: users sign in through NG identity and ICD keeps its own role grants.',
              'x-confidential': 'Internal design document of Double Click. Do not distribute.'},
        servers=[{'url': 'https://{ngHost}/api', 'variables': {'ngHost': {'default': 'ng.example.com'}}}],
        security=[{'ngClient': []}],
        tags=[{'name': 'Master sync', 'description': 'Incremental pull of parties, trucks and drivers.'},
              {'name': 'Events', 'description': 'ICD domain events pushed to NG.'},
              {'name': 'Billing', 'description': 'Journals from ICD invoices, payments and notes into the NG ledger.'}],
        paths=paths,
        components={'schemas': sch, 'securitySchemes': {'ngClient': {
            'type': 'oauth2', 'flows': {'clientCredentials': {
                'tokenUrl': 'https://ng.example.com/connect/token',
                'scopes': {'icd.sync.read': 'Read changed masters', 'icd.events.write': 'Send ICD events',
                           'icd.journals.write': 'Post journals'}}}}}},
    )

# ------------------------------------------------------------------ catalogue
def build_catalogue(doc):
    L = ['# DCC NG ICD — API endpoint catalogue', '',
         '*Confidential — internal design document.* Generated from the same definition as `ng_icd_api.yaml`, '
         'so the two always match.', '']
    by_ms = defaultdict(int)
    for o in OPS:
        by_ms[o['ms']] += 1
    L += ['## Summary', '', '| Milestone | Endpoints |', '|---|---|']
    names = {'M0': 'Foundations', 'M1': 'Inbound operations', 'M2': 'Control', 'M3': 'Commercial',
             'M4': 'Insight & pilot', 'M5': 'Depth (Phase 2)', 'M6': 'Intelligence (Phase 2)'}
    for ms in sorted(by_ms):
        L.append(f'| {ms} {names[ms]} | {by_ms[ms]} |')
    L.append(f'| **Total** | **{len(OPS)}** |')
    L += ['', f'Plus {len(doc["webhooks"])} outbound events and {len(doc["components"]["schemas"])} schemas.', '']
    L += ['Legend: 🔑 `Idempotency-Key` required · ⟳ `If-Match` (logInst) required · '
          '🌐 not site-scoped (no `X-Site-Id`).', '']
    for ms in ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6']:
        L += [f'## {ms} — {names[ms]}', '']
        for t, tv in TAGS.items():
            rows = [o for o in OPS if o['tag'] == t and o['ms'] == ms]
            if not rows:
                continue
            L += [f'### {t}', '', tv['description'], '', '| Method | Path | Summary | Permission | |',
                  '|---|---|---|---|---|']
            for o in rows:
                flags = ''.join([('🔑' if o['idem'] == 'required' else ''), ('⟳' if o['ifmatch'] else ''),
                                 ('' if o['site'] else '🌐')])
                path = o['path'].replace('|', '\\|')
                L.append(f"| {o['method'].upper()} | `{path}` | {o['summary']} | "
                         f"{'`' + o['perm'] + '`' if o['perm'] else '—'} | {flags} |")
            L.append('')
    L += ['## Outbound events', '', 'Delivered from the outbox to NG (`POST /icd-events`), the socket rooms and '
          'notification rules. Envelope: `EventEnvelope`.', '']
    L.append(', '.join(f'`{e}`' for e in doc['webhooks']))
    L += ['', '## NG-side endpoints (`ng_icd_ng_side.yaml`)', '',
          '| Method | Path | Purpose |', '|---|---|---|',
          '| GET | `/icd-sync/parties` | Changed parties since a point (updatedSince + afterRefId) |',
          '| GET | `/icd-sync/trucks` | Changed trucks |',
          '| GET | `/icd-sync/drivers` | Changed drivers |',
          '| POST | `/icd-events` | Receive ICD events (202, dedupe on eventId) |',
          '| POST | `/billing/icd-journals` | Post a balanced journal; idempotent on sourceRef; returns ngDocumentNo |',
          '| GET | `/billing/icd-journals/{sourceRef}` | Journal status |', '']
    unknown = sorted(PERMS_KNOWN - SEED_PERMS)
    L += ['## Permission codes used', '',
          f'{len(PERMS_KNOWN)} distinct codes, all present in the database seed.' if not unknown else
          'Codes not yet in the seed: ' + ', '.join(unknown), '']
    return '\n'.join(L)

SEED_PERMS = set()
def load_seed_perms():
    import glob
    for f in glob.glob('/home/claude/ng_icd_db/src/*seed*.sql'):
        for m in re.finditer(r"\('([a-z_]+\.[a-z_.]+)',", open(f).read()):
            SEED_PERMS.add(m.group(1))

class Dumper(yaml.SafeDumper):
    pass
Dumper.add_representer(OrderedDict, lambda d, v: d.represent_dict(v.items()))
Dumper.ignore_aliases = lambda self, data: True

def dump(doc, fn):
    with open(os.path.join(OUT, fn), 'w') as f:
        f.write('# DCC NG ICD - CONFIDENTIAL internal design document. Generated by gen.py; do not edit by hand.\n')
        yaml.dump(doc, f, Dumper=Dumper, sort_keys=False, allow_unicode=True, width=110)

if __name__ == '__main__':
    load_seed_perms()
    main = build_main()
    dump(main, 'ng_icd_api.yaml')
    dump(build_ng_side(), 'ng_icd_ng_side.yaml')
    open(os.path.join(OUT, 'NG_ICD_API_catalogue.md'), 'w').write(build_catalogue(main))
    print('operations', len(OPS), 'paths', len(main['paths']), 'schemas', len(main['components']['schemas']),
          'unknown perms', sorted(PERMS_KNOWN - SEED_PERMS))
