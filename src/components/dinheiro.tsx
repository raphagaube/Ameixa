/**
 * Marca um valor como dinheiro, para o modo privado poder escondê-lo.
 *
 * É de propósito um componente burro, sem estado e sem `"use client"`: quem
 * esconde é o CSS, a partir de um atributo no `<html>` escrito antes da
 * primeira pintura. Se a decisão fosse tomada em JavaScript, o servidor
 * mandaria o valor verdadeiro no HTML e ele apareceria por um instante
 * antes de sumir — e "piscar o saldo na frente de quem está olhando" é
 * exatamente a falha que este recurso existe para evitar.
 *
 * Uso: `<Dinheiro>{moeda(saldo)}</Dinheiro>`
 */
export function Dinheiro({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={className ? `dinheiro ${className}` : "dinheiro"} style={style}>
      {children}
    </span>
  );
}
