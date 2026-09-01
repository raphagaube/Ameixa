"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoAmeixa } from "@/components/logo-ameixa";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

export function FormularioNovaSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setSalvando(true);
    const { error } = await criarClienteNavegador().auth.updateUser({
      password: senha,
    });
    setSalvando(false);

    if (error) {
      const m = error.message.toLowerCase();
      // Chegar aqui sem a sessão do link é o erro mais comum: link velho,
      // já usado, ou aberto num navegador diferente do que pediu.
      setErro(
        m.includes("session") || m.includes("jwt") || m.includes("token")
          ? "Esse link expirou ou já foi usado. Peça um novo em “Esqueci a senha”."
          : m.includes("should be at least")
            ? "A senha precisa ter pelo menos 6 caracteres."
            : "Não deu para trocar a senha. Tente de novo.",
      );
      return;
    }

    setPronto(true);
  }

  if (pronto) {
    return (
      <div className="flex flex-col" style={{ gap: 18 }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <LogoAmeixa tamanho={46} />
          <span style={{ fontSize: 30, fontWeight: 700 }}>Ameixa</span>
        </div>
        <h1 style={{ fontSize: 30, lineHeight: 1.15 }}>Senha trocada</h1>
        <p style={{ fontSize: 14, color: "var(--mut)" }}>
          Pronto. Da próxima vez, entre com a senha nova.
        </p>
        <Botao
          onClick={() => {
            router.replace("/");
            router.refresh();
          }}
        >
          Ir para o app
        </Botao>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 22 }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        <LogoAmeixa tamanho={46} />
        <span style={{ fontSize: 30, fontWeight: 700 }}>Ameixa</span>
      </div>

      <div>
        <h1 style={{ fontSize: 38, lineHeight: 1.1 }}>Nova senha</h1>
        <p style={{ fontSize: 14, color: "var(--mut)", marginTop: 6 }}>
          Escolha uma senha nova para entrar.
        </p>
      </div>

      <form onSubmit={enviar} className="flex flex-col" style={{ gap: 12 }}>
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <Campo
          rotulo="Confirmar senha"
          type="password"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
        />

        {erro ? (
          <p
            role="alert"
            style={{
              fontSize: 13,
              color: "var(--bad)",
              borderLeft: "3px solid var(--bad)",
              paddingLeft: 10,
            }}
          >
            {erro}
          </p>
        ) : null}

        <Botao type="submit" carregando={salvando} style={{ marginTop: 4 }}>
          Salvar senha
        </Botao>
      </form>
    </div>
  );
}
