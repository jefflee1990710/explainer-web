import type { Messages } from "./types";

export const fr: Partial<Messages> = {
  meta: { title: "Explainer — Vidéos explicatives", description: "Transformez vos concepts en Reels, clips marketing et vidéos de présentation. Choisissez un style, validez les storyboards et exportez vos clips." },
  nav: { projects: "Projets", characters: "Personnages", billing: "Facturation", pricing: "Tarifs", signIn: "Se connecter", workspace: "Espace de travail", language: "Langue" },
  common: { credits: "credits", perMonth: "/ mois", cancel: "Annuler", save: "Enregistrer", close: "Fermer", create: "Créer", loading: "Chargement…", popular: "Le plus populaire", subscribe: "S’abonner" },
  landing: {
    hero: { kicker: "Explainer", title: "Expliquez clairement vos idées avec des Reels, des vidéos marketing et des présentations.", subtitle: "Choisissez un style, validez les storyboards et exportez des clips pour vos vidéos courtes, votre marketing produit et vos présentations.", ctaStart: "Commencer", ctaWorkspace: "Ouvrir l’espace de travail", ctaPricing: "Voir les offres", artLabel: "Illustration conceptuelle du storyboard et du montage" },
    steps: {
      step1Title: "Choisissez un style", step1Body: "Choisissez un style de réalisation adapté aux vidéos courtes, au marketing, aux présentations et plus encore.",
      step2Title: "Validez les storyboards", step2Body: "L’IA propose des titres, des accroches, des scènes et une voix off. Modifiez-les jusqu’à obtenir le résultat souhaité.",
      step3Title: "Exportez la vidéo", step3Body: "Après validation, nous générons des images fixes des personnages et des clips pour vos Reels, publicités et présentations.",
    },
    pricing: { title: "Abonnez-vous pour générer des vidéos", subtitle: "Chaque clip coûte 3 credits (image de début, image de fin et rendu). Les storyboards sont gratuits jusqu’à leur validation.", clipsApprox: "clips", subscribePlan: "S’abonner à {plan}" },
  },
  dashboard: { title: "Projets", subscribed: "Votre offre permet de générer des vidéos. Il vous reste {credits} credits.", notSubscribed: "Aucun abonnement actif. Vous pouvez préparer des storyboards, mais une offre est nécessaire avant le rendu.", noSubscriptionBanner: "Aucun abonnement actif.", goBilling: "Accéder à la facturation" },
  folder: {
    create: "Nouveau projet", createTitle: "Nouveau projet", createHint: "Donnez-lui d'abord un nom, puis ajoutez des vidéos.", createSubmit: "Créer le projet", nameLabel: "Nom du projet", namePlaceholder: "Ex. : lancement produit du T4",
    emptyTitle: "Aucun projet pour le moment", emptyBody: "Commencez par nommer cette campagne, puis ajoutez-y des vidéos.",
    noMatch: "Aucun projet ne correspond. Essayez un autre filtre ou mot-clé.",
    searchPlaceholder: "Rechercher un nom ou un sujet…", searchLabel: "Rechercher un nom ou un sujet", filterLabel: "Filtre d’état",
  },
  project: {
    steps: { input: "Contenu", scene: "Scène", frames: "Images", video: "Vidéo" },
    status: { draft: "Brouillon", phase_a: "Rédaction du storyboard", awaiting_approval: "Validation du storyboard", frames_generating: "Génération des images", frames_ready: "Validation des images", approved: "Préparation du rendu", generating: "Génération en cours", ready: "Terminé", failed: "Échec" },
    filters: { all: "Tous", action: "Action requise", active: "En cours", ready: "Terminés", failed: "Échecs" },
  },
  characters: { title: "Personnages", create: "Nouveau personnage", empty: "Aucun personnage pour le moment." },
  billing: { title: "Facturation" },
  styles: { doodle: "Dessin sur tableau blanc", "flat-vector": "Illustration vectorielle plane", "paper-cutout": "Papier découpé", chalkboard: "Tableau noir", watercolor: "Album à l’aquarelle", clay: "Animation en pâte à modeler", pixel: "Pixel art", "ink-manga": "Manga à l’encre", realistic: "Réalisme cinématographique" },
  plans: {
    starter: { name: "Débutant", blurb: "30 credits/mois (environ 10 clips / 2 vidéos courtes). Idéal pour essayer les Reels." },
    pro: { name: "Pro", blurb: "90 credits/mois (environ 30 clips). Une production régulière pour le marketing et les présentations." },
    studio: { name: "Studio", blurb: "200 credits/mois (environ 66 clips). Pour les petites équipes qui publient chaque semaine." },
    scale: { name: "Scale", blurb: "400 credits/mois (environ 133 clips). Pour une production à grande échelle." },
  },
} as unknown as Messages;
