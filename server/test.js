const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    let session = await prisma.session.findFirst({ where: { active: true } });
    if (!session) {
      session = await prisma.session.create({
        data: {
          sessionCode: 'TEST-' + Math.floor(Math.random()*1000),
          domain: 'HOSPITAL',
          active: true
        }
      });
      console.log('Created new session:', session.id);
    } else {
      console.log('Found active session:', session.id);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
