"use client";
import Link from "next/link";
import Image from "next/image";
import { tomorrow, silkscreen } from "@/app/fonts";
import { ProductType } from "@/types";

const RelatedProducts = ({ products }: { products: ProductType[] }) => (
  <div className="related-products">
    <h2 className={tomorrow.className + " title"}>Related Products</h2>
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
          <p className={tomorrow.className + " name"}>{product.name}</p>
          <p className={silkscreen.className + " price"}>
            ${product.price.toFixed(2)}
          </p>
        </Link>
      ))}
    </div>
  </div>
);

export default RelatedProducts;