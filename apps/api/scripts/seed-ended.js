const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const user = await p.user.findFirst({ where: { role: 'STUDENT' } });
  const cats = await p.category.findMany();

  const booksId = cats.find(c => c.slug === 'books-study')?.id;
  const sportsId = cats.find(c => c.slug === 'sports-fitness')?.id;
  const hostelId = cats.find(c => c.slug === 'hostel-essentials')?.id;
  const calcId = cats.find(c => c.slug === 'calculators-tools')?.id;

  const now = Date.now();
  const day = 86400000;

  const result = await p.auctionListing.createMany({
    data: [
      {
        sellerId: user.id,
        categoryId: booksId,
        title: 'Chemistry NCERT + JD Lee Bundle',
        description: 'Set of 4 chemistry textbooks used for 2 semesters. Highlights and notes inside. JD Lee Inorganic Chemistry included.',
        condition: 'GOOD',
        startingPriceInCents: 30000,
        minIncrementInCents: 2500,
        currentLeadingBidInCents: 55000,
        status: 'COMPLETED',
        startTime: new Date(now - 7 * day),
        closingTime: new Date(now - 2 * day),
        pickupLocation: 'Library Lawn, Block C',
        sellerNotes: 'Sold to winning bidder'
      },
      {
        sellerId: user.id,
        categoryId: sportsId,
        title: 'Badminton Racket Set (2 Rackets + Shuttlecocks)',
        description: 'Yonex Nanoflare 270 pair, used for 1 semester. Comes with 3 feather shuttlecocks and carry bag.',
        condition: 'LIKE_NEW',
        startingPriceInCents: 80000,
        minIncrementInCents: 5000,
        currentLeadingBidInCents: 115000,
        status: 'COMPLETED',
        startTime: new Date(now - 5 * day),
        closingTime: new Date(now - day),
        pickupLocation: 'Sports Complex Reception',
        sellerNotes: null
      },
      {
        sellerId: user.id,
        categoryId: hostelId,
        title: 'Study Table Lamp — Philips LED',
        description: 'Philips LED desk lamp with adjustable brightness, used 1 year. Excellent light for late-night studies. No flicker, minimal heat.',
        condition: 'GOOD',
        startingPriceInCents: 40000,
        minIncrementInCents: 3000,
        currentLeadingBidInCents: 0,
        status: 'UNSOLD',
        startTime: new Date(now - 3 * day),
        closingTime: new Date(now - 3600000),
        pickupLocation: 'Hostel Block B Common Room',
        sellerNotes: null
      },
      {
        sellerId: user.id,
        categoryId: calcId,
        title: 'Scientific Calculator Casio fx-82MS',
        description: 'Basic scientific calculator, used for 1st year. All functions working perfectly. Comes with original case.',
        condition: 'GOOD',
        startingPriceInCents: 20000,
        minIncrementInCents: 2000,
        currentLeadingBidInCents: 28000,
        status: 'COMPLETED',
        startTime: new Date(now - 4 * day),
        closingTime: new Date(now - 12 * 3600000),
        pickupLocation: 'Academic Block A Lobby',
        sellerNotes: null
      }
    ]
  });

  console.log('Seeded', result.count, 'ended/sold listings');
  await p.$disconnect();
}

main().catch(console.error);

