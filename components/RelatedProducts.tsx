import Link from "next/link";
import Image from "next/image";
import { inter, cormorantGaramond } from "@/app/fonts";
import { ProductType } from "@/types";

const RelatedProducts = ({ products }: { products: ProductType[] }) => {
  if (products.length === 0) return null;

  return (
    <div className="related-products">
      <h2 className={inter.className + " title"}>Productos relacionados</h2>
      <div className="products">
        {products.map((product) => (
          <Link
            href={`/products/${product.slug}`}
            key={product.id}
            className="product"
          >
            <Image
              src={product.photo}
              alt={product.name}
              height={100}
              width={100}
              sizes="100px"
              className="related-product-image"
            />
            <p className={cormorantGaramond.className + " name"}>{product.name}</p>
            <p className={inter.className + " price"}>
              ${product.price.toLocaleString("es-AR")}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
