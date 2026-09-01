"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

export function BotaoSair() {
  const router = useRouter();
  const [saindo, iniciar] = useTransition();

  function sair() {
    iniciar(async () => {
      await criarClienteNavegador().auth.signOut();
      router.replace("/entrar");
      router.refresh();
    });
  }

  return (
    <Botao variante="contorno" onClick={sair} carregando={saindo}>
      <span className="flex items-center justify-center" style={{ gap: 8 }}>
        <LogOut size={18} strokeWidth={1.5} aria-hidden />
        Sair
      </span>
    </Botao>
  );
}
