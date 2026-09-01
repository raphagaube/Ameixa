"use client";

import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { alterarNome } from "./acoes";

/** Alterar nome, e-mail e senha. Tudo em português, inclusive os erros. */
export function MinhaConta({
  nomeAtual,
  emailAtual,
}: {
  nomeAtual: string;
  emailAtual: string;
}) {
  const [nome, setNome] = useState(nomeAtual);
  const [email, setEmail] = useState(emailAtual);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(
    null,
  );
  const [salvando, iniciar] = useTransition();

  function salvarNome() {
    setMsg(null);
    iniciar(async () => {
      const r = await alterarNome(nome);
      setMsg(
        r.ok
          ? { tipo: "ok", texto: "Nome salvo." }
          : { tipo: "erro", texto: r.erro },
      );
    });
  }

  function salvarEmail() {
    setMsg(null);
    iniciar(async () => {
      const { error } = await criarClienteNavegador().auth.updateUser({ email });
      if (error) {
        const m = error.message.toLowerCase();
        setMsg({
          tipo: "erro",
          texto: m.includes("already")
            ? "Esse e-mail já está em uso."
            : m.includes("invalid")
              ? "Esse e-mail não parece válido."
              : "Não deu para trocar o e-mail.",
        });
        return;
      }
      setMsg({
        tipo: "ok",
        texto: `Enviamos um link de confirmação para ${email}. O e-mail só troca depois que você clicar nele.`,
      });
    });
  }

  function salvarSenha() {
    setMsg(null);
    if (senha.length < 6) {
      setMsg({ tipo: "erro", texto: "A senha precisa ter pelo menos 6 caracteres." });
      return;
    }
    if (senha !== confirmar) {
      setMsg({ tipo: "erro", texto: "As duas senhas não são iguais." });
      return;
    }
    iniciar(async () => {
      const { error } = await criarClienteNavegador().auth.updateUser({
        password: senha,
      });
      if (error) {
        setMsg({ tipo: "erro", texto: "Não deu para trocar a senha." });
        return;
      }
      setSenha("");
      setConfirmar("");
      setMsg({ tipo: "ok", texto: "Senha trocada." });
    });
  }

  const caixa: React.CSSProperties = {
    borderRadius: "var(--r)",
    border: "1px solid var(--ln2)",
    background: "var(--sf)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <div style={caixa}>
        <Campo
          rotulo="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={60}
        />
        <p style={{ fontSize: 12, color: "var(--mut)" }}>
          Aparece na saudação do Início e no cabeçalho dos relatórios.
        </p>
        <Botao
          variante="contorno"
          onClick={salvarNome}
          disabled={salvando || nome.trim() === nomeAtual}
        >
          Salvar nome
        </Botao>
      </div>

      <div style={caixa}>
        <Campo
          rotulo="E-mail"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Botao
          variante="contorno"
          onClick={salvarEmail}
          disabled={salvando || email.trim() === emailAtual}
        >
          Trocar e-mail
        </Botao>
      </div>

      <div style={caixa}>
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Campo
          rotulo="Confirmar senha"
          type="password"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
        <Botao variante="contorno" onClick={salvarSenha} disabled={salvando || !senha}>
          Trocar senha
        </Botao>
      </div>

      {msg ? (
        <p
          role={msg.tipo === "erro" ? "alert" : "status"}
          style={{
            fontSize: 13,
            color: msg.tipo === "erro" ? "var(--bad)" : "var(--color-text)",
            background: msg.tipo === "erro" ? "transparent" : "var(--tint)",
            borderLeft: msg.tipo === "erro" ? "3px solid var(--bad)" : undefined,
            borderRadius: msg.tipo === "erro" ? 0 : "var(--rs)",
            padding: msg.tipo === "erro" ? "0 0 0 10px" : 12,
          }}
        >
          {msg.texto}
        </p>
      ) : null}
    </div>
  );
}
