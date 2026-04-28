const http = require('http');

async function test() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const session = await prisma.session.findFirst({ where: { active: true } });
    if (!session) {
      console.log('No active session found.');
      return;
    }
    const sessionId = session.id;

    const postData = JSON.stringify({
      type: 'Medical Emergency',
      description: 'Test incident from http script',
      floor: 'Floor 1',
      sessionId: sessionId
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/incident',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Body:', data);
        prisma.$disconnect();
      });
    });

    req.on('error', (e) => {
      console.error('Request Error:', e.message);
      prisma.$disconnect();
    });

    req.write(postData);
    req.end();

  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
