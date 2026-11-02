const http = require('http');

function get(path) {
  return new Promise((resolve) => {
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
    }).on('error', (err) => resolve({ status: 500, error: err.message }));
  });
}

async function run() {
  const eps = [
    '/gate/visits',
    '/truck-visits',
    '/gate/queue',
    '/gate/lanes',
    '/appointments',
    '/yard/map',
    '/moves',
    '/yard/moves'
  ];

  for (const ep of eps) {
    const res = await get(ep);
    let count = 0;
    if (res.body?.items && Array.isArray(res.body.items)) {
      count = res.body.items.length;
    } else if (Array.isArray(res.body)) {
      count = res.body.length;
    } else if (res.body && typeof res.body === 'object') {
      count = Object.keys(res.body).length;
    }
    console.log(`GET /api${ep} -> Status: ${res.status}, Count: ${count}${res.status !== 200 ? ' ERR: ' + JSON.stringify(res.body).substring(0, 120) : ''}`);
  }
}

run();

