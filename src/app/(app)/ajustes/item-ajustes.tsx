import { ChevronRight, type LucideIcon } from "lucide-react";

export function ItemAjustes({ titulo, descricao, Icone, perigoso, aberta, children }: {
  titulo: string; descricao: string; Icone: LucideIcon; perigoso?: boolean;
  aberta?: boolean; children: React.ReactNode;
}) {
  return (
    <li>
      <details className="item-ajustes" name="opcoes-ajustes" open={aberta || undefined}>
        <summary>
          <Icone size={19} strokeWidth={1.5} style={{ color: perigoso ? "var(--bad)" : "var(--deep)", flexShrink: 0 }} aria-hidden />
          <span className="flex flex-1 flex-col" style={{ gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: perigoso ? "var(--bad)" : "var(--color-text)" }}>{titulo}</span>
            <span style={{ fontSize: 12, lineHeight: 1.4, color: "var(--mut)" }}>{descricao}</span>
          </span>
          <ChevronRight className="seta-ajustes" size={18} strokeWidth={1.5} style={{ color: "var(--mut)", flexShrink: 0 }} aria-hidden />
        </summary>
        <div className="flex flex-col" style={{ gap: 14, padding: "4px 14px 16px" }}>{children}</div>
      </details>
    </li>
  );
}
