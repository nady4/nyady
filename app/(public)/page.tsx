"use client";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { getProducts } from "@/actions/products";
import { ProductType } from "@/types";
import styles from "@/styles/Landing.module.scss";
import "@/styles/Carousel.scss";

const AUTOPLAY_MS = 3000;

export default function LandingPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      const allProducts = await getProducts();
      setProducts(allProducts);
    };
    loadProducts();
  }, []);

  // Autoplay: advance every AUTOPLAY_MS, wrapping around. Pause when the user
  // is dragging or hovering the carousel so manual navigation feels natural.
  useEffect(() => {
    if (products.length <= 1 || isPaused || isDragging) return;
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [products.length, isPaused, isDragging]);

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    setStartX("touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const currentX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = startX - currentX;
    setCurrentTranslate(diff);
  }, [isDragging, startX]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (currentTranslate > 50) {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    } else if (currentTranslate < -50) {
      setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
    }
    setCurrentTranslate(0);
  }, [isDragging, currentTranslate, products.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mouseup", handleTouchEnd);
    container.addEventListener("mouseleave", handleTouchEnd);

    return () => {
      container.removeEventListener("mouseup", handleTouchEnd);
      container.removeEventListener("mouseleave", handleTouchEnd);
    };
  }, [handleTouchEnd]);

  if (products.length === 0) {
    return (
      <main className={styles.landing}>
        <div className={styles.hero}>
          <div className={styles.content}>
            <h1 className={styles.title}>Elevá tu comodidad, definí tu estilo.</h1>
            <p className={styles.subtitle}>Encontrá el equilibrio perfecto entre comodidad, diseño y calidad.</p>
            <div className={styles.ctaContainer}>
              <Link href="/catalog" className={styles.cta}>Abrir Catálogo</Link>
              {session ? (
                <button onClick={() => signOut({ callbackUrl: "/" })} className={styles.authButton}>Cerrar Sesión</button>
              ) : (
                <Link href="/signin" className={styles.authButton}>Iniciar sesión</Link>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.landing}>
      <section className={styles.hero}>
        <div className={styles.content}>
          <h1 className={styles.title}>Elevá tu comodidad, definí tu estilo.</h1>
          <p className={styles.subtitle}>Encontrá el equilibrio perfecto entre comodidad, diseño y calidad.</p>
          <div className={styles.ctaContainer}>
              <Link href="/catalog" className={styles.cta}>Abrir Catálogo</Link>
            {session ? (
              <button onClick={() => signOut({ callbackUrl: "/" })} className={styles.authButton}>Cerrar Sesión</button>
            ) : (
              <Link href="/signin" className={styles.authButton}>Iniciar sesión</Link>
            )}
          </div>
        </div>
          <div
            ref={containerRef}
          className="carousel-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => { setIsPaused(false); handleTouchEnd(); }}
        >
          <div
            className="carousel-track"
            style={{ transform: `translateX(${currentIndex * -100 + (currentTranslate / 20)}%)` }}
          >
            {products.map((product, idx) => (
              <div key={product.id} className="carousel-slide">
                <Link href={`/products/${encodeURIComponent(product.id)}`}>
                  <Image
                    src={product.photo}
                    alt={product.name}
                    fill
                    className="carousel-image"
                    priority={idx < 3}
                  />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
