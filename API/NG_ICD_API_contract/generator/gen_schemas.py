"""Schemas for the DCC NG ICD API contract.

Field spec mini-language (value of each field):
  base types : id int str text bool dec money date datetime time uuid json binary any
  enum(A|B)  : string enum
  ref(Name)  : $ref to another schema
  list(x)    : array of x
  suffixes   : !  required     ?  nullable     ~  read-only (server sets it)
Entities with AUDIT=True also get logInst~, createdAt~, createdBy~, updatedAt~.
"""

S = {}
AUDITED = set()

def sch(name, audited=False, /, **fields):
    S[name] = fields
    if audited:
        AUDITED.add(name)

E_CATEGORY = 'enum(CONTAINER|VEHICLE|LOT)'
E_FACILITY = 'enum(ICD|ICDV|CFS|EMPTY_DEPOT|WAREHOUSE)'
E_GRANT = 'enum(DO|REQ|APPR|VIEW)'
E_LANG = 'enum(en|sw|fr)'
E_FLOW = 'enum(IMPORT|EXPORT|TRANSIT|EMPTY_RETURN|EMPTY_RELEASE|TRANSHIP|STORAGE)'
E_FE = 'enum(F|E)'
E_PHYS = 'enum(EXPECTED|GATED_IN|IN_YARD|AT_ACTIVITY|LOADED_OUT|DEPARTED|CANCELLED)'
E_CUSTOMS = 'enum(NOT_REQUIRED|NOT_LODGED|LODGED|UNDER_EXAM|QUERY|CLEARED|SEIZED)'
E_BILLING = 'enum(NONE|ACCRUING|PROFORMA|PAID|CREDIT)'
E_RELEASE = 'enum(NONE|REQUESTED|APPROVED|EXPIRED|USED)'
E_SOURCE = 'enum(NG|LOCAL)'
E_SYNC = 'enum(SYNCED|PROVISIONAL|LOCAL)'
E_PARTY_ROLE = 'enum(CUSTOMER|IMPORTER|EXPORTER|CONSIGNEE|CLEARING_AGENT|SHIPPING_LINE|SHIPPING_AGENT|TRANSPORTER|VENDOR)'
E_AREA = 'enum(EXTERIOR|INTERIOR|ROOF|FLOOR|DOORS|WALLS|CORNERS|UNDERCARRIAGE|ENGINE|CABIN|ACCESSORIES|DOCUMENTS|SEAL|OTHER)'
E_SEVERITY = 'enum(CRITICAL|HIGH|MEDIUM|LOW)'
E_CHANNEL = 'enum(EMAIL|SMS|WHATSAPP|IN_APP|PUSH)'
E_EVENT = ('enum(UnitExpected|TruckArrived|UnitGatedIn|UnitInspected|UnitMoved|UnitWeighed|HoldPlaced|HoldLifted|'
           'CustomsStatusChanged|ReleaseRequested|ReleaseApproved|ReleaseExpired|GateOutBlocked|UnitGatedOut|'
           'InvoicePosted|CreditNoteIssued|PaymentReceived|FreeTimeExpiring|ExceptionOpened|ExceptionEscalated)')

# ---------------------------------------------------------------- common
sch('Problem',
    type='str!', title='str!', status='int!', detail='str', code='str!',
    correlationId='uuid', errors='list(ref(FieldError))')
sch('FieldError', field='str!', code='str!', message='str!')
sch('EntityLink', entityName='str!', entityId='id!', label='str')
sch('MoneyTotal', currency='str!', amount='money!', taxAmount='money!', total='money!')
sch('MapRect', x='dec!', y='dec!', w='dec!', h='dec!', rotation='int')
sch('LocationRef', yardLocationId='id!', fullCode='str!')
sch('ReasonRequest', reason='text!')

# ---------------------------------------------------------------- M0 foundations
sch('Me', userId='id!', userSub='str!', name='str!', email='str', language=E_LANG,
    partyId='id?', sites='list(ref(MySite))!')
sch('MySite', siteId='id!', siteCode='str!', siteName='str!', timeZone='str!',
    facilities=f'list({E_FACILITY})', roles='list(str)!', permissions='list(ref(PermissionGrant))!')
sch('PermissionGrant', code='str!', grant=E_GRANT + '!', limitAmount='money?', limitCurrency='str?')
sch('Company', True, companyId='id~', companyCode='str!', legalName='str!', tradingName='str',
    countryCode='str!', countryPackCode='str!', baseCurrency='str!', taxId='str', vatNo='str',
    addressLine1='str', addressLine2='str', city='str', phone='str', email='str',
    logoDocumentId='id?', isActive='bool')
sch('Site', True, siteId='id~', siteCode='str!', siteName='str!', companyId='id!', countryCode='str!',
    timeZone='str!', calendarId='id?', addressLine1='str', city='str', latitude='dec?', longitude='dec?',
    customsStationCode='str?', regulatorLicenceNo='str?', offlineGateLimitMin='int',
    signatureMode='enum(SCREEN|PAPER|EITHER)', facilities=f'list({E_FACILITY})!', isActive='bool')
sch('Calendar', True, calendarId='id~', calendarCode='str!', calendarName='str!', countryCode='str?')
sch('Holiday', True, calendarHolidayId='id~', holidayDate='date!', holidayName='str!')
sch('NumberSequence', True, numberSequenceId='id~', companyId='id!', siteId='id?',
    documentKind='str!', prefix='str!', pattern='str!', nextValue='int', resetPolicy='enum(NEVER|YEARLY|MONTHLY)',
    currentPeriod='str~')
sch('YardLevel', True, yardLevelId='id~', levelNo='int!', levelName='str!')
sch('YardLocation', True, yardLocationId='id~', parentId='id?', levelNo='int!', locationCode='str!',
    fullCode='str~',
    kind='enum(AREA|BLOCK|ROW|BAY|SLOT|TIER|AISLE|RACK|BIN|PARKING_BAY|KEY_CABINET|KEY_HOOK|VIRTUAL)!',
    isSlot='bool', allows20='bool', allows40='bool', allows45='bool', maxTier='int?', maxWeightKg='int?',
    baySize='enum(CAR|SUV|TRUCK|BUS)?', reeferPlugNo='str?', map='ref(MapRect)?', sortOrder='int',
    isBlocked='bool', blockedReason='str?', tags='list(str)', childCount='int~', isActive='bool')
sch('YardGenerateRequest', parentId='id!', rowPrefix='str', rowFrom='int!', rowTo='int!',
    bayFrom='int!', bayTo='int!', tiers='int!', codePad='int', allows20='bool', allows40='bool',
    allows45='bool', maxWeightKg='int?', tags='list(str)', origin='ref(MapRect)?')
sch('YardGenerateResult', created='int!', sampleCodes='list(str)!')
sch('LocationTag', True, locationTagId='id~', tagCode='str!', tagName='str!')
sch('Gate', True, gateId='id~', gateCode='str!', gateName='str!',
    gateKind='enum(OUTER|INNER|WEIGHBRIDGE|OTHER)!', lanes='list(ref(GateLane))', isActive='bool')
sch('GateLane', gateLaneId='id~', laneCode='str!', direction='enum(IN|OUT|BOTH)!', isActive='bool')
sch('Checkpoint', True, checkpointId='id~', checkpointCode='str!', checkpointName='str!',
    checkpointKind='enum(OUTER_IN|INNER_IN|WEIGH_IN|INNER_OUT|WEIGH_OUT|OUTER_OUT|OTHER)!', gateId='id?',
    isActive='bool')
sch('VisitType', True, visitTypeId='id~', visitTypeCode='str!', visitTypeName='str!',
    requiresNomination='bool', requiresAppointment='bool',
    checkpoints='list(ref(VisitTypeCheckpoint))!', isActive='bool')
sch('VisitTypeCheckpoint', seqNo='int!', checkpointCode='str!', isMandatory='bool')
sch('UnitType', True, unitTypeId='id~', category=E_CATEGORY + '!', typeCode='str!', typeName='str!',
    lengthFt='int?', heightCode='enum(STD|HC)?', teu='dec?', isReefer='bool', isTank='bool',
    isOpenTop='bool', isFlatRack='bool', defaultTareKg='int?',
    vehicleClass='enum(CAR|SUV|VAN|PICKUP|TRUCK|BUS|MOTORCYCLE|MACHINERY)?',
    baySizeRequired='enum(CAR|SUV|TRUCK|BUS)?', identityRules='list(str)', isActive='bool')
sch('IdentityRule', ruleCode='str!', ruleName='str!', regexPattern='str!', checkDigitAlgo='enum(ISO6346|VIN|NONE)!')
sch('IdentityCheckRequest', category=E_CATEGORY + '!', number='str!', unitTypeCode='str')
sch('IdentityCheckResult', valid='bool!', normalized='str!', ruleCode='str?', message='str?',
    existingUnitStayId='id?')
sch('CargoRegime', cargoRegimeId='id~', regimeCode='str!', regimeName='str!', requiresCustoms='bool')
sch('Party', True, partyId='id~', partyCode='str!', partyName='str!', shortName='str?',
    roles=f'list({E_PARTY_ROLE})!', taxId='str?', vatNo='str?', countryCode='str?', addressLine1='str?',
    city='str?', phone='str?', email='str?', defaultCurrency='str?',
    creditStatus='enum(CASH|CREDIT|BLOCKED)', creditLimit='money?', creditCurrency='str?',
    disbursementService='bool', source=E_SOURCE + '~', syncStatus=E_SYNC + '~', ngRefId='str~',
    contacts='list(ref(PartyContact))', isActive='bool')
sch('PartyContact', partyContactId='id~', contactName='str!', jobTitle='str?', phone='str?',
    email='str?', preferredLanguage=E_LANG, isPrimary='bool', notifyEmail='bool', notifySms='bool',
    notifyWhatsapp='bool', isActive='bool')
sch('PartyMatch', ngRefId='str!')
sch('Truck', True, truckId='id~', plateNo='str!', plateDisplay='str~',
    vehicleKind='enum(TRUCK|TRAILER|CAR_CARRIER)', transporterPartyId='id?', countryCode='str?',
    makeModel='str?', axleCount='int?', tareKg='int?', source=E_SOURCE + '~', syncStatus=E_SYNC + '~',
    ngRefId='str~', isActive='bool')
sch('Driver', True, driverId='id~', driverName='str!', licenceNo='str!', licenceClass='str?',
    licenceExpiry='date?', licenceCountry='str?', phone='str?', transporterPartyId='id?',
    photoDocumentId='id?', source=E_SOURCE + '~', syncStatus=E_SYNC + '~', ngRefId='str~',
    licenceValid='bool~', isActive='bool')
sch('Vessel', True, vesselId='id~', vesselName='str!', imoNo='str?', callSign='str?',
    flagCountry='str?', operatorPartyId='id?', isActive='bool')
sch('Port', True, portId='id~', unlocode='str?', portName='str!', countryCode='str!',
    portKind='enum(SEAPORT|ICD|ECD|BORDER|AIRPORT|OTHER)!', isActive='bool')
sch('Commodity', True, commodityId='id~', commodityCode='str!', commodityName='str!', hsCode='str?',
    isHazardous='bool', isActive='bool')
sch('Equipment', True, equipmentId='id~', equipmentCode='str!', equipmentName='str!',
    equipmentType='enum(REACH_STACKER|EMPTY_HANDLER|FORKLIFT|RTG|MOBILE_CRANE|TERMINAL_TRACTOR|WEIGHBRIDGE|GENERATOR|OTHER)!',
    capacityKg='int?', ngRefId='str?', isActive='bool')
sch('User', True, userId='id~', userSub='str~', userName='str!', email='str?', phone='str?',
    partyId='id?', preferredLanguage=E_LANG, isNgUser='bool~', mfaRequired='bool',
    lastLoginAt='datetime~', isActive='bool', roleGrants='list(ref(RoleGrant))~')
sch('UserCreate', userName='str!', email='str!', phone='str?', partyId='id?',
    preferredLanguage=E_LANG, mfaRequired='bool')
sch('RoleGrant', True, userSiteRoleId='id~', roleCode='str!', siteId='id?', validFrom='date',
    validTo='date?', grantedBy='str~')
sch('Role', True, roleId='id~', roleCode='str!', roleName='str!', description='str?', isSystem='bool~',
    isExternal='bool', isActive='bool', permissions='list(ref(RolePermission))')
sch('RolePermission', permissionCode='str!', grant=E_GRANT + '!', limitAmount='money?', limitCurrency='str?')
sch('Permission', code='str!', module='str!', description='str!', isApproval='bool!', supportsLimit='bool!')
sch('FieldRule', True, fieldRuleId='id~', roleCode='str!', entityName='str!', fieldName='str!',
    accessLevel='enum(HIDDEN|READONLY)!')
sch('Device', True, deviceId='id~', siteId='id!', deviceCode='str!', deviceName='str!',
    deviceKind='enum(TABLET|PHONE|GATE_PC|KIOSK)!', publicKey='text?', registeredAt='datetime~',
    registeredBy='str~', revokedAt='datetime~', revokedReason='str~', lastSeenAt='datetime~')
sch('DocumentType', True, documentTypeId='id~', docTypeCode='str!', docTypeName='str!',
    appliesTo='str!', retentionYears='int', requiresApproval='bool', maxSizeMb='int', allowedExt='str',
    isActive='bool')
sch('Document', True, documentId='id~', docTypeCode='str!', siteId='id?', entityName='str!',
    entityId='id!', fileName='str~', contentType='str~', sizeBytes='int~', sha256='str~',
    versionNo='int~', supersedesDocumentId='id?',
    status='enum(ACTIVE|PENDING_APPROVAL|REJECTED|SUPERSEDED|DELETED)~',
    scanStatus='enum(PENDING|CLEAN|INFECTED|FAILED)~', capturedAt='datetime?', capturedDeviceId='id?',
    expiryDate='date?', downloadUrl='str~')
sch('DocumentUpload', file='binary!', docTypeCode='str!', entityName='str!', entityId='id!',
    capturedAt='datetime', supersedesDocumentId='id', expiryDate='date')
sch('AuditEntry', auditLogId='id!', occurredAt='datetime!', userSub='str!', userName='str?',
    deviceId='id?', ipAddress='str?', siteId='id?', entityName='str!', entityId='str!',
    action='enum(CREATE|UPDATE|DELETE|APPROVE|REJECT|OVERRIDE|LOGIN|LOGOUT|EXPORT|PRINT|VIEW_SENSITIVE|SYNC)!',
    reason='str?', changes='list(ref(FieldChange))', source='enum(UI|EDGE|API|SYNC|JOB|AIVA)!')
sch('FieldChange', field='str!', old='any', new='any')
sch('SyncStatus', entityName='str!', lastUpdatedate='datetime?', lastRunAt='datetime?',
    lastStatus='enum(OK|PARTIAL|FAILED)?', lastError='str?', rowsLastRun='int?')

# ---------------------------------------------------------------- M1 inbound
sch('VesselCall', True, vesselCallId='id~', vesselId='id!', vesselName='str~', voyageNo='str!', portId='id!',
    shippingLinePartyId='id?', eta='datetime?', ata='datetime?', dischargeCompletedAt='datetime?',
    etd='datetime?', gateCutoffAt='datetime?', docCutoffAt='datetime?', vgmCutoffAt='datetime?',
    portCallRef='str?', status='enum(EXPECTED|ARRIVED|DISCHARGING|DISCHARGED|DEPARTED|CANCELLED)')
sch('ManifestUpload', file='binary!', vesselCallId='id', manifestRef='str', mappingProfile='str')
sch('Manifest', True, manifestId='id~', vesselCallId='id?', manifestRef='str?',
    source='enum(EXCEL|CSV|API|MANUAL)~', fileDocumentId='id~', importedAt='datetime~',
    lineCount='int~', createdCount='int~', matchedCount='int~', errorCount='int~',
    status='enum(VALIDATING|REVIEW|APPLIED|PARTIAL|REJECTED)~')
sch('ManifestLine', manifestLineId='id~', lineNo='int~', unitNoRaw='str~', unitNo='str~',
    unitTypeRaw='str~', blNo='str~', consigneeRaw='str~', agentRaw='str~', regimeRaw='str~',
    fullEmpty=E_FE + '~', dischargeAt='datetime~', sealNo='str~', grossWeightKg='dec~',
    commodityRaw='str~', vehicleMake='str~', vehicleModel='str~', vehicleYear='int~',
    vehicleColour='str~', engineNo='str~',
    matchStatus='enum(NEW|CREATED|MATCHED|DUPLICATE|INVALID|IGNORED)', errorText='str~', unitStayId='id~')
sch('ManifestApplyRequest', lineIds='list(id)', createConsignments='bool', defaultRegimeCode='str')
sch('ManifestApplyResult', created='int!', matched='int!', skipped='int!', errors='list(ref(LineError))')
sch('LineError', lineNo='int!', message='str!')
sch('Consignment', True, consignmentId='id~',
    refType='enum(BL|BOOKING|CARGO_REF|DELIVERY_NOTE|DROPOFF_AUTH|EMPTY_RELEASE)!', refNo='str!',
    cargoRegimeCode='str!', vesselCallId='id?', shippingLinePartyId='id?', consigneePartyId='id?',
    shipperPartyId='id?', agentPartyId='id?', billToPartyId='id?', commodityId='id?',
    cargoDescription='text?', originPortId='id?', destinationPortId='id?', destinationCountry='str?',
    declaredPackages='int?', declaredWeightKg='dec?', unitsExpected='int~', unitsReceived='int~',
    unitsDelivered='int~', validFrom='date?', validTo='date?', status='enum(OPEN|CLOSED|CANCELLED)~',
    remarks='text?', lines='list(ref(ConsignmentLine))')
sch('ConsignmentLine', consignmentLineId='id~', lineNo='int!', unitTypeCode='str?',
    unitGrade='enum(A|B|C|D)?', qtyExpected='dec!', qtyReceived='dec~', qtyDelivered='dec~', uom='str!',
    weightKg='dec?', description='str?')
sch('CargoUnit', cargoUnitId='id~', category=E_CATEGORY + '!', unitNo='str!', unitTypeCode='str!',
    ownerPartyId='id?', engineNo='str?', make='str?', model='str?', modelYear='int?', colour='str?',
    tareKg='int?', maxGrossKg='int?')
sch('UnitSummary', unitStayId='id!', unitNo='str!', category=E_CATEGORY + '!', unitTypeCode='str!',
    siteId='id!', flow=E_FLOW + '!', fullEmpty=E_FE + '!', physicalStatus=E_PHYS + '!',
    customsStatus=E_CUSTOMS + '!', billingStatus=E_BILLING + '!', releaseStatus=E_RELEASE + '!',
    activeHoldCount='int!', location='str?', consignmentRef='str?', lineCode='str?',
    gatedInAt='datetime?', dwellDays='int?')
sch('UnitStay', True, unitStayId='id~', cargoUnit='ref(CargoUnit)!', siteId='id~', consignmentId='id?',
    cargoRegimeCode='str!', flow=E_FLOW + '!', fullEmpty=E_FE + '!', physicalStatus=E_PHYS + '~',
    customsStatus=E_CUSTOMS + '~', billingStatus=E_BILLING + '~', releaseStatus=E_RELEASE + '~',
    activeHoldCount='int~', currentLocation='ref(LocationRef)~', linePartyId='id?', commodityId='id?',
    cargoDescription='text?', unitGrade='enum(A|B|C|D)?',
    conditionStatus='enum(UNKNOWN|SOUND|DAMAGED|REJECTED)~', sealNo='str?', grossWeightKg='dec?',
    vgmKg='dec?', imoClass='str?', unNo='str?', reeferSetTempC='dec?', dischargeAt='datetime?',
    gatedInAt='datetime~', departedAt='datetime~', storageStartAt='datetime~',
    expectedExitDate='date?', destinationCountry='str?', remarks='text?', freeUntil='datetime~',
    accruedCharges='ref(MoneyTotal)~', nextAction='str~')
sch('TimelineEntry', at='datetime!',
    kind='enum(STATUS|GATE|MOVE|INSPECTION|WEIGH|HOLD|CUSTOMS|RELEASE|CHARGE|INVOICE|PAYMENT|DOCUMENT|EXCEPTION|KEY|NOTE)!',
    title='str!', detail='str?', track='enum(PHYSICAL|CUSTOMS|BILLING|RELEASE|HOLD)?',
    fromStatus='str?', toStatus='str?', by='str?', link='ref(EntityLink)?')
sch('SearchResult', query='str!', groups='list(ref(SearchGroup))!')
sch('SearchGroup',
    entity='enum(UNIT|CONSIGNMENT|TRUCK_VISIT|TRUCK|DRIVER|PARTY|RELEASE_ORDER|INVOICE|VESSEL_CALL|APPOINTMENT|DOCUMENT)!',
    total='int!', hits='list(ref(SearchHit))!')
sch('SearchHit', id='id!', title='str!', subtitle='str?', status='str?', link='ref(EntityLink)!')
sch('TruckVisit', True, truckVisitId='id~', visitNo='str~', visitTypeCode='str!',
    conveyance='enum(TRUCK|SELF_DRIVEN|CAR_CARRIER)', truckId='id?', plateNo='str?', trailerId='id?',
    driverId='id?', driverName='str~', transporterPartyId='id?', nominationRef='str?', appointmentId='id?',
    status='enum(ANNOUNCED|AT_OUTER_GATE|ADMITTED|WORKING|HELD|CHECKED_OUT|EXITED|REJECTED|EXPIRED|CANCELLED)~',
    currentSeqNo='int~', nextCheckpointCode='str~', expectedFrom='datetime?', expectedTo='datetime?',
    arrivedAt='datetime~', admittedAt='datetime~', checkedOutAt='datetime~', exitedAt='datetime~',
    gatePassNo='str~', gatePassQr='str~', isOfflineEntry='bool~', remarks='text?',
    units='list(ref(VisitUnit))~', checkpoints='list(ref(CheckpointEvent))~')
sch('TruckVisitCreate', visitTypeCode='str!', conveyance='enum(TRUCK|SELF_DRIVEN|CAR_CARRIER)',
    truckId='id', plateNo='str', trailerPlateNo='str', driverId='id', driverLicenceNo='str',
    driverName='str', transporterPartyId='id', nominationRef='str', appointmentId='id',
    expectedFrom='datetime', expectedTo='datetime', units='list(ref(VisitUnitPlan))', remarks='text',
    occurredAt='datetime')
sch('VisitUnitPlan', direction='enum(DROP|PICK)!', unitStayId='id', unitNo='str', releaseOrderId='id',
    truckPosition='enum(SINGLE|FRONT|REAR|CENTER)')
sch('VisitUnit', visitUnitTxnId='id~', unitStayId='id!', unitNo='str~', direction='enum(DROP|PICK)!',
    status='enum(PLANNED|IN_PROGRESS|DONE|CANCELLED)~', truckPosition='enum(SINGLE|FRONT|REAR|CENTER)?',
    sealExpected='str~', sealFound='str?', sealApplied='str?',
    sealStatus='enum(MATCH|MISMATCH|MISSING|NEW_APPLIED|NOT_SEALED)~', eirNo='str~',
    signatureMode='enum(SCREEN|PAPER)?', signedAt='datetime~', signedByName='str?',
    signatureDocumentId='id?', releaseOrderId='id?', completedAt='datetime~')
sch('CheckpointPassRequest', checkpointCode='str!', occurredAt='datetime!', gateLaneId='id',
    plateRead='str', plateSource='enum(MANUAL|ANPR|QR)', anprConfidence='dec', isOffline='bool',
    overrideApprovalId='id')
sch('CheckpointResult', result='enum(PASSED|FAILED|OVERRIDDEN)!', visit='ref(TruckVisit)!',
    failures='list(ref(CheckFailure))', exceptionCaseId='id?')
sch('CheckFailure', conditionCode='str!', unitStayId='id?', detail='str!', canOverride='bool!')
sch('CheckpointEvent', checkpointCode='str!', seqNo='int!', result='enum(PASSED|FAILED|OVERRIDDEN)!',
    failureReason='str?', occurredAt='datetime!', by='str!', isOffline='bool')
sch('VisitUnitComplete', sealFound='str', sealApplied='str', signatureMode='enum(SCREEN|PAPER)!',
    signedByName='str!', signatureDocumentId='id', inspectionId='id', occurredAt='datetime!',
    lotQty='dec', lotWeightKg='dec')
sch('InspectionTemplate', inspectionTemplateId='id!', templateCode='str!', templateName='str!',
    category=E_CATEGORY + '!', inspectionKind='enum(GATE_IN|GATE_OUT|PERIODIC|EXAM|DESTUFF|STUFF)!',
    versionNo='int!', minPhotos='int!', items='list(ref(InspectionItem))!')
sch('InspectionItem', inspectionItemId='id!', itemCode='str!', itemName='str!', area=E_AREA + '!',
    inputType='enum(OK_DAMAGE|YES_NO|NUMBER|TEXT|CHOICE)!', isMandatory='bool!', sortOrder='int!')
sch('DamageCode', damageCode='str!', damageName='str!', appliesTo='enum(ANY|CONTAINER|VEHICLE|LOT)!')
sch('Inspection', True, inspectionId='id~', unitStayId='id!', templateCode='str!',
    inspectionKind='enum(GATE_IN|GATE_OUT|PERIODIC|EXAM|DESTUFF|STUFF)!', truckVisitId='id?',
    status='enum(PENDING|IN_PROGRESS|COMPLETED|REINSPECT|APPROVED)~',
    overallCondition='enum(SOUND|MINOR_DAMAGE|MAJOR_DAMAGE|REJECTED)?', odometerKm='int?',
    fuelLevel='enum(E|1/4|1/2|3/4|F)?', batteryOk='bool?', personalEffects='text?', remarks='text?',
    startedAt='datetime!', completedAt='datetime~', inspectorSub='str~', eirNo='str~',
    results='list(ref(InspectionResult))', findings='list(ref(InspectionFinding))~', photoCount='int~')
sch('InspectionResult', inspectionItemId='id!', resultValue='str?', isOk='bool?')
sch('InspectionFinding', True, inspectionFindingId='id~', area=E_AREA + '!', damageCode='str!',
    severity='enum(MINOR|MAJOR|CRITICAL)!', locationDetail='str?', sizeCm='str?', description='text?',
    needsRepair='bool', isPreexisting='bool', photoDocumentIds='list(id)')
sch('InspectionComplete', overallCondition='enum(SOUND|MINOR_DAMAGE|MAJOR_DAMAGE|REJECTED)!',
    completedAt='datetime!', remarks='text')
sch('YardBlockView', yardLocationId='id!', fullCode='str!', kind='str!', map='ref(MapRect)?',
    usableSlots='int!', occupiedSlots='int!', slots='list(ref(SlotView))!')
sch('SlotView', yardLocationId='id!', fullCode='str!', tier='int?', map='ref(MapRect)?', isBlocked='bool!',
    unit='ref(SlotUnit)?')
sch('SlotUnit', unitStayId='id!', unitNo='str!', unitTypeCode='str!', flow=E_FLOW + '!',
    fullEmpty=E_FE + '!', hasHold='bool!', isReefer='bool!', isHazardous='bool!', dwellDays='int!',
    lineCode='str?', releaseStatus=E_RELEASE + '!')
sch('OccupancySummary', yardLocationId='id!', fullCode='str!', usableSlots='int!', occupiedSlots='int!',
    occupancyPct='dec!')
sch('AllocationSuggestRequest', unitStayId='id!', excludeLocationIds='list(id)')
sch('AllocationSuggestion', suggestionLogId='id!', engine='enum(RULES|ML)!',
    candidates='list(ref(SlotCandidate))!')
sch('SlotCandidate', rank='int!', yardLocationId='id!', fullCode='str!', score='dec!', reasons='list(str)!')
sch('MoveOrder', True, moveOrderId='id~', unitStayId='id!', unitNo='str~',
    moveKind='enum(PLACE|RELOCATE|RESHUFFLE|TO_ACTIVITY|FROM_ACTIVITY|PICK_FOR_VISIT)!',
    fromLocation='ref(LocationRef)~', toLocationId='id?', suggestionLogId='id', suggestionRank='int?',
    overrideReason='str?', truckVisitId='id?', priority='int',
    status='enum(OPEN|ASSIGNED|IN_PROGRESS|DONE|CANCELLED)~', assignedEquipmentId='id?',
    assignedOperatorSub='str?', requestedAt='datetime~', completedAt='datetime~')
sch('MoveAssign', equipmentId='id', operatorSub='str')
sch('MoveComplete', toLocationId='id!', occurredAt='datetime!', equipmentId='id', reason='str',
    isOffline='bool')
sch('YardMove', yardMoveId='id!', unitStayId='id!', moveKind='str!', from_='ref(LocationRef)?',
    to='ref(LocationRef)?', equipmentCode='str?', operator='str!', occurredAt='datetime!', reason='str?')
sch('Weighing', True, weighingId='id~', ticketNo='str!', weighKind='enum(IN|OUT|UNIT|VGM)!',
    truckVisitId='id?', unitStayId='id?', grossKg='dec?', tareKg='dec?', netKg='dec~',
    containerTareKg='dec?', declaredKg='dec?', variancePct='dec~', withinTolerance='bool~',
    source='enum(DEVICE|MANUAL)', deviceRef='str?', overrideApprovalId='id?', weighedAt='datetime!')
sch('KeyCustody', True, keyCustodyId='id~', unitStayId='id!', keyTagNo='str!', keyCount='int',
    hasRemote='bool', status='enum(IN_CABINET|ISSUED|HANDED_OVER|LOST)~', location='ref(LocationRef)~',
    holderName='str~', movements='list(ref(KeyMovement))~')
sch('KeyMovement', keyMovementId='id~', action='enum(RECEIVE|STORE|ISSUE|RETURN|HAND_OVER|LOST|FOUND)!',
    toLocationId='id?', toHolderName='str?', toHolderSub='str?', reason='str?', occurredAt='datetime!',
    by='str~')

# ---------------------------------------------------------------- M2 control
sch('CustomsRefType', refTypeCode='str!', refTypeName='str!', countryPackCode='str!', hasValidity='bool!',
    hasAmount='bool!', evidenceDocTypeCode='str?', setsCustomsStatus=E_CUSTOMS + '?')
sch('CustomsRef', True, customsRefId='id~', refTypeCode='str!', unitStayId='id?', consignmentId='id?',
    refNo='str!', refDate='date?', status='enum(ACTIVE|CANCELLED|EXPIRED)~', validTo='date?',
    amount='money?', amountCurrency='str?', evidenceDocumentId='id?',
    source='enum(MANUAL|CUSTOMS_OFFICER|INTEGRATION)~', remarks='text?')
sch('Exam', True, examId='id~', unitStayId='id!', examType='enum(PHYSICAL|SCAN|DOCUMENT)!',
    noticeRef='str?', authority='enum(CUSTOMS|PORT|HEALTH|STANDARDS|POLICE|OTHER)',
    status='enum(REQUESTED|SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED)~', scheduledAt='datetime?',
    examLocationId='id?', moveOrderId='id~', startedAt='datetime~', completedAt='datetime~',
    result='enum(PASSED|SHORTAGE|EXCESS|MISDECLARED|SEIZED|OTHER)~', officersPresent='str~',
    sealRemoved='str~', sealApplied='str~', remarks='text?')
sch('ExamComplete', result='enum(PASSED|SHORTAGE|EXCESS|MISDECLARED|SEIZED|OTHER)!',
    officersPresent='str', sealRemoved='str', sealApplied='str', remarks='text', completedAt='datetime!',
    nextAction='enum(RETURN_TO_YARD|KEEP_AT_EXAM)!')
sch('HoldType', holdCode='str!', holdName='str!', authority='str!', blocksGateOut='bool!',
    blocksRelease='bool!', blocksMove='bool!', blocksStuffing='bool!', liftNeedsApproval='bool!',
    liftNeedsEvidence='bool!', moveToTagCode='str?')
sch('Hold', True, holdId='id~', unitStayId='id!', unitNo='str~', holdTypeCode='str!',
    status='enum(ACTIVE|LIFTED)~', authorityRef='str?', reason='text!', placedAt='datetime~',
    placedBy='str~', placedEvidenceDocumentId='id?', exceptionCaseId='id~', liftApprovalId='id~',
    liftedAt='datetime~', liftedBy='str~', liftReason='str~')
sch('HoldPlace', unitStayIds='list(id)!', holdTypeCode='str!', authorityRef='str', reason='text!',
    evidenceDocumentId='id')
sch('HoldLift', reason='text!', evidenceDocumentId='id')
sch('HoldLiftResult', lifted='bool!', approvalRequest='ref(ApprovalRequest)?', hold='ref(Hold)!')
sch('ReleaseCondition', conditionCode='str!', conditionName='str!', evalOrder='int!', description='str?')
sch('ReleaseRule', True, releaseRuleId='id~', regimeCode='str!', unitCategory=E_CATEGORY + '?',
    conditionCode='str!', atApproval='bool', atGateOut='bool', canOverride='bool', isActive='bool')
sch('ReleaseOrder', True, releaseOrderId='id~', releaseNo='str~',
    releaseKind='enum(DELIVERY|EMPTY_RELEASE|EXPORT_TO_PORT|TRANSFER)!', consignmentId='id?',
    status='enum(REQUESTED|PENDING_CHECKS|APPROVED|PARTLY_USED|USED|EXPIRED|CANCELLED|REJECTED)~',
    requestedByPartyId='id?', requestedAt='datetime~', plannedExitDate='date?', validFrom='datetime~',
    validTo='datetime~', approvedAt='datetime~', approvedBy='str~', unitsTotal='int~', unitsOut='int~',
    transporterPartyId='id?', truckId='id?', driverId='id?', collectorName='str?',
    collectorIdType='str?', collectorIdNo='str?', qrToken='str~',
    units='list(ref(ReleaseOrderUnit))~', lastChecks='list(ref(ReleaseCheck))~',
    validityHistory='list(ref(ValidityChange))~', amountDue='ref(MoneyTotal)~')
sch('ReleaseOrderCreate', releaseKind='enum(DELIVERY|EMPTY_RELEASE|EXPORT_TO_PORT|TRANSFER)!',
    consignmentId='id', unitStayIds='list(id)!', plannedExitDate='date!', transporterPartyId='id',
    truckId='id', driverId='id', collectorName='str', collectorIdType='str', collectorIdNo='str')
sch('ReleaseOrderUnit', unitStayId='id!', unitNo='str!', status='enum(PENDING|RELEASED|OUT|REMOVED)!',
    outAt='datetime?')
sch('ReleaseUnitsChange', addUnitStayIds='list(id)', removeUnitStayIds='list(id)', reason='str')
sch('ReleaseCheck', conditionCode='str!', conditionName='str!',
    result='enum(PASS|FAIL|OVERRIDDEN|NOT_APPLIC)!', detail='str?', unitStayId='id!',
    stage='enum(APPROVAL|GATE_OUT|PREVIEW)!', evaluatedAt='datetime!', canOverride='bool')
sch('ReleaseEvaluation', correlationId='uuid!', allPassed='bool!', checks='list(ref(ReleaseCheck))!',
    amountDue='ref(MoneyTotal)?')
sch('ReleaseApprove', overrideApprovalId='id')
sch('ReleaseRevalidate', newExitDate='date!')
sch('ReleaseRevalidateResult', releaseOrder='ref(ReleaseOrder)!', proformaInvoiceId='id?',
    amountDue='ref(MoneyTotal)!')
sch('ValidityChange', changeKind='enum(INITIAL|REVALIDATED|EXTENDED|SHORTENED)!', oldValidTo='datetime?',
    newValidTo='datetime!', invoiceId='id?', reason='str?', changedAt='datetime!')
sch('GateOutCheckRequest', truckVisitId='id!', unitStayId='id!')
sch('GateOutExplanation', unitStayId='id!', unitNo='str!', canLeave='bool!',
    failedChecks='list(ref(ReleaseCheck))!', explanation='str!', nextSteps='list(str)!')
sch('ApprovalRequest', True, approvalRequestId='id~', requestNo='str~', permissionCode='str!',
    entityName='str!', entityId='id!', summary='str!', reason='text!', amount='money?',
    amountCurrency='str?', payload='json?', levelsRequired='int~', currentLevel='int~',
    status='enum(PENDING|APPROVED|REJECTED|CANCELLED|EXPIRED)~', requestedBy='str~',
    requestedAt='datetime~', expiresAt='datetime~', decidedAt='datetime~', appliedAt='datetime~',
    steps='list(ref(ApprovalStep))~', canDecide='bool~')
sch('ApprovalStep', levelNo='int!', decision='enum(APPROVE|REJECT)!', decidedBy='str!',
    onBehalfOf='str?', note='str?', decidedAt='datetime!')
sch('ApprovalDecision', decision='enum(APPROVE|REJECT)!', note='text')
sch('ApprovalPolicy', True, approvalPolicyId='id~', permissionCode='str!', siteId='id?', amountFrom='money',
    amountCurrency='str?', levelsRequired='int!', expiresAfterHours='int', isActive='bool')
sch('Delegation', True, approvalDelegationId='id~', fromUserId='id!', toUserId='id!',
    permissionCode='str?', siteId='id?', validFrom='datetime!', validTo='datetime!', reason='str!',
    revokedAt='datetime~')
sch('ExceptionType', True, exceptionCode='str!', exceptionName='str!', severity=E_SEVERITY + '!',
    defaultRoleCode='str?', escalationRoleCode='str?', slaMinutes='int!', placesHoldTypeCode='str?',
    supervisorClose='bool', isActive='bool')
sch('ExceptionCase', True, exceptionCaseId='id~', caseNo='str~', exceptionCode='str!',
    severity=E_SEVERITY + '~', status='enum(OPEN|ASSIGNED|IN_PROGRESS|RESOLVED|CLOSED)~', title='str!',
    description='text?', entityName='str!', entityId='id!', unitStayId='id?', truckVisitId='id?',
    raisedBy='str~', raisedAt='datetime~', assignedRoleCode='str~', assignedTo='str~', dueAt='datetime~',
    isOverdue='bool~', escalationLevel='int~', holdId='id~', approvalRequestId='id~',
    resolutionCode='str~', resolutionNote='str~', resolvedAt='datetime~', closedAt='datetime~',
    comments='list(ref(ExceptionComment))~')
sch('ExceptionAssign', assignedTo='str', roleCode='str')
sch('ExceptionComment', exceptionCommentId='id~',
    kind='enum(COMMENT|ASSIGN|ESCALATE|STATUS|SYSTEM)~', text='text!', createdAt='datetime~',
    createdBy='str~')
sch('ExceptionResolve', resolutionCode='str!', note='text!')
sch('ResolutionCode', resolutionCode='str!', resolutionName='str!')

# ---------------------------------------------------------------- M3 commercial
sch('AccountingPeriod', True, accountingPeriodId='id~', companyId='id!', periodKey='str!',
    periodStart='date!', periodEnd='date!', status='enum(OPEN|CLOSED)~', closedAt='datetime~',
    closedBy='str~')
sch('GlSetting', True, settingKey='enum(AR_CONTROL|UNALLOCATED_RECEIPTS|DISBURSEMENT_CLEARING|FX_GAIN|FX_LOSS|ROUNDING|CASH_OVER_SHORT|REFUNDS_PAYABLE)!',
    glAccount='str!', description='str?')
sch('ExchangeRate', True, exchangeRateId='id~', companyId='id!', fromCurrency='str!', toCurrency='str!',
    rateDate='date!', rate='dec!', rateKind='enum(DAILY|MONTHLY)', sourceNote='str?')
sch('TaxCode', True, taxCodeId='id~', taxCode='str!', taxName='str!', countryCode='str!', ratePct='dec!',
    taxTreatment='enum(STANDARD|ZERO_RATED|EXEMPT|OUT_OF_SCOPE)!', fiscalTaxClass='str?',
    outputGlAccount='str?', effectiveFrom='date!', effectiveTo='date?', isActive='bool')
sch('ChargeCode', True, chargeCodeId='id~', chargeCode='str!', chargeName='str!',
    chargeGroup='enum(STORAGE|HANDLING|GATE|WEIGHING|INSPECTION|EXAMINATION|REEFER|DOCUMENTATION|VEHICLE|SPECIAL|DISBURSEMENT|OTHER)!',
    defaultTaxCode='str?', revenueGlAccount='str?', isDisbursement='bool', printOrder='int', isActive='bool')
sch('PaymentChannel', True, paymentChannelId='id~', companyId='id!', channelCode='str!', channelName='str!',
    method='enum(CASH|BANK_TRANSFER|MOBILE_MONEY|CARD|CHEQUE)!', provider='str?', currency='str!',
    glAccount='str?', referencePattern='str?', isActive='bool')
sch('Tariff', True, tariffId='id~', tariffCode='str!', tariffName='str!',
    level='enum(SITE|REGIME|LINE|CUSTOMER)!', companyId='id!', siteId='id?', partyId='id?',
    regimeCode='str?', currency='str!', versionNo='int~', effectiveFrom='date!', effectiveTo='date?',
    status='enum(DRAFT|PENDING_APPROVAL|ACTIVE|RETIRED|REJECTED)~', approvalRequestId='id~',
    regulatorRef='str?', remarks='text?', rules='list(ref(TariffRule))')
sch('TariffRule', tariffRuleId='id~', chargeCode='str!',
    basis='enum(PER_UNIT_DAY|PER_TEU_DAY|PER_UNIT|PER_TEU|PER_MOVE|PER_VISIT|PER_TONNE|PER_KWH|PER_HOUR|PER_PACKAGE|FLAT)!',
    unitCategory=E_CATEGORY + '?', unitTypeCode='str?', lengthFt='int?', vehicleClass='str?',
    fullEmpty=E_FE + '?', isReefer='bool?', isHazardous='bool?', clockStart='enum(DISCHARGE|GATE_IN)?',
    freeDays='int?', freeExclSundays='bool', freeExclHolidays='bool', flatRate='dec?', minCharge='money?',
    maxCharge='money?', taxCode='str?', sortOrder='int', slabs='list(ref(TariffSlab))')
sch('TariffSlab', fromQty='dec!', toQty='dec?', rate='dec!')
sch('TariffNewVersion', effectiveFrom='date!', copyRules='bool')
sch('RatingPreviewRequest', unitStayIds='list(id)!', throughDate='date!', billToPartyId='id',
    currency='str')
sch('RatingPreview', currency='str!', lines='list(ref(ChargeLine))!', subtotal='money!',
    taxTotal='money!', total='money!', freeUntil='datetime?', warnings='list(str)')
sch('ChargeLine', unitStayId='id?', unitNo='str?', chargeCode='str!', description='str!',
    serviceFrom='date?', serviceTo='date?', quantity='dec!', uom='str!', unitRate='dec!', amount='money!',
    taxCode='str?', taxAmount='money!', tariffCode='str?', tariffVersion='int?')
sch('BillableEvent', billableEventId='id~', chargeCode='str!', unitStayId='id?', truckVisitId='id?',
    consignmentId='id?', billToPartyId='id?', sourceEntity='str~', sourceId='id~', serviceDate='date!',
    occurredAt='datetime!', quantity='dec!', uom='str!', dayNo='int~',
    status='enum(UNRATED|RATED|NO_CHARGE|CANCELLED)~')
sch('ManualChargeRequest', chargeCode='str!', unitStayId='id', consignmentId='id', billToPartyId='id!',
    serviceDate='date!', quantity='dec!', unitRate='dec!', currency='str!', reason='text!')
sch('Charge', chargeId='id~', billableEventId='id~', billToPartyId='id~', chargeCode='str~',
    tariffCode='str~', tariffVersion='int~', currency='str~', quantity='dec~', unitRate='dec~',
    amount='money~', taxCode='str~', taxAmount='money~',
    kind='enum(NORMAL|MANUAL|WAIVER|REVERSAL|RERATE)~', reversesChargeId='id~',
    status='enum(OPEN|INVOICED|CREDITED|REVERSED)~', ratedAt='datetime~')
sch('WaiverRequest', chargeIds='list(id)!', percent='dec', reason='text!')
sch('Invoice', True, invoiceId='id~', docKind='enum(PROFORMA|TAX_INVOICE|CREDIT_NOTE|DEBIT_NOTE)~',
    invoiceNo='str~', status='enum(DRAFT|ISSUED|CONVERTED|POSTED|PART_PAID|PAID|CREDITED|CANCELLED)~',
    billToPartyId='id!', consignmentId='id?', releaseOrderId='id?', currency='str!', baseCurrency='str~',
    exchangeRate='dec~', exchangeRateDate='date~', invoiceDate='date~', dueDate='date?',
    serviceToDate='date?', subtotal='money~', taxTotal='money~', total='money~', totalBase='money~',
    amountPaid='money~', amountCredited='money~', balance='money~', proformaInvoiceId='id~',
    originalInvoiceId='id~', reason='str~', postedAt='datetime~', fiscalReceipt='ref(FiscalReceipt)~',
    lines='list(ref(InvoiceLine))~')
sch('InvoiceLine', invoiceLineId='id~', lineNo='int~', chargeId='id~', disbursementId='id~',
    chargeCode='str~', unitStayId='id~', unitNo='str~', description='str~', serviceFrom='date~',
    serviceTo='date~', quantity='dec~', uom='str~', unitRate='dec~', amount='money~', taxCode='str~',
    taxRatePct='dec~', taxAmount='money~', lineTotal='money~')
sch('ProformaCreate', billToPartyId='id!', currency='str!', throughDate='date!', unitStayIds='list(id)',
    consignmentId='id', releaseOrderId='id', includeDisbursements='bool')
sch('InvoiceFromProforma', proformaInvoiceId='id!')
sch('InvoiceCreate', billToPartyId='id!', currency='str!', chargeIds='list(id)', disbursementIds='list(id)',
    dueDate='date')
sch('CreditNoteCreate', originalInvoiceId='id!', lines='list(ref(NoteLineRequest))!', reason='text!')
sch('NoteLineRequest', invoiceLineId='id!', amount='money!')
sch('FiscalReceipt', provider='str!', status='enum(PENDING|ISSUED|FAILED)!', receiptNo='str?',
    verificationCode='str?', verificationUrl='str?', issuedAt='datetime?', attempts='int!',
    lastError='str?')
sch('CashierShift', True, cashierShiftId='id~', siteId='id~', cashierSub='str~', currency='str!',
    openedAt='datetime~', closedAt='datetime~', openingFloat='money', expectedCash='money~',
    countedCash='money~', difference='money~', status='enum(OPEN|CLOSED|APPROVED)~',
    approvalRequestId='id~')
sch('ShiftClose', countedCash='money!', note='text')
sch('Payment', True, paymentId='id~', receiptNo='str~', partyId='id!', channelCode='str!',
    externalRef='str?', currency='str!', amount='money!', exchangeRate='dec~', amountBase='money~',
    amountAllocated='money~', unallocated='money~', receivedAt='datetime!', valueDate='date?',
    status='enum(RECEIVED|PART_ALLOC|ALLOCATED|REVERSED|REFUNDED)~', cashierShiftId='id~',
    proofDocumentId='id?', allocate='list(ref(AllocationRequest))', allocations='list(ref(Allocation))~')
sch('AllocationRequest', invoiceId='id!', amount='money!')
sch('Allocation', paymentAllocationId='id!', invoiceId='id!', invoiceNo='str!', amount='money!',
    amountInvoiceCcy='money!', fxDifferenceBase='money!', allocatedAt='datetime!', reversedAt='datetime?')
sch('Refund', True, refundId='id~', refundNo='str~', paymentId='id!', currency='str!', amount='money!',
    reason='text!', approvalRequestId='id~', status='enum(APPROVED|PAID|CANCELLED)~', paidAt='datetime?',
    paidReference='str?')
sch('RefundPaid', paidAt='datetime!', paidReference='str!')
sch('Disbursement', True, disbursementId='id~', consignmentId='id!', unitStayId='id?', billToPartyId='id!',
    payeePartyId='id?', chargeCode='str!', description='str!', currency='str!', amountPaid='money!',
    paidAt='date!', payeeReceiptNo='str?', receiptDocumentId='id?',
    rebillMode='enum(AT_COST|COST_PLUS_FEE)', handlingFee='money',
    status='enum(RECORDED|INVOICED|WRITTEN_OFF)~')
sch('GlPosting', glPostingId='id!', sourceEntity='str!', sourceId='id!',
    destination='enum(NG_BILLING|ERP)!', postingDate='date!', status='enum(PENDING|POSTED|FAILED)!',
    externalRef='str?', attempts='int!', lastError='str?', postedAt='datetime?', journal='json')
sch('Statement', partyId='id!', currency='str!', fromDate='date!', toDate='date!', openingBalance='money!',
    lines='list(ref(StatementLine))!', closingBalance='money!', ageing='ref(Ageing)!')
sch('StatementLine', date='date!', docKind='str!', docNo='str!', reference='str?', debit='money!',
    credit='money!', balance='money!')
sch('Ageing', current='money!', days1to30='money!', days31to60='money!', days61to90='money!',
    over90='money!')

# ---------------------------------------------------------------- M4 insight
sch('ControlTower', generatedAt='datetime!', siteId='id!', exceptions='ref(ExceptionCounts)!',
    gateQueue='list(ref(GateQueueRow))!', blockedTrucks='list(ref(GateQueueRow))!',
    yardOccupancy='list(ref(OccupancySummary))!', todayIn='int!', todayOut='int!', planIn='int?',
    planOut='int?', pendingMoves='int!', equipment='list(ref(EquipmentStatus))!')
sch('ExceptionCounts', critical='int!', high='int!', medium='int!', low='int!', overdue='int!')
sch('GateQueueRow', truckVisitId='id!', plateNo='str?', visitTypeCode='str!', status='str!',
    checkpointCode='str?', waitingMinutes='int!', units='int!', blockedReason='str?')
sch('EquipmentStatus', equipmentId='id!', equipmentCode='str!', equipmentType='str!',
    operatorName='str?', movesToday='int!', status='enum(WORKING|IDLE|DOWN)!')
sch('Dashboard', code='str!', generatedAt='datetime!', tiles='list(ref(KpiTile))!', sections='json')
sch('KpiTile', kpiCode='str!', label='str!', value='dec!', unit='str?', comparison='dec?',
    comparisonLabel='str?', trend='list(ref(KpiPoint))', drillDownUrl='str?')
sch('KpiPoint', date='date!', value='dec!')
sch('KpiSeries', kpiCode='str!', dimensionKind='str', dimensionKey='str', points='list(ref(KpiPoint))!')
sch('ReportDefinition', reportCode='str!', reportName='str!',
    category='enum(OPERATIONAL|COMMERCIAL|COMPLIANCE)!', parameters='list(ref(ReportParam))!',
    formats='list(str)!', permissionCode='str!')
sch('ReportParam', name='str!', type='enum(date|dateRange|site|party|enum|text)!', required='bool!',
    options='list(str)')
sch('ReportRunRequest', parameters='json!', format='enum(XLSX|PDF|CSV|SCREEN)!')
sch('ReportRun', reportRunId='id~', reportCode='str~', status='enum(QUEUED|RUNNING|DONE|FAILED)~',
    rowCount='int~', documentId='id~', downloadUrl='str~', startedAt='datetime~', finishedAt='datetime~',
    errorText='str~', rows='json~')
sch('SavedReport', True, savedReportId='id~', reportCode='str!', reportName='str!', isShared='bool',
    siteId='id?', parameters='json?', scheduleCron='str?', scheduleFormat='enum(XLSX|PDF|CSV)?',
    recipients='str?', isActive='bool')
sch('InboxNotification', notificationId='id!', subject='str?', body='str!', link='ref(EntityLink)?',
    createdAt='datetime!', readAt='datetime?')
sch('NotificationTemplate', True, notificationTemplateId='id~', templateCode='str!', eventType=E_EVENT + '!',
    channel=E_CHANNEL + '!', languageCode=E_LANG + '!', subject='str?', body='text!', isActive='bool')
sch('NotificationRule', True, notificationRuleId='id~', eventType=E_EVENT + '!', templateCode='str!',
    recipientKind='enum(CONSIGNEE|AGENT|BILL_TO|TRANSPORTER|SHIPPING_LINE|ROLE|ASSIGNEE)!',
    roleCode='str?', siteId='id?', channel=E_CHANNEL + '!', onlyIf='json?', isActive='bool')
sch('PrintTemplate', True, printTemplateId='id~',
    docKind='enum(GATE_PASS|EIR|RELEASE_ORDER|PROFORMA|TAX_INVOICE|CREDIT_NOTE|DEBIT_NOTE|RECEIPT|STATEMENT|WEIGHT_TICKET|INSPECTION_REPORT|DAMAGE_REPORT|KEY_RECEIPT|DISBURSEMENT)!',
    companyId='id?', siteId='id?', languageCode=E_LANG, versionNo='int~', templateName='str!',
    templateHtml='text!', paperSize='enum(A4|A5|LETTER|THERMAL80)', defaultCopies='int',
    reprintWatermark='str?', status='enum(DRAFT|ACTIVE|RETIRED)~')
sch('PrintRequest', docKind='str!', entityName='str!', entityId='id!', copies='int', reason='str',
    languageCode=E_LANG)
sch('PrintResult', printLogId='id!', isReprint='bool!', pdfUrl='str!')
sch('AivaConversation', conversationId='uuid~', surface='enum(ICD_PANEL|NG|PORTAL)',
    contextEntity='str?', contextId='id?', startedAt='datetime~')
sch('AivaMessageRequest', content='text!')
sch('AivaMessage', aivaMessageId='id~', role='enum(USER|ASSISTANT)~', content='text~', createdAt='datetime~',
    toolCalls='list(ref(AivaToolCall))~', links='list(ref(EntityLink))~')
sch('AivaToolCall', toolName='str!', resultSummary='str?', wasDenied='bool!')
sch('AivaFeedback', feedback='int!', note='str')

# ---------------------------------------------------------------- M5 depth
sch('AppointmentSlotRule', True, appointmentSlotRuleId='id~', visitTypeCode='str?', weekday='int!',
    slotStart='time!', slotEnd='time!', capacityTrucks='int!', lateGraceMin='int', isActive='bool')
sch('AppointmentAvailability', date='date!', slots='list(ref(SlotAvailability))!')
sch('SlotAvailability', slotStart='datetime!', slotEnd='datetime!', capacity='int!', booked='int!',
    available='int!')
sch('Appointment', True, appointmentId='id~', appointmentNo='str~', visitTypeCode='str!',
    slotStart='datetime!', slotEnd='datetime!', transporterPartyId='id!', truckId='id?', driverId='id?',
    releaseOrderId='id?', consignmentId='id?',
    status='enum(BOOKED|ARRIVED|COMPLETED|MISSED|CANCELLED)~', truckVisitId='id~',
    bookedVia='enum(PORTAL|DESK|API)~')
sch('LabourContractor', True, labourContractorId='id~', partyId='id?', contractorName='str!',
    rateBasis='enum(PER_JOB|PER_PACKAGE|PER_TONNE|PER_HOUR)?', rate='dec?', currency='str?', isActive='bool')
sch('HandlingJob', True, handlingJobId='id~', jobNo='str~', jobKind='enum(STUFF|DESTUFF|RESTUFF|TRANSLOAD)!',
    containerStayId='id!', consignmentId='id?', workLocationId='id?',
    status='enum(PLANNED|IN_PROGRESS|COMPLETED|APPROVED|CANCELLED)~', plannedAt='datetime?',
    startedAt='datetime~', completedAt='datetime~', supervisorSub='str?', labourContractorId='id?',
    labourCount='int?', equipmentId='id?', sealRemoved='str?', sealApplied='str?',
    customsOfficerName='str?', remarks='text?', lines='list(ref(HandlingJobLine))')
sch('HandlingJobLine', handlingJobLineId='id~', lineNo='int!', lotStayId='id~', lotUnitNo='str~',
    consignmentLineId='id?', marksNumbers='str?', description='str?', packagesDeclared='int?',
    packagesCounted='int!', packageType='str?', weightKg='dec?', volumeCbm='dec?', shortQty='int',
    excessQty='int', damagedQty='int', damageNote='str?', placeAtLocationId='id?')
sch('LotBalance', lotStayId='id!', unitNo='str!', uom='str!', packageType='str?', qtyReceived='dec!',
    qtyDelivered='dec!', qtyBalance='dec!', weightReceivedKg='dec?', weightDeliveredKg='dec!')
sch('PortalInvitation', True, portalInvitationId='id~', partyId='id!', email='str!', roleCode='str!',
    expiresAt='datetime~', acceptedAt='datetime~', revokedAt='datetime~')
sch('InvitationAccept', token='str!')
sch('ServiceRequest', True, serviceRequestId='id~', requestNo='str~',
    requestKind='enum(DELIVERY|EMPTY_RETURN|DOCUMENT_SUBMISSION|FREE_DAY_EXTENSION|INVOICE_QUERY|DAMAGE_CLAIM|COMPLAINT|OTHER)!',
    partyId='id!', consignmentId='id?', unitStayId='id?', subject='str!', details='text?', payload='json?',
    status='enum(SUBMITTED|IN_REVIEW|NEEDS_INFO|APPROVED|REJECTED|CLOSED)~', assignedTo='str~',
    resultEntity='str~', resultId='id~', respondedAt='datetime~', closedAt='datetime~')
sch('ServiceRequestRespond', status='enum(IN_REVIEW|NEEDS_INFO|APPROVED|REJECTED|CLOSED)!',
    message='text!', resultEntity='str', resultId='id')
sch('ReeferSession', True, reeferSessionId='id~', unitStayId='id!', plugLocationId='id!', setTempC='dec!',
    pluggedAt='datetime!', unpluggedAt='datetime~', meterStartKwh='dec?', meterEndKwh='dec~',
    kwhUsed='dec~', readings='list(ref(ReeferReading))~')
sch('ReeferUnplug', unpluggedAt='datetime!', meterEndKwh='dec')
sch('ReeferReading', reeferReadingId='id~', readAt='datetime!', supplyTempC='dec?', returnTempC='dec?',
    setTempC='dec?', powerOn='bool?', alarmCode='str?', source='enum(MANUAL|IOT)', isOutOfRange='bool~')
sch('ImoClass', imoClass='str!', className='str!', parentClass='str?')
sch('SegregationRule', True, classA='str!', classB='str!',
    requirement='enum(NONE|AWAY_FROM|SEPARATED|SEP_COMPARTMENT|SEP_LONGITUDINAL|PROHIBITED)!',
    minDistanceM='dec?')
sch('DgLine', True, unitDgLineId='id~', unNo='str!', imoClass='str!', subsidiaryClass='str?',
    packingGroup='enum(I|II|III)?', properShippingName='str!', flashpointC='dec?', marinePollutant='bool',
    grossWeightKg='dec?', emergencyContact='str?')
sch('RepairCode', True, repairCode='str!', repairName='str!', defaultLabourHours='dec?', isActive='bool')
sch('RepairEstimate', True, repairEstimateId='id~', estimateNo='str~', unitStayId='id!', inspectionId='id?',
    approverPartyId='id!', currency='str!', labourRate='dec?', totalLabour='money~', totalMaterial='money~',
    totalAmount='money~', status='enum(DRAFT|SENT|APPROVED|REJECTED|PARTIAL|COMPLETED|CANCELLED)~',
    sentAt='datetime~', approverRef='str?', decidedAt='datetime~', completedAt='datetime~',
    lines='list(ref(RepairEstimateLine))')
sch('RepairEstimateLine', repairEstimateLineId='id~', lineNo='int!', inspectionFindingId='id?',
    repairCode='str!', locationDetail='str?', quantity='dec', labourHours='dec', labourCost='money',
    materialCost='money', responsibility='enum(OWNER|USER|DEPOT)',
    lineStatus='enum(PROPOSED|APPROVED|REJECTED|DONE)~')
sch('EstimateDecision', approverRef='str', lines='list(ref(LineDecision))!')
sch('LineDecision', repairEstimateLineId='id!', decision='enum(APPROVED|REJECTED)!')
sch('DeviceIntegration', True, deviceIntegrationId='id~',
    integrationKind='enum(ANPR|CONTAINER_OCR|WEIGHBRIDGE|CCTV|RFID|BARRIER|REEFER_IOT)!', gateLaneId='id?',
    checkpointId='id?', vendor='str?', model='str?', config='json?', secretRef='str?',
    gateAgentDeviceId='id?', laneMode='enum(MANUAL|ASSISTED|AUTOMATIC)', isActive='bool')
sch('DeviceReadIngest', deviceIntegrationId='id!', reads='list(ref(DeviceReadIn))!')
sch('DeviceReadIn', readKind='enum(PLATE|CONTAINER_NO|WEIGHT|TAG|CLIP_REF|TEMP)!', readValue='str!',
    confidence='dec', imageStorageKey='str', readAt='datetime!')
sch('DeviceRead', deviceReadId='id!', deviceIntegrationId='id!', readKind='str!', readValue='str!',
    confidence='dec?', readAt='datetime!', matchedVisitId='id?',
    matchStatus='enum(PENDING|MATCHED|UNMATCHED|IGNORED)!')
sch('DeviceIngestResult', accepted='int!', matched='int!')
sch('IntegrationMessage', integrationMessageId='id!',
    partnerSystem='enum(SHIPPING_LINE|CUSTOMS|PORT|BANK|MOBILE_MONEY|OTHER)!', partnerPartyId='id?',
    direction='enum(IN|OUT)!', messageType='str!', format='enum(EDIFACT|XML|JSON|CSV|EXCEL)!',
    correlationRef='str?', relatedEntity='str?', relatedId='id?',
    status='enum(PENDING|SENT|RECEIVED|PROCESSED|FAILED|REJECTED)!', attempts='int!', lastError='str?',
    processedAt='datetime?', createdAt='datetime!')

# ---------------------------------------------------------------- M6 intelligence
sch('ModelVersion', mlModelVersionId='id!', modelCode='str!', versionLabel='str!', trainedAt='datetime!',
    metrics='json?', isActive='bool!')
sch('DwellPrediction', unitStayId='id!', predictedExitDate='date!', p50Days='dec!', p90Days='dec?',
    modelVersion='str!', predictedAt='datetime!')
sch('OccupancyForecast', siteId='id!', yardLocationId='id?', fullCode='str?', forecastDate='date!',
    predictedPct='dec!', lowerPct='dec?', upperPct='dec?', modelVersion='str!')
sch('AivaDraft', aivaDraftActionId='id~', aivaMessageId='id~', actionKind='str~', targetEntity='str~',
    targetIds='json~', payload='json', status='enum(DRAFT|SUBMITTED|DISCARDED|EXPIRED)~',
    approvalRequestId='id~', resultEntity='str~', resultId='id~')
sch('YardSuggestionLog', yardSuggestionLogId='id!', unitStayId='id!', engine='enum(RULES|ML)!',
    chosenRank='int?', overrideReason='str?', suggestedAt='datetime!')

# ---------------------------------------------------------------- events
sch('EventEnvelope', eventId='uuid!', eventType=E_EVENT + '!', eventVersion='int!', tenantCode='str!',
    siteId='id?', occurredAt='datetime!', aggregateType='str!', aggregateId='id!', correlationId='uuid?',
    payload='json!')
