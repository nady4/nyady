"use client";
import Link from "next/link";
import Image from "next/image";
import { inter, fraunces } from "@/app/fonts";
import { ProductType } from "@/types";

const RelatedProducts = ({ products }: { products: ProductType[] }) => (
  <div className="related-products">
    <h2 className={inter.className + " title"}>Productos relacionados</h2>
    <div className="products">
      {products.map((product) => (
        <Link
          href={`/products/${product.id}`}
          key={product.id}
          className="product"
        >
          <Image
            src={product.photo}
            alt={product.name}
            height={100}
            width={100}
          />
          <p className={inter.className + " name"}>{product.name}</p>
          <p className={fraunces.className + " price"}>
            ${product.price.toLocaleString("es-AR")}
          </p>
        </Link>
      ))}
    </div>
  </div>
);

export default RelatedProducts;
