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
    code: "SKU-PURPLE-SKIRT-01",
    sizes: ["S", "M", "L", "XL"],
    colors: ["#8B5CF6", "#EC4899", "#3B82F6"],
    photos: {
      "#8B5CF6": [
        "/assets/products/purple_skirt-8B5CF6-1.jpg",
        "/assets/products/purple_skirt-8B5CF6-2.jpg",
        "/assets/products/purple_skirt-8B5CF6-3.jpg",
      ],
      "#EC4899": [
        "/assets/products/purple_skirt-EC4899-1.jpg",
        "/assets/products/purple_skirt-EC4899-2.jpg",
        "/assets/products/purple_skirt-EC4899-3.jpg",
      ],
      "#3B82F6": [
        "/assets/products/purple_skirt-3B82F6-1.jpg",
        "/assets/products/purple_skirt-3B82F6-2.jpg",
        "/assets/products/purple_skirt-3B82F6-3.jpg",
      ],
    },
    description: "Ultra cute purple pleated skirt with cute print. Perfect for any occasion!",
  },
  {
    name: "Kuromi Socks",
    photo: "/assets/products/kuromi_socks.jpg",
    price: 12.99,
    category: "Accessories",
    stock: 100,
    code: "SKU-KUROMI-SOCKS-01",
    sizes: ["One Size"],
    colors: ["#1F1F1F", "#8B5CF6", "#EC4899"],
    photos: {
      "#1F1F1F": [
        "/assets/products/kuromi_socks-1F1F1F-1.jpg",
        "/assets/products/kuromi_socks-1F1F1F-2.jpg",
        "/assets/products/kuromi_socks-1F1F1F-3.jpg",
      ],
      "#8B5CF6": [
        "/assets/products/kuromi_socks-8B5CF6-1.jpg",
        "/assets/products/kuromi_socks-8B5CF6-2.jpg",
        "/assets/products/kuromi_socks-8B5CF6-3.jpg",
      ],
      "#EC4899": [
        "/assets/products/kuromi_socks-EC4899-1.jpg",
        "/assets/products/kuromi_socks-EC4899-2.jpg",
        "/assets/products/kuromi_socks-EC4899-3.jpg",
      ],
    },
    description: "Comfy kuromi themed socks. Your feet will look adorable!",
  },
  {
    name: "Goth Skirt",
    photo: "/assets/products/goth_skirt.jpg",
    price: 39.99,
    category: "Skirts",
    stock: 30,
    code: "SKU-GOTH-SKIRT-01",
    sizes: ["S", "M", "L"],
    colors: ["#1F1F1F", "#4B0082"],
    photos: {
      "#1F1F1F": [
        "/assets/products/goth_skirt-1F1F1F-1.jpg",
        "/assets/products/goth_skirt-1F1F1F-2.jpg",
        "/assets/products/goth_skirt-1F1F1F-3.jpg",
      ],
      "#4B0082": [
        "/assets/products/goth_skirt-4B0082-1.jpg",
        "/assets/products/goth_skirt-4B0082-2.jpg",
        "/assets/products/goth_skirt-4B0082-3.jpg",
      ],
    },
    description: "Dark and elegant gothic skirt. Spooky but cute!",
  },
  {
    name: "Thigh Highs",
    photo: "/assets/products/thigh_highs.jpg",
    price: 24.99,
    category: "Accessories",
    stock: 75,
    code: "SKU-THIGH-HIGHS-01",
    sizes: ["One Size"],
    colors: ["#1F1F1F", "#DC143C", "#4169E1"],
    photos: {
      "#1F1F1F": [
        "/assets/products/thigh_highs-1F1F1F-1.jpg",
        "/assets/products/thigh_highs-1F1F1F-2.jpg",
        "/assets/products/thigh_highs-1F1F1F-3.jpg",
      ],
      "#DC143C": [
        "/assets/products/thigh_highs-DC143C-1.jpg",
        "/assets/products/thigh_highs-DC143C-2.jpg",
        "/assets/products/thigh_highs-DC143C-3.jpg",
      ],
      "#4169E1": [
        "/assets/products/thigh_highs-4169E1-1.jpg",
        "/assets/products/thigh_highs-4169E1-2.jpg",
        "/assets/products/thigh_highs-4169E1-3.jpg",
      ],
    },
    description: "Long socks that reach your thighs. Super kawaii!",
  },
  {
    name: "Paws Gloves",
    photo: "/assets/products/paws_gloves.jpg",
    price: 15.99,
    category: "Accessories",
    stock: 60,
    code: "SKU-PAWS-GLOVES-01",
    sizes: ["One Size"],
    colors: ["#1F1F1F", "#FF69B4"],
    photos: {
      "#1F1F1F": [
        "/assets/products/paws_gloves-1F1F1F-1.jpg",
        "/assets/products/paws_gloves-1F1F1F-2.jpg",
        "/assets/products/paws_gloves-1F1F1F-3.jpg",
      ],
      "#FF69B4": [
        "/assets/products/paws_gloves-FF69B4-1.jpg",
        "/assets/products/paws_gloves-FF69B4-2.jpg",
        "/assets/products/paws_gloves-FF69B4-3.jpg",
      ],
    },
    description: "Cute paw print gloves. Ready to scratch!",
  },
  {
    name: "Rubber Duck",
    photo: "/assets/products/rubber_duck.jpg",
    price: 8.99,
    category: "Toys",
    stock: 200,
    code: "SKU-RUBBER-DUCK-01",
    sizes: ["Small", "Medium", "Large"],
    colors: ["#FCD34D", "#FF6B6B", "#4ECDC4"],
    photos: {
      "#FCD34D": [
        "/assets/products/rubber_duck-FCD34D-1.jpg",
        "/assets/products/rubber_duck-FCD34D-2.jpg",
        "/assets/products/rubber_duck-FCD34D-3.jpg",
      ],
      "#FF6B6B": [
        "/assets/products/rubber_duck-FF6B6B-1.jpg",
        "/assets/products/rubber_duck-FF6B6B-2.jpg",
        "/assets/products/rubber_duck-FF6B6B-3.jpg",
      ],
      "#4ECDC4": [
        "/assets/products/rubber_duck-4ECDC4-1.jpg",
        "/assets/products/rubber_duck-4ECDC4-2.jpg",
        "/assets/products/rubber_duck-4ECDC4-3.jpg",
      ],
    },
    description: "Classic yellow rubber duck. Float around in your bath!",
  },
  {
    name: "Blahaj",
    photo: "/assets/products/blahaj.jpg",
    price: 34.99,
    category: "Toys",
    stock: 40,
    code: "SKU-BLAHAJ-01",
    sizes: ["Small", "Medium", "Large"],
    colors: ["#3B82F6", "#8B5CF6", "#EC4899"],
    photos: {
      "#3B82F6": [
        "/assets/products/blahaj-3B82F6-1.jpg",
        "/assets/products/blahaj-3B82F6-2.jpg",
        "/assets/products/blahaj-3B82F6-3.jpg",
      ],
      "#8B5CF6": [
        "/assets/products/blahaj-8B5CF6-1.jpg",
        "/assets/products/blahaj-8B5CF6-2.jpg",
        "/assets/products/blahaj-8B5CF6-3.jpg",
      ],
      "#EC4899": [
        "/assets/products/blahaj-EC4899-1.jpg",
        "/assets/products/blahaj-EC4899-2.jpg",
        "/assets/products/blahaj-EC4899-3.jpg",
      ],
    },
    description: "The iconic IKEA shark. Perfect huggie buddy!",
  },
  {
    name: "Cat Socks",
    photo: "/assets/products/cat_socks.jpg",
    price: 9.99,
    category: "Accessories",
    stock: 150,
    code: "SKU-CAT-SOCKS-01",
    sizes: ["One Size"],
    colors: ["#1F1F1F", "#FFB347", "#87CEEB"],
    photos: {
      "#1F1F1F": [
        "/assets/products/cat_socks-1F1F1F-1.jpg",
        "/assets/products/cat_socks-1F1F1F-2.jpg",
        "/assets/products/cat_socks-1F1F1F-3.jpg",
      ],
      "#FFB347": [
        "/assets/products/cat_socks-FFB347-1.jpg",
        "/assets/products/cat_socks-FFB347-2.jpg",
        "/assets/products/cat_socks-FFB347-3.jpg",
      ],
      "#87CEEB": [
        "/assets/products/cat_socks-87CEEB-1.jpg",
        "/assets/products/cat_socks-87CEEB-2.jpg",
        "/assets/products/cat_socks-87CEEB-3.jpg",
      ],
    },
    description: "Adorable cat themed socks. Purrfect for cat lovers!",
  },
  {
    name: "C Book",
    photo: "/assets/products/c_book.jpg",
    price: 49.99,
    category: "Books",
    stock: 25,
    code: "SKU-C-BOOK-01",
    sizes: ["A5"],
    colors: ["#6B7280"],
    photos: {
      "#6B7280": [
        "/assets/products/c_book-6B7280-1.jpg",
        "/assets/products/c_book-6B7280-2.jpg",
        "/assets/products/c_book-6B7280-3.jpg",
      ],
    },
    description: "Learn C programming the cute way!",
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