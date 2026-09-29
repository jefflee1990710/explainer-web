import type { Messages } from "@/util/i18n/messages/types";

export const de: Partial<Messages> = {
  meta: { title: "Scro — Erklärvideos", description: "Verwandle Konzepte in Reels, Marketing-clips und Präsentationsvideos. Wähle einen Stil, gib Storyboards frei und exportiere clips." },
  nav: { projects: "Projekte", characters: "Figuren", tasks: "Aufgaben", mcp: "MCP", affiliate: "Affiliate", billing: "Abrechnung", examples: "Beispiele", pricing: "Preise", signIn: "Anmelden", workspace: "Arbeitsbereich", language: "Sprache" },
  common: { credits: "credits", pending: "ausstehend", perMonth: "/ Monat", cancel: "Abbrechen", save: "Speichern", close: "Schließen", create: "Erstellen", loading: "Wird geladen…", popular: "Am beliebtesten", subscribe: "Abonnieren" },
  landing: {
    hero: { kicker: "Scro", title: "Erkläre Ideen verständlich als Reels, Marketing- und Präsentationsvideos.", subtitle: "Wähle einen Stil, gib Storyboards frei und exportiere clips – für Kurzvideos, Produktmarketing und Präsentationen.", ctaStart: "Jetzt starten", ctaWorkspace: "Arbeitsbereich öffnen", ctaPricing: "Tarife ansehen", artLabel: "Konzeptillustration für Storyboard und Schnitt" },
    steps: {
      step1Title: "Stil auswählen", step1Body: "Wähle einen Regiestil für Kurzvideos, Marketing, Präsentationen und mehr.",
      step2Title: "Storyboards freigeben", step2Body: "Die KI schlägt Titel, Aufhänger, Szenen und Sprechertexte vor. Bearbeite alles, bis du zufrieden bist.",
      step3Title: "Video exportieren", step3Body: "Nach der Freigabe erstellen wir Figurenbilder und clips für Reels, Anzeigen und Präsentationen.",
    },
    pricing: { title: "Abonnieren und Videos rendern", subtitle: "Jeder clip kostet 3 credits (Startbild, Endbild und Rendering). Storyboards sind bis zur Freigabe kostenlos.", clipsApprox: "clips", subscribePlan: "{plan} abonnieren" },
    enterprise: { title: "Mehr als Scale?", body: "Individuelle Credits, Rechnungen und Verträge für Teams, die über die gelisteten Tarife hinauswachsen.", cta: "Kontakt" },
    showcase: { title: "Ergebnisse ansehen", subtitle: "Vier Kombinationen auf derselben Plattform: Thema, Stil und Format.", reel: "Reel", deck: "Präsentation", marketing: "Marketing", scro: "So funktioniert Scro", product: "Produktdemo" },
    cast: { eyebrow: "Charaktere", title: "Charakter einmal anlegen. In jedem Video derselbe.", body: "Lege zuerst Charakter und Stil fest. Danach entstehen Reels, Marketingclips und Erklärvideos mit demselben Gesicht — für ein Produkt, eine Funktion oder Wissen.", product: "Produkt", service: "Service", knowledge: "Wissen", cta: "Charakter erstellen" },
    persona: { eyebrow: "Personal Brand", title: "Nicht vor die Kamera. Ein virtuelles Ich moderiert das Reel.", body: "Lade dein Foto hoch. Scro zeichnet dich im selben Stil als virtuellen Charakter und nutzt ihn für Personal-Branding-Videos.", cta: "Foto verwenden" },
    director: { eyebrow: "Generierungskosten", title: "Teuer sind die Wiederholungen.", body: "KI-Video summiert sich, weil jeder Fehlversuch ein neues Rendering ist. Scros KI-Regie macht aus deiner Idee zuerst ein Storyboard zum Freigeben. Das Video trifft in wenigen Takes, und die Generierungskosten bleiben niedrig.", idea: "Deine Idee", takes: "Wenige Takes", cost: "Niedrigere Kosten", cta: "Storyboard schreiben" },
  },
  examples: {
    title: "Ergebnisse ansehen",
    subtitle: "Jeder Typ hat eine Aufgabe: Format, Stil und wo das Video läuft.",
    cta: "Ergebnisse ansehen",
    scroReel: { title: "So funktioniert Scro, als Reel", body: "Ein vertikales 9:16-Doodle für Social. Eine Szene: Stil wählen, Storyboard anpinnen, die Bilder werden zum Kurzvideo. Wenn die Idee in wenigen Sekunden auf dem Handy ankommen muss." },
    scroDeck: { title: "So funktioniert Scro, als Folienclip", body: "Dieselbe Geschichte als 16:9-Flat-Vector für eine Folie. Drei Schritte in einer Einstellung: Stil, Storyboard, Export. Wenn das Video in einer Präsentation steckt." },
    productMarketing: { title: "Eine Produktdemo für einen quadratischen Post", body: "Ein 1:1-Claymation-Clip. Ein Produkt, ein Moment: die Flasche verlässt die Schachtel und leuchtet. Für Feed-Anzeigen, in denen das Produkt der Held ist." },
    productReel: { title: "Eine Produktdemo als Breitbild-Reel", body: "Dieselbe Produktgeschichte als 16:9-Pixel-Art. Der breitere Rahmen gibt der Demo eine Bühne. Für einen Website-Hero oder einen Querformat-Short." },
  },
  dashboard: { title: "Projekte", subscribed: "Mit deinem Tarif kannst du Videos rendern. Noch {credits} credits verfügbar.", notSubscribed: "Kein aktives Abonnement. Du kannst Storyboards entwerfen, benötigst aber vor dem Rendering einen Tarif.", noSubscriptionBanner: "Kein aktives Abonnement.", goBilling: "Zur Abrechnung" },
  folder: {
    create: "Neues Projekt", createTitle: "Neues Projekt", createHint: "Zuerst benennen, dann Videos hinzufügen.", createSubmit: "Projekt erstellen", nameLabel: "Projektname", namePlaceholder: "z. B. Produkteinführung im 4. Quartal",
    emptyTitle: "Noch keine Projekte", emptyBody: "Gib dieser Kampagne zuerst einen Namen und füge dann Videos hinzu.",
    noMatch: "Keine passenden Projekte gefunden. Probiere einen anderen Filter oder Suchbegriff.",
    searchPlaceholder: "Projektname oder Thema suchen…", searchLabel: "Projektname oder Thema suchen", filterLabel: "Statusfilter",
  },
  project: {
    steps: { input: "Eingabe", scene: "Szene", production: "Produktion", export: "Video" },
    status: { draft: "Entwurf", phase_a: "Storyboard wird erstellt", awaiting_approval: "Storyboard-Prüfung", production: "In Produktion", ready: "Fertig", failed: "Fehlgeschlagen" },
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
