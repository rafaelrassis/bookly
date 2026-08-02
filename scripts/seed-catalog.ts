/**
 * Semeia o catálogo local com termos populares em PT-BR (best-sellers,
 * autores brasileiros, clássicos), pra busca local já ter resultado antes
 * da primeira pesquisa de usuário real. Respeita a cota do Google Books com
 * 1s de intervalo entre chamadas. Manual — não roda no build (gasta cota a
 * cada deploy). Rodar: `npx tsx scripts/seed-catalog.ts`.
 */
import "dotenv/config";
import { searchGoogleBooks } from "../src/lib/books/google";
import { cacheGoogleBooks } from "../src/lib/books";

const TERMS = [
  // Best-sellers / ficção contemporânea
  "colleen hoover",
  "verity",
  "it ends with us",
  "a menina que roubava livros",
  "o pequeno príncipe",
  "1984",
  "a revolução dos bichos",
  "código da vinci",
  "harry potter",
  "senhor dos anéis",
  "percy jackson",
  "jogos vorazes",
  "divergente",
  "crepúsculo",
  "diário de um banana",
  "extraordinário",
  "a culpa é das estrelas",
  "cidades de papel",
  "quem me dera",
  "a sutil arte de ligar o f*da-se",
  // Autores brasileiros
  "machado de assis",
  "clarice lispector",
  "jorge amado",
  "paulo coelho",
  "carlos drummond de andrade",
  "cecília meireles",
  "guimarães rosa",
  "graciliano ramos",
  "monteiro lobato",
  "rachel de queiroz",
  "lima barreto",
  "raduan nassar",
  "conceição evaristo",
  "martha medeiros",
  "rubem alves",
  "ariano suassuna",
  "milton hatoum",
  "chico buarque",
  "cristovão tezza",
  "adélia prado",
  // Clássicos internacionais
  "dom casmurro",
  "memórias póstumas de brás cubas",
  "grande sertão veredas",
  "capitães da areia",
  "a hora da estrela",
  "vidas secas",
  "orgulho e preconceito",
  "cem anos de solidão",
  "dom quixote",
  "crime e castigo",
  "a metamorfose",
  "o alquimista",
  "a arte da guerra",
  "sapiens",
  "duna",
  "o hobbit",
  "ensaio sobre a cegueira",
  "josé saramago",
  "gabriel garcía márquez",
  "franz kafka",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`seed-catalog: ${TERMS.length} termos.`);
  for (let i = 0; i < TERMS.length; i++) {
    const term = TERMS[i];
    try {
      const books = await searchGoogleBooks(term);
      await cacheGoogleBooks(books);
      console.log(`  [${i + 1}/${TERMS.length}] "${term}" -> ${books.length} livros`);
    } catch (err) {
      console.log(`  [${i + 1}/${TERMS.length}] "${term}" — falhou:`, err);
    }
    await sleep(1000);
  }
  console.log("seed-catalog: concluído.");
}

main().catch((err) => {
  console.error("seed-catalog: falhou:", err);
  process.exit(1);
});
