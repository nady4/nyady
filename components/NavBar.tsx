"use client";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { silkscreen } from "@/app/fonts";
import Dropdown from "./Dropdown";
import "@/styles/Navbar.scss";

function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className={`${silkscreen.className} navbar-container`}>
      <h1 className="left-content">NYADY</h1>
      <Link href="/" className="center-content">
        <Image src="/assets/icons/logo.svg" alt="Home" width={60} height={60} />
      </Link>
      {session ? (
        <Dropdown />
      ) : (
        <Link href="/signin" className="right-content">
          <Image src="/assets/icons/signin.svg" alt="Sign in" width={50} height={50} />
        </Link>
      )}
    </nav>
  );
}

export default NavBar;