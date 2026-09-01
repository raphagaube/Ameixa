"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LogoAmeixa } from "@/components/logo-ameixa";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

type Modo = "login" | "cadastro" | "recuperar";

const TITULOS: Record<Modo, { titulo: string; subtitulo: string }> = {
  login: {
    titulo: "Bem-vindo de volta",
    subtitulo: "Entre para ver suas contas do mês.",
  },
  cadastro: {
    titulo: "Criar conta",
    subtitulo: "Leva menos de um minuto.",
  },
  recuperar: {
    titulo: "Esqueci a senha",
    subtitulo: "Enviamos um link para você criar uma nova.",
  },
};

/** Traduz os erros do Supabase, que vêm sempre em inglês. */
function mensagemDeErro(bruto: string): string {
  const m = bruto.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Esse e-mail já tem conta. Tente entrar.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Esse e-mail não parece válido.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Sem conexão com o servidor. Verifique sua internet.";
  return "Não deu para concluir. Tente novamente.";
}

export function FormularioEntrada() {
  const router = useRouter();
  const params = useSearchParams();
  const proxima = params.get("proxima") ?? "/";

  const [modo, setModo] = useState<Modo>("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErro(null);
    setAviso(null);
    setSenha("");
    setConfirmar("");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);

    if (modo === "cadastro") {
      if (nome.trim().length < 2) {
        setErro("Escreva seu nome.");
        return;
      }
      if (senha.length < 6) {
        setErro("A senha precisa ter pelo menos 6 caracteres.");
        return;
      }
      if (senha !== confirmar) {
        setErro("As duas senhas não são iguais.");
        return;
      }
    }

    setCarregando(true);
    const supabase = criarClienteNavegador();

    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        router.replace(proxima);
        router.refresh();
        return;
      }

      if (modo === "cadastro") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome: nome.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        // Com "Confirm email" ligado, não vem sessão: o usuário precisa
        // clicar no link do e-mail antes de conseguir entrar.
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setAviso(
            `Enviamos um e-mail para ${email}. Abra a mensagem e clique no link para confirmar sua conta.`,
          );
        }
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?proxima=/redefinir-senha`,
      });
      if (error) throw error;
      setAviso(
        `Se existir conta com ${email}, o link de nova senha chega em instantes.`,
      );
    } catch (e) {
      setErro(mensagemDeErro(e instanceof Error ? e.message : String(e)));
    } finally {
      setCarregando(false);
    }
  }

  const { titulo, subtitulo } = TITULOS[modo];

  return (
    <div className="flex flex-col" style={{ gap: 22 }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        <LogoAmeixa tamanho={46} />
        <span style={{ fontSize: 30, fontWeight: 700 }}>Ameixa</span>
      </div>

      <div>
        <h1 style={{ fontSize: 38, lineHeight: 1.1 }}>{titulo}</h1>
        <p style={{ fontSize: 14, color: "var(--mut)", marginTop: 6 }}>{subtitulo}</p>
      </div>

      <form onSubmit={enviar} className="flex flex-col" style={{ gap: 12 }}>
        {modo === "cadastro" ? (
          <Campo
            rotulo="Nome"
            name="nome"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        ) : null}

        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {modo !== "recuperar" ? (
          <Campo
            rotulo="Senha"
            name="senha"
            type="password"
            autoComplete={modo === "login" ? "current-password" : "new-password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        ) : null}

        {modo === "cadastro" ? (
          <Campo
            rotulo="Confirmar senha"
            name="confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
          />
        ) : null}

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

        {aviso ? (
          <p
            role="status"
            style={{
              fontSize: 13,
              color: "var(--color-text)",
              background: "var(--tint)",
              borderRadius: "var(--rs)",
              padding: 12,
            }}
          >
            {aviso}
          </p>
        ) : null}

        <Botao type="submit" carregando={carregando} style={{ marginTop: 4 }}>
          {modo === "login" ? "Entrar" : modo === "cadastro" ? "Criar conta" : "Enviar link"}
        </Botao>
      </form>

      <div className="flex flex-col items-center" style={{ gap: 2 }}>
        <Botao
          variante="texto"
          type="button"
          onClick={() => trocarModo(modo === "cadastro" ? "login" : "cadastro")}
        >
          {modo === "cadastro" ? "Já tenho conta — entrar" : "Criar uma conta"}
        </Botao>
        {modo !== "recuperar" ? (
          <Botao variante="texto" type="button" onClick={() => trocarModo("recuperar")}>
            Esqueci a senha
          </Botao>
        ) : (
          <Botao variante="texto" type="button" onClick={() => trocarModo("login")}>
            Voltar para entrar
          </Botao>
        )}
      </div>
    </div>
  );
}
