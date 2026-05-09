require('dotenv').config();
const { prisma } = require("./utils/db");

async function main() {
  console.log("Fetching organisers from database...");

  const users = await prisma.user.findMany({
    where: { email: { in: ['untold@tiget.com', 'ec@tiget.com', 'tnb@tiget.com', 'arena@tiget.com'] } }
  });

  const userMap = users.reduce((acc, user) => {
    acc[user.email] = user.id;
    return acc;
  }, {});

  if (Object.keys(userMap).length < 4) {
    console.error("❌ Missing organisers. Run 'node src/seedAuth.js' first!");
    process.exit(1);
  }

  const mockEvents = [
    {
      ownerEmail: 'untold@tiget.com',
      name: "Untold Festival 2026",
      description: "The world capital of night and magic. Join 4 days of legendary music.",
      category: "Festival",
      lineup: ["Imagine Dragons", "David Guetta", "Martin Garrix"],
      thumbnail: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800",
      gallery: ["https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800"],
      date: "2026-08-06", startTime: "18:00", duration: "4 Days", location: "Cluj Arena",
      ageRestriction: "12+", price: 850, capacity: 90000, sold: 45000
    },
    {
      ownerEmail: 'untold@tiget.com',
      name: "Neversea 2026",
      description: "The largest beach festival in Europe. Sun, sea, and perfect beats.",
      category: "Festival",
      lineup: ["Maluma", "Alok", "Don Diablo"],
      thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800",
      gallery: ["https://images.unsplash.com/photo-1501281668745-f7f5792203b4?q=80&w=800"],
      date: "2026-07-02", startTime: "16:00", duration: "4 Days", location: "Modern Beach, Constanța",
      ageRestriction: "16+", price: 600, capacity: 70000, sold: 68000
    },

    {
      ownerEmail: 'ec@tiget.com',
      name: "Electric Castle 2026",
      description: "A unique festival experience blending music, technology, and alternative arts.",
      category: "Festival",
      lineup: ["Massive Attack", "Bring Me The Horizon", "Peggy Gou"],
      thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800",
      gallery: ["https://images.unsplash.com/photo-1470229722913-7c092bbdd30d?q=80&w=800"],
      date: "2026-07-15", startTime: "14:00", duration: "5 Days", location: "Banffy Castle, Bonțida",
      ageRestriction: "16+", price: 650, capacity: 45000, sold: 22000
    },

    {
      ownerEmail: 'tnb@tiget.com',
      name: "Hamilton - The Musical",
      description: "The award-winning hip-hop musical finally arrives in Romania.",
      category: "Theater",
      lineup: ["Original Broadway Cast"],
      thumbnail: "https://images.unsplash.com/photo-1507676184212-d03305a527e4?q=80&w=800",
      gallery: ["https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800"],
      date: "2026-09-10", startTime: "19:00", duration: "2.5 Hours", location: "Sala Mare, TNB",
      ageRestriction: "7+", price: 350, capacity: 900, sold: 900 // Sold out
    },
    {
      ownerEmail: 'tnb@tiget.com',
      name: "O Scrisoare Pierdută",
      description: "The classic Romanian comedy masterpiece brought back to life.",
      category: "Theater",
      lineup: ["Marcel Iureș", "Horațiu Mălăele"],
      thumbnail: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=800",
      gallery: [],
      date: "2026-05-20", startTime: "20:00", duration: "2 Hours", location: "Sala Studio, TNB",
      ageRestriction: "12+", price: 120, capacity: 400, sold: 150
    },

    {
      ownerEmail: 'arena@tiget.com',
      name: "Dua Lipa - Radical Optimism Tour",
      description: "Global pop superstar brings her spectacular live show to Bucharest.",
      category: "Concert",
      lineup: ["Dua Lipa", "Griff"],
      thumbnail: "https://images.unsplash.com/photo-1493225457124-b14352b2f671?q=80&w=800",
      gallery: ["https://images.unsplash.com/photo-1540039155732-d674d40af4e0?q=80&w=800"],
      date: "2026-06-20", startTime: "19:30", duration: "4 Hours", location: "Arena Națională",
      ageRestriction: "12+", price: 450, capacity: 55000, sold: 52000
    },
    {
      ownerEmail: 'arena@tiget.com',
      name: "Derby: FCSB vs CFR Cluj",
      description: "The biggest rivalry in Romanian football continues.",
      category: "Sports",
      lineup: ["FCSB", "CFR Cluj"],
      thumbnail: "https://images.unsplash.com/photo-1508344928928-7137b29de216?q=80&w=800",
      gallery: ["https://images.unsplash.com/photo-1518605368461-1ee711681ab5?q=80&w=800"],
      date: "2026-05-28", startTime: "21:00", duration: "2 Hours", location: "Arena Națională",
      ageRestriction: "All Ages", price: 80, capacity: 55000, sold: 41000
    },
    {
      ownerEmail: 'arena@tiget.com',
      name: "Mega Party: Tzancă Uraganu",
      description: "The ultimate night with the biggest names in the industry.",
      category: "Concert",
      lineup: ["Tzancă Uraganu", "Florin Salam"],
      thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800",
      gallery: [],
      date: "2026-07-15", startTime: "23:00", duration: "All Night", location: "Romexpo",
      ageRestriction: "18+", price: 150, capacity: 8000, sold: 6500
    }
  ];

  console.log("Vaporizing old events...");
  await prisma.event.deleteMany();

  console.log("Linking events to their respective Organisers...");
  const mappedEvents = mockEvents.map(event => {
    const { ownerEmail, ...eventData } = event; 
    return {
      ...eventData,
      organiserId: userMap[ownerEmail] 
    };
  });

  const result = await prisma.event.createMany({ data: mappedEvents });
  console.log(`✅ Success! Seeded ${result.count} highly-detailed events.`);
}

main().catch(e => console.error(e)).finally(async () => { await prisma.$disconnect(); });