const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:4000/api${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log('Testing Ops Endpoints...');

  // 1. CFS Handling Jobs
  const cfsJobs = await get('/handling-jobs');
  console.log('GET /api/handling-jobs:', cfsJobs.status, Array.isArray(cfsJobs.body) ? `Array[${cfsJobs.body.length}]` : cfsJobs.body);

  // 2. CFS Lots
  const cfsLots = await get('/lots/balances');
  console.log('GET /api/lots/balances:', cfsLots.status, Array.isArray(cfsLots.body) ? `Array[${cfsLots.body.length}]` : cfsLots.body);

  // 3. Reefers
  const reefers = await get('/reefers');
  console.log('GET /api/reefers:', reefers.status, Array.isArray(reefers.body) ? `Array[${reefers.body.length}]` : reefers.body);

  // 4. Repairs
  const repairs = await get('/repairs');
  console.log('GET /api/repairs:', repairs.status, Array.isArray(repairs.body) ? `Array[${repairs.body.length}]` : repairs.body);

  // 5. Inspections
  const insp = await get('/inspections');
  console.log('GET /api/inspections:', insp.status, Array.isArray(insp.body) ? `Array[${insp.body.length}]` : insp.body);

  // 6. Weighings
  const weigh = await get('/weighings');
  console.log('GET /api/weighings:', weigh.status, Array.isArray(weigh.body) ? `Array[${weigh.body.length}]` : weigh.body);
}

test().catch(console.error);

