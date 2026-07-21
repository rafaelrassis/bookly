"use client";

import { useState } from "react";

const TRUNCATE_AT = 220;

/** Texto que trunca acima de um limite e revela o restante ao clicar (reviews longas). */
export function ExpandableText({ text, className = "" }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > TRUNCATE_AT;
  const shown = expanded || !isLong ? text : `${text.slice(0, TRUNCATE_AT).trimEnd()}…`;

  if (!isLong) return <p className={className}>{text}</p>;

  return (
    <p className={className}>
      {shown}{" "}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="font-bold text-foil hover:opacity-80"
      >
        {expanded ? "ver menos" : "ler mais"}
      </button>
    </p>
  );
}
