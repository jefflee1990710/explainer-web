import type { Messages } from "./types";

export const de: Partial<Messages> = {
  meta: { title: "Explainer — Erklärvideos", description: "Verwandle Konzepte in Reels, Marketing-clips und Präsentationsvideos. Wähle einen Stil, gib Storyboards frei und exportiere clips." },
  nav: { projects: "Projekte", characters: "Figuren", billing: "Abrechnung", pricing: "Preise", signIn: "Anmelden", workspace: "Arbeitsbereich", language: "Sprache" },
  common: { credits: "credits", perMonth: "/ Monat", cancel: "Abbrechen", save: "Speichern", close: "Schließen", create: "Erstellen", loading: "Wird geladen…", popular: "Am beliebtesten", subscribe: "Abonnieren" },
  landing: {
    hero: { kicker: "Explainer", title: "Erkläre Ideen verständlich als Reels, Marketing- und Präsentationsvideos.", subtitle: "Wähle einen Stil, gib Storyboards frei und exportiere clips – für Kurzvideos, Produktmarketing und Präsentationen.", ctaStart: "Jetzt starten", ctaWorkspace: "Arbeitsbereich öffnen", ctaPricing: "Tarife ansehen", artLabel: "Konzeptillustration für Storyboard und Schnitt" },
    steps: {
      step1Title: "Stil auswählen", step1Body: "Wähle einen Regiestil für Kurzvideos, Marketing, Präsentationen und mehr.",
      step2Title: "Storyboards freigeben", step2Body: "Die KI schlägt Titel, Aufhänger, Szenen und Sprechertexte vor. Bearbeite alles, bis du zufrieden bist.",
      step3Title: "Video exportieren", step3Body: "Nach der Freigabe erstellen wir Figurenbilder und clips für Reels, Anzeigen und Präsentationen.",
    },
    pricing: { title: "Abonnieren und Videos rendern", subtitle: "Jeder clip kostet 3 credits (Startbild, Endbild und Rendering). Storyboards sind bis zur Freigabe kostenlos.", clipsApprox: "clips", subscribePlan: "{plan} abonnieren" },
  },
  dashboard: { title: "Projekte", subscribed: "Mit deinem Tarif kannst du Videos rendern. Noch {credits} credits verfügbar.", notSubscribed: "Kein aktives Abonnement. Du kannst Storyboards entwerfen, benötigst aber vor dem Rendering einen Tarif.", noSubscriptionBanner: "Kein aktives Abonnement.", goBilling: "Zur Abrechnung" },
  folder: {
    create: "Neues Projekt", createTitle: "Neues Projekt", createHint: "Zuerst benennen, dann Videos hinzufügen.", createSubmit: "Projekt erstellen", nameLabel: "Projektname", namePlaceholder: "z. B. Produkteinführung im 4. Quartal",
    emptyTitle: "Noch keine Projekte", emptyBody: "Gib dieser Kampagne zuerst einen Namen und füge dann Videos hinzu.",
    noMatch: "Keine passenden Projekte gefunden. Probiere einen anderen Filter oder Suchbegriff.",
    searchPlaceholder: "Projektname oder Thema suchen…", searchLabel: "Projektname oder Thema suchen", filterLabel: "Statusfilter",
  },
  project: {
    steps: { input: "Eingabe", scene: "Szene", frames: "Einzelbilder", video: "Video" },
    status: { draft: "Entwurf", phase_a: "Storyboard wird erstellt", awaiting_approval: "Storyboard-Prüfung", production: "In Produktion", frames_generating: "Einzelbilder werden gerendert", frames_ready: "Einzelbild-Prüfung", approved: "Rendering wird vorbereitet", generating: "Rendering läuft", ready: "Fertig", failed: "Fehlgeschlagen" },
    filters: { all: "Alle", action: "Handlungsbedarf", active: "In Bearbeitung", ready: "Fertig", failed: "Fehlgeschlagen" },
  },
  characters: { title: "Figuren", create: "Neue Figur", empty: "Noch keine Figuren vorhanden." },
  billing: { title: "Abrechnung" },
  styles: { doodle: "Whiteboard-Zeichnung", "flat-vector": "Flache Vektorgrafik", "paper-cutout": "Scherenschnitt", chalkboard: "Kreidetafel", watercolor: "Aquarell-Bilderbuch", clay: "Knetanimation", pixel: "Pixelkunst", "ink-manga": "Tusche-Manga", realistic: "Filmisch-realistisch" },
  plans: {
    starter: { name: "Starter", blurb: "30 credits/Monat (ca. 10 clips / 2 Kurzvideos). Ideal zum Ausprobieren von Reels." },
    pro: { name: "Pro", blurb: "90 credits/Monat (ca. 30 clips). Regelmäßige Inhalte für Marketing und Präsentationen." },
    studio: { name: "Studio", blurb: "200 credits/Monat (ca. 66 clips). Für kleine Teams mit wöchentlicher Produktion." },
    scale: { name: "Scale", blurb: "400 credits/Monat (ca. 133 clips). Für hohe Produktionsvolumen." },
  },
} as unknown as Messages;
