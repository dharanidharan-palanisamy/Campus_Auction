import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import {
  User,
  Category,
  AuctionListing,
  Bid,
  Question,
} from '../models';

async function main() {
  console.log('Seeding initial campus data to MongoDB...');
  await connectDatabase();

  // 1. Seed Categories
  const categories = [
    { name: 'Books & Study Materials', slug: 'books-study', icon: 'BookOpen', description: 'Engineering textbooks, lecture notes, reference guides' },
    { name: 'Electronics & Gadgets', slug: 'electronics', icon: 'Laptop', description: 'Laptops, monitors, chargers, headphones, keyboards' },
    { name: 'Bicycles & Transport', slug: 'bicycles', icon: 'Bike', description: 'Geared/single speed campus cycles, locks, helmets' },
    { name: 'Calculators & Lab Tools', slug: 'calculators-tools', icon: 'Calculator', description: 'Scientific calculators, drafters, breadboards, toolkits' },
    { name: 'Hostel & Room Essentials', slug: 'hostel-essentials', icon: 'Home', description: 'Study lamps, kettles, mattress pads, laundry bags' },
    { name: 'Sports & Fitness', slug: 'sports-fitness', icon: 'Trophy', description: 'Badminton rackets, footballs, gym gear' },
  ];

  const catMap = new Map<string, any>();
  for (const cat of categories) {
    const c = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { ...cat, isActive: true },
      { upsert: true, new: true }
    );
    catMap.set(cat.slug, c);
  }

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('CampusPassword123!', 10);

  const admin = await User.findOneAndUpdate(
    { email: 'admin@campus.edu' },
    {
      email: 'admin@campus.edu',
      passwordHash,
      fullName: 'Campus Administrator',
      campusAlias: 'AdminOfficial',
      studentId: 'ADM-001',
      role: 'ADMIN',
      isEmailVerified: true,
      verificationStatus: 'VERIFIED',
      accountStatus: 'ACTIVE',
    },
    { upsert: true, new: true }
  );

  const student1 = await User.findOneAndUpdate(
    { email: 'aarav.sharma@campus.edu' },
    {
      email: 'aarav.sharma@campus.edu',
      passwordHash,
      fullName: 'Aarav Sharma',
      campusAlias: 'Aarav_Tech',
      studentId: 'CS2023-042',
      role: 'STUDENT',
      department: 'Computer Science',
      college: 'Main Engineering Block',
      isEmailVerified: true,
      verificationStatus: 'VERIFIED',
      accountStatus: 'ACTIVE',
    },
    { upsert: true, new: true }
  );

  const student2 = await User.findOneAndUpdate(
    { email: 'priya.patel@campus.edu' },
    {
      email: 'priya.patel@campus.edu',
      passwordHash,
      fullName: 'Priya Patel',
      campusAlias: 'PriyaP',
      studentId: 'EE2024-118',
      role: 'STUDENT',
      department: 'Electrical Engineering',
      college: 'East Campus',
      isEmailVerified: true,
      verificationStatus: 'VERIFIED',
      accountStatus: 'ACTIVE',
    },
    { upsert: true, new: true }
  );

  const student3 = await User.findOneAndUpdate(
    { email: 'rohan.verma@campus.edu' },
    {
      email: 'rohan.verma@campus.edu',
      passwordHash,
      fullName: 'Rohan Verma',
      campusAlias: 'RohanV',
      studentId: 'ME2022-085',
      role: 'STUDENT',
      department: 'Mechanical Engineering',
      college: 'West Campus',
      isEmailVerified: true,
      verificationStatus: 'VERIFIED',
      accountStatus: 'ACTIVE',
    },
    { upsert: true, new: true }
  );

  const now = new Date();

  // Clean existing listings for a fresh deterministic seed
  await AuctionListing.deleteMany({});
  await Bid.deleteMany({});
  await Question.deleteMany({});

  // Listing 1: Mountain Bike
  const cycleListing = await AuctionListing.create({
    sellerId: student1._id,
    categoryId: catMap.get('bicycles')._id,
    title: 'Hercules 21-Speed Mountain Bike (Great condition, newly serviced)',
    description:
      'Used for 2 semesters only. Smooth Shimano gears, dual disc brakes, front shock absorbers. Includes a sturdy steel combination lock and bell. Moving out of hostel next week.',
    condition: 'GOOD',
    startingPriceInCents: 250000, // ₹2,500.00
    minIncrementInCents: 10000, // ₹100.00
    currentLeadingBidInCents: 270000, // ₹2,700.00
    status: 'ACTIVE',
    startTime: new Date(now.getTime() - 24 * 3600 * 1000),
    closingTime: new Date(now.getTime() + 2 * 3600 * 1000), // closes in 2 hours
    pickupLocation: 'Hostel Block 4 Bicycle Stand / Main Campus Gate',
    sellerNotes: 'Available for inspection between 5 PM and 8 PM every evening.',
    images: [
      { url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
      { url: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=800&q=80', displayOrder: 1 },
    ],
  });

  // Bids for listing 1
  const b1_1 = await Bid.create({
    listingId: cycleListing._id,
    bidderId: student2._id,
    amountInCents: 250000,
    acceptedAt: new Date(now.getTime() - 12 * 3600 * 1000),
  });
  const b1_2 = await Bid.create({
    listingId: cycleListing._id,
    bidderId: student3._id,
    amountInCents: 260000,
    acceptedAt: new Date(now.getTime() - 6 * 3600 * 1000),
  });
  const b1_3 = await Bid.create({
    listingId: cycleListing._id,
    bidderId: student2._id,
    amountInCents: 270000,
    acceptedAt: new Date(now.getTime() - 1 * 3600 * 1000),
  });

  cycleListing.leadingBidId = b1_3._id;
  await cycleListing.save();

  // Q&A for listing 1
  await Question.create({
    listingId: cycleListing._id,
    askerId: student3._id,
    content: 'Are the tires recently replaced or stock?',
    answers: [
      {
        sellerId: student1._id,
        content: 'Rear tire replaced last month with a puncture-resistant tube!',
        createdAt: new Date(now.getTime() - 5 * 3600 * 1000),
      },
    ],
  });

  // Listing 2: Casio Scientific Calculator (Closing soon!)
  const calcListing = await AuctionListing.create({
    sellerId: student2._id,
    categoryId: catMap.get('calculators-tools')._id,
    title: 'Casio fx-991EX ClassWiz Scientific Calculator',
    description:
      'Approved for university engineering examinations. High-resolution spreadsheet display, matrix calculations, solar + battery backup. Pristine condition with original hard slide case.',
    condition: 'LIKE_NEW',
    startingPriceInCents: 60000, // ₹600.00
    minIncrementInCents: 5000, // ₹50.00
    currentLeadingBidInCents: 75000, // ₹750.00
    status: 'ACTIVE',
    startTime: new Date(now.getTime() - 48 * 3600 * 1000),
    closingTime: new Date(now.getTime() + 15 * 60 * 1000), // Closes in 15 mins (Closing soon!)
    pickupLocation: 'Central Library Ground Floor Help Desk',
    images: [
      { url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
    ],
  });

  const b2_1 = await Bid.create({
    listingId: calcListing._id,
    bidderId: student1._id,
    amountInCents: 60000,
    acceptedAt: new Date(now.getTime() - 20 * 3600 * 1000),
  });
  const b2_2 = await Bid.create({
    listingId: calcListing._id,
    bidderId: student3._id,
    amountInCents: 75000,
    acceptedAt: new Date(now.getTime() - 2 * 3600 * 1000),
  });

  calcListing.leadingBidId = b2_2._id;
  await calcListing.save();

  // Listing 3: Algorithms & OS Books
  await AuctionListing.create({
    sellerId: student3._id,
    categoryId: catMap.get('books-study')._id,
    title: 'Introduction to Algorithms (CLRS 4th Ed) + Silberschatz OS Book Set',
    description:
      'Standard computer science textbooks bundle. Free of markings and highlighter stains. Clean spine and intact pages. Perfect for CS juniors.',
    condition: 'GOOD',
    startingPriceInCents: 80000, // ₹800.00
    minIncrementInCents: 5000, // ₹50.00
    currentLeadingBidInCents: 0,
    status: 'ACTIVE',
    startTime: new Date(now.getTime() - 2 * 3600 * 1000),
    closingTime: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
    pickupLocation: 'Computer Science Department Reception',
    images: [
      { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
    ],
  });

  // Listing 4: Mechanical Keyboard
  const kbListing = await AuctionListing.create({
    sellerId: student1._id,
    categoryId: catMap.get('electronics')._id,
    title: 'Redragon K552 RGB Mechanical Gaming & Coding Keyboard',
    description:
      'Solid aluminum frame, hot-swappable tactile switches, full RGB backlighting with multiple profiles. Cleaned and sanitized.',
    condition: 'LIKE_NEW',
    startingPriceInCents: 120000, // ₹1,200.00
    minIncrementInCents: 5000, // ₹50.00
    currentLeadingBidInCents: 140000, // ₹1,400.00
    status: 'ACTIVE',
    startTime: new Date(now.getTime() - 10 * 3600 * 1000),
    closingTime: new Date(now.getTime() + 1 * 24 * 3600 * 1000),
    pickupLocation: 'Campus Cafeteria Entrance',
    images: [
      { url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', displayOrder: 0 },
    ],
  });

  const b4_1 = await Bid.create({
    listingId: kbListing._id,
    bidderId: student2._id,
    amountInCents: 120000,
    acceptedAt: new Date(now.getTime() - 8 * 3600 * 1000),
  });
  const b4_2 = await Bid.create({
    listingId: kbListing._id,
    bidderId: student3._id,
    amountInCents: 140000,
    acceptedAt: new Date(now.getTime() - 3 * 3600 * 1000),
  });

  kbListing.leadingBidId = b4_2._id;
  await kbListing.save();

  console.log('MongoDB Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDatabase();
  });

