export const metadata = {
  title: "Política de Privacidade · Ameixa",
  description: "Como o Ameixa trata os seus dados.",
};

const ATUALIZADO = "2 de setembro de 2026";

export default function Privacidade() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p className="atualizado">Última atualização: {ATUALIZADO}</p>

      <p>
        O Ameixa é um aplicativo de finanças pessoais. Esta política explica,
        sem rodeios, quais dados ele guarda, por quê, e o que você pode fazer
        a respeito.
      </p>

      <h2>Quais dados o Ameixa guarda</h2>
      <ul>
        <li>
          <strong>Sua conta:</strong> e-mail e nome, para identificar você e
          permitir o login.
        </li>
        <li>
          <strong>Seus dados financeiros:</strong> lançamentos, contas,
          cartões, categorias, orçamentos e metas que você cadastra ou importa.
        </li>
        <li>
          <strong>Preferências:</strong> tema e cor de destaque escolhidos.
        </li>
      </ul>

      <p>
        Esses dados ficam em um banco de dados hospedado no{" "}
        <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">
          Supabase
        </a>
        , e o aplicativo é servido pela{" "}
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
          Vercel
        </a>
        . Cada conta só enxerga os próprios dados: o isolamento é imposto pelo
        banco, não apenas pela tela.
      </p>

      <h2>Conexão com o Google Agenda</h2>
      <p>
        A conexão com o Google Agenda é opcional e só existe se você autorizar.
        Quando autorizada:
      </p>
      <ul>
        <li>
          O Ameixa cria <strong>duas agendas próprias</strong> na sua conta
          Google e cria compromissos nelas a partir das suas contas a pagar e a
          receber.
        </li>
        <li>
          A permissão pedida é a mais restrita que existe para isso
          (<code>calendar.app.created</code>): ela dá acesso{" "}
          <strong>somente às agendas criadas pelo próprio aplicativo</strong>.
          O Ameixa não lê, não altera e não enxerga o restante do seu
          calendário.
        </li>
        <li>
          O seu endereço de e-mail do Google é lido apenas para mostrar, na
          tela de Ajustes, qual conta está conectada.
        </li>
        <li>
          A chave de acesso fornecida pelo Google é guardada de forma cifrada e
          usada exclusivamente para manter esses compromissos em dia.
        </li>
      </ul>
      <p>
        Você pode desconectar a qualquer momento em <em>Ajustes → Google
        Agenda</em>, ou revogar o acesso diretamente em{" "}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noreferrer"
        >
          myaccount.google.com/permissions
        </a>
        . Ao desconectar, o Ameixa apaga a chave de acesso e esquece o vínculo
        com os compromissos.
      </p>
      <p>
        O uso de dados recebidos das APIs do Google segue a{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer"
        >
          Política de Dados do Usuário dos Serviços de API do Google
        </a>
        , incluindo os requisitos de Uso Limitado.
      </p>

      <h2>O que o Ameixa não faz</h2>
      <ul>
        <li>Não vende os seus dados.</li>
        <li>Não compartilha os seus dados com terceiros para publicidade.</li>
        <li>Não usa os seus dados para treinar modelos de inteligência artificial.</li>
        <li>Não usa cookies de rastreamento nem ferramentas de análise de comportamento.</li>
      </ul>
      <p>
        Os únicos cookies usados são os necessários para manter você
        conectado.
      </p>

      <h2>Seus direitos</h2>
      <ul>
        <li>
          <strong>Ver e exportar:</strong> em <em>Ajustes → Dados</em> você
          baixa um arquivo com tudo que é seu.
        </li>
        <li>
          <strong>Corrigir:</strong> qualquer lançamento pode ser editado ou
          excluído a qualquer momento.
        </li>
        <li>
          <strong>Apagar:</strong> peça a exclusão da conta pelo e-mail abaixo
          e todos os seus dados são removidos.
        </li>
      </ul>
      <p>
        Esses direitos acompanham a Lei Geral de Proteção de Dados (Lei
        13.709/2018).
      </p>

      <h2>Contato</h2>
      <p>
        Dúvidas sobre esta política:{" "}
        <a href="mailto:nascimento.gaube@gmail.com">
          nascimento.gaube@gmail.com
        </a>
        .
      </p>
    </>
  );
}
