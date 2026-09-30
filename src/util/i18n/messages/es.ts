import type { Messages } from "@/util/i18n/messages/types";

export const es: Partial<Messages> = {
  meta: { title: "Scro — Vídeos explicativos", description: "Convierte conceptos en Reels, clips de marketing y vídeos para presentaciones. Elige un estilo, aprueba los guiones gráficos y exporta clips." },
  nav: { projects: "Proyectos", characters: "Personajes", tasks: "Tareas", mcp: "MCP", affiliate: "Affiliate", billing: "Facturación", examples: "Ejemplos", pricing: "Precios", signIn: "Iniciar sesión", workspace: "Espacio de trabajo", language: "Idioma" },
  common: { credits: "credits", pending: "pendientes", perMonth: "/ mes", cancel: "Cancelar", save: "Guardar", close: "Cerrar", create: "Crear", loading: "Cargando…", popular: "Más popular", subscribe: "Suscribirse" },
  landing: {
    hero: { kicker: "Scro", title: "Explica tus ideas con claridad mediante Reels, vídeos de marketing y presentaciones.", subtitle: "Elige un estilo, aprueba los guiones gráficos y exporta clips para vídeos cortos, marketing de producto y presentaciones.", ctaStart: "Empezar", ctaWorkspace: "Abrir espacio de trabajo", ctaPricing: "Ver planes", artLabel: "Ilustración conceptual de guion gráfico y edición" },
    steps: {
      step1Title: "Elige un estilo", step1Body: "Elige un estilo de dirección para vídeos cortos, marketing, presentaciones y mucho más.",
      step2Title: "Aprueba los guiones gráficos", step2Body: "La IA propone títulos, ganchos, escenas y locución. Edítalos hasta que te convenzan.",
      step3Title: "Exporta el vídeo", step3Body: "Tras la aprobación, generamos imágenes de los personajes y clips para Reels, anuncios y presentaciones.",
    },
    pricing: { title: "Suscríbete para renderizar vídeos", subtitle: "Cada clip cuesta 3 credits (fotograma inicial, fotograma final y renderizado). Los guiones gráficos son gratis hasta que los apruebes.", clipsApprox: "clips", subscribePlan: "Suscribirse a {plan}" },
    enterprise: { title: "¿Necesitas más que Scale?", body: "Credits, facturación y contrato a medida para equipos que superan los planes publicados.", cta: "Contáctanos" },
    showcase: { title: "Ver resultados", subtitle: "Cuatro combinaciones en la misma plataforma: tema, estilo y formato.", reel: "Reel", deck: "Presentación", marketing: "Marketing", scro: "Cómo funciona Scro", product: "Demo de producto", story: "Historia corta" },
    cast: { eyebrow: "Personajes", title: "Crea el personaje una vez. Úsalo en cada vídeo.", body: "Define primero el personaje y el estilo. Luego haz Reels, clips de marketing y vídeos explicativos con la misma cara: para un producto, una función o un conocimiento.", product: "Producto", service: "Servicio", knowledge: "Conocimiento", cta: "Crear personaje" },
    persona: { eyebrow: "Marca personal", title: "Sin salir a cámara. Que un tú virtual presente el Reel.", body: "Sube tu foto. Scro te redibuja como personaje virtual en el mismo estilo y lo usa en vídeos de marca personal.", cta: "Usar tu foto" },
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
  dashboard: { title: "Proyectos", subscribed: "Tu plan permite renderizar vídeos. Te quedan {credits} credits.", notSubscribed: "No hay ninguna suscripción activa. Puedes preparar guiones gráficos, pero necesitarás un plan antes de renderizar.", noSubscriptionBanner: "No hay ninguna suscripción activa.", goBilling: "Ir a facturación" },
  folder: {
    create: "Nuevo proyecto", createTitle: "Nuevo proyecto", createHint: "Ponle un nombre primero y luego añade vídeos.", createSubmit: "Crear proyecto", nameLabel: "Nombre del proyecto", namePlaceholder: "p. ej., lanzamiento de producto del T4",
    emptyTitle: "Aún no hay proyectos", emptyBody: "Ponle un nombre a esta campaña y después añade vídeos.",
    noMatch: "No hay proyectos que coincidan. Prueba otro filtro o palabra clave.",
    searchPlaceholder: "Buscar por nombre o tema…", searchLabel: "Buscar por nombre o tema", filterLabel: "Filtro de estado",
  },
  project: {
    steps: { input: "Contenido", scene: "Escena", production: "Producción", export: "Video" },
    status: { draft: "Borrador", phase_a: "Redactando el guion gráfico", awaiting_approval: "Revisión del guion gráfico", production: "En producción", ready: "Terminado", failed: "Error" },
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
