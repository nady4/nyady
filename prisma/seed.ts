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

const products = [
  {
    name: "Pantufla Aurora",
    photo:
      "https://http2.mlstatic.com/D_NQ_NP_873785-MLA83081746914_032025-O.webp",
    price: 26900,
    category: "Pantuflas",
    stock: 50,
    code: "SKU-PC-PANTUFLA-AURORA",
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
    code: "SKU-PF-PANTUFLON",
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
    code: "SKU-PB-L-PANTUBOTA-ARTIC",
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
    code: "SKU-PB-C-PANTUBOTA-FREYA",
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
    code: "SKU-PB-T-PANTUBOTA-STUDS",
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
    code: "SKU-PB-M-PANTUBOTA-VALKYRIA",
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
    code: "SKU-HC-PANTUFLA-LENA",
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
    code: "SKU-HB-PANTUFLA-FOGATA",
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
    code: "SKU-C-CHINELA-PLUSH",
    sizes: sizes.chinela,
    colors: ["Negro", "Beige"],
    description: "Chinela Plush casual"
  }
];

async function main() {
  console.log("Seeding database...");

  const addressData = {
    street: "Av. Corrientes 1234",
    city: "Buenos Aires",
    state: "CABA",
    postalCode: "C1043",
    country: "AR"
  };

  // Credentials are mirrored into both `create` and `update` so re-seeding
  // repairs an existing user-1 instead of leaving a stale row behind. The
  // password is the bcrypt hash of "Nyady-1234" (documented in the README).
  const userCredentials = {
    username: "nyady",
    email: "test@nyady.com",
    password: "$2b$10$k6aGhApoPFdtdtfVYikfGOWcqu824BJIk5.3zTvQAHbAWEjcc5v5K",
  };

  await prisma.user.upsert({
    where: { id: "user-1" },
    update: {
      ...userCredentials,
      address: {
        upsert: {
          create: addressData,
          update: addressData
        }
      }
    },
    create: {
      id: "user-1",
      ...userCredentials,
      address: { create: addressData }
    }
  });

  await prisma.cart.deleteMany({});
  await prisma.wishList.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});

  for (const product of products) {
    let id = product.name.toLowerCase().replace(/\s+/g, "-").replace(/ñ/g, "n").replace(/í/g, "i").replace(/ó/g, "o");
    if (product.name === "Pantuflón") id = "pantuflon";
    await prisma.product.create({
      data: {
        id,
        ...product
      }
    });
  }

  // Showcase orders for the seeded user. Mirrors the three real states the
  // /orders UI distinguishes: "En Preparación" (approved, no shipment yet),
  // "En Envío" (approved, shipment created, in transit) and "Entregado"
  // (approved, shipment delivered). No Zipnova calls — the data is inserted
  // directly so the page renders correctly without hitting the API.
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const showcaseOrders = [
    {
      id: "order-showcase-1",
      status: "approved",
      total: 26900 + 20900,
      createdAt: new Date(now - 2 * day),
      recipientName: "Nyady Demo",
      recipientDocument: "40123456",
      recipientPhone: "+541112345678",
      shipmentId: null,
      trackingNumber: null,
      trackingUrl: null,
      shipmentStatus: null,
      items: [
        { productId: "pantufla-aurora", quantity: 1, selectedColor: "Bordó" },
        { productId: "chinela-plush", quantity: 1, selectedColor: "Negro" }
      ]
    },
    {
      id: "order-showcase-2",
      status: "approved",
      total: 28500,
      createdAt: new Date(now - 5 * day),
      recipientName: "Nyady Demo",
      recipientDocument: "40123456",
      recipientPhone: "+541112345678",
      shipmentId: "ZN-SHIP-200002",
      trackingNumber: "TRK200002AR",
      trackingUrl: "https://www.zipnova.com.ar/track/TRK200002AR",
      shipmentStatus: "in_transit",
      items: [
        { productId: "pantubota-alpina", quantity: 1, selectedColor: "Gris" }
      ]
    },
    {
      id: "order-showcase-3",
      status: "approved",
      total: 25900 + 29500,
      createdAt: new Date(now - 15 * day),
      recipientName: "Nyady Demo",
      recipientDocument: "40123456",
      recipientPhone: "+541112345678",
      shipmentId: "ZN-SHIP-200003",
      trackingNumber: "TRK200003AR",
      trackingUrl: "https://www.zipnova.com.ar/track/TRK200003AR",
      shipmentStatus: "delivered",
      items: [
        { productId: "pantuflon", quantity: 1, selectedColor: "Camel" },
        { productId: "pantubota-valkyria", quantity: 1, selectedColor: "Fucsia" }
      ]
    }
  ];

  for (const order of showcaseOrders) {
    const { items, ...orderData } = order;
    await prisma.order.create({
      data: {
        ...orderData,
        userId: "user-1",
        orderItems: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            selectedColor: item.selectedColor ?? null,
          }))
        }
      }
    });
  }

  // Example coupon codes. Upserted by `code` so re-seeding is idempotent and
  // doesn't reset usedCount. PERCENT value is 0-100; FIXED value is ARS.
  const coupons = [
    {
      code: "BIENVENIDA10",
      type: "PERCENT",
      value: 10,
      active: true,
      onePerUser: true,
      usageLimit: null,
      expiresAt: null,
    },
    {
      code: "5000OFF",
      type: "FIXED",
      value: 5000,
      active: true,
      onePerUser: true,
      usageLimit: null,
      expiresAt: null,
    },
    {
      code: "VERANO15",
      type: "PERCENT",
      value: 15,
      active: true,
      onePerUser: true,
      usageLimit: 100,
      expiresAt: new Date("2026-12-31T23:59:59Z"),
    },
    {
      code: "MAYORISTA25",
      type: "PERCENT",
      value: 25,
      active: true,
      onePerUser: false,
      usageLimit: null,
      expiresAt: null,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        type: coupon.type,
        value: coupon.value,
        active: coupon.active,
        onePerUser: coupon.onePerUser,
        usageLimit: coupon.usageLimit,
        expiresAt: coupon.expiresAt,
      },
      create: coupon,
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