import type { Messages } from "@/util/i18n/messages/types";

export const pt: Partial<Messages> = {
  meta: { title: "Scro — Vídeos explicativos", description: "Transforme conceitos em Reels, clips de marketing e vídeos de apresentação. Escolha um estilo, aprove os storyboards e exporte clips." },
  nav: { projects: "Vídeo", characters: "Personagens", tasks: "Tarefas", mcp: "MCP", affiliate: "Affiliate", billing: "Faturação", examples: "Exemplos", pricing: "Preços", signIn: "Entrar", workspace: "Área de trabalho", language: "Idioma" },
  common: { credits: "credits", pending: "pendentes", perMonth: "/ mês", cancel: "Cancelar", save: "Guardar", close: "Fechar", create: "Criar", loading: "A carregar…", popular: "Mais popular", subscribe: "Subscrever" },
  landing: {
    hero: { kicker: "O estúdio de vídeos curtos", title: "A forma mais rápida de criar Reels e Shorts que as pessoas veem até ao fim.", subtitle: "Escreva uma ideia. O realizador de IA do Scro cria o gancho, planeia cada cena e gera um vídeo vertical 9:16 pronto a publicar.", ctaStart: "Criar o meu primeiro short", ctaWorkspace: "Abrir área de trabalho", ctaUseCases: "Veja o que pode criar", platformReels: "Instagram Reels", platformShorts: "YouTube Shorts", platformTiktok: "TikTok", artLabel: "Dois telemóveis a reproduzir vídeos curtos verticais" },
    steps: {
      step1Title: "Escolha um estilo", step1Body: "Escolha um estilo de realização para vídeos curtos, marketing, apresentações e muito mais.",
      step2Title: "Aprove os storyboards", step2Body: "A IA propõe títulos, ganchos, cenas e locução. Edite até ficar satisfeito.",
      step3Title: "Exporte o vídeo", step3Body: "Após a aprovação, geramos imagens das personagens e clips para Reels, anúncios e apresentações.",
    },
    pricing: { title: "Subscreva para renderizar vídeos", subtitle: "Escolha o plano conforme usa o Scro.", clipsApprox: "clips", subscribePlan: "Subscrever {plan}" },
    enterprise: { title: "Precisa de mais do que o Scale?", body: "Credits, faturação e contrato à medida para equipas que ultrapassam os planos listados.", cta: "Contacte-nos" },
    showcase: { title: "Ver resultados", subtitle: "Quatro combinações na mesma plataforma: tema, estilo e formato.", reel: "Reel", deck: "Apresentação", marketing: "Marketing", scro: "Como o Scro funciona", product: "Demo de produto", story: "História curta" },
    cast: { eyebrow: "Personagens", title: "Crie o personagem uma vez. Mantenha-o em cada vídeo.", body: "Defina primeiro o personagem e o estilo. Depois faça Reels, clips de marketing e vídeos explicativos com o mesmo rosto — para um produto, uma funcionalidade ou um conhecimento.", product: "Produto", service: "Serviço", knowledge: "Conhecimento", cta: "Criar personagem" },
    director: { eyebrow: "Custo de geração", title: "O que custa caro são as tentativas.", body: "O vídeo com IA acumula custo porque cada erro é outra renderização. O diretor de IA do Scro transforma a sua ideia num storyboard que aprova primeiro. O vídeo acerta em poucas tomadas e o custo de geração fica baixo.", idea: "A sua ideia", takes: "Poucas tomadas", cost: "Custo menor", cta: "Escrever o storyboard" },
  },
  examples: {
    title: "Ver os resultados",
    heroTitle: "Veja como o Scro funciona",
    subtitle: "Cada tipo faz um trabalho diferente: o formato, o estilo e onde o vídeo vai passar.",
    cta: "Ver os resultados",
    scroReel: { title: "Como o Scro funciona, num Reel", body: "Um doodle vertical 9:16 para redes. Uma cena: escolher um estilo, fixar um storyboard e os fotogramas viram um vídeo curto. Quando a ideia tem de chegar em poucos segundos no telemóvel." },
    scroDeck: { title: "Como o Scro funciona, para uma apresentação", body: "A mesma história em flat vector 16:9, feita para um slide. Três passos num plano: estilo, storyboard, exportação. Quando o vídeo vive dentro de uma apresentação." },
    productMarketing: { title: "Uma demo de produto para um post quadrado", body: "Um clip de claymation 1:1. Um produto, um instante: a garrafa sai da caixa e acende. Para anúncios de feed em que o produto é o protagonista." },
    productReel: { title: "Um curto pixel num palco largo", body: "Uma história pixel 16:9. Um robô pequeno entrega um bilhete luminoso. O formato largo dá um palco à cena. Para o hero de um site ou um short horizontal." },
  },
  dashboard: { title: "Vídeo", subscribed: "O seu plano permite renderizar vídeos. Restam {credits} credits.", notSubscribed: "Não existe uma subscrição ativa. Pode preparar storyboards, mas precisa de um plano antes de renderizar.", noSubscriptionBanner: "Não existe uma subscrição ativa.", goBilling: "Ir para faturação" },
  folder: {
    create: "Novo projeto", createTitle: "Novo projeto", createHint: "Dê um nome primeiro e depois adicione vídeos.", createSubmit: "Criar projeto", nameLabel: "Nome do projeto", namePlaceholder: "por ex., lançamento do produto no 4.º trimestre",
    emptyTitle: "Ainda não há projetos", emptyBody: "Dê primeiro um nome a esta campanha e depois adicione vídeos.",
    noMatch: "Nenhum projeto corresponde a esse nome.",
    searchPlaceholder: "Pesquisar pelo nome do projeto…", searchLabel: "Pesquisar pelo nome do projeto", filterLabel: "Filtro de estado",
  },
  project: {
    steps: { input: "Conteúdo", scene: "Cena", production: "Produção", export: "Video" },
    status: { draft: "Rascunho", phase_a: "A escrever o storyboard", awaiting_approval: "Revisão do storyboard", production: "Em produção", ready: "Concluído", failed: "Falhou" },
    filters: { all: "Todos", action: "Requer atenção", active: "Em curso", ready: "Concluídos", failed: "Falhados" },
  },
  characters: { title: "Personagens", create: "Nova personagem", empty: "Ainda não há personagens." },
  billing: { title: "Faturação" },
  styles: { doodle: "Desenho em quadro branco", "flat-vector": "Vetor plano", "paper-cutout": "Recorte de papel", chalkboard: "Quadro de giz", "chalkboard-color": "Quadro de giz colorido", watercolor: "Livro ilustrado em aguarela", clay: "Animação em plasticina", pixel: "Pixel art", "ink-manga": "Manga a tinta", realistic: "Realismo cinematográfico", "low-poly": "3D low poly", "colored-pencil": "Lápis de cor", "dark-tech": "3D tech escuro" },
  plans: {
    starter: { name: "Inicial", blurb: "Perfeito para testar o Scro." },
    pro: { name: "Pro", blurb: "Para quem gere o próprio negócio." },
    studio: { name: "Estúdio", blurb: "Para quem usa o Scro para ganhar dinheiro." },
    scale: { name: "Escala", blurb: "Para agências e equipas que fazem vídeos para muitos clientes." },
  },
} as unknown as Messages;
