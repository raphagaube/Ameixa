import { expect, it } from "vitest";
import { resumirPendencias } from "./pendencias";

const item = { tipo: "despesa", conta_id: "banco", incompleto: false, valor: 10 };

it("conta uma vez o lançamento que está incompleto e sem conta", () => {
  const r = resumirPendencias([
    { ...item, conta_id: null, incompleto: true, valor: 42 },
    { ...item, incompleto: true, valor: 25.9 },
    item,
  ]);
  expect(r).toEqual({ quantidade: 2, semConta: { quantidade: 1, valor: 42 } });
});

it("inclui quem só precisa escolher uma conta e não anula entradas com saídas", () => {
  const r = resumirPendencias([
    { ...item, conta_id: null, valor: 100 },
    { ...item, tipo: "receita", conta_id: null, valor: 100 },
  ]);
  expect(r).toEqual({ quantidade: 2, semConta: { quantidade: 2, valor: 200 } });
});

it("não trata aporte sem conta como receita ou despesa pendente", () => {
  expect(resumirPendencias([{ ...item, tipo: "aporte", conta_id: null }]))
    .toEqual({ quantidade: 0, semConta: { quantidade: 0, valor: 0 } });
});

it("arredonda apenas o volume informativo e preserva os registros", () => {
  const linhas = [{ ...item, conta_id: null, valor: 0.1 }, { ...item, conta_id: null, valor: 0.2 }];
  const antes = structuredClone(linhas);
  expect(resumirPendencias(linhas).semConta.valor).toBe(0.3);
  expect(linhas).toEqual(antes);
});
