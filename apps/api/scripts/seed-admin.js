const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Admin settings, disputes, and student profiles...');

  // 1. Update students with department & colleges
  await prisma.user.updateMany({
    where: { studentId: { contains: 'CS' } },
    data: { department: 'Computer Science & Engineering', college: 'School of Computing' }
  });
  await prisma.user.updateMany({
    where: { studentId: { contains: 'EE' } },
    data: { department: 'Electrical & Electronics Engineering', college: 'School of Electrical Technology' }
  });
  await prisma.user.updateMany({
    where: { studentId: { contains: 'ME' } },
    data: { department: 'Mechanical Engineering', college: 'School of Mechanical Sciences' }
  });

  // Set any null departments for other students
  const studentsWithoutDept = await prisma.user.findMany({
    where: { role: 'STUDENT', department: null }
  });
  const depts = ['Civil Engineering', 'Information Technology', 'Biotechnology', 'Chemical Engineering', 'Management Studies'];
  for (let i = 0; i < studentsWithoutDept.length; i++) {
    await prisma.user.update({
      where: { id: studentsWithoutDept[i].id },
      data: {
        department: depts[i % depts.length],
        college: 'Main Engineering Campus',
        isEmailVerified: i % 4 !== 0, // make 1 or 2 pending verification for realistic review!
        isSuspended: i === 1 // make 1 suspended for testing
      }
    });
  }

  // 2. Admin Settings
  const settings = [
    { key: 'marketplace_name', value: JSON.stringify('CampusBid Verified Marketplace') },
    { key: 'campus_name', value: JSON.stringify('National Institute of Engineering & Technology') },
    { key: 'support_email', value: JSON.stringify('marketplace-support@campus.edu') },
    { key: 'anti_sniping_extension_seconds', value: JSON.stringify(60) },
    { key: 'anti_sniping_trigger_seconds', value: JSON.stringify(30) },
    { key: 'default_min_increment_cents', value: JSON.stringify(5000) },
    { key: 'seller_decision_deadline_hours', value: JSON.stringify(24) },
    { key: 'verification_policy', value: JSON.stringify('INSTITUTIONAL_EMAIL_AND_STUDENT_ID') },
    { key: 'auto_proxy_bidding_enabled', value: JSON.stringify(true) }
  ];

  for (const s of settings) {
    await prisma.adminSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s
    });
  }

  // 3. Sample Disputes
  const studentUsers = await prisma.user.findMany({ where: { role: 'STUDENT' }, take: 4 });
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const listings = await prisma.auctionListing.findMany({ take: 3 });

  if (studentUsers.length >= 2 && listings.length > 0) {
    const existingDisputes = await prisma.dispute.count();
    if (existingDisputes === 0) {
      await prisma.dispute.createMany({
        data: [
          {
            reporterId: studentUsers[1].id,
            reportedUserId: studentUsers[0].id,
            listingId: listings[0].id,
            category: 'FAILED_HANDOVER',
            description: 'The winning bid was accepted yesterday, but the seller failed to show up at the designated Library Lawn pickup location after 45 minutes of waiting.',
            priority: 'HIGH',
            status: 'OPEN',
            assignedAdminId: adminUser ? adminUser.id : null,
            internalNotes: 'Contacted seller via campus email to check reason for delay.'
          },
          {
            reporterId: studentUsers[0].id,
            reportedUserId: studentUsers[1].id,
            listingId: listings.length > 1 ? listings[1].id : listings[0].id,
            category: 'MISLEADING_DESCRIPTION',
            description: 'Item condition was listed as LIKE_NEW, but upon meeting for inspection, there are clear cracks and battery corrosion.',
            priority: 'MEDIUM',
            status: 'UNDER_REVIEW',
            assignedAdminId: adminUser ? adminUser.id : null,
            internalNotes: 'Reviewing listing photos vs provided photos from buyer.'
          },
          {
            reporterId: studentUsers[1].id,
            reportedUserId: studentUsers[0].id,
            category: 'SUSPICIOUS_BIDDING',
            description: 'Unusual rapid bid spikes within seconds from the same group of campus aliases.',
            priority: 'URGENT',
            status: 'WAITING_FOR_INFORMATION',
            internalNotes: 'Checked IP and session logs; awaiting statement.'
          }
        ]
      });
      console.log('Sample disputes created!');
    }
  }

  console.log('Admin settings, student profiles, and disputes seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
