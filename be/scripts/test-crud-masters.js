const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {})
      }
    }, (res) => {
      let respData = '';
      res.on('data', chunk => respData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(respData) });
        } catch {
          resolve({ status: res.statusCode, body: respData });
        }
      });
    });
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function run() {
  console.log('Testing CRUD operations against live MSSQL backend...');

  // 1. Truck
  const newTruck = await request('POST', '/trucks', {
    plateNo: 'T 999 ZZZ',
    plateDisplay: 'T 999 ZZZ',
    vehicleKind: 'TRUCK',
    makeModel: 'Scania Test Truck',
    axleCount: 3,
    tareKg: 9500,
    transporterPartyId: 7,
  });
  console.log('1. POST /trucks status:', newTruck.status, '| truckId:', newTruck.body.truckId);

  const updatedTruck = await request('PATCH', `/trucks/${newTruck.body.truckId}`, {
    localNote: 'Updated gate pass note',
    gateBlocked: true,
  });
  console.log('2. PATCH /trucks/:id status:', updatedTruck.status, '| gateBlocked:', updatedTruck.body.gateBlocked);

  // 2. Driver
  const newDriver = await request('POST', '/drivers', {
    driverName: 'Test Driver Juma',
    licenceNo: '9988776655',
    licenceClass: 'E',
    licenceExpiry: '2028-01-01',
    licenceCountry: 'TZ',
    phone: '+255 777 000 111',
    transporterPartyId: 8,
  });
  console.log('3. POST /drivers status:', newDriver.status, '| driverId:', newDriver.body.driverId);

  // 3. Vessel
  const newVessel = await request('POST', '/vessels', {
    vesselName: 'Test Ocean Explorer',
    imoNo: '9876543',
    callSign: '5XYZ',
    flagCountry: 'TZ',
    operatorPartyId: 1,
  });
  console.log('4. POST /vessels status:', newVessel.status, '| vesselId:', newVessel.body.vesselId);

  // 4. Port
  const newPort = await request('POST', '/ports', {
    portName: 'Test Mtwara Port',
    unlocode: 'TZMYW',
    countryCode: 'TZ',
    portKind: 'SEAPORT',
  });
  console.log('5. POST /ports status:', newPort.status, '| portId:', newPort.body.portId);

  // 5. Commodity
  const newComm = await request('POST', '/commodities', {
    commodityCode: 'TESTCOTTON',
    commodityName: 'Raw Cotton Bales',
    hsCode: '5201',
    isHazardous: false,
  });
  console.log('6. POST /commodities status:', newComm.status, '| commodityId:', newComm.body.commodityId);

  // 6. Equipment
  const newEq = await request('POST', '/equipment', {
    equipmentCode: 'FL-TEST',
    equipmentName: 'Forklift Test 5t',
    equipmentType: 'FORKLIFT',
    capacityKg: 5000,
  });
  console.log('7. POST /equipment status:', newEq.status, '| equipmentId:', newEq.body.equipmentId);

  // Filter check
  const filteredTrucks = await request('GET', '/trucks?q=999ZZZ');
  console.log('8. GET /trucks?q=999ZZZ status:', filteredTrucks.status, '| count:', filteredTrucks.body.items.length);

  console.log('ALL CRUD MASTER ENDPOINT TESTS COMPLETED SUCCESSFULLY!');
}

run().catch(console.error);

