export function PaginaConfiguracao({ titulo, descricao, children }: {
  titulo: string; descricao: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col" style={{ gap: "var(--espaco-secao)", paddingTop: 24 }}>
      <header>
        <p className="rotulo">Configurações</p>
        <h1 style={{ fontSize: 30, lineHeight: 1.15, marginTop: 4 }}>{titulo}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--mut)", marginTop: 8 }}>{descricao}</p>
      </header>
      {children}
    </div>
  );
}
