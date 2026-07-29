import Papa from "papaparse";

export type GoodreadsRow = {
  title: string;
  author: string;
  isbn: string | null; // ISBN13 preferido, senão ISBN10
  myRating: number; // 0 = sem nota
  shelf: "read" | "currently-reading" | "to-read";
  dateRead: Date | null;
  dateAdded: Date | null;
  review: string | null;
  bookshelves: string[]; // estantes custom — parseado, não aplicado (ver spec)
};

function cleanIsbn(raw?: string): string | null {
  if (!raw) return null;
  const v = raw.replace(/^="?/, "").replace(/"?$/, "").trim();
  return v.length >= 10 ? v : null;
}

function parseDate(raw?: string): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.replace(/\//g, "-"));
  return isNaN(d.getTime()) ? null : d;
}

export function parseGoodreadsCsv(csv: string): GoodreadsRow[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  return data
    .map((r) => {
      const shelfRaw = (r["Exclusive Shelf"] ?? "").trim().toLowerCase();
      const shelf =
        shelfRaw === "read" || shelfRaw === "currently-reading" || shelfRaw === "to-read"
          ? (shelfRaw as GoodreadsRow["shelf"])
          : null;
      return {
        title: (r["Title"] ?? "").trim(),
        author: (r["Author"] ?? "").trim(),
        isbn: cleanIsbn(r["ISBN13"]) ?? cleanIsbn(r["ISBN"]),
        myRating: Number(r["My Rating"] ?? 0) || 0,
        shelf,
        dateRead: parseDate(r["Date Read"]),
        dateAdded: parseDate(r["Date Added"]),
        review: (r["My Review"] ?? "").trim() || null,
        bookshelves: (r["Bookshelves"] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
    })
    .filter((r): r is GoodreadsRow => Boolean(r.title && r.shelf));
}
