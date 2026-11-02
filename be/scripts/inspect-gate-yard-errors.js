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

async function inspect() {
  const eps = [
    '/gate/visits',
    '/gate/queue',
    '/gate/lanes',
    '/appointments',
    '/yard/map',
    '/moves'
  ];

  for (const ep of eps) {
    const res = await get(ep);
    console.log(`=== ${ep} (status ${res.status}) ===`);
    console.log(res.body?.error || res.body?.message || JSON.stringify(res.body));
  }
}

inspect();

