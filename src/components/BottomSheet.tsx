import { Sheet } from "@/components/ui/Sheet";

type Props = {
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

/** @deprecated use `Sheet` de `@/components/ui/Sheet` diretamente em código
 * novo — mantido como alias pra não precisar tocar todos os call sites. */
export function BottomSheet(props: Props) {
  return <Sheet {...props} />;
}
