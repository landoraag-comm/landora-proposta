/*
 * LANDORA — Dados da proposta
 * ---------------------------------------------------------------
 * Edite este arquivo para personalizar a proposta.
 * ATENÇÃO: os valores abaixo são EXEMPLOS. Ajuste antes de enviar ao cliente.
 *
 * Link personalizado por cliente:
 *   proposta.html?cliente=Nome%20do%20Cliente
 */
window.PROPOSTA = {
  cliente: "Seu Cliente",
  planos: [],
  validadeDias: 15,
  // WhatsApp da Landora com DDI+DDD, só números (ex.: "5515999999999").
  // Se ficar vazio, o botão vira "Copiar resumo".
  whatsapp: "",
  instagram: "@landora.ag",

  categorias: [
    { id: "todos", nome: "Todos" },
    { id: "essenciais", nome: "Essenciais" },
    { id: "vendas", nome: "Vendas" },
    { id: "relacionamento", nome: "Relacionamento" },
    { id: "gestao", nome: "Gestão" },
  ],

  // preco = valor único (implantação) | mensal = recorrência (0 = não tem)
  modulos: [
    {
      id: "landing",
      categoria: "essenciais",
      icone: "page",
      nome: "Landing page premium",
      desc: "Página de alta conversão, rápida, responsiva e com identidade visual do seu negócio.",
      preco: 1800,
      mensal: 0,
    },
    {
      id: "painel",
      categoria: "gestao",
      icone: "dashboard",
      nome: "Painel administrativo",
      desc: "Área restrita para gerenciar conteúdos, clientes e configurações sem depender de ninguém.",
      preco: 2400,
      mensal: 0,
    },
    {
      id: "pagamentos",
      categoria: "vendas",
      icone: "card",
      nome: "Pagamentos Pix e cartão",
      desc: "Cobrança online com confirmação automática e recibo para o cliente.",
      preco: 1200,
      mensal: 0,
    },
    {
      id: "agendamento",
      categoria: "vendas",
      icone: "calendar",
      nome: "Agendamento online",
      desc: "Horários disponíveis, confirmação e remarcação em poucos toques.",
      preco: 1500,
      mensal: 0,
    },
    {
      id: "whatsapp",
      categoria: "relacionamento",
      icone: "chat",
      nome: "Automação de WhatsApp",
      desc: "Respostas rápidas, boas-vindas e encaminhamento de leads direto para sua equipe.",
      preco: 1400,
      mensal: 99,
    },
    {
      id: "crm",
      categoria: "vendas",
      icone: "users",
      nome: "CRM de leads",
      desc: "Funil simples para acompanhar cada contato, do primeiro clique ao fechamento.",
      preco: 1600,
      mensal: 0,
    },
    {
      id: "area-cliente",
      categoria: "relacionamento",
      icone: "lock",
      nome: "Área do cliente",
      desc: "Login individual com histórico, documentos e comunicados para cada cliente.",
      preco: 2200,
      mensal: 0,
    },
    {
      id: "checkin",
      categoria: "gestao",
      icone: "zap",
      nome: "Check-in e controle de acesso",
      desc: "Liberação por QR Code, registro de presença e regras de acesso por perfil.",
      preco: 1900,
      mensal: 0,
    },
    {
      id: "pedidos",
      categoria: "vendas",
      icone: "cart",
      nome: "Catálogo e pedidos online",
      desc: "Catálogo com fotos, carrinho do cliente e pedidos organizados para a sua equipe.",
      preco: 1700,
      mensal: 0,
    },
    {
      id: "notificacoes",
      categoria: "relacionamento",
      icone: "bell",
      nome: "Notificações e lembretes",
      desc: "Avisos automáticos de vencimento, agendamentos e novidades.",
      preco: 900,
      mensal: 49,
    },
    {
      id: "fidelidade",
      categoria: "relacionamento",
      icone: "star",
      nome: "Programa de fidelidade",
      desc: "Pontos, recompensas e indicações para fazer o cliente voltar.",
      preco: 1300,
      mensal: 0,
    },
    {
      id: "relatorios",
      categoria: "gestao",
      icone: "chart",
      nome: "Relatórios e métricas",
      desc: "Visão clara de vendas, conversões e desempenho em um só lugar.",
      preco: 1100,
      mensal: 0,
    },
    {
      id: "seo",
      categoria: "essenciais",
      icone: "globe",
      nome: "SEO, Pixel e Analytics",
      desc: "Configuração para aparecer no Google e medir cada campanha de anúncios.",
      preco: 800,
      mensal: 0,
    },
    {
      id: "pwa",
      categoria: "essenciais",
      icone: "mobile",
      nome: "App instalável (PWA)",
      desc: "Seu site se comporta como app no celular, com ícone na tela inicial.",
      preco: 2000,
      mensal: 0,
    },
    {
      id: "suporte",
      categoria: "gestao",
      icone: "shield",
      nome: "Suporte e manutenção mensal",
      desc: "Hospedagem, atualizações, backups e atendimento prioritário.",
      preco: 0,
      mensal: 150,
    },
  ],

  termos: [
    "Todo o projeto (domínio, hospedagem, banco de dados, contas e código-fonte) fica registrado no CNPJ e no e-mail do contratante, que é o dono e tem acesso a tudo.",
    "Os valores únicos correspondem à implantação de cada módulo; valores mensais são recorrentes enquanto o módulo estiver ativo.",
    "O prazo de entrega e o cronograma são definidos em conjunto após a assinatura.",
    "Módulos guardados em “Depois” não fazem parte deste contrato e podem ser contratados mais adiante, com os valores desta proposta durante a validade.",
    "Ajustes fora do escopo dos módulos escolhidos são orçados à parte.",
  ],
};
