const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cc = await prisma.$queryRawUnsafe(`
    SELECT tc.TABLE_NAME, cc.CONSTRAINT_NAME, cc.CHECK_CLAUSE 
    FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_NAME IN ('approval_request', 'notification', 'app_user')
  `);
  console.log('Constraints:', cc);

  const user = await prisma.app_user.findFirst({
    include: {
      user_site_role: {
        include: {
          m_role: true,
          m_site: true
        }
      }
    }
  });
  console.log('User 1:', user);

  const notifCount = await prisma.notification.count();
  console.log('Notification count:', notifCount);

  const apprvCount = await prisma.approval_request.count();
  console.log('Approval count:', apprvCount);

  await prisma.$disconnect();
}

main().catch(console.error);

