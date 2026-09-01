import { categoriasDoUsuario } from "@/lib/dados/categorias";
import { PainelCategorias } from "./painel-categorias";

export const metadata = { title: "Categorias · Ameixa" };

export default async function Categorias() {
  const categorias = await categoriasDoUsuario();
  return <PainelCategorias categorias={categorias} />;
}
