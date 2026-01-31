import React from "react";
import fs from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { getSections, parseToc, slug } from "../lib/sections";
import { DocsShell } from "../DocsShell";
import styles from "../docs.module.css";

function headingText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(headingText).join("");
  const el = node as React.ReactElement<{ children?: React.ReactNode }> | null;
  if (el && typeof el === "object" && el.props?.children != null)
    return headingText(el.props.children);
  return "";
}

export async function generateStaticParams() {
  const contentPath = path.join(process.cwd(), "app/docs/content.md");
  const content = await fs.readFile(contentPath, "utf-8");
  const sections = getSections(content);
  return sections.map((s) => ({ section: s.slug }));
}

export default async function DocsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionSlug } = await params;
  const contentPath = path.join(process.cwd(), "app/docs/content.md");
  const content = await fs.readFile(contentPath, "utf-8");
  const sections = getSections(content);
  const section = sections.find((s) => s.slug === sectionSlug);

  if (!section) notFound();

  const toc = parseToc(section.content);

  return (
    <DocsShell
      sections={sections}
      currentSection={section.slug}
      breadcrumbTitle={section.title}
      rightToc={
        <>
          <ul className={styles.docsToc}>
            {toc.map((item) => (
              <li
                key={item.id}
                className={styles.docsTocItem}
                style={{ paddingLeft: (item.level - 1) * 10 }}
              >
                <a href={`#${item.id}`} className={styles.docsTocLink}>
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </>
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src ?? ""} alt={alt ?? ""} loading="lazy" decoding="async" {...props} />
          ),
          h1: ({ children, ...props }) => (
            <h1 id={slug(headingText(children))} {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 id={slug(headingText(children))} {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 id={slug(headingText(children))} {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 id={slug(headingText(children))} {...props}>
              {children}
            </h4>
          ),
          h5: ({ children, ...props }) => (
            <h5 id={slug(headingText(children))} {...props}>
              {children}
            </h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 id={slug(headingText(children))} {...props}>
              {children}
            </h6>
          ),
        }}
      >
        {section.content}
      </ReactMarkdown>
    </DocsShell>
  );
}
