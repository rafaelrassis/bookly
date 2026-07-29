/** Mensagem amigável pra uma resposta de API malsucedida. Trata 429 (rate
 * limit) à parte usando o header Retry-After; senão usa `error` do corpo. */
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  if (res.status === 429) {
    const retry = res.headers.get("Retry-After");
    return `Você está indo rápido demais. Tente de novo em ${retry ?? "alguns"}s.`;
  }
  const body = await res.json().catch(() => null);
  const error = body?.error;
  return typeof error === "string" ? error : fallback;
}
