import type { Messages } from "@/util/i18n/messages/types";

export const fr: Partial<Messages> = {
  meta: { title: "Scro — Vidéos explicatives", description: "Transformez vos concepts en Reels, clips marketing et vidéos de présentation. Choisissez un style, validez les storyboards et exportez vos clips." },
  nav: { projects: "Vidéo", characters: "Personnages", tasks: "Tâches", mcp: "MCP", affiliate: "Affiliate", billing: "Facturation", examples: "Exemples", pricing: "Tarifs", signIn: "Se connecter", workspace: "Espace de travail", language: "Langue" },
  common: { credits: "credits", pending: "en cours", perMonth: "/ mois", cancel: "Annuler", save: "Enregistrer", close: "Fermer", create: "Créer", loading: "Chargement…", popular: "Le plus populaire", subscribe: "S’abonner" },
  landing: {
    hero: { kicker: "Scro", title: "Expliquez clairement vos idées avec des Reels, des vidéos marketing et des présentations.", subtitle: "Choisissez un style, validez les storyboards et exportez des clips pour vos vidéos courtes, votre marketing produit et vos présentations.", ctaStart: "Commencer", ctaWorkspace: "Ouvrir l’espace de travail", ctaPricing: "Voir les offres", artLabel: "Illustration conceptuelle du storyboard et du montage" },
    steps: {
      step1Title: "Choisissez un style", step1Body: "Choisissez un style de réalisation adapté aux vidéos courtes, au marketing, aux présentations et plus encore.",
      step2Title: "Validez les storyboards", step2Body: "L’IA propose des titres, des accroches, des scènes et une voix off. Modifiez-les jusqu’à obtenir le résultat souhaité.",
      step3Title: "Exportez la vidéo", step3Body: "Après validation, nous générons des images fixes des personnages et des clips pour vos Reels, publicités et présentations.",
    },
    pricing: { title: "Abonnez-vous pour générer des vidéos", subtitle: "Choisissez l’offre qui correspond à votre usage de Scro.", clipsApprox: "clips", subscribePlan: "S’abonner à {plan}" },
    enterprise: { title: "Besoin de plus que Scale ?", body: "Credits, facturation et contrat sur mesure pour les équipes qui dépassent les offres affichées.", cta: "Nous contacter" },
    showcase: { title: "Voir les résultats", subtitle: "Quatre combinaisons sur la même plateforme : sujet, style et format.", reel: "Reel", deck: "Présentation", marketing: "Marketing", scro: "Comment marche Scro", product: "Démo produit", story: "Courte histoire" },
    cast: { eyebrow: "Personnages", title: "Créez le personnage une fois. Gardez-le dans chaque vidéo.", body: "Définissez d’abord un personnage et un style. Ensuite, enchaînez Reels, clips marketing et vidéos explicatives avec le même visage — pour un produit, une fonctionnalité, ou un savoir.", product: "Produit", service: "Service", knowledge: "Savoir", cta: "Créer un personnage" },
    persona: { eyebrow: "Marque personnelle", title: "Restez hors caméra. Laissez un vous virtuel animer le Reel.", body: "Importez votre photo. Scro vous redessine en personnage virtuel dans le même style, puis l’utilise pour vos vidéos de marque personnelle.", cta: "Utiliser votre photo" },
    director: { eyebrow: "Coût de génération", title: "Ce qui coûte cher, ce sont les essais.", body: "La vidéo IA s’additionne parce que chaque raté est un nouveau rendu. Le directeur IA de Scro transforme votre idée en storyboard à valider d’abord. La vidéo tombe juste en quelques prises, et le coût de génération reste bas.", idea: "Votre idée", takes: "Peu de prises", cost: "Coût plus bas", cta: "Écrire le storyboard" },
  },
  examples: {
    title: "Voir les résultats",
    heroTitle: "Voir comment Scro fonctionne",
    subtitle: "Chaque type a un rôle : le format, le style, et l’endroit où la vidéo sera lue.",
    cta: "Voir les résultats",
    scroReel: { title: "Comment marche Scro, en Reel", body: "Un doodle vertical 9:16 pour les réseaux. Une scène : choisir un style, épingler un storyboard, les images deviennent une courte vidéo. Quand l’idée doit passer en quelques secondes sur un téléphone." },
    scroDeck: { title: "Comment marche Scro, pour une présentation", body: "La même histoire en flat vector 16:9, faite pour une diapositive. Trois temps dans un plan : style, storyboard, export. Quand la vidéo vit dans une présentation." },
    productMarketing: { title: "Une démo produit pour un post carré", body: "Un clip claymation 1:1. Un produit, un instant : la bouteille sort de la boîte et s’allume. Pour une pub de fil où le produit est le héros." },
    productReel: { title: "Un court pixel sur une scène large", body: "Une histoire pixel 16:9. Un petit robot livre un mot lumineux. Le cadre large donne une scène à l’histoire. Pour un hero de site ou un short horizontal." },
  },
  dashboard: { title: "Vidéo", subscribed: "Votre offre permet de générer des vidéos. Il vous reste {credits} credits.", notSubscribed: "Aucun abonnement actif. Vous pouvez préparer des storyboards, mais une offre est nécessaire avant le rendu.", noSubscriptionBanner: "Aucun abonnement actif.", goBilling: "Accéder à la facturation" },
  folder: {
    create: "Nouveau projet", createTitle: "Nouveau projet", createHint: "Donnez-lui d'abord un nom, puis ajoutez des vidéos.", createSubmit: "Créer le projet", nameLabel: "Nom du projet", namePlaceholder: "Ex. : lancement produit du T4",
    emptyTitle: "Aucun projet pour le moment", emptyBody: "Commencez par nommer cette campagne, puis ajoutez-y des vidéos.",
    noMatch: "Aucun projet ne correspond à ce nom.",
    searchPlaceholder: "Rechercher par nom de projet…", searchLabel: "Rechercher par nom de projet", filterLabel: "Filtre d’état",
  },
  project: {
    steps: { input: "Contenu", scene: "Scène", production: "Production", export: "Video" },
    status: { draft: "Brouillon", phase_a: "Rédaction du storyboard", awaiting_approval: "Validation du storyboard", production: "En production", ready: "Terminé", failed: "Échec" },
    filters: { all: "Tous", action: "Action requise", active: "En cours", ready: "Terminés", failed: "Échecs" },
  },
  characters: { title: "Personnages", create: "Nouveau personnage", empty: "Aucun personnage pour le moment." },
  billing: { title: "Facturation" },
  styles: { doodle: "Dessin sur tableau blanc", "flat-vector": "Illustration vectorielle plane", "paper-cutout": "Papier découpé", chalkboard: "Tableau noir", watercolor: "Album à l’aquarelle", clay: "Animation en pâte à modeler", pixel: "Pixel art", "ink-manga": "Manga à l’encre", realistic: "Réalisme cinématographique" },
  plans: {
    starter: { name: "Débutant", blurb: "Idéal pour tester Scro." },
    pro: { name: "Pro", blurb: "Pour quelqu’un qui développe sa propre activité." },
    studio: { name: "Studio", blurb: "Pour ceux qui gagnent de l’argent avec Scro." },
    scale: { name: "Scale", blurb: "Pour les agences et les équipes qui produisent pour de nombreux clients." },
  },
} as unknown as Messages;
