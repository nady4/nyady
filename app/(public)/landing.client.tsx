"use client";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ProductType } from "@/types";
import styles from "@/styles/Landing.module.scss";
import "@/styles/Carousel.scss";

const AUTOPLAY_MS = 4000;

export interface PromoBannerView {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  href: string | null;
}

export interface LandingCopy {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroCtaLabel: string | null;
  heroCtaHref: string | null;
}

const DEFAULT_HERO_TITLE = "Sentite cómoda. Sentite vos.";
const DEFAULT_HERO_SUBTITLE =
  "Encontrá ese par que completa tus días. Calzado para disfrutar de la comodidad sin dejar de lado tu estilo.";
const DEFAULT_HERO_CTA_LABEL = "Abrir Catálogo";
const DEFAULT_HERO_CTA_HREF = "/catalog";

export default function LandingClient({
  copy,
  promoBanners,
  carouselProducts,
}: {
  copy: LandingCopy;
  promoBanners: PromoBannerView[];
  carouselProducts: Pick<ProductType, "id" | "slug" | "name" | "photo" | "price">[];
}) {
  const { data: session } = useSession();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const count = carouselProducts.length;

  const heroTitle = copy.heroTitle || DEFAULT_HERO_TITLE;
  const heroSubtitle = copy.heroSubtitle || DEFAULT_HERO_SUBTITLE;
  const heroCtaLabel = copy.heroCtaLabel || DEFAULT_HERO_CTA_LABEL;
  const heroCtaHref = copy.heroCtaHref || DEFAULT_HERO_CTA_HREF;

  const goNext = useCallback(() => {
    if (count === 0) return;
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const goPrev = useCallback(() => {
    if (count === 0) return;
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Autoplay: advance every AUTOPLAY_MS, wrapping around. Pause when the user
  // is dragging, hovering, focusing inside the carousel, or pressing pause.
  useEffect(() => {
    if (count <= 1 || isPaused || isDragging) return;
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count, isPaused, isDragging]);

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
      goNext();
    } else if (currentTranslate < -50) {
      goPrev();
    }
    setCurrentTranslate(0);
  }, [isDragging, currentTranslate, goNext, goPrev]);

  // Only render slides close to the current one: keeps the DOM light even as
  // the catalog grows (each slide otherwise ships a full-size img).
  const visibleSlides = useMemo(() => {
    if (count === 0) return [];
    const window = 2;
    const indices = new Set<number>();
    for (let offset = -window; offset <= window; offset += 1) {
      indices.add(((currentIndex + offset) % count + count) % count);
    }
    return [...indices];
  }, [currentIndex, count]);

  const authControls = session ? (
    <button onClick={() => signOut({ callbackUrl: "/" })} className={styles.authButton}>Cerrar Sesión</button>
  ) : (
    <Link href="/signin" className={styles.authButton}>Iniciar sesión</Link>
  );

  return (
    <main className={styles.landing}>
      <section className={styles.hero}>
        <div className={styles.content}>
          <h1 className={styles.title}>{heroTitle}</h1>
          <p className={styles.subtitle}>{heroSubtitle}</p>
          <div className={styles.ctaContainer}>
              <Link href={heroCtaHref} className={styles.cta}>{heroCtaLabel}</Link>
            {authControls}
          </div>
        </div>
        {count > 0 && (
          <div
            className="carousel-container"
            role="region"
            aria-roledescription="carrusel"
            aria-label="Productos destacados"
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
              {carouselProducts.map((product, idx) => (
                <div
                  key={product.id}
                  className="carousel-slide"
                  aria-hidden={!visibleSlides.includes(idx)}
                >
                  <Link
                    href={`/products/${encodeURIComponent(product.slug)}`}
                    aria-label={product.name}
                  >
                    <Image
                      src={product.photo}
                      alt={product.name}
                      fill
                      sizes="37vw"
                      className="carousel-image"
                      priority={idx === 0}
                      quality={70}
                    />
                  </Link>
                </div>
              ))}
            </div>
            {count > 1 && (
              <div className="carousel-controls">
                <button
                  type="button"
                  className="carousel-control prev"
                  aria-label="Producto anterior"
                  onClick={goPrev}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="carousel-control next"
                  aria-label="Producto siguiente"
                  onClick={goNext}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="carousel-control pause"
                  aria-label={isPaused ? "Reanudar rotación del carrusel" : "Pausar rotación del carrusel"}
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? "▶" : "❚❚"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {promoBanners.length > 0 && (
        <section className={styles.promoStrip}>
          {promoBanners.map((banner) => (
            <BannerCard key={banner.id} banner={banner} />
          ))}
        </section>
      )}
    </main>
  );
}

function BannerCard({ banner }: { banner: PromoBannerView }) {
  const content = (
    <div className={styles.promoCard}>
      <Image
        src={banner.imageUrl}
        alt={banner.title}
        fill
        sizes="(max-width: 800px) 100vw, 400px"
        className={styles.promoImage}
      />
      <div className={styles.promoOverlay}>
        <span className={styles.promoTitle}>{banner.title}</span>
        {banner.subtitle && (
          <span className={styles.promoSubtitle}>{banner.subtitle}</span>
        )}
      </div>
    </div>
  );

  return banner.href ? (
    <Link
      href={banner.href}
      className={styles.promoLink}
      aria-label={banner.title}
    >
      {content}
    </Link>
  ) : (
    content
  );
}
