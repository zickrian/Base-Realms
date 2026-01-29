import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, Sun } from "lucide-react";
import { DocsSearch, GITHUB_REPO } from "./DocsSearch";
import type { DocSection } from "./lib/sections";
import styles from "./docs.module.css";

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
  return (
    <div className={styles.docsOuter}>
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
                aria-label="Toggle theme"
              >
                <Sun size={20} />
              </button>
            </div>
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
