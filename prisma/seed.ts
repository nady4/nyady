import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const generateSizes = (start: number, end: number): string[] => {
  const sizes: string[] = [];
  for (let i = start; i < end; i += 2) {
    sizes.push(`${i}/${i + 1}`);
  }
  return sizes;
};

const sizes = {
  long: generateSizes(21, 42),
  short: generateSizes(21, 42),
  closed: generateSizes(21, 46),
  pantuflon: generateSizes(25, 42),
  chinela: generateSizes(35, 46),
  hornito: generateSizes(21, 46)
};

const COLOR_HEX: Record<string, string> = {
  Negro: "#1a1a1a",
  Marrón: "#8b4513",
  Gris: "#6b7280",
  Beige: "#f5f5dc",
  "Rosa claro": "#ffb6c1",
  Fucsia: "#ff00ff",
  Bordó: "#800020",
  Nevado: "#e8e8e8",
  Camel: "#c19a6b",
  Violeta: "#8b00ff",
  "Animal Print": "#d2b48c"
};

const products = [
  {
    name: "Pantufla Aurora",
    photo:
      "https://http2.mlstatic.com/D_NQ_NP_873785-MLA83081746914_032025-O.webp",
    price: 26900,
    category: "Pantuflas",
    stock: 50,
    code: "SKU-PANTUFLA-AURORA-01",
    sizes: sizes.closed,
    colors: ["Negro", "Marrón", "Bordó", "Nevado"],
    description: "Pantufla Aurora clásica"
  },
  {
    name: "Pantuflón",
    photo:
      "https://acdn-us.mitiendanube.com/stores/005/213/325/products/4040-gris-771c763e262bbbe9ba17728054817655-1024-1024.webp",
    price: 25900,
    category: "Pantuflas",
    stock: 50,
    code: "SKU-PANTUFLON-01",
    sizes: sizes.pantuflon,
    colors: [
      "Negro",
      "Marrón",
      "Bordó",
      "Gris",
      "Camel",
      "Beige",
      "Rosa claro",
      "Violeta",
      "Fucsia"
    ],
    description: "Pantuflón cómodo y ligero"
  },
  {
    name: "Pantubota Alpina",
    photo:
      "https://http2.mlstatic.com/D_NQ_NP_981674-MLA85769012239_062025-O.webp",
    price: 28500,
    category: "Pantubotas",
    stock: 50,
    code: "SKU-PANTUBOTA-ALPINA-01",
    sizes: sizes.long,
    colors: ["Negro", "Marrón", "Gris", "Beige", "Rosa claro", "Fucsia"],
    description: "Pantubota Alpina cómoda y elegante"
  },
  {
    name: "Pantubota Freya",
    photo:
      "https://http2.mlstatic.com/D_NQ_NP_2X_814874-MLA109265366713_032026-T.webp",
    price: 25900,
    category: "Pantubotas",
    stock: 50,
    code: "SKU-PANTUBOTA-FREYA-01",
    sizes: sizes.short,
    colors: ["Negro", "Marrón", "Gris", "Beige", "Rosa claro", "Fucsia"],
    description: "Pantubota Freya perfecta para el diario"
  },
  {
    name: "Pantubota Studs",
    photo:
      "https://http2.mlstatic.com/D_NQ_NP_634283-MLA32019556153_082019-O.webp",
    price: 26500,
    category: "Pantubotas",
    stock: 50,
    code: "SKU-PANTUBOTA-STUDS-01",
    sizes: sizes.short,
    colors: ["Negro", "Marrón", "Gris", "Beige", "Rosa claro", "Fucsia"],
    description: "Pantubota Studs decorativas"
  },
  {
    name: "Pantubota Valkyria",
    photo:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqan2EB7M4AQEZxf2cPFX3oVr_bxfIugrexw&s",
    price: 29500,
    category: "Pantubotas",
    stock: 50,
    code: "SKU-PANTUBOTA-VALKYRIA-01",
    sizes: sizes.short,
    colors: ["Negro", "Beige", "Fucsia"],
    description: "Pantubota Valkyria suave y acogedora"
  },
  {
    name: "Pantufla Leña",
    photo:
      "https://equipovallejo.vtexassets.com/arquivos/ids/408708/1-Perfil.png?v=638961580731400000",
    price: 24500,
    category: "Hornitos",
    stock: 50,
    code: "SKU-PANTUFLA-LENA-01",
    sizes: sizes.hornito,
    colors: ["Negro", "Marrón"],
    description: "Pantufla Leña para mantenerte abrigado"
  },
  {
    name: "Pantufla Fogata",
    photo:
      "https://http2.mlstatic.com/D_NQ_NP_916055-MLA86520198021_062025-O.webp",
    price: 24900,
    category: "Hornitos",
    stock: 50,
    code: "SKU-PANTUFLA-FOGATA-01",
    sizes: sizes.hornito,
    colors: ["Negro", "Gris", "Beige"],
    description: "Pantufla Fogata tipo bota"
  },
  {
    name: "Chinela Plush",
    photo:
      "https://lrsa-media.lojasrenner.com.br/uri/medium_718245066_001_3_7bf7abb72f.jpg",
    price: 20900,
    category: "Chinelas",
    stock: 50,
    code: "SKU-CHINELA-PLUSH-01",
    sizes: sizes.chinela,
    colors: ["Negro", "Animal Print", "Beige"],
    description: "Chinela Plush casual"
  }
];

async function main() {
  console.log("Seeding database...");

  await prisma.user.upsert({
    where: { id: "user-1" },
    update: {},
    create: {
      id: "user-1",
      username: "testuser",
      email: "test@test.com",
      password: "$2a$10$1234567890abcdefghijklmnopqrstuv",
    },
  });

  await prisma.cart.deleteMany({});
  await prisma.wishList.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});

  for (const product of products) {
    const id = product.name.toLowerCase().replace(/\s+/g, "-").replace(/ñ/g, "n").replace(/í/g, "i");
    await prisma.product.create({
      data: {
        id,
        ...product
      }
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