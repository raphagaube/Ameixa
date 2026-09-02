export const metadata = {
  title: "Termos de Uso · Ameixa",
  description: "As regras de uso do Ameixa.",
};

const ATUALIZADO = "2 de setembro de 2026";

export default function Termos() {
  return (
    <>
      <h1>Termos de Uso</h1>
      <p className="atualizado">Última atualização: {ATUALIZADO}</p>

      <h2>O que é o Ameixa</h2>
      <p>
        O Ameixa é um aplicativo de finanças pessoais: você registra o que
        entra e o que sai, acompanha contas a pagar e a receber, e vê para
        onde o dinheiro está indo. Usá-lo é gratuito.
      </p>

      <h2>Sua conta</h2>
      <p>
        Você é responsável por manter a sua senha em segredo e pelo que
        acontece na sua conta. Se desconfiar de acesso indevido, troque a
        senha e avise pelo e-mail no fim desta página.
      </p>

      <h2>Seus dados são seus</h2>
      <p>
        Os lançamentos, contas e categorias que você cadastra pertencem a
        você. Pode exportar tudo quando quiser, em{" "}
        <em>Ajustes → Dados</em>, e pode pedir a exclusão da conta a qualquer
        momento. Como tratamos esses dados está na{" "}
        <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>O Ameixa não é consultoria financeira</h2>
      <p>
        Os números, gráficos e relatórios são um retrato do que você mesmo
        registrou. Eles ajudam a enxergar, mas não são recomendação de
        investimento nem orientação profissional. Decisões sobre o seu
        dinheiro são suas.
      </p>

      <h2>Erros e indisponibilidade</h2>
      <p>
        O aplicativo é oferecido no estado em que se encontra. Fazemos o
        possível para que os cálculos estejam corretos e o serviço no ar, mas
        não há garantia de funcionamento ininterrupto nem de ausência de
        falhas. Confira informações importantes — especialmente vencimentos e
        valores — antes de agir com base nelas.
      </p>
      <p>
        A integração com o Google Agenda é uma conveniência: o compromisso
        pode não ser criado se o Google estiver indisponível ou se a
        autorização expirar. O lembrete na agenda não substitui a sua própria
        conferência das contas.
      </p>

      <h2>Uso adequado</h2>
      <p>
        Não use o Ameixa para atividade ilegal, nem tente acessar dados de
        outras pessoas, sobrecarregar o serviço ou burlar seus limites.
      </p>

      <h2>Mudanças</h2>
      <p>
        Estes termos podem mudar. Alterações relevantes serão avisadas dentro
        do aplicativo, e a data de atualização no topo desta página sempre
        indica a versão vigente.
      </p>

      <h2>Contato</h2>
      <p>
        <a href="mailto:nascimento.gaube@gmail.com">
          nascimento.gaube@gmail.com
        </a>
      </p>
    </>
  );
}
