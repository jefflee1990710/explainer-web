import type { Messages } from "@/util/i18n/messages/types";

export const pt: Partial<Messages> = {
  meta: { title: "Explainer — Vídeos explicativos", description: "Transforme conceitos em Reels, clips de marketing e vídeos de apresentação. Escolha um estilo, aprove os storyboards e exporte clips." },
  nav: { projects: "Projetos", characters: "Personagens", mcp: "MCP", affiliate: "Affiliate", billing: "Faturação", pricing: "Preços", signIn: "Entrar", workspace: "Área de trabalho", language: "Idioma" },
  common: { credits: "credits", perMonth: "/ mês", cancel: "Cancelar", save: "Guardar", close: "Fechar", create: "Criar", loading: "A carregar…", popular: "Mais popular", subscribe: "Subscrever" },
  landing: {
    hero: { kicker: "Explainer", title: "Explique ideias com clareza através de Reels, vídeos de marketing e apresentações.", subtitle: "Escolha um estilo, aprove os storyboards e exporte clips para vídeos curtos, marketing de produto e apresentações.", ctaStart: "Começar", ctaWorkspace: "Abrir área de trabalho", ctaPricing: "Ver planos", artLabel: "Ilustração conceptual de storyboard e edição" },
    steps: {
      step1Title: "Escolha um estilo", step1Body: "Escolha um estilo de realização para vídeos curtos, marketing, apresentações e muito mais.",
      step2Title: "Aprove os storyboards", step2Body: "A IA propõe títulos, ganchos, cenas e locução. Edite até ficar satisfeito.",
      step3Title: "Exporte o vídeo", step3Body: "Após a aprovação, geramos imagens das personagens e clips para Reels, anúncios e apresentações.",
    },
    pricing: { title: "Subscreva para renderizar vídeos", subtitle: "Cada clip custa 3 credits (fotograma inicial, fotograma final e renderização). Os storyboards são gratuitos até à aprovação.", clipsApprox: "clips", subscribePlan: "Subscrever {plan}" },
  },
  dashboard: { title: "Projetos", subscribed: "O seu plano permite renderizar vídeos. Restam {credits} credits.", notSubscribed: "Não existe uma subscrição ativa. Pode preparar storyboards, mas precisa de um plano antes de renderizar.", noSubscriptionBanner: "Não existe uma subscrição ativa.", goBilling: "Ir para faturação" },
  folder: {
    create: "Novo projeto", createTitle: "Novo projeto", createHint: "Dê um nome primeiro e depois adicione vídeos.", createSubmit: "Criar projeto", nameLabel: "Nome do projeto", namePlaceholder: "por ex., lançamento do produto no 4.º trimestre",
    emptyTitle: "Ainda não há projetos", emptyBody: "Dê primeiro um nome a esta campanha e depois adicione vídeos.",
    noMatch: "Nenhum projeto corresponde. Experimente outro filtro ou palavra-chave.",
    searchPlaceholder: "Pesquisar nome ou tema do projeto…", searchLabel: "Pesquisar nome ou tema do projeto", filterLabel: "Filtro de estado",
  },
  project: {
    steps: { input: "Conteúdo", scene: "Cena", production: "Produção", export: "Reel" },
    status: { draft: "Rascunho", phase_a: "A escrever o storyboard", awaiting_approval: "Revisão do storyboard", production: "Em produção", ready: "Concluído", failed: "Falhou" },
    filters: { all: "Todos", action: "Requer atenção", active: "Em curso", ready: "Concluídos", failed: "Falhados" },
  },
  characters: { title: "Personagens", create: "Nova personagem", empty: "Ainda não há personagens." },
  billing: { title: "Faturação" },
  styles: { doodle: "Desenho em quadro branco", "flat-vector": "Vetor plano", "paper-cutout": "Recorte de papel", chalkboard: "Quadro de giz", watercolor: "Livro ilustrado em aguarela", clay: "Animação em plasticina", pixel: "Pixel art", "ink-manga": "Manga a tinta", realistic: "Realismo cinematográfico" },
  plans: {
    starter: { name: "Inicial", blurb: "30 credits/mês (cerca de 10 clips / 2 vídeos curtos). Ideal para experimentar Reels." },
    pro: { name: "Pro", blurb: "90 credits/mês (cerca de 30 clips). Produção regular para marketing e apresentações." },
    studio: { name: "Estúdio", blurb: "200 credits/mês (cerca de 66 clips). Para equipas pequenas que publicam semanalmente." },
    scale: { name: "Escala", blurb: "400 credits/mês (cerca de 133 clips). Para produção em grande volume." },
  },
} as unknown as Messages;
