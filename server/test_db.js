const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  console.log('Testing connection...');
  const timeout = setTimeout(() => {
    console.error('Connection timed out after 10s');
    process.exit(1);
  }, 10000);

  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('Database Result:', result);
    clearTimeout(timeout);
  } catch (err) {
    console.error('Database Error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
test();
