import type { Messages } from "@/util/i18n/messages/types";

export const ru: Partial<Messages> = {
  meta: { title: "Explainer — Объясняющие видео", description: "Превращайте идеи в Reels, маркетинговые clips и видео для презентаций. Выберите стиль, утвердите раскадровки и экспортируйте clips." },
  nav: { projects: "Проекты", characters: "Персонажи", mcp: "MCP", affiliate: "Affiliate", billing: "Оплата", pricing: "Тарифы", signIn: "Войти", workspace: "Рабочая область", language: "Язык" },
  common: { credits: "credits", perMonth: "/ мес.", cancel: "Отмена", save: "Сохранить", close: "Закрыть", create: "Создать", loading: "Загрузка…", popular: "Самый популярный", subscribe: "Оформить подписку" },
  landing: {
    hero: { kicker: "Explainer", title: "Объясняйте идеи понятно с помощью Reels, маркетинговых видео и презентаций.", subtitle: "Выберите стиль, утвердите раскадровки и экспортируйте clips для коротких видео, продуктового маркетинга и презентаций.", ctaStart: "Начать", ctaWorkspace: "Открыть рабочую область", ctaPricing: "Посмотреть тарифы", artLabel: "Концептуальная иллюстрация раскадровки и монтажа" },
    steps: {
      step1Title: "Выберите стиль", step1Body: "Выберите режиссёрский стиль для коротких видео, маркетинга, презентаций и других задач.",
      step2Title: "Утвердите раскадровки", step2Body: "ИИ предложит заголовки, зацепки, сцены и закадровый текст. Редактируйте их, пока результат вас не устроит.",
      step3Title: "Экспортируйте видео", step3Body: "После утверждения мы создадим изображения персонажей и clips для Reels, рекламы и презентаций.",
    },
    pricing: { title: "Оформите подписку для рендеринга видео", subtitle: "Каждый clip стоит 3 credits (начальный кадр, конечный кадр и рендеринг). Раскадровки бесплатны до утверждения.", clipsApprox: "clips", subscribePlan: "Оформить подписку {plan}" },
  },
  dashboard: { title: "Проекты", subscribed: "Ваш тариф позволяет создавать видео. Осталось {credits} credits.", notSubscribed: "Нет активной подписки. Вы можете подготовить раскадровки, но для рендеринга понадобится тариф.", noSubscriptionBanner: "Нет активной подписки.", goBilling: "Перейти к оплате" },
  folder: {
    create: "Новый проект", createTitle: "Новый проект", createHint: "Сначала назовите проект, затем добавьте видео.", createSubmit: "Создать проект", nameLabel: "Название проекта", namePlaceholder: "например, запуск продукта в IV квартале",
    emptyTitle: "Проектов пока нет", emptyBody: "Сначала назовите кампанию, а затем добавьте в неё видео.",
    noMatch: "Подходящих проектов нет. Попробуйте другой фильтр или ключевое слово.",
    searchPlaceholder: "Поиск по названию или теме…", searchLabel: "Поиск по названию или теме", filterLabel: "Фильтр по статусу",
  },
  project: {
    steps: { input: "Материал", scene: "Сцена", production: "Производство", export: "Ролик" },
    status: { draft: "Черновик", phase_a: "Создание раскадровки", awaiting_approval: "Проверка раскадровки", production: "В производстве", ready: "Готово", failed: "Ошибка" },
    filters: { all: "Все", action: "Требуют внимания", active: "В работе", ready: "Готово", failed: "С ошибками" },
  },
  characters: { title: "Персонажи", create: "Новый персонаж", empty: "Персонажей пока нет." },
  billing: { title: "Оплата" },
  styles: { doodle: "Рисунок на белой доске", "flat-vector": "Плоская векторная графика", "paper-cutout": "Бумажная аппликация", chalkboard: "Меловая доска", watercolor: "Акварельная книга", clay: "Пластилиновая анимация", pixel: "Пиксельная графика", "ink-manga": "Манга тушью", realistic: "Кинематографический реализм" },
  plans: {
    starter: { name: "Начальный", blurb: "30 credits/мес. (около 10 clips / 2 коротких видео). Подходит, чтобы попробовать Reels." },
    pro: { name: "Профессиональный", blurb: "90 credits/мес. (около 30 clips). Регулярный выпуск маркетинговых материалов и презентаций." },
    studio: { name: "Студия", blurb: "200 credits/мес. (около 66 clips). Для небольших команд с еженедельными публикациями." },
    scale: { name: "Масштаб", blurb: "400 credits/мес. (около 133 clips). Для больших объёмов производства." },
  },
} as unknown as Messages;
