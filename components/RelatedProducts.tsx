"use client";
import Link from "next/link";
import Image from "next/image";
import { fraunces, inter } from "@/app/fonts";
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
            className="related-product-image"
          />
          <p className={fraunces.className + " name"}>{product.name}</p>
          <p className={inter.className + " price"}>
            ${product.price.toLocaleString("es-AR")}
          </p>
        </Link>
      ))}
    </div>
  </div>
);

export default RelatedProducts;
