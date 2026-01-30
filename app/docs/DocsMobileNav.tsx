"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Github } from "lucide-react";
import { DocsSearch } from "./DocsSearch";
import { GITHUB_REPO } from "./DocsSearch";
import type { DocSection } from "./lib/sections";
import styles from "./docs.module.css";

export function DocsMobileNav({
  sections,
  currentSection,
}: {
  sections: DocSection[];
  currentSection: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.docsMobileMenuBtn}
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {open && (
        <>
          <div
            className={styles.docsMobileBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className={styles.docsMobileDrawer}>
            <div className={styles.docsMobileDrawerHeader}>
              <Link
                href="/"
                className={styles.docsMobileLogoLink}
                onClick={() => setOpen(false)}
              >
                <Image
                  src="/logoke.png"
                  alt="Base Realms"
                  width={140}
                  height={32}
                  className={styles.docsMobileLogo}
                />
              </Link>
              <button
                type="button"
                className={styles.docsMobileClose}
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <div className={styles.docsMobileSearch}>
              <DocsSearch sections={sections.map((s) => ({ slug: s.slug, title: s.title }))} />
            </div>
            <nav className={styles.docsMobileNavLinks}>
              <span className={`${styles.docsMobileNavLink} ${styles.docsHeaderLinkActive}`}>
                Docs
              </span>
              <Link
                href="/"
                className={styles.docsMobileNavLink}
                onClick={() => setOpen(false)}
              >
                Home
              </Link>
            </nav>
            <div className={styles.docsMobileSidebarTitle}>Documentation</div>
            <ul className={styles.docsMobileNavList}>
              {sections.map((s) => (
                <li key={s.slug} className={styles.docsNavItem}>
                  <Link
                    href={`/docs/${s.slug}`}
                    className={`${styles.docsNavLink} ${s.slug === currentSection ? styles.docsNavLinkActive : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docsMobileGitHub}
            >
              <Github size={20} />
              GitHub
            </a>
          </div>
        </>
      )}
    </>
  );
}
