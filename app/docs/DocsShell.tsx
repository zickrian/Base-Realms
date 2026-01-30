"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, Sun, Moon } from "lucide-react";
import { DocsSearch, GITHUB_REPO } from "./DocsSearch";
import { DocsMobileNav } from "./DocsMobileNav";
import type { DocSection } from "./lib/sections";
import styles from "./docs.module.css";

const STORAGE_KEY = "docs-glossarium-dark";

export function DocsShell({
  sections,
  currentSection,
  breadcrumbTitle,
  children,
  rightToc,
}: {
  sections: DocSection[];
  currentSection: string;
  breadcrumbTitle: string;
  children: React.ReactNode;
  rightToc: React.ReactNode;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    setDark(stored === "1");
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  };

  return (
    <div
      className={styles.docsOuter}
      data-allow-scroll="true"
      data-docs-theme={dark ? "dark" : undefined}
    >
      <div className={styles.docsCard}>
        <header className={styles.docsHeader}>
          <div className={styles.docsHeaderLeft}>
            <Link href="/" className={styles.docsHeaderLogoLink} aria-label="Home">
              <Image
                src="/logoke.png"
                alt="Base Realms"
                width={120}
                height={28}
                className={styles.docsHeaderLogo}
              />
            </Link>
          </div>
          <div className={styles.docsHeaderRight}>
            <nav className={styles.docsHeaderNav}>
              <span className={`${styles.docsHeaderLink} ${styles.docsHeaderLinkActive}`}>
                Docs
              </span>
              <Link href="/" className={styles.docsHeaderLink}>
                Home
              </Link>
            </nav>
            <DocsSearch sections={sections.map((s) => ({ slug: s.slug, title: s.title }))} />
            <div className={styles.docsHeaderIcons}>
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.docsHeaderIcon}
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
              <button
                type="button"
                className={styles.docsHeaderIcon}
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                onClick={toggleDark}
              >
                {dark ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
            <DocsMobileNav sections={sections} currentSection={currentSection} />
          </div>
        </header>

        <div className={styles.docsBody}>
          <aside className={styles.docsSidebarLeft}>
            <div className={styles.docsSidebarLeftTitle}>Documentation</div>
            <ul className={styles.docsNavList}>
              {sections.map((s) => (
                <li key={s.slug} className={styles.docsNavItem}>
                  <Link
                    href={`/docs/${s.slug}`}
                    className={`${styles.docsNavLink} ${s.slug === currentSection ? styles.docsNavLinkActive : ""}`}
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <div className={styles.docsMainWrap}>
            <main className={styles.docsMain}>
              <nav className={styles.docsBreadcrumb} aria-label="Breadcrumb">
                <Link href="/docs/introduction" className={styles.docsBreadcrumbLink}>
                  Docs
                </Link>
                <span className={styles.docsBreadcrumbSep}>›</span>
                <span>{breadcrumbTitle}</span>
              </nav>
              <article className={styles.docsContent}>{children}</article>
            </main>
          </div>

          <aside className={styles.docsSidebarRight}>
            <div className={styles.docsSidebarRightTitle}>On this page</div>
            {rightToc}
            <div className={styles.docsFooterLinks}>
              <a
                href={`${GITHUB_REPO}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.docsFooterLink}
              >
                Question? Give us feedback →
              </a>
              <a
                href={`${GITHUB_REPO}/blob/main/app/docs/content.md`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.docsFooterLink}
              >
                Edit this page on GitHub →
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
