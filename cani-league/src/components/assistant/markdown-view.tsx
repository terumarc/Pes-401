"use client";

import React from "react";

interface MarkdownViewProps {
  content: string;
}

export function MarkdownView({ content }: MarkdownViewProps) {
  // Parser ligero y seguro para formato común de chat (negrita, cursiva, listas, títulos)
  const lines = content.split("\n");

  const renderInline = (text: string): React.ReactNode => {
    // Procesa **negrita** e *cursiva* y `código`
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={match.index} className="font-semibold text-foreground">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(
          <em key={match.index} className="italic text-foreground/90">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            className="rounded bg-muted/70 px-1 py-0.5 font-mono text-xs text-primary"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Títulos
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-semibold text-foreground pt-1 text-sm">
              {renderInline(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-foreground pt-2 text-base">
              {renderInline(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={idx} className="font-extrabold text-foreground pt-2 text-lg">
              {renderInline(trimmed.slice(2))}
            </h2>
          );
        }

        // Listas con viñetas
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-primary text-xs mt-1 select-none">•</span>
              <span className="flex-1 text-muted-foreground">{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Listas numeradas (ej. "1. ")
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-primary font-mono text-xs mt-0.5 select-none">
                {numMatch[1]}.
              </span>
              <span className="flex-1 text-muted-foreground">{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Párrafo normal
        return (
          <p key={idx} className="text-muted-foreground">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}
