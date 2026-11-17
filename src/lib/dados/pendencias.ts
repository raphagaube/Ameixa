import "server-only";
import { cache } from "react";
import { todosOsMovimentos } from "@/lib/dados/movimentos";
import { resumirPendencias } from "@/lib/pendencias";

/** Reaproveita os movimentos que o Início já lê para os saldos. */
export const resumoDasPendencias = cache(async () =>
  resumirPendencias(await todosOsMovimentos()),
);
