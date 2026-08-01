"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AsideCtx = { node: HTMLDivElement | null; setNode: (n: HTMLDivElement | null) => void };

const AsideContext = createContext<AsideCtx | null>(null);

/** Envolve o shell do app: guarda o nó DOM da `aside` do desktop, pra que
 * cada tela possa portar conteúdo contextual pra lá (ex.: "Em alta" na
 * Home, meta de leitura na Estante) sem prop-drilling pelo layout. */
export function AsideProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  return <AsideContext.Provider value={{ node, setNode }}>{children}</AsideContext.Provider>;
}

/** Renderizado uma vez pelo layout — é o destino real dos portais. */
export function AsideSlot({ className = "" }: { className?: string }) {
  const ctx = useContext(AsideContext);
  return <div ref={ctx?.setNode} className={className} />;
}

/** Usado pelas telas: o conteúdo só aparece no desktop (quando a aside
 * existe no DOM); no mobile, simplesmente não é portado a lugar nenhum. */
export function AsideContent({ children }: { children: ReactNode }) {
  const ctx = useContext(AsideContext);
  if (!ctx?.node) return null;
  return createPortal(children, ctx.node);
}
