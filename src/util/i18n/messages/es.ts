import type { Messages } from "@/util/i18n/messages/types";

export const es: Partial<Messages> = {
  meta: { title: "Scro — Vídeos explicativos", description: "Convierte conceptos en Reels, clips de marketing y vídeos para presentaciones. Elige un estilo, aprueba los guiones gráficos y exporta clips." },
  nav: { projects: "Vídeo", characters: "Personajes", tasks: "Tareas", mcp: "MCP", affiliate: "Affiliate", billing: "Facturación", examples: "Ejemplos", pricing: "Precios", signIn: "Iniciar sesión", workspace: "Espacio de trabajo", language: "Idioma" },
  common: { credits: "credits", pending: "pendientes", perMonth: "/ mes", cancel: "Cancelar", save: "Guardar", close: "Cerrar", create: "Crear", loading: "Cargando…", popular: "Más popular", subscribe: "Suscribirse" },
  landing: {
    hero: { kicker: "El estudio de vídeo corto", title: "La forma más rápida de crear Reels y Shorts que la gente ve hasta el final.", subtitle: "Escribe una idea. El director de IA de Scro crea el gancho, planifica cada escena y renderiza un vídeo vertical 9:16 listo para publicar.", ctaStart: "Crear mi primer short", ctaWorkspace: "Abrir espacio de trabajo", ctaUseCases: "Mira qué puedes crear", platformReels: "Instagram Reels", platformShorts: "YouTube Shorts", platformTiktok: "TikTok", artLabel: "Dos móviles reproduciendo vídeos cortos verticales" },
    steps: {
      step1Title: "Elige un estilo", step1Body: "Elige un estilo de dirección para vídeos cortos, marketing, presentaciones y mucho más.",
      step2Title: "Aprueba los guiones gráficos", step2Body: "La IA propone títulos, ganchos, escenas y locución. Edítalos hasta que te convenzan.",
      step3Title: "Exporta el vídeo", step3Body: "Tras la aprobación, generamos imágenes de los personajes y clips para Reels, anuncios y presentaciones.",
    },
    pricing: { title: "Suscríbete para renderizar vídeos", subtitle: "Elige el plan según cómo uses Scro.", clipsApprox: "clips", subscribePlan: "Suscribirse a {plan}" },
    enterprise: { title: "¿Necesitas más que Scale?", body: "Credits, facturación y contrato a medida para equipos que superan los planes publicados.", cta: "Contáctanos" },
    showcase: { title: "Ver resultados", subtitle: "Cuatro combinaciones en la misma plataforma: tema, estilo y formato.", reel: "Reel", deck: "Presentación", marketing: "Marketing", scro: "Cómo funciona Scro", product: "Demo de producto", story: "Historia corta" },
    cast: { eyebrow: "Personajes", title: "Crea el personaje una vez. Úsalo en cada vídeo.", body: "Define primero el personaje y el estilo. Luego haz Reels, clips de marketing y vídeos explicativos con la misma cara: para un producto, una función o un conocimiento.", product: "Producto", service: "Servicio", knowledge: "Conocimiento", cta: "Crear personaje" },
    director: { eyebrow: "Coste de generación", title: "Lo caro son los reintentos.", body: "El vídeo con IA se encarece porque cada fallo es otro render. El director de IA de Scro convierte tu idea en un storyboard que apruebas primero. El vídeo acierta en pocas tomas y el coste de generación baja.", idea: "Tu idea", takes: "Pocas tomas", cost: "Menor coste", cta: "Escribir el storyboard" },
  },
  examples: {
    title: "Ver los resultados",
    heroTitle: "Mira cómo funciona Scro",
    subtitle: "Cada tipo hace un trabajo distinto: el formato, el estilo y dónde se reproduce el vídeo.",
    cta: "Ver los resultados",
    scroReel: { title: "Cómo funciona Scro, en un Reel", body: "Un doodle vertical 9:16 para redes. Una escena: eliges un estilo, fijas un storyboard y los fotogramas se vuelven un vídeo corto. Cuando la idea tiene que entrar en unos segundos en el móvil." },
    scroDeck: { title: "Cómo funciona Scro, para una presentación", body: "La misma historia en flat vector 16:9, hecha para una diapositiva. Tres pasos en un plano: estilo, storyboard, exportación. Cuando el vídeo vive dentro de una presentación." },
    productMarketing: { title: "Una demo de producto para un post cuadrado", body: "Un clip de plastilina 1:1. Un producto, un instante: la botella sale de la caja y se enciende. Para anuncios de feed donde el producto es el protagonista." },
    productReel: { title: "Un corto pixel en un escenario ancho", body: "Una historia pixel 16:9. Un robot pequeño entrega una nota que brilla. El marco ancho le da un escenario a la escena. Para el hero de un sitio o un short horizontal." },
  },
  dashboard: { title: "Vídeo", subscribed: "Tu plan permite renderizar vídeos. Te quedan {credits} credits.", notSubscribed: "No hay ninguna suscripción activa. Puedes preparar guiones gráficos, pero necesitarás un plan antes de renderizar.", noSubscriptionBanner: "No hay ninguna suscripción activa.", goBilling: "Ir a facturación" },
  folder: {
    create: "Nuevo proyecto", createTitle: "Nuevo proyecto", createHint: "Ponle un nombre primero y luego añade vídeos.", createSubmit: "Crear proyecto", nameLabel: "Nombre del proyecto", namePlaceholder: "p. ej., lanzamiento de producto del T4",
    emptyTitle: "Aún no hay proyectos", emptyBody: "Ponle un nombre a esta campaña y después añade vídeos.",
    noMatch: "Ningún proyecto coincide con ese nombre.",
    searchPlaceholder: "Buscar por nombre del proyecto…", searchLabel: "Buscar por nombre del proyecto", filterLabel: "Filtro de estado",
  },
  project: {
    steps: { input: "Contenido", scene: "Escena", production: "Producción", export: "Video" },
    status: { draft: "Borrador", phase_a: "Redactando el guion gráfico", awaiting_approval: "Revisión del guion gráfico", production: "En producción", ready: "Terminado", failed: "Error" },
    filters: { all: "Todos", action: "Requiere atención", active: "En curso", ready: "Terminados", failed: "Con errores" },
  },
  characters: { title: "Personajes", create: "Nuevo personaje", empty: "Aún no hay personajes." },
  billing: { title: "Facturación" },
  styles: { doodle: "Garabato de pizarra blanca", "flat-vector": "Vector plano", "paper-cutout": "Recortes de papel", chalkboard: "Pizarra", "chalkboard-color": "Pizarra a color", watercolor: "Cuento en acuarela", clay: "Animación con plastilina", pixel: "Pixel art", "ink-manga": "Manga a tinta", realistic: "Realismo cinematográfico", "low-poly": "3D low poly", "colored-pencil": "Lápiz de color", "dark-tech": "3D técnico oscuro" },
  plans: {
    starter: { name: "Inicial", blurb: "Perfecto para probar Scro." },
    pro: { name: "Pro", blurb: "Para quien lleva su propio negocio." },
    studio: { name: "Estudio", blurb: "Para quien usa Scro para ganar dinero." },
    scale: { name: "Escala", blurb: "Para agencias y equipos que hacen vídeos para muchos clientes." },
  },
} as unknown as Messages;
