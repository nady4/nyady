import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const products = [
  {
    name: "Purple Skirt",
    photo: "/assets/products/purple_skirt.jpg",
    price: 29.99,
    category: "Skirts",
    stock: 50,
  },
  {
    name: "Kuromi Socks",
    photo: "/assets/products/kuromi_socks.jpg",
    price: 12.99,
    category: "Accessories",
    stock: 100,
  },
  {
    name: "Goth Skirt",
    photo: "/assets/products/goth_skirt.jpg",
    price: 39.99,
    category: "Skirts",
    stock: 30,
  },
  {
    name: "Thigh Highs",
    photo: "/assets/products/thigh_highs.jpg",
    price: 24.99,
    category: "Accessories",
    stock: 75,
  },
  {
    name: "Paws Gloves",
    photo: "/assets/products/paws_gloves.jpg",
    price: 15.99,
    category: "Accessories",
    stock: 60,
  },
  {
    name: "Rubber Duck",
    photo: "/assets/products/rubber_duck.jpg",
    price: 8.99,
    category: "Toys",
    stock: 200,
  },
  {
    name: "Blahaj",
    photo: "/assets/products/blahaj.jpg",
    price: 34.99,
    category: "Toys",
    stock: 40,
  },
  {
    name: "Cat Socks",
    photo: "/assets/products/cat_socks.jpg",
    price: 9.99,
    category: "Accessories",
    stock: 150,
  },
  {
    name: "C Book",
    photo: "/assets/products/c_book.jpg",
    price: 49.99,
    category: "Books",
    stock: 25,
  },
];

async function main() {
  console.log("Seeding database...");

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.name.toLowerCase().replace(/\s+/g, "-") },
      update: product,
      create: {
        id: product.name.toLowerCase().replace(/\s+/g, "-"),
        ...product,
      },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });