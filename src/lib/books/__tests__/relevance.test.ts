import { describe, it, expect } from "vitest";
import { relevanceScore, dedupeByWork } from "../google";
import type { Book } from "@/lib/types";

function mkBook(overrides: Partial<Book>): Book {
  return {
    id: "id",
    title: "",
    authors: "",
    year: 2020,
    pages: 100,
    genre: "Geral",
    gradient: ["#000", "#111"],
    avg: 0,
    count: 0,
    synopsis: "",
    ...overrides,
  };
}

describe("relevanceScore", () => {
  it("dá score >= 1 para match exato de título e autor", () => {
    const book = mkBook({ title: "A culpa é das estrelas", authors: "John Green" });
    expect(relevanceScore(book, "a culpa é das estrelas")).toBeGreaterThanOrEqual(1);
  });

  it("dá score >= 1 mesmo quando o título não tem o artigo inicial da query", () => {
    const book = mkBook({ title: "História do mundo para quem tem pressa", authors: "Someone" });
    expect(relevanceScore(book, "A história do mundo para quem tem pressa")).toBeGreaterThanOrEqual(1);
  });

  it("dá score < 0.6 para título sem relação com a query", () => {
    const book = mkBook({ title: "Saga Obscuro", authors: "Vitória Cassini Amaral" });
    expect(relevanceScore(book, "a culpa é das estrelas")).toBeLessThan(0.6);
  });
});

describe("dedupeByWork", () => {
  it("colapsa duas edições com mesmo título/autor e mantém a de maior count", () => {
    const weak = mkBook({ id: "1", title: "A Culpa é das Estrelas", authors: "John Green", count: 10 });
    const strong = mkBook({ id: "2", title: "a culpa é das estrelas", authors: "John Green", count: 500 });

    const result = dedupeByWork([weak, strong]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});
