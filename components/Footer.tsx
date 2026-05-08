"use client";
import Image from "next/image";
import { fraunces } from "@/app/fonts";
import "@/styles/Footer.scss";

function Footer() {
  return (
    <footer className="footer">
      <a
        href="https://github.com/nady4/nyady"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h3 className={`${fraunces.className} footer-text`}>
          Hecho con{" "}
          <Image
            src="/assets/icons/heartFilled.svg"
            alt="Love"
            width={16}
            height={16}
          />{" "}
          por nady4
        </h3>
      </a>
    </footer>
  );
}

export default Footer;
