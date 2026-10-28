import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial campus data...');

  // 1. Seed Categories
  const categories = [
    { name: 'Books & Study Materials', slug: 'books-study', icon: 'BookOpen', description: 'Engineering textbooks, lecture notes, reference guides' },
    { name: 'Electronics & Gadgets', slug: 'electronics', icon: 'Laptop', description: 'Laptops, monitors, chargers, headphones, keyboards' },
    { name: 'Bicycles & Transport', slug: 'bicycles', icon: 'Bike', description: 'Geared/single speed campus cycles, locks, helmets' },
    { name: 'Calculators & Lab Tools', slug: 'calculators-tools', icon: 'Calculator', description: 'Scientific calculators, drafters, breadboards, toolkits' },
    { name: 'Hostel & Room Essentials', slug: 'hostel-essentials', icon: 'Home', description: 'Study lamps, kettles, mattress pads, laundry bags' },
    { name: 'Sports & Fitness', slug: 'sports-fitness', icon: 'Trophy', description: 'Badminton rackets, footballs, gym gear' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // 2. Seed Users (Admin + Demo Students)
  const passwordHash = await bcrypt.hash('CampusPassword123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@campus.edu' },
    update: {},
    create: {
      email: 'admin@campus.edu',
      passwordHash,
      fullName: 'Campus Administrator',
      campusAlias: 'AdminOfficial',
      studentId: 'ADM-001',
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  const student1 = await prisma.user.upsert({
    where: { email: 'aarav.sharma@campus.edu' },
    update: {},
    create: {
      email: 'aarav.sharma@campus.edu',
      passwordHash,
      fullName: 'Aarav Sharma',
      campusAlias: 'Aarav_Tech',
      studentId: 'CS2023-042',
      role: 'STUDENT',
      isEmailVerified: true,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'priya.patel@campus.edu' },
    update: {},
    create: {
      email: 'priya.patel@campus.edu',
      passwordHash,
      fullName: 'Priya Patel',
      campusAlias: 'PriyaP',
      studentId: 'EE2024-118',
      role: 'STUDENT',
      isEmailVerified: true,
    },
  });

  const student3 = await prisma.user.upsert({
    where: { email: 'rohan.verma@campus.edu' },
    update: {},
    create: {
      email: 'rohan.verma@campus.edu',
      passwordHash,
      fullName: 'Rohan Verma',
      campusAlias: 'RohanV',
      studentId: 'ME2022-085',
      role: 'STUDENT',
      isEmailVerified: true,
    },
  });

  // 3. Seed Sample Listings
  const cycleCat = await prisma.category.findUnique({ where: { slug: 'bicycles' } });
  const calcCat = await prisma.category.findUnique({ where: { slug: 'calculators-tools' } });
  const bookCat = await prisma.category.findUnique({ where: { slug: 'books-study' } });
  const electroCat = await prisma.category.findUnique({ where: { slug: 'electronics' } });

  const now = new Date();

  // Listing 1: Active Bicycle closing in 2 hours
  const cycleListing = await prisma.auctionListing.create({
    data: {
      sellerId: student1.id,
      categoryId: cycleCat!.id,
      title: 'Hercules 21-Speed Mountain Bike (Great condition, newly serviced)',
      description: 'Used for 2 semesters only. Smooth Shimano gears, dual disc brakes, front shock absorbers. Includes a sturdy steel combination lock and bell. Moving out of hostel next week.',
      condition: 'GOOD',
      startingPriceInCents: 250000, // ₹2,500.00
      minIncrementInCents: 10000,   // ₹100.00
      currentLeadingBidInCents: 270000, // ₹2,700.00
      status: 'ACTIVE',
      startTime: new Date(now.getTime() - 24 * 3600 * 1000),
      closingTime: new Date(now.getTime() + 2 * 3600 * 1000), // closes in 2 hours
      pickupLocation: 'Hostel Block 4 Bicycle Stand / Main Campus Gate',
      sellerNotes: 'Available for inspection between 5 PM and 8 PM every evening.',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
          { url: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=800&q=80', displayOrder: 1 },
        ],
      },
      bids: {
        create: [
          { bidderId: student2.id, amountInCents: 250000, acceptedAt: new Date(now.getTime() - 12 * 3600 * 1000) },
          { bidderId: student3.id, amountInCents: 260000, acceptedAt: new Date(now.getTime() - 6 * 3600 * 1000) },
          { bidderId: student2.id, amountInCents: 270000, acceptedAt: new Date(now.getTime() - 1 * 3600 * 1000) },
        ],
      },
      questions: {
        create: [
          {
            askerId: student3.id,
            content: 'Are the tires recently replaced or stock?',
            answers: {
              create: [
                { sellerId: student1.id, content: 'Rear tire replaced last month with a puncture-resistant tube!' }
              ]
            }
          }
        ]
      }
    },
  });

  // Listing 2: Casio Scientific Calculator
  await prisma.auctionListing.create({
    data: {
      sellerId: student2.id,
      categoryId: calcCat!.id,
      title: 'Casio fx-991EX ClassWiz Scientific Calculator',
      description: 'Approved for university engineering examinations. High-resolution spreadsheet display, matrix calculations, solar + battery backup. Pristine condition with original hard slide case.',
      condition: 'LIKE_NEW',
      startingPriceInCents: 60000, // ₹600.00
      minIncrementInCents: 5000,   // ₹50.00
      currentLeadingBidInCents: 75000, // ₹750.00
      status: 'ACTIVE',
      startTime: new Date(now.getTime() - 48 * 3600 * 1000),
      closingTime: new Date(now.getTime() + 15 * 60 * 1000), // Closes in 15 mins (Closing soon!)
      pickupLocation: 'Central Library Ground Floor Help Desk',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
        ],
      },
      bids: {
        create: [
          { bidderId: student1.id, amountInCents: 60000, acceptedAt: new Date(now.getTime() - 20 * 3600 * 1000) },
          { bidderId: student3.id, amountInCents: 75000, acceptedAt: new Date(now.getTime() - 2 * 3600 * 1000) },
        ],
      },
    },
  });

  // Listing 3: Complete CLRS Algorithms & Operating Systems Concept Textbooks
  await prisma.auctionListing.create({
    data: {
      sellerId: student3.id,
      categoryId: bookCat!.id,
      title: 'Introduction to Algorithms (CLRS 4th Ed) + Silberschatz OS Book Set',
      description: 'Standard computer science textbooks bundle. Free of markings and highlighter stains. Clean spine and intact pages. Perfect for CS juniors.',
      condition: 'GOOD',
      startingPriceInCents: 80000, // ₹800.00
      minIncrementInCents: 5000,   // ₹50.00
      currentLeadingBidInCents: 0,
      status: 'ACTIVE',
      startTime: new Date(now.getTime() - 2 * 3600 * 1000),
      closingTime: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
      pickupLocation: 'Computer Science Department Reception',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
        ],
      },
    },
  });

  // Listing 4: Mechanical Keyboard with Blue Switches
  await prisma.auctionListing.create({
    data: {
      sellerId: student1.id,
      categoryId: electroCat!.id,
      title: 'Redragon K552 RGB Mechanical Gaming & Coding Keyboard',
      description: 'Solid aluminum frame, hot-swappable tactile switches, full RGB backlighting with multiple profiles. Cleaned and sanitized.',
      condition: 'LIKE_NEW',
      startingPriceInCents: 120000, // ₹1,200.00
      minIncrementInCents: 5000,    // ₹50.00
      currentLeadingBidInCents: 140000, // ₹1,400.00
      status: 'ACTIVE',
      startTime: new Date(now.getTime() - 10 * 3600 * 1000),
      closingTime: new Date(now.getTime() + 1 * 24 * 3600 * 1000),
      pickupLocation: 'Campus Cafeteria Entrance',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
        ],
      },
      bids: {
        create: [
          { bidderId: student2.id, amountInCents: 120000, acceptedAt: new Date(now.getTime() - 8 * 3600 * 1000) },
          { bidderId: student3.id, amountInCents: 140000, acceptedAt: new Date(now.getTime() - 3 * 3600 * 1000) },
        ],
      },
    },
  });

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
