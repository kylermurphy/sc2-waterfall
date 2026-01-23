// build-advisor/src/pages/BuildJsonTutorial.jsx
// Desktop-friendly tutorial layout with auto-generated sidebar,
// improved typography, and syntax highlighting

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import tutorialMarkdown from "./tutorial.md?raw";


const markdownContent = tutorialMarkdown;

export function BuildJsonTutorial() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(null);

  // Extract "##" headings for sidebar navigation
  const headings = useMemo(() => {
    return markdownContent
      .split("\n")
      .filter(line => line.startsWith("## "))
      .map(line => {
        const text = line.replace(/^##\s+/, "");
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return { text, id };
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-black text-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              Build JSON Tutorial
            </h1>
            <p className="mt-2 max-w-2xl text-lg opacity-70">
              Learn how to create and validate build-order JSON files for SC2 Waterfall.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            ← Back to Advisor
          </button>
        </header>

        {/* Content */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-sm">
              <p className="mb-3 font-semibold uppercase tracking-wide opacity-70">
                On this page
              </p>
              <ul className="space-y-2">
                {headings.map(h => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className="block rounded-md px-2 py-1 opacity-80 hover:bg-neutral-800 hover:opacity-100"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Markdown */}
          <main className="prose prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2({ children }) {
                  const text = String(children);
                  const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                  return <h2 id={id}>{children}</h2>;
                },
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeString = String(children).replace(/\n$/, "");

                  const handleCopy = async () => {
                    try {
                      await navigator.clipboard.writeText(codeString);
                      setCopied(codeString);
                      setTimeout(() => setCopied(null), 1500);
                    } catch (err) {
                      console.error("Copy failed", err);
                    }
                  };

                  return !inline && match ? (
                    <div className="relative">
                      <button
                        onClick={handleCopy}
                        className="absolute right-2 top-2 z-10 rounded-md bg-neutral-800 px-2 py-1 text-xs opacity-80 hover:opacity-100"
                      >
                        {copied === codeString ? "✓ Copied" : "Copy"}
                      </button>

                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-xl pt-10"
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </main>
        </div>

        <footer className="mt-16 text-center text-sm opacity-50">
          SC2 Waterfall • Build JSON Tutorial
        </footer>
      </div>
    </div>
  );
}
