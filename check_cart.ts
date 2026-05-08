import prisma from "./lib/prisma";

async function main() {
  const cartItems = await prisma.cart.findMany({
    select: {
      id: true,
      userId: true,
      productId: true,
      selectedSize: true,
      selectedColor: true,
    },
  });
  console.log(JSON.stringify(cartItems, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());