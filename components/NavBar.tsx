"use client";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { fraunces } from "@/app/fonts";
import Dropdown from "./Dropdown";
import "@/styles/Navbar.scss";

function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className={`${fraunces.className} navbar-container`}>
      {session ? (
        <Dropdown />
      ) : (
        <Link href="/signin" className="left-content">
          <Image
            src="/assets/icons/signin.svg"
            alt="Sign in"
            width={30}
            height={30}
          />
        </Link>
      )}

      <div className="center-content">
        <Link href="/catalog">
          <h1>NYADY</h1>
        </Link>
      </div>

      <div className="right-content">
        <Link href="/cart">
          <Image
            src="/assets/icons/cart.svg"
            alt="Cart"
            width={30}
            height={30}
          />
        </Link>
      </div>
    </nav>
  );
}

export default NavBar;
