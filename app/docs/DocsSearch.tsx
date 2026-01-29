"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./docs.module.css";

const GITHUB_REPO = "https://github.com/zickrian/Base-Realms";

type Section = { slug: string; title: string };

export function DocsSearch({ sections }: { sections: Section[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();

  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(normalized) ||
          s.slug.toLowerCase().includes(normalized)
      )
    : sections.slice(0, 8);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocused((f) => (f < results.length - 1 ? f + 1 : 0));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocused((f) => (f > 0 ? f - 1 : results.length - 1));
      }
      if (e.key === "Enter" && results[focused]) {
        e.preventDefault();
        router.push(`/docs/${results[focused].slug}`);
        setOpen(false);
        setQuery("");
        setFocused(-1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, results, focused, router]);

  useEffect(() => {
    setFocused(-1);
    if (query.trim()) setOpen(true);
  }, [query]);

  useEffect(() => {
    if (focused >= 0 && listRef.current) {
      const el = listRef.current.children[focused] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [focused]);

  return (
    <div className={styles.docsSearchWrap}>
      <input
        ref={inputRef}
        type="search"
        placeholder="Search documentation..."
        className={styles.docsSearchInput}
        aria-label="Search documentation"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        aria-expanded={open}
        aria-controls="docs-search-results"
        id="docs-search-input"
      />
      <span className={styles.docsSearchShortcut}>/</span>
      {open && (
        <ul
          id="docs-search-results"
          ref={listRef}
          className={styles.docsSearchResults}
          role="listbox"
        >
          {results.length === 0 ? (
            <li className={styles.docsSearchResultItem}>No results</li>
          ) : (
            results.map((s, i) => (
              <li key={s.slug} role="option" aria-selected={i === focused}>
                <Link
                  href={`/docs/${s.slug}`}
                  className={`${styles.docsSearchResultLink} ${i === focused ? styles.docsSearchResultLinkFocused : ""}`}
                  onMouseEnter={() => setFocused(i)}
                >
                  {s.title}
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export { GITHUB_REPO };
