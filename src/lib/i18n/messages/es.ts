import type { Messages } from "./types";

export const es: Partial<Messages> = {
  meta: { title: "Explainer — Vídeos explicativos", description: "Convierte conceptos en Reels, clips de marketing y vídeos para presentaciones. Elige un estilo, aprueba los guiones gráficos y exporta clips." },
  nav: { projects: "Proyectos", characters: "Personajes", billing: "Facturación", pricing: "Precios", signIn: "Iniciar sesión", workspace: "Espacio de trabajo", language: "Idioma" },
  common: { credits: "credits", perMonth: "/ mes", cancel: "Cancelar", save: "Guardar", close: "Cerrar", create: "Crear", loading: "Cargando…", popular: "Más popular", subscribe: "Suscribirse" },
  landing: {
    hero: { kicker: "Explainer", title: "Explica tus ideas con claridad mediante Reels, vídeos de marketing y presentaciones.", subtitle: "Elige un estilo, aprueba los guiones gráficos y exporta clips para vídeos cortos, marketing de producto y presentaciones.", ctaStart: "Empezar", ctaWorkspace: "Abrir espacio de trabajo", ctaPricing: "Ver planes", artLabel: "Ilustración conceptual de guion gráfico y edición" },
    steps: {
      step1Title: "Elige un estilo", step1Body: "Elige un estilo de dirección para vídeos cortos, marketing, presentaciones y mucho más.",
      step2Title: "Aprueba los guiones gráficos", step2Body: "La IA propone títulos, ganchos, escenas y locución. Edítalos hasta que te convenzan.",
      step3Title: "Exporta el vídeo", step3Body: "Tras la aprobación, generamos imágenes de los personajes y clips para Reels, anuncios y presentaciones.",
    },
    pricing: { title: "Suscríbete para renderizar vídeos", subtitle: "Cada clip cuesta 3 credits (fotograma inicial, fotograma final y renderizado). Los guiones gráficos son gratis hasta que los apruebes.", clipsApprox: "clips", subscribePlan: "Suscribirse a {plan}" },
  },
  dashboard: { title: "Proyectos", subscribed: "Tu plan permite renderizar vídeos. Te quedan {credits} credits.", notSubscribed: "No hay ninguna suscripción activa. Puedes preparar guiones gráficos, pero necesitarás un plan antes de renderizar.", noSubscriptionBanner: "No hay ninguna suscripción activa.", goBilling: "Ir a facturación" },
  folder: {
    create: "Nuevo proyecto", createTitle: "Nuevo proyecto", createHint: "Ponle un nombre primero y luego añade vídeos.", createSubmit: "Crear proyecto", nameLabel: "Nombre del proyecto", namePlaceholder: "p. ej., lanzamiento de producto del T4",
    emptyTitle: "Aún no hay proyectos", emptyBody: "Ponle un nombre a esta campaña y después añade vídeos.",
    noMatch: "No hay proyectos que coincidan. Prueba otro filtro o palabra clave.",
    searchPlaceholder: "Buscar por nombre o tema…", searchLabel: "Buscar por nombre o tema", filterLabel: "Filtro de estado",
  },
  project: {
    steps: { input: "Contenido", scene: "Escena", frames: "Fotogramas", video: "Vídeo" },
    status: { draft: "Borrador", phase_a: "Redactando el guion gráfico", awaiting_approval: "Revisión del guion gráfico", production: "En producción", frames_generating: "Renderizando fotogramas", frames_ready: "Revisión de fotogramas", approved: "Preparando el renderizado", generating: "Renderizando", ready: "Terminado", failed: "Error" },
    filters: { all: "Todos", action: "Requiere atención", active: "En curso", ready: "Terminados", failed: "Con errores" },
  },
  characters: { title: "Personajes", create: "Nuevo personaje", empty: "Aún no hay personajes." },
  billing: { title: "Facturación" },
  styles: { doodle: "Garabato de pizarra blanca", "flat-vector": "Vector plano", "paper-cutout": "Recortes de papel", chalkboard: "Pizarra", watercolor: "Cuento en acuarela", clay: "Animación con plastilina", pixel: "Pixel art", "ink-manga": "Manga a tinta", realistic: "Realismo cinematográfico" },
  plans: {
    starter: { name: "Inicial", blurb: "30 credits/mes (unos 10 clips / 2 vídeos cortos). Ideal para probar Reels." },
    pro: { name: "Pro", blurb: "90 credits/mes (unos 30 clips). Producción constante para marketing y presentaciones." },
    studio: { name: "Estudio", blurb: "200 credits/mes (unos 66 clips). Para equipos pequeños que publican cada semana." },
    scale: { name: "Escala", blurb: "400 credits/mes (unos 133 clips). Producción de gran volumen." },
  },
} as unknown as Messages;
