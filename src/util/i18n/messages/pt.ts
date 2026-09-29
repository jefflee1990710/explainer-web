import type { Messages } from "@/util/i18n/messages/types";

export const pt: Partial<Messages> = {
  meta: { title: "Scro — Vídeos explicativos", description: "Transforme conceitos em Reels, clips de marketing e vídeos de apresentação. Escolha um estilo, aprove os storyboards e exporte clips." },
  nav: { projects: "Projetos", characters: "Personagens", tasks: "Tarefas", mcp: "MCP", affiliate: "Affiliate", billing: "Faturação", examples: "Exemplos", pricing: "Preços", signIn: "Entrar", workspace: "Área de trabalho", language: "Idioma" },
  common: { credits: "credits", pending: "pendentes", perMonth: "/ mês", cancel: "Cancelar", save: "Guardar", close: "Fechar", create: "Criar", loading: "A carregar…", popular: "Mais popular", subscribe: "Subscrever" },
  landing: {
    hero: { kicker: "Scro", title: "Explique ideias com clareza através de Reels, vídeos de marketing e apresentações.", subtitle: "Escolha um estilo, aprove os storyboards e exporte clips para vídeos curtos, marketing de produto e apresentações.", ctaStart: "Começar", ctaWorkspace: "Abrir área de trabalho", ctaPricing: "Ver planos", artLabel: "Ilustração conceptual de storyboard e edição" },
    steps: {
      step1Title: "Escolha um estilo", step1Body: "Escolha um estilo de realização para vídeos curtos, marketing, apresentações e muito mais.",
      step2Title: "Aprove os storyboards", step2Body: "A IA propõe títulos, ganchos, cenas e locução. Edite até ficar satisfeito.",
      step3Title: "Exporte o vídeo", step3Body: "Após a aprovação, geramos imagens das personagens e clips para Reels, anúncios e apresentações.",
    },
    pricing: { title: "Subscreva para renderizar vídeos", subtitle: "Cada clip custa 3 credits (fotograma inicial, fotograma final e renderização). Os storyboards são gratuitos até à aprovação.", clipsApprox: "clips", subscribePlan: "Subscrever {plan}" },
    enterprise: { title: "Precisa de mais do que o Scale?", body: "Credits, faturação e contrato à medida para equipas que ultrapassam os planos listados.", cta: "Contacte-nos" },
    showcase: { title: "Ver resultados", subtitle: "Quatro combinações na mesma plataforma: tema, estilo e formato.", reel: "Reel", deck: "Apresentação", marketing: "Marketing", scro: "Como o Scro funciona", product: "Demo de produto" },
    cast: { eyebrow: "Personagens", title: "Crie o personagem uma vez. Mantenha-o em cada vídeo.", body: "Defina primeiro o personagem e o estilo. Depois faça Reels, clips de marketing e vídeos explicativos com o mesmo rosto — para um produto, uma funcionalidade ou um conhecimento.", product: "Produto", service: "Serviço", knowledge: "Conhecimento", cta: "Criar personagem" },
    persona: { eyebrow: "Marca pessoal", title: "Sem aparecer na câmara. Um você virtual apresenta o Reel.", body: "Envie a sua foto. O Scro redesenha-o como personagem virtual no mesmo estilo e usa-o em vídeos de marca pessoal.", cta: "Usar a sua foto" },
    director: { eyebrow: "Custo de geração", title: "O que custa caro são as tentativas.", body: "O vídeo com IA acumula custo porque cada erro é outra renderização. O diretor de IA do Scro transforma a sua ideia num storyboard que aprova primeiro. O vídeo acerta em poucas tomadas e o custo de geração fica baixo.", idea: "A sua ideia", takes: "Poucas tomadas", cost: "Custo menor", cta: "Escrever o storyboard" },
  },
  examples: {
    title: "Ver os resultados",
    subtitle: "Cada tipo faz um trabalho diferente: o formato, o estilo e onde o vídeo vai passar.",
    cta: "Ver os resultados",
    scroReel: { title: "Como o Scro funciona, num Reel", body: "Um doodle vertical 9:16 para redes. Uma cena: escolher um estilo, fixar um storyboard e os fotogramas viram um vídeo curto. Quando a ideia tem de chegar em poucos segundos no telemóvel." },
    scroDeck: { title: "Como o Scro funciona, para uma apresentação", body: "A mesma história em flat vector 16:9, feita para um slide. Três passos num plano: estilo, storyboard, exportação. Quando o vídeo vive dentro de uma apresentação." },
    productMarketing: { title: "Uma demo de produto para um post quadrado", body: "Um clip de claymation 1:1. Um produto, um instante: a garrafa sai da caixa e acende. Para anúncios de feed em que o produto é o protagonista." },
    productReel: { title: "Uma demo de produto num Reel panorâmico", body: "A mesma história de produto em pixel art 16:9. O formato largo dá um palco à demo. Para o hero de um site ou um short horizontal." },
  },
  dashboard: { title: "Projetos", subscribed: "O seu plano permite renderizar vídeos. Restam {credits} credits.", notSubscribed: "Não existe uma subscrição ativa. Pode preparar storyboards, mas precisa de um plano antes de renderizar.", noSubscriptionBanner: "Não existe uma subscrição ativa.", goBilling: "Ir para faturação" },
  folder: {
    create: "Novo projeto", createTitle: "Novo projeto", createHint: "Dê um nome primeiro e depois adicione vídeos.", createSubmit: "Criar projeto", nameLabel: "Nome do projeto", namePlaceholder: "por ex., lançamento do produto no 4.º trimestre",
    emptyTitle: "Ainda não há projetos", emptyBody: "Dê primeiro um nome a esta campanha e depois adicione vídeos.",
    noMatch: "Nenhum projeto corresponde. Experimente outro filtro ou palavra-chave.",
    searchPlaceholder: "Pesquisar nome ou tema do projeto…", searchLabel: "Pesquisar nome ou tema do projeto", filterLabel: "Filtro de estado",
  },
  project: {
    steps: { input: "Conteúdo", scene: "Cena", production: "Produção", export: "Video" },
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
