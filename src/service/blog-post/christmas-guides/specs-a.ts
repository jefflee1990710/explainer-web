import type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";

const explain = ["Christmas", "AI Video", "Explainer"] as string[];
const host = ["Christmas", "AI Video", "Talking Head"] as string[];
const product = ["Christmas", "AI Video", "Product Promo"] as string[];
const face = ["Christmas", "AI Video", "AI Influencer"] as string[];
const voice = ["Christmas", "AI Video", "Cantonese"] as string[];

void voice;

// English Christmas production guides, ids 1–25.
export const SPECS_A: SeasonGuideSpec[] = [
  {
    id: 1,
    slug: "christmas-reel-hook-in-3-seconds",
    title: "Christmas Reel Hook in 3 Seconds",
    excerpt:
      "The first spoken line is the offer or the date. A greeting spends the only seconds a stranger is likely to hear.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult at a small flower stall, mouth open as if speaking, a wrapped bunch of greenery held low, warm shop light, no text",
    cta: "Open on the offer",
    answer:
      "The first spoken line of a Christmas reel is the offer or the date. Hello, welcome, and a holiday wish spend the only stretch many people hear before they move on. Say the offer you are actually running, or the day you actually mean, before any greeting. A reel can run from 3 seconds to 3 minutes, and a practical cut is 15–45 seconds. In every length, the first 3 seconds carry the point, so that offer or that date has to land inside them. One person speaks. If the face or the voice could be mistaken for a real person, say in the caption that it is AI, and leave the platform label where it already appears. Lower the wrapped bunch, speak the offer or the date as the first words, and only then match the caption to that line. The first 3 seconds show one florist with the bunch held low, and they say the hand-off day with no hello in front of it. Reject a greeting-first take, a second face at the stall, or stems that cover the mouth. Keep one speaker. A practical reel is 15–45 seconds. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it already appears.",
    points: [
      {
        h: "Put the point in the first breath",
        p: "Speak the offer or the date as the first words, in the order a customer would write them down. A date means the day you open, close, ship, or stop taking orders. An offer means the offer you are running today. Save the shop name and any greeting for a later breath, or leave them out of the voice entirely. Say the offer or the date in the order a customer would write it, and save the shop name for a later breath. In the first 3 seconds the picture is the florist and the low bunch, and the words are that day or that offer. Reject any opening that starts with welcome or a holiday wish before you post.",
      },
      {
        h: "Match the caption to that line",
        p: "The words on screen should be the same offer or the same date, held through the opening. Place them in the upper middle, clear of the face and of anything the host is holding. If this file will also go to TikTok or Shorts, burn the caption in so the point survives without the app's own text layer. After the spoken line, type the same offer or date in the upper middle, clear of the face and the stems. In the first 3 seconds, viewers see that clear band and hear the same day the mouth just used. Do not post a caption that names a different day, or a bunch that crosses the type.",
      },
      {
        h: "One speaker, one claim",
        p: "Keep a single person in the frame for the whole reel. A second voice, a second face, or a second offer in the opening turns the hook into a list. Finish the first claim before you add a detail. The detail can arrive after the third second, once the point is already clear. Finish the first claim with the same person in frame, and let any extra detail wait until after the third second. The opening 3 seconds show one florist while the line says only the offer or the date. Throw out a second voice, a second face, or a second offer before the file goes up.",
      },
    ],
    example:
      "A florist at a covered market looks into the lens and says the last day for a local hand-off of a wrapped bunch. There is no hello before that sentence. The bunch stays low so the upper middle is free. The caption repeats the same day and says the host is AI, because the face looks like a real person. After the hand-off day is spoken, hold on the low bunch, then stop. For the first 3 seconds, show the florist and the wrapped stems, and say the last local hand-off day. Reject a hello, a second bundle, or a face you did not lock. Keep one speaker inside 15–45 seconds. If the face or voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps this as one person speaking. You can set the opening line in one of 13 caption styles and export the reel at 9:16. If the face or the voice is realistic, label it as AI in the caption and leave the platform label in place. Set that opening line in one caption style, export 9:16, and check the order before the file leaves. Inside the first 3 seconds, the florist is on screen with the bunch low, and the voice says the offer or the date. Reject a greeting-first cut. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Say the offer or the date first.",
      "Keep one person in frame.",
      "Label a realistic face or voice as AI.",
    ],
  },
  {
    id: 2,
    slug: "one-gift-christmas-product-reel",
    title: "One Gift, One Christmas Reel",
    excerpt:
      "One reel, one gift, a blank tag. Say the offer out loud and put the shop name in the caption.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one wrapped gift box on a wood counter, a blank paper tag with no marks, soft daylight, no logo and no text",
    cta: "Show the one gift",
    answer:
      "One Christmas product reel carries one gift. Pick a single jar, scarf, or box, and leave every other item for another cut. The tag on this gift stays blank, with no invented letters and no invented logo. Say the offer you are actually running, in words you would use at the counter. The shop name goes in the caption, typed by you, not painted onto the wrap. The first 3 seconds should already show that one gift and let the offer be heard. If you use a realistic AI voice for the line, label the clip as AI. Choose the one gift, clear every other sharp object, then say the offer you are actually running while the blank tag is already in frame. The first 3 seconds show that single jar, scarf, or box, and they say the offer with the shop name left for the caption. Reject a second product in focus, any letter on the tag, or a painted logo. Keep one product. A practical reel is 15–45 seconds. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it was placed.",
    points: [
      {
        h: "One SKU fills the frame",
        p: "Choose the gift before you choose the background. A second product, even a small one at the edge, asks the viewer to shop a shelf instead of one thing. Neighbors can sit far behind and out of focus, or they can wait. The hero is the only object you would point at if the sound were off. Point at the hero gift first and push neighbors out of focus before you record the line. In the first 3 seconds the picture is that one gift, and the words are the offer you would say at the counter. Do not post a frame where a second item is sharp enough to shop.",
      },
      {
        h: "The tag stays unmarked",
        p: "A blank tag is part of the still. Do not ask for writing, a monogram, or a luxury mark on the card, the ribbon, or the box. If a letter appears, reject the still and try again. Anything you need the viewer to read belongs in the caption, where you can type the real shop name yourself. Inspect the tag, the ribbon, and the box for strokes before you accept the still, then type the shop name yourself. In the first 3 seconds, viewers see the blank tag and hear the real offer. Reject any monogram, word, or luxury mark before posting.",
      },
      {
        h: "Say the offer once, clearly",
        p: "Speak the offer in one sentence, using only what you are actually offering. Do not add a second deal in the same breath. A practical cut is 15–45 seconds, which is enough for the gift, the offer, and a quiet end on the same object. The opening still has to be that gift, not a room tour. Speak the offer in one sentence after the gift is already large, and end on that same object. The opening 3 seconds show the one gift while the line says only the offer you are running. Throw out a room tour, a second deal, or a logo on the wrap before the file goes up.",
      },
    ],
    example:
      "A candle maker films one glass jar on a wood counter. The hang tag is blank paper. The spoken line is the offer the maker is running this week, and the shop name is typed in the caption. A second jar that crept into the corner is cropped out before the reel is posted. Crop the corner jar, leave the hang tag blank, then read the caption against the spoken offer. For the first 3 seconds, show the glass jar on the wood counter and say the offer the maker is running. Reject a crest on the glass or a second jar left in focus. Keep one product inside 15–45 seconds. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro treats this as one product. Keep the label blank, invent no logo, and say the offer in the reel. The shop name goes in the caption. Export 9:16 so the jar can sit large in a vertical frame. Export the vertical frame only after the jar is the only sharp object and the label is still blank. Inside the first 3 seconds, that one gift is on screen and the voice says the offer. Reject a painted shop name. Type the real shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Show only one gift.",
      "Leave the tag blank.",
      "Say the real offer, and type the shop name in the caption.",
    ],
  },
  {
    id: 3,
    slug: "warm-window-light-christmas-host",
    title: "Warm Window Light for a Christmas Host",
    excerpt:
      "Let the window be the key light. Fairy lights stay softer, and the face keeps a real skin color.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult seated beside a tall window, warm daylight on one cheek, faint fairy lights behind and out of focus, natural skin color, no text",
    cta: "Light the host from the window",
    answer:
      "The window is the key light for a Christmas host. Fairy lights are fill, and they stay dimmer than the glass. Sit the host a step from the window so one cheek is brighter and the far cheek falls off. The face keeps a real skin color, the color you would see in that daylight, not a gold cast from the string. If the lights are brighter than the window, they have become the key and the skin will follow them. Approve the still while it is still a picture. If the host looks like a real person, say in the caption that the host is AI. Name the window side, sit the host a step from the glass, and only then let a dim string sit behind. The first 3 seconds show one cheek brighter from the window and skin that still looks like skin, and they say the shop point in that light. Reject a string brighter than the glass, a gold cast on the collar, or a second lamp you did not name. Keep one speaker. A practical reel is 15–45 seconds. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Name the window as the key",
        p: "Say which side the glass is on, and that it is the main light. A description that only says festive, warm, or glowing gives the string permission to paint the face. The window should be in the frame or just outside it, close enough that you can point to the bright cheek and know why it is bright. Point to the bright cheek and say which side the glass is on before you approve anything. In the first 3 seconds the picture is that window-lit face, and the words are the point of the reel. Reject a still you cannot explain from the glass before you post.",
      },
      {
        h: "Keep the string behind",
        p: "Fairy lights belong in the background, soft and out of focus. They can lift a dark corner. They should not relight the forehead, the nose, or a white collar. If you can see a bulb reflected as the main catchlight, the string is no longer fill. Move it back or dim it in the description. Push the fairy lights behind the shoulder and out of focus after the window is set. In the first 3 seconds, viewers see a soft string and hear the line without a bulb sitting in the eye as the key. Do not post catchlights that belong to the string instead of the window.",
      },
      {
        h: "Check the skin before motion",
        p: "Look at the cheeks, the neck, and any white cloth on a phone screen. They should agree with daylight, with only a small warm lift from the room. An overall amber face means the lights won. Fix the still before the mouth moves. The same locked face should survive a later life photo in this corner. Check cheeks, neck, and white cloth on a phone, then let the mouth move only if the color still matches daylight. The opening 3 seconds show the locked face while the line says the shop point. Throw out an amber face before the file goes up, and say the host is AI if the face looks real.",
      },
    ],
    example:
      "A knitwear seller sits at a kitchen table with the window on frame left. The left cheek is bright, the right cheek is a step darker, and the skin still looks like skin. A short string of lights hangs on the far wall, blurred, and it does not turn the collar gold. That still is the one that moves. Keep the kitchen window on frame left, approve the skin, then let that still move. For the first 3 seconds, show the brighter left cheek and the blurred string, and say the shop line. Reject a collar turned gold or a string that outshines the glass. Keep one speaker inside 15–45 seconds. If the face could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro can lock this host's face and wait while you approve the still before any motion. A later life photo can reuse the same person in the same light. Change clothes only if you mean to, and export 9:16. Label the realistic face as AI. Approve the still in this window light before motion, then export 9:16. Inside the first 3 seconds, the bright cheek is the window side and the voice says the shop point. Reject a face dyed by the string. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Point to the window as the bright side.",
      "Keep fairy lights dimmer than the glass.",
      "Leave the skin a real color, and label the host as AI.",
    ],
  },
  {
    id: 4,
    slug: "paper-cutout-christmas-explainer",
    title: "Paper-Cutout Christmas Explainer",
    excerpt:
      "One wooden board, one Christmas idea, and one hook title in the opening. The paper figure is not a person.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "Paper-cutout shapes of a plain gift box and a single arrow on one dark wooden board, white paper edges, no letters and no people",
    cta: "Build it on one board",
    answer:
      "A paper-cutout Christmas explainer lives on one wooden board and teaches one idea. The opening is one hook title, large enough to read at once, in the language you are speaking. If you turn on-screen text off, the board stays free of writing and the spoken line carries the idea alone. Use at most one arrow. Do not cover the board with a blank grey strip. Approve every still before the paper moves. The cutout is paper with a scissor edge. It is not a real person, and it should not borrow a face or a character from a film. Stay on the same dark board, state the one idea as a single hook title, and approve each still before any paper slides. The first 3 seconds show that wooden board and one hook title in the spoken language, unless on-screen text is off, and they say the idea of folding once and stopping. Reject a second board, a second headline, a film face, or a blank grey strip. Keep one product, the single box in that folding lesson. A practical reel is 15–45 seconds. If a face or voice could be mistaken for a real person, the caption must say it is AI. The cutout itself is paper, not a person.",
    points: [
      {
        h: "Keep the same wood",
        p: "Every clip shares the same dark wooden board. A jump to a room, a white void, or a second table makes the lesson look like two films. Pieces can enter and leave. The grain under them stays put. If the board changes color halfway, reject that still and return to the first frame. Lock the grain and the color of the board on clip 1, and return every later piece to that same wood. In the first 3 seconds the picture is that board, and the words are the one folding idea. Reject a jump to a room, a white void, or a second table before you post.",
      },
      {
        h: "One idea, one title",
        p: "Say the idea in a single hook title for the first 3 seconds of clip 1, unless on-screen text is off. A second headline beside it splits the opening. The title should be the point of the reel, in the spoken language, not a greeting and not a logo. Later clips continue the same idea. They do not introduce a new one. Put one hook title up for the opening, in the language being spoken, unless you turn on-screen text off. In the first 3 seconds, viewers see that single title and hear the same idea. Do not post a second headline, a greeting, or a logo beside it.",
      },
      {
        h: "One arrow, no grey strip",
        p: "A single arrow can point at the piece that matters. A second arrow, or a blank grey strip sliding over the board, clutters the craft and hides the idea. If something must leave, slide that paper piece off the board. Approve the stills in order before you let them move. Use one arrow toward the fold, slide a piece off if it must leave, and approve the stills in that order. The opening 3 seconds show the board while the line says the one idea. Throw out a second arrow, a grey strip, or a borrowed film face before the file goes up.",
      },
    ],
    example:
      "A gift shop explains one idea: fold the paper once, then stop. The pieces are a box and a sheet on the same wooden board, with one arrow toward the fold. Clip 1 opens on a hook title in English, the language being spoken. The paper figure has no film face, and the stills are approved before anything slides. Approve the box and the sheet on the same wood, then let the fold slide. For the first 3 seconds, show one hook title in English and say that you fold the paper once and stop. Reject a new background, a second arrow, or a character from a film. Keep one product shape inside 15–45 seconds. If a voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro builds this as a paper-cutout on one wooden board and holds it to one idea. Clip 1's first 3 seconds are one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave out any blank grey strip, and approve the stills before motion. The cutout is not a real person. Build the cutout on that one board and export only after the stills are approved in order. Inside the first 3 seconds, the hook title is on the wood, unless on-screen text is off, and the voice says the one idea. Reject a grey strip or a film face. The paper figure is not a real person. If a voice could be mistaken for one, the caption says it is AI.",
    checks: [
      "Stay on one wooden board.",
      "Open with one hook title, or turn on-screen text off.",
      "Use at most one arrow and no blank grey strip.",
    ],
  },
  {
    id: 5,
    slug: "faceless-cartoon-christmas-how-to",
    title: "Faceless Cartoon for a Christmas How-To",
    excerpt:
      "Teach the steps with a faceless cartoon. No host on camera, and no character taken from a film.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "A faceless cartoon doodle of a plain wreath and a hook on a whiteboard, simple marker lines, no letters and no famous character",
    cta: "Draw the steps",
    answer:
      "A Christmas how-to can be a faceless cartoon: the steps are on the board, and no host stands in the frame. Draw an original figure, or draw no figure at all and let the objects carry the lesson. Do not use a character from a film or a studio. The doodle is marker on a whiteboard, not a real person. Keep one idea, show the steps in order, and open clip 1 with one big hook title in the spoken language unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before they move. Draw the hook, then the wreath, then the wreath on the hook, all on the same whiteboard, and approve those stills before they move. The first 3 seconds show the faceless doodle and one hook title in English, unless on-screen text is off, and they say the hanging task itself. Reject a filmed host, a film character, a skipped middle step, or a blank grey strip. Keep one product, the plain wreath. A practical reel is 15–45 seconds. If a face or voice could be mistaken for a real person, the caption must say it is AI. The doodle is marker, not a person.",
    points: [
      {
        h: "Steps, in order, on one board",
        p: "Each beat does one action a viewer could copy. Place the object, then the next move, then the result. Skipping the middle makes the last frame look like a poster. Stay on the same whiteboard for every step so the how-to reads as one lesson rather than a stack of unrelated drawings. Place the hook, then hang the wreath, then show the wreath sitting on the hook, without skipping the middle. In the first 3 seconds the picture is the first drawn step, and the words are the task. Reject a last frame that looks like a poster with the middle missing before you post.",
      },
      {
        h: "Leave the host out",
        p: "A faceless how-to does not need a mouth, a portrait, or a body that could be mistaken for staff. Hands, if you draw them, can be simple shapes. Do not switch halfway to a filmed person. The drawing is not a real person, and it should not suddenly grow a realistic face. Leave the mouth, the portrait, and any staff body out of every step, and keep hands as simple shapes if you need them. In the first 3 seconds, viewers see the wreath lesson and hear the task, with no person standing in frame. Do not post a switch to a filmed face halfway through.",
      },
      {
        h: "Keep the character original",
        p: "If a figure appears, it is one you could redraw next week from memory, with no costume taken from a film. A famous outline is still a copy. One arrow may point at the step that matters. A blank grey strip over an old step is the wrong way to move on. Approve each still first. If a figure appears, redraw it from memory with no costume from a film, then approve that still. The opening 3 seconds show the original doodle while the line says how to hang the wreath. Throw out a famous outline, a second arrow, or a grey strip over an old step before the file goes up.",
      },
    ],
    example:
      "A hardware shop shows how to hang a plain wreath in three drawn steps: the hook, the wreath, the wreath on the hook. The figure is a circle and a line, faceless, on one whiteboard. The hook title in the first 3 seconds is the task itself, in English. Nothing in the drawing comes from a film. Keep the circle-and-line figure faceless, approve the three steps, then let them move in order. For the first 3 seconds, show the hook title and say the hanging task in English. Reject a character from a film or a realistic face grown onto the doodle. Keep one product, the wreath, inside 15–45 seconds. If a voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro can teach this as a cartoon doodle, one idea, with no filmed host. Clip 1's first 3 seconds are one big hook title in the spoken language, unless on-screen text is off. Keep at most one arrow, skip any blank grey strip, and approve the stills before motion. The doodle is not a real person. Teach the three drawn steps with no filmed host, and export after the stills are approved. Inside the first 3 seconds, the hook title names the task, unless on-screen text is off, and the voice says the same task. Reject a copied character or a grey strip. If a face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Show the steps with no filmed host.",
      "Draw an original figure, or none.",
      "Approve the stills before they move.",
    ],
  },
  {
    id: 6,
    slug: "same-face-three-christmas-outfits",
    title: "Same Face, Three Christmas Outfits",
    excerpt:
      "Lock one face, then change only the knit. Approve each still before you let that outfit move.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a plain wool knit, face fully visible, soft window light, natural skin, no costume trim and no text",
    cta: "Lock the face, then change the knit",
    answer:
      "Use the same face for three Christmas outfits, and change only the knit. Lock the eyes, the nose, the jaw, and the hairline before you swap a sweater. A new garment that also brings a new head is a different host. Approve each still against the locked face before that outfit moves. A charcoal knit, a cream knit, and a matte red wool knit can share the week. The red one is wool on your own host, not a costume. If the face looks real, say in the caption that the host is AI, and leave the platform label visible. Lock the window-lit face on a plain still, swap only the knit, and approve each color against that lock before the mouth moves. The first 3 seconds show the same eyes, nose, jaw, and hairline in one wool knit, and they say the shop line for that day. Reject a new head, a changed haircut, a room swap, or three outfits stacked in one frame. Keep one speaker. A practical reel is 15–45 seconds. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Lock the face on a plain still",
        p: "Start from one clear still in window light, with the face fully visible and no glasses change, no new haircut, and no beauty blur. That frame is the reference. Every later outfit is judged beside it. If the eyes or the hairline drift, the knit is not the problem. The identity moved, and that still should not go forward. Judge every later knit beside the plain reference, and stop if the eyes or the hairline drift. In the first 3 seconds the picture is that locked face, and the words are the day's shop line. Reject a still where the identity moved, even if the sweater is right, before you post.",
      },
      {
        h: "Change the knit only",
        p: "Swap the sweater, and leave the room, the chair, and the light alone. Changing clothes and the background in the same still makes it impossible to see whether the face held. One knit per still. Approve it, then move to the next color. Do not stack three outfits into one frame and call it a series. Change the sweater only after the chair, the window, and the light are left alone, one color at a time. In the first 3 seconds, viewers see one knit on the locked face and hear that day's line. Do not post a frame that also moves the room, or a stack of three outfits.",
      },
      {
        h: "Approve before motion",
        p: "A moving clip will keep whatever face you approved. Check the still on a phone, next to the reference, before you let the mouth move. Life photos later in the week can reuse this same host, in one of these knits, without growing a new person. Label each realistic clip as AI. Compare the still on a phone with the reference, then allow motion, and use the same host if you shoot a life photo later. The opening 3 seconds show the approved face while the line says the shop point. Throw out a narrowed jaw or a new person under the same caption before the file goes up.",
      },
    ],
    example:
      "A preserve seller locks a window-lit face on Monday. Tuesday is a charcoal knit, Wednesday a cream knit, Friday a matte red wool knit. The chair and the window stay. One still where the jaw narrowed is rejected. The three approved faces match, and each caption says the host is AI. Put Monday's face beside the charcoal, cream, and matte red stills, and keep only the matches. For the first 3 seconds, show one approved knit and say that day's line. Reject the still where the jaw narrowed. Keep one speaker inside 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro locks one host face and lets you change clothes only, so the knit can swap while the head stays. Approve each still before motion. Life photos can reuse that same host. Export 9:16, and label the realistic face as AI. Change clothes only after the face lock passes, then export 9:16. Inside the first 3 seconds, the locked face is in one knit and the voice says the shop line. Reject a new head. If the face or voice could be mistaken for a real person, the caption says it is AI, and you leave the platform label untouched.",
    checks: [
      "Compare every outfit to the locked face.",
      "Change the knit, not the head.",
      "Approve the still before it moves, and label it as AI.",
    ],
  },
  {
    id: 7,
    slug: "christmas-hours-talking-head",
    title: "Christmas Hours in a Talking Head",
    excerpt:
      "Say the open and the close in the first sentence. One person speaks the hours you actually keep.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult behind a shop counter, mouth open as if speaking, a plain wall behind, one warm lamp, no text",
    cta: "Say the hours first",
    answer:
      "Put the open and the close in the first sentence. A Christmas hours reel is a service, and the service is those two times, spoken before any greeting. Use the hours you actually keep. If Christmas Eve is a shorter day, say that shorter day in the same first sentence, in the order a customer would write it down. One person speaks. The first 3 seconds carry the point, so the times cannot wait for a second take hidden later in the cut. If the face or the voice looks and sounds real, label the clip as AI. Write the open and the close, including a shorter Christmas Eve only if you really keep it, and say that sentence before any greeting. The first 3 seconds show one person at the counter, and they say those hours in the order a customer would write them. Reject a story that delays the times, a crowd behind the counter, or hours you do not keep. Keep one speaker. A practical reel is 15–45 seconds. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it appears.",
    points: [
      {
        h: "Open, then close",
        p: "Say when you open, then when you close, in one breath. A story about the season before the times forces people to listen for the only fact they came for. If a day differs, name that day in the same sentence. Repeat nothing you do not keep. The caption can show the same times for people watching without sound. Say when you open, then when you close, in one breath, and put the same times in the caption for silent viewers. In the first 3 seconds the picture is the host at the counter, and the words are the open and the close. Reject a reel that makes people wait for the only fact they came for.",
      },
      {
        h: "One speaker at the counter",
        p: "The person who says the hours is the only person in frame. A crowd behind the counter makes the times harder to trust and harder to hear. Stand where the counter reads as a shop, with the face clear. The first 3 seconds are the hours, not a pan across the room. Clear everyone else out of the frame, stand where the counter reads as a shop, and start on the hours rather than a pan. In the first 3 seconds, viewers see one face and hear the times. Do not post a crowd, a second voice, or a room tour ahead of the hours.",
      },
      {
        h: "Label a realistic delivery",
        p: "A generated face or a generated voice that could pass for a person at the door needs a plain caption: this host is AI. Leave the platform label where it appears. The hours themselves stay the hours you keep. The label does not replace them, and it does not belong painted on the wall of the still. Add a plain caption that the host is AI if the face or voice looks real, and leave the platform label where it showed up. The opening 3 seconds show the host at the counter while the line says the hours, not a painted line on the wall. Throw out a still with lettering on the wall, or a clip that hides the platform label, before the file goes up.",
      },
    ],
    example:
      "A bookshop host faces the camera at the counter. The first sentence is the Christmas week open and the Christmas week close, including the shorter Christmas Eve if that is the real day. There is no hello first. The caption repeats those times and says the host is AI, because the face looks real. Face the counter camera, say the Christmas week open and close first, then stop. For the first 3 seconds, show the bookshop host and say those real hours, including the shorter Eve only if that is the true day. Reject a hello before the times. Keep one speaker inside 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro has one person speak the hours. Put the same times in one of 13 caption styles so the opening still works with the sound off. Export 9:16. If the face or the voice is realistic, label it as AI. Put the same times in one caption style and export 9:16 after the first sentence is the hours. Inside the first 3 seconds, one person is at the counter and the voice says the open and the close. Reject hours you do not keep. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Say open and close in the first sentence.",
      "Use only hours you keep.",
      "Label a realistic host as AI.",
    ],
  },
  {
    id: 8,
    slug: "candlelight-without-orange-skin",
    title: "Candlelight without Orange Skin",
    excerpt:
      "One candle lights one side of the face. The other side keeps its real color, and so does a white collar.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult beside one candle, warm light on one cheek only, the far cheek a natural skin color, white collar still white, no text",
    cta: "Use one candle",
    answer:
      "Use one candle as the practical light, and let the face keep its real color. The candle sits on one side, in the frame, close enough to count as a lamp. The near cheek warms. The far cheek stays the skin color of the room, not a second coat of orange. White cloth stays white. If the whole face, the eyes, and the collar turn the same amber, the candle has become a filter. Approve that decision on the still, before the mouth moves. If the host looks real, say the host is AI. Set one candle on one side of the table, check that only the near cheek warms, and approve that still before the mouth moves. The first 3 seconds show the candle in frame and a far cheek that keeps its real color, and they say the shop line. Reject a second flame of equal strength, an all-amber face, or a white collar turned orange. Keep one speaker. A practical reel is 15–45 seconds. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Put the candle in the frame",
        p: "A candle you cannot see is a color grade. Place one candle on the table, to the left or the right, and say so. A second candle of equal strength pulls the face in two directions and flattens the color. One flame is the practical. The rest of the room can stay dim without being dyed. Place the single candle where it can be seen, left or right, and do not add a twin. In the first 3 seconds the picture is that one flame beside the face, and the words are the shop line. Reject a candle you cannot see, because that is a color grade, before you post.",
      },
      {
        h: "Warm one side only",
        p: "The cheek nearer the flame may go warm. The far cheek, the neck in shadow, and any white collar should still look like themselves. Teeth and eye whites are an easy check. If they match the flame, the still is orange, and orange skin is the failure this reel is trying to avoid. Compare the far cheek, the teeth, and the eye whites with the flame, and keep them from matching it. In the first 3 seconds, viewers see warmth on one side only and hear the line. Do not post a still where the whole head has taken the candle's color.",
      },
      {
        h: "Approve the color, then move",
        p: "Motion will not restore a color the still never had. Reject an all-amber face before you continue. The locked face should match the reference once the candle is added, aside from that one-sided warmth. Life photos of this host can reuse the same person only if the skin still reads as skin. Label the realistic face as AI. Reject the all-amber frame while it is still a picture, then move only the approved face. The opening 3 seconds show the one-sided warmth while the line says the shop point. Throw out a face that no longer matches the lock once the candle is added, before the file goes up.",
      },
    ],
    example:
      "A tailor sits at a cutting table with one candle on frame left. The left cheek is warm, the right cheek keeps its daylight color, and the white shirt stays white. A version where the whole head turned amber is rejected. The approved still is the one that moves, and the caption says the host is AI. Keep the candle on frame left at the cutting table, confirm the shirt stays white, then let that still move. For the first 3 seconds, show the warm left cheek and the daylight-colored right cheek, and say the shop line. Reject the version where the whole head turned amber. Keep one speaker inside 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro locks this face and waits for you to approve the still before motion. The candle is a change of light, not a change of person. Life photos can reuse the host once the skin color holds. Export 9:16, and label the realistic face as AI. Treat the candle as a change of light, not a change of person, and export 9:16 after the still passes. Inside the first 3 seconds, one candle is in frame and the voice says the shop line. Reject orange skin. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Show one candle in the frame.",
      "Keep the far cheek a real color.",
      "Leave white cloth white, and label the host as AI.",
    ],
  },
  {
    id: 9,
    slug: "christmas-caption-safe-zone",
    title: "Christmas Caption Safe Zone",
    excerpt:
      "Place the caption in the upper middle. Keep it off the gift, the face, and the bottom edge where the app adds buttons.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult holding a gift low in the frame, empty space across the upper middle, face visible, soft indoor light, no text",
    cta: "Leave the upper middle clear",
    answer:
      "Put the Christmas caption in the upper middle of the frame, and keep it off the gift. The upper middle is the safe zone: high enough to miss the buttons and the handle, low enough to miss a cropped forehead. The gift stays in the lower half, where a line of type will not cross the bow. One person speaks. If the same file will also go to TikTok or Shorts, burn the caption in so the line travels with the picture. If the face or the voice is realistic, say that it is AI. Leave the platform label where it appears. Lower the gift, clear a band across the upper middle, and burn the line in if this file will also go to TikTok or Shorts. The first 3 seconds show the face in the upper half and the box at waist height, and they say the offer. Reject a bow under the words, type parked on the mouth, or a platform label that was covered. Keep one speaker. A practical reel is 15–45 seconds. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where the platform put it.",
    points: [
      {
        h: "Clear the upper middle first",
        p: "Frame the face in the upper half with empty space beside or just above the mouth for the line. Do not park the gift there. A bow that crosses the upper middle will be sliced by the caption, and the product becomes a background for type. Lower the box, or crop it, before you choose a caption style. Frame the empty band beside the mouth before you pick a caption style, and keep the gift in the lower half. In the first 3 seconds the picture is that clear upper middle, and the words are the offer. Reject a bow that crosses the line before you post.",
      },
      {
        h: "Burn the line in when the file travels",
        p: "An app caption disappears when the file is downloaded or reposted. Burned-in captions stay on the picture, which helps if the same reel goes to TikTok or Shorts. Pick one of the caption styles and keep that choice for the whole clip. The words should be the point, held long enough to read in the first 3 seconds. Choose one caption style, burn it into the picture when the file will travel, and hold it long enough to read. In the first 3 seconds, viewers see the burned-in offer and hear the same words. Do not post a line that disappears the moment the file is downloaded.",
      },
      {
        h: "Leave the platform label alone",
        p: "The safe zone is for your words. If the host looks or sounds like a real person, your own caption should say the host is AI, and the platform's label stays visible where the platform put it. The gift belongs low, clear of that line, and the label stays with the post. Put your own AI sentence in the caption if the host looks or sounds real, and leave the platform label visible beside it. The opening 3 seconds show the offer in the safe zone while the line says it. Throw out a painted badge on the still, or a gift that covers the platform label, before the file goes up.",
      },
    ],
    example:
      "A chocolate shop host holds the box at waist height. The face sits in the upper half with a clear band across the upper middle. The caption, in one style, states the offer and that the host is AI. The bow never passes under the words. The same burned-in line is still readable when the file is posted again on another app. Hold the chocolate box at the waist, place one caption style in the upper middle, then check the line on a second app. For the first 3 seconds, show the clear band and say the offer. Reject a bow that passes under the words. Keep one speaker inside 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays visible.",
    bridge:
      "Scro has one person speak, with 13 caption styles for the line you place in that upper middle. Burn the caption into the export if the file will also go elsewhere. Export 9:16. Label a realistic face or voice as AI, and leave the platform label in place. Use one of the caption styles in that upper middle and export 9:16 with the line burned in if the file will travel. Inside the first 3 seconds, the gift is low and the voice says the offer. Reject type across the bow. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep the gift below the caption.",
      "Use the upper middle for the line.",
      "Leave the platform label visible.",
    ],
  },
  {
    id: 10,
    slug: "label-a-realistic-christmas-host",
    title: "Label a Realistic Christmas Host",
    excerpt:
      "If the Christmas host looks like a real person, say the host is AI. Leave the platform label where it appears.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "Close portrait of an ordinary adult in a wool coat, natural skin, soft window light, no famous likeness and no text",
    cta: "Say the host is AI",
    answer:
      "If the Christmas host looks like a real person, say that the host is AI. Write it in the caption in plain words, and leave the platform's own label where the platform places it. A realistic face is not a drawing, and a realistic voice is not a cartoon. Posting either one without saying so asks people to treat a generated host as someone who walked into the shop. Lock the face you mean to keep, approve the still before it moves, and export the vertical frame. The label stays visible where the platform places it, beside your own sentence that the host is AI. Approve the locked face, write that the host is AI in the caption, and leave the platform label where it appears. The first 3 seconds show the window-lit face beside the tin, with no painted words on the still, and they say the shop line. Reject a still that grows a badge, a new head under the same label, or a post where the platform label was covered. Keep one speaker. A practical reel is 15–45 seconds. If the face or the voice could be mistaken for a real person, the caption must say it is AI. That sentence does not replace the platform label.",
    points: [
      {
        h: "Say it in your own caption",
        p: "Use ordinary words: the host is AI. Put them where a viewer will read them, not in a corner of the still as painted type. The picture should not grow a badge, a watermark, or a line of letters. Your caption carries the sentence. The still stays a picture of the locked face. Type the host is AI in ordinary caption words before you export, and keep letters out of the picture. In the first 3 seconds the picture is the locked face, and the words in the caption include that it is AI. Reject a watermark, a painted badge, or a line of letters drawn onto the still before you post.",
      },
      {
        h: "Leave the platform label visible",
        p: "The platform label is part of the post. Leave it where it appears, next to your own sentence that the host is AI. A realistic host needs both of those truths together. A cartoon would be a different reel. This one looks real, so it is labeled, and the platform's label stays with the post. Leave the platform label beside your own sentence, and do not cover it with the gift or with type. In the first 3 seconds, viewers see the realistic host and hear the shop line, and they can read both that the host is AI and the platform label. Do not post a version that hides the platform label.",
      },
      {
        h: "Lock the face you are labeling",
        p: "The person you call AI should be the same person in every Christmas still. Approve the still before motion so a later clip does not invent a new head under the same label. Life photos that reuse this host carry the same caption rule. Clothes can change. The face, and the fact that it is AI, stay. Match the labeled face to the lock before motion, and carry the same caption rule into any life photo that reuses this host. The opening 3 seconds show that same person while the line says the shop point and that the host is AI. Throw out a new head wearing the old label before the file goes up.",
      },
    ],
    example:
      "A tea merchant approves one window-lit face, then posts a short reel of that host beside a tin. The caption says the host is AI in the first line, and the platform label is left where it showed up. The still has no painted words. The post that goes out still shows that platform label beside the caption. Approve the tea merchant's window-lit face, put the AI sentence in the first caption line, then confirm the platform label is still visible. For the first 3 seconds, show that face beside the tin and say the shop line. Reject painted words on the still. Keep one speaker inside 15–45 seconds. The caption says the host is AI because the face could pass for a real person.",
    bridge:
      "Scro locks one host face, and you approve the still before motion. Life photos can reuse that host. Clothes can change without a new head. Export 9:16. If the face looks real, say it is AI, and leave the platform label in place. Export 9:16 only after the still matches the lock and the caption already says the host is AI. Inside the first 3 seconds, the locked face is on screen and the voice says the shop line. Reject a covered platform label. If the face or voice could be mistaken for a real person, both your sentence and the platform label stay visible.",
    checks: [
      "Write that the host is AI.",
      "Leave the platform label visible.",
      "Approve the locked face before it moves.",
    ],
  },
  {
    id: 11,
    slug: "red-green-without-clown-color",
    title: "Red and Green without Clown Color",
    excerpt:
      "Let the tree stay green and soft. Keep the wall neutral so the product holds its true color.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one jam jar on a neutral plaster ledge, a soft green tree far behind, the jar color true, no logo and no text",
    cta: "Keep the product true",
    answer:
      "The tree can be green. The wall stays neutral, and the product keeps the color it has in your hand. Red and green at full strength, on both the object and the background, turn a shop reel into a costume. Put the tree far back and soft. Let the wall be plaster, wood, or a pale cloth. Say the offer you are actually running, and type the shop name in the caption. The label on the product stays blank, with no invented logo. One product is enough. If a realistic AI voice speaks the offer, label the clip as AI. A practical reel is 15–45 seconds and it holds one product. Set the jar on a neutral ledge first, push the tree back until it cannot tint the glass, then say the offer you are running. Viewers in the first 3 seconds see the true fruit color and hear that offer, with the shop name kept for the caption. Before posting, reject green light on the jar, a red wall behind the label, or any invented mark on the glass. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it was placed.",
    points: [
      {
        h: "Soften the tree",
        p: "A green tree may sit in the background, out of focus, and it may be the only strong green in the room. It should not throw green light onto the product. If the hero object picks up a green edge, move the tree back in the description or crop it smaller. The tree is season. The product is the subject. Move the tree back or crop it smaller before you accept a green edge on the hero. The first 3 seconds show the jar in its own color and say the offer. Reject a still where the season has recolored the product before you post.",
      },
      {
        h: "Hold the wall neutral",
        p: "A red wall plus a green tree plus a red product is three costumes at once. Choose a wall you already have: warm wood, grey plaster, or a white shelf. Red, if you want it, can be a small bow or a single ornament, not the surface behind the label. The product color is judged against that neutral. Choose wood, plaster, or a white shelf before you add any red, and keep red to a small bow if you want it at all. In the opening 3 seconds the wall stays neutral while the line says the real offer. Do not post three costumes at once: red wall, green tree, and red product.",
      },
      {
        h: "Believe the object",
        p: "Compare the still to the real item. Jam stays the color of the fruit, a candle stays its wax color, cloth stays its dye. If the still is prettier and less true, reject it. The label area stays blank. Speak the offer, and put the shop name in the caption rather than on the jar. Hold the still beside the real jar, then speak. By the end of the first 3 seconds the glass still matches the fruit and the voice has said the offer. Throw out a prettier, less true color, and any word painted on the label, before the file goes up.",
      },
    ],
    example:
      "A jam maker sets one jar on a plaster ledge. A tree is visible through a doorway, soft and green, and it does not tint the glass. The wall is the color of the shop. The label is blank. The spoken offer is the one the shop is running, and the shop name is typed under the reel. Check the doorway tree, confirm it does not tint the glass, then record the offer. The first 3 seconds show the jar on the plaster ledge and say the offer the shop is running. Reject a green rim on the glass or a fake word on the label. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps this to one product, with a blank label and no invented logo. Say the offer in the reel, and put the shop name in the caption. Export 9:16 so the jar stays large and the tree can fall back. Export 9:16 once the jar is large and the tree has fallen back. The first 3 seconds show that one jar and say the offer. Reject an invented logo. Type the shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Leave the wall neutral.",
      "Keep the product its true color.",
      "Leave the label blank and say the real offer.",
    ],
  },
  {
    id: 12,
    slug: "one-corner-all-christmas-week",
    title: "One Corner All Christmas Week",
    excerpt:
      "Keep the same window and the same chair all week. Change the gift, and keep the host's face locked.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in the same chair beside the same window, a wrapped box on the sill, natural daylight, no text",
    cta: "Stay in this corner",
    answer:
      "Film the whole Christmas week from one corner: the same window and the same chair, with a new gift when the gift is the news. The host's face stays locked. Changing the room and the person on the same day makes the account look like a series of strangers. Approve each still before it moves, and compare it with the first morning. Life photos can reuse this host in this corner. Clothes may change. The chair, the window, and the face do not. If the host looks real, say the host is AI. Mark the window and the chair on the first morning, swap only the gift, and compare the face with that first still before anything moves. Keep one speaker for a practical reel of 15–45 seconds. The first 3 seconds show the same corner and the locked face, and they say what is new about today's gift. Reject a new room, a drifted hairline, or two changes in the same still. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Mark the window and the chair",
        p: "Choose the glass and the seat on the first day and describe them the same way afterward. The window stays on the same side of the frame. The chair stays at the same distance. A new rug, a new wall, or a new time of day disguised as a new shop will read as a new person even when the face held. Describe the glass on the same side and the chair at the same distance every day before you bring in a new object. The first 3 seconds show that window and that chair and say which gift is the news. Reject a new rug, a new wall, or a new shop disguised as a new time of day.",
      },
      {
        h: "Swap the gift, not the place",
        p: "The new object is the reason for a new reel. Put it on the sill or in the hands, and leave the corner alone. One gift at a time. If you also change the knit, do that in a separate still and approve the face again. Two changes at once hide a drift in the eyes or the hairline. Put the new gift on the sill only after the corner is unchanged, one object at a time. In the first 3 seconds the picture is the same seat with one new gift, and the words name that gift. Do not post a knit change and a gift change in the same still.",
      },
      {
        h: "Reuse the host on purpose",
        p: "A life photo later in the week should be recognizable as the same person in the same corner, not a fresh casting. Approve the still before motion every time. Label the realistic face as AI in the caption, and leave the platform label visible. The repetition is the point of the week. Approve the face against the first morning, then post, and carry the same corner into a later life photo. In the first 3 seconds, viewers see the locked host and hear the point of today's gift. Throw out a still that moved the host to a new room before the file goes up.",
      },
    ],
    example:
      "A plant shop films from the chair by the street window. Monday's reel has a wreath on the sill. Thursday's reel has a potted tree in the same spot, same chair, same face. A still that moved the host to a new room is rejected. Each caption says the host is AI. Keep Thursday's potted tree on the same sill as Monday's wreath, and reject the still that changed rooms. The first 3 seconds show the chair, the street window, and the locked face, and they say which plant is new. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro locks one host face so this corner can return all week. Change clothes only when you mean to, approve stills before motion, and reuse the host in life photos. Export 9:16. Label the realistic face as AI. Reuse this locked host in the same corner, then export 9:16. The first 3 seconds show the window, the chair, and one gift, and say what changed. Reject a new head. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep the same window and chair.",
      "Change the gift, not the face.",
      "Approve each still, and label the host as AI.",
    ],
  },
  {
    id: 13,
    slug: "gift-wrap-close-up-reel",
    title: "Gift Wrap Close-Up Reel",
    excerpt:
      "Hands hold the box or stay cropped out. One bow, no writing on the paper, and the offer spoken once.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Close view of an ordinary adult's hands holding a wrapped box with one bow, the face cropped out, plain paper, no text",
    cta: "Close in on the wrap",
    answer:
      "A gift-wrap reel is a close view of one box. Adult hands hold it, or the hands are cropped and the box fills the frame. Use one bow. The paper stays free of writing, logos, and a painted shop name. Say the offer you are actually running while the box is already in frame. The first 3 seconds should read as the wrap, not a tour of the table. The shop name goes in the caption. If a realistic face never enters, you are showing the box. If you add a realistic AI voice, label the clip as AI. Crop the face or show only adult hands, set one bow, and speak the wrapping offer while the box is already readable. One product, and a practical reel is 15–45 seconds. The first 3 seconds show the wrap, the linen bow, and the blank tag, and they say the offer the shop is actually running. Reject a face leaning in, a second bow, writing on the paper, or fingers that melt into the ribbon. If a realistic voice speaks, the caption must say it is AI, and the platform label stays where it appears.",
    points: [
      {
        h: "Hands in, or hands gone",
        p: "Either the hands are clearly holding the box, with a natural grip, or they are cropped out entirely. A face leaning in changes the reel into a talking portrait and covers the bow. Keep the face out. Fingers should look like they belong to the same person, and they should not melt into the ribbon. Decide hands-in or hands-gone before you shoot, and keep the grip natural if the hands stay. The first 3 seconds show the box being held or the box alone, and say the wrapping offer. Reject a face that covers the bow, or fingers that do not match, before you post.",
      },
      {
        h: "One bow is the finish",
        p: "One bow, one box, one kind of paper. A second bow, a second pattern, or a pile of scraps turns the close-up into a craft table. The bow sits where it can be seen, with a single shadow under the box. Leave the tag blank. Any word you need is typed in the caption, including the shop name. Finish with one bow and one kind of paper, then look at the tag and confirm it is blank. In the first 3 seconds the picture is that single bow and the words are the offer. Do not post a second pattern, a pile of scraps, or a letter on the tag.",
      },
      {
        h: "Speak while the box is the picture",
        p: "The offer starts when the wrap is already readable, inside the first 3 seconds. Do not open on a hallway and arrive at the box later. A practical cut can stay inside 15–45 seconds: the paper, the bow, the offer, and a hold. One product only. A second gift waits for a second reel. Start the spoken offer only once the wrap fills the frame, and hold there instead of touring the table. In the first 3 seconds, viewers see the paper and hear the offer. Throw out a hallway opening or a second gift before the file goes up.",
      },
    ],
    example:
      "A stationer films adult hands setting one wrapped box on a wood table. The face is cropped out. There is one linen bow and a blank tag. The spoken line is the wrapping offer the shop is actually running. The shop name is typed in the caption, not printed on the paper. Set the wrapped box on the wood with adult hands, keep the face cropped, then say the wrapping offer. The first 3 seconds show the linen bow and the blank tag and say the offer the stationer is running. Reject print on the paper. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps the reel to one product, with a blank label and no invented logo. Say the offer while the box is on screen, and put the shop name in the caption. Export 9:16 so the bow can fill a vertical frame. Export 9:16 so the bow can fill the vertical frame, after the tag is still blank. The first 3 seconds show the one box and say the offer. Reject an invented logo on the ribbon. Type the shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Crop the face, or keep only the hands.",
      "Use one bow and a blank tag.",
      "Say the offer, and type the shop name in the caption.",
    ],
  },
  {
    id: 14,
    slug: "snow-on-the-window-only",
    title: "Snow on the Window Only",
    excerpt:
      "Leave the snow on the outside of the glass. The host stays indoors and dry, with the weather readable behind them.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult indoors beside a window, snow on the outside of the glass only, dry hair and dry shoulders, warm room light, no text",
    cta: "Keep the snow outside",
    answer:
      "Snow stays on the window. The host stays indoors and dry. Weather is the view, not a costume on the person. Hair, shoulders, and the counter should show no flakes and no melt. You can read the season through the glass, and you can still see a face lit by the room. One person speaks. The first line is the point of the reel, not a comment about the storm. If the face or the voice could pass for a real person, say in the caption that it is AI, and leave the platform label in place. Put the snow on the outside of the pane, dry the host's hair and shoulders, and say the shop point rather than a comment about the storm. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show a dry person indoors with weather only on the glass, and they say the last day for in-shop pickup if that is the real day. Reject flakes on the eyelashes, a wet coat, or blue snow light that replaces the room lamp. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays in place.",
    points: [
      {
        h: "Put the weather on the glass",
        p: "Describe snow on the outside of the pane, with the interior dry. Flakes on the eyelashes, the collar, or the product mean the storm came inside. A wet coat is a different picture. This one is a shop in warm light, with winter visible and not landing on the speaker. Describe the interior as dry before you describe the glass, and check collar, hair, and counter for melt. The first 3 seconds show the host inside and say the pickup day. Reject a storm that landed on the speaker before you post.",
      },
      {
        h: "Light the face from the room",
        p: "The window can rim the shoulder. It should not turn the host into a silhouette unless you mean to lose the face. A lamp or the room's own daylight keeps skin a real color. Blue snow light on the cheeks is the weather leaking in. Correct it on the still, before the person speaks. Light the face from the room lamp after the window is only a rim, and correct the color while it is a still. In the first 3 seconds the picture is a readable face, not a silhouette, and the words are the shop point. Do not post cheeks dyed the blue of the snow.",
      },
      {
        h: "Speak the shop point",
        p: "The snow is the setting. The sentence is the offer, the date, or the hours. One person holds the frame from the first 3 seconds. A realistic face or voice is labeled as AI in the caption. The glass can stay in the background so the season is obvious without covering the mouth. Give the first sentence to the offer, the date, or the hours, with one person holding the frame. In the first 3 seconds, viewers see dry wool and hear the pickup day. Throw out a second voice or a mouth hidden by the glass before the file goes up.",
      },
    ],
    example:
      "A wool shop owner stands inside, beside a window streaked with snow on the outer glass. The sweater and hair are dry. A warm lamp lights the face. The first sentence is the last day for in-shop pickup, which is the day that shop actually offers. The caption says the host is AI. Stand inside beside the streaked pane, confirm the sweater is dry, then say the last pickup day. The first 3 seconds show the wool shop owner and the outer snow and say that day. Reject flakes on the hair. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays visible.",
    bridge:
      "Scro has one person speak in this dry interior. Use one of 13 caption styles for the shop point, and export 9:16 with the window still readable. If the face or the voice is realistic, label it as AI. Export 9:16 with the window still readable and the host still dry. The first 3 seconds show the interior and say the shop point. Reject snow on the shoulders. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep snow on the outside of the glass.",
      "Leave the host dry.",
      "Label a realistic face or voice as AI.",
    ],
  },
  {
    id: 15,
    slug: "fairy-lights-as-the-only-lamp",
    title: "Fairy Lights as the Only Lamp",
    excerpt:
      "Turn the other lamps off. The string is the only light, and it leaves a catchlight in each eye.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a dim room lit only by a string of warm fairy lights, small catchlights in both eyes, natural skin, no text",
    cta: "Use the string alone",
    answer:
      "Fairy lights are the only lamp in this still. Turn the other sources off, including the overhead, the window if it is still bright, and any hidden fill. The string has to be close enough, and bright enough, that each eye carries a catchlight from those bulbs. Dark eyes mean the face was lit from somewhere you did not name. The skin can be dim and still look like skin. Approve the still before the host moves. If the face looks real, say the host is AI. Turn the work lamp and the window off, bring the string close enough to light the mouth, and approve the still only when each eye has a catchlight from those bulbs. One speaker, inside a practical reel of 15–45 seconds. The first 3 seconds show the potter in that single practical and say the shop line. Reject a ceiling wash, empty eyes, or a plastic orange glow. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Name one practical",
        p: "Say that the fairy lights are the only source, and say where the string hangs. A second lamp in the description will sneak back in as a flat wash. If the room is too dark to see the mouth, bring the string closer. Do not solve it by adding a ceiling light you then have to explain away. Name the shelf where the string hangs, and delete any second source from the description before you generate again. The first 3 seconds show that string as the only lamp and say the shop line. Reject a flat wash you cannot point to a bulb for.",
      },
      {
        h: "Match the catchlights",
        p: "Each eye should show a small bright point from the same string. Two different shapes mean two lights. A catchlight at the bottom of the iris means the source is below the face, which a hanging string usually is not. If the eyes are empty, the still is not ready to move. Match the two catchlights so they share one shape, and reject the still if a point sits at the bottom of the iris or an eye is empty. In the first 3 seconds both eyes carry the string and the voice says the line. Do not post mismatched glints.",
      },
      {
        h: "Keep a real skin color",
        p: "Dim is not the same as orange. The cheeks may warm slightly and should still show skin. A plastic glow means the string became a filter. Lock this face, approve the still, and only then let it move. A life photo can reuse the host in this light once the eyes and the color agree. Label the realistic face as AI. Separate dim from orange on the cheeks, lock the face, and only then let it move. In the first 3 seconds, viewers see real skin and hear the shop line. Throw out a plastic glow or a face that no longer matches the lock before the file goes up.",
      },
    ],
    example:
      "A potter sits in the studio after dusk with the work lamp off. A string on the shelf behind one shoulder is the only light. Both eyes show a small warm catchlight, and the skin stays a real color. A still with a bright ceiling wash is rejected. The caption says the host is AI. Leave the studio work lamp off, confirm both eyes, then use that still. The first 3 seconds show the string on the shelf and the two small catchlights, and they say the shop line. Reject the bright ceiling wash. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro locks this host and lets you approve the still before motion, so the catchlights are settled first. Life photos can reuse the same face. Change clothes only if you intend to. Export 9:16, and label the realistic face as AI. Settle the catchlights in the still, then export 9:16. The first 3 seconds show the string as the only lamp and say the shop line. Reject empty eyes. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Use the string as the only lamp.",
      "Show a catchlight in each eye.",
      "Approve the still, and label the host as AI.",
    ],
  },
  {
    id: 16,
    slug: "christmas-cafe-menu-reel",
    title: "Christmas Cafe Menu Reel",
    excerpt:
      "Film one drink in a blank cup. Say what you actually sell, and type the cafe name in the caption.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one warm drink in a plain unmarked cup on a wood counter, soft window light, no logo and no letters",
    cta: "Show the one drink",
    answer:
      "A Christmas cafe menu reel is one drink. The cup is blank: no invented logo, no wordmark, and no letters on the glass or the sleeve. Say the drink you actually sell, and say the offer you are actually running, in one clear line. The cafe name goes in the caption, typed by you. The first 3 seconds should already be the cup, large enough to recognize. A second pastry, a second mug, or a chalkboard full of items belongs in another reel. If a realistic AI voice speaks the line, label the clip as AI. Choose the one drink you actually sell, set it in a plain cup, and say that drink plus the real offer before any other item enters. Keep one product. A practical reel is 15–45 seconds. The first 3 seconds show the unmarked cup large enough to recognize and say the name you use at the counter. Reject a wordmark on the sleeve, a second mug in focus, or a chalkboard menu inside the picture. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it was placed.",
    points: [
      {
        h: "One drink is the menu",
        p: "Choose the drink before you dress the counter. Milk, foam, and a single garnish should match what you serve. A second hero drink splits the reel into a list. Background cups, if they exist, stay soft and unmarked. The cup in focus is the only one a viewer could order from this post. Match milk, foam, and garnish to what you serve, and let background cups stay soft and unmarked. The first 3 seconds show the one drink and say its real name. Reject a second hero drink that splits the reel into a list before you post.",
      },
      {
        h: "Leave the cup blank",
        p: "Do not ask for a logo, a fake cafe name, or a hand-lettered special on the ceramic. Models invent marks that are not yours. A blank cup plus your real name in the caption is the honest frame. If a letter appears on the sleeve, reject the still. Ask for a blank ceramic, then zoom in on the sleeve and throw the still away if a letter appeared. In the first 3 seconds the cup is unmarked and the voice says the offer. Do not post a fake cafe name painted on the glass.",
      },
      {
        h: "Say the real item",
        p: "Speak the name you use at the counter, then the offer if there is one, and only the offer you are running. Do not invent a second size or a deal for the video. Hold the cup through the line. The shop name stays in the caption, not on the menu board in the picture. Speak the counter name, then the offer you are running, and keep the shop name in the caption rather than on a board in the picture. In the first 3 seconds, viewers see the cup and hear that item. Throw out an invented size or a second deal before the file goes up.",
      },
    ],
    example:
      "A neighborhood cafe sets one spiced drink on the counter in a plain cup. No logo is on the glass. The spoken line names that drink and the offer the cafe is running this week. The cafe name is typed in the caption. A still that grew a wordmark on the cup is thrown out. Set the spiced drink down, check the glass for a wordmark, then say the offer. The first 3 seconds show the plain cup and say the drink the cafe is pouring this week. Reject the still that grew a logo. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps the reel to one product, here the one drink, with a blank label and no invented logo. Say the offer, put the shop name in the caption, and export 9:16 so the cup fills the vertical frame. Export 9:16 so the cup fills the frame, with the label still blank. The first 3 seconds show that one drink and say the offer. Reject an invented logo. Type the cafe name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Show one drink.",
      "Leave the cup blank.",
      "Say the real offer, and type the cafe name in the caption.",
    ],
  },
  {
    id: 17,
    slug: "blank-gift-tag-words-in-caption",
    title: "Blank Gift Tag, Words in Caption",
    excerpt:
      "Leave the gift tag blank. The model should not paint letters. Type the words in the caption instead.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of a wrapped gift with a blank hanging tag, the tag unmarked, soft window light, no letters and no logo",
    cta: "Leave the tag blank",
    answer:
      "The gift tag in the still stays blank. The model must not paint letters, numbers, or a logo on the card, the ribbon, or the paper. Anything you need read, including the shop name and the offer, is typed in the caption by you. A generated word on a tag is almost never your real mark, and it is hard to correct once the picture moves. One product, one blank tag, the offer spoken in the reel. Place caption text in the upper middle so it does not cover the tag you worked to keep clean. Call the tag unmarked paper, shoot until the card is blank, and only then type the shop name and the offer in the caption. One product, in a practical reel of 15–45 seconds. The first 3 seconds show the kraft tag with no strokes and say the offer you are running. Reject a to-and-from, a monogram, a smudge that could be writing, or a pile of extra tags. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Describe the tag as blank",
        p: "Say that the tag is unmarked paper. Do not add a to-and-from, a monogram, or a festive word in the picture description. Those requests are how letters appear. If a stroke shows up that could be read as writing, reject the still. A smudge is already too close. Leave to-and-from, monograms, and festive words out of the picture description, then inspect the card. The first 3 seconds show blank paper and say the offer. Reject the smallest stroke that could be read as a letter before you post.",
      },
      {
        h: "Type the words yourself",
        p: "The caption holds the shop name and the offer you are actually running. You can proofread a caption. You cannot reliably proofread paint. Keep the spoken line and the caption in agreement. The upper middle is the safe zone, clear of the bow and the tag. Proofread the caption against the spoken offer, and park those words in the upper middle so they do not cover the tag. In the first 3 seconds the tag stays clean while the voice says the offer. Do not post paint you hoped was your name.",
      },
      {
        h: "One product, one card",
        p: "A pile of tags invites a pile of invented writing. Hang one blank tag on one gift. The first 3 seconds should show that clean card so you can see the failure if it happens. Export the vertical frame with the tag still readable as blank paper, not as a tiny logo you hope nobody zooms. Hang one card on one gift and keep it readable as blank paper in the vertical frame. In the first 3 seconds, viewers see that single card and hear the offer. Throw out a stack of tags or a tiny logo you would only notice if you zoomed.",
      },
    ],
    example:
      "A soap maker wraps one gift box and hangs a plain kraft tag. The still shows no letters on the tag or the paper. The caption, typed afterward, carries the shop name and the offer the shop is running. A version where the tag grew a fake initial is rejected before it is posted. Wrap the one box, hang the plain kraft tag, and reject the version that grew a fake initial. The first 3 seconds show the unmarked tag and say the offer the soap shop is running. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI, and the shop name is typed, not painted.",
    bridge:
      "Scro's product reel is one product with a blank label and no invented logo. Say the offer in the video, and put the shop name in the caption rather than on the tag. Export 9:16 with the blank card still visible. Export 9:16 with the blank card still visible. The first 3 seconds show that tag and say the offer. Reject writing on the card. Put the shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep the tag free of letters.",
      "Reject any still that grows writing.",
      "Type the shop name and the offer in the caption.",
    ],
  },
  {
    id: 18,
    slug: "last-shipping-day-one-sentence",
    title: "Last Shipping Day in One Sentence",
    excerpt:
      "The last day you can still ship is the hook. Say that day in the first sentence, before any greeting.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult at a packing table, mouth open as if speaking, one sealed plain box, no writing on the box, warm lamp, no text",
    cta: "Lead with the shipping day",
    answer:
      "The last shipping day is the first sentence. Say the day you can still send an order, in the words you would use at the bench, before hello and before the shop story. If that day is Christmas Eve, say Christmas Eve only when Christmas Eve is the day you mean. The first 3 seconds carry the point, so the date cannot arrive after a greeting. One person speaks, with the packed box in frame as proof of the work. If the face or the voice looks real, label the clip as AI and leave the platform label visible. Say the last day you can still ship before hello and before the shop story, with one sealed box on the bench as proof. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the ceramicist and the blank box, and they say that real last day. Reject a wish ahead of the date, writing painted on the carton, or a day chosen only because it sounds urgent. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "The date is the whole hook",
        p: "Open with the last day you ship, and stop. A second sentence can say what still qualifies, after the day is already heard. Do not bury the day under a wish or a thank-you. People who need the date are listening for a day, not a mood. The caption repeats the same day for silent viewers. Open on the day, stop, and let a second sentence explain what still qualifies only after the day has been heard. The first 3 seconds show the packing table and say the last shipping day. Reject a thank-you or a holiday wish parked in front of the date.",
      },
      {
        h: "Show the work, not a slogan",
        p: "A sealed box on the table tells the truth of the sentence. The box stays blank: no painted date and no invented mark. You say the day. The picture shows a real packing setup. One person, one bench, one box is enough for the opening. Keep the carton blank and the bench real, one person and one box, so the picture proves the sentence without lettering the date. In the first 3 seconds the box has no painted mark and the voice says the day. Do not post an invented stamp or a slogan on the cardboard.",
      },
      {
        h: "Label the speaker",
        p: "A realistic face or voice needs a plain line in the caption that the host is AI. That line sits with the date, not instead of it. Leave the platform label where it appears. The shipping day you speak is the day you actually ship, not a day chosen to sound urgent. Put the date and the AI sentence in the same caption if the face looks real, and leave the platform label where it appears. In the first 3 seconds, viewers see the blank box and hear the day you actually ship. Throw out a nearer day you invented for urgency before the file goes up.",
      },
    ],
    example:
      "A ceramicist stands at a packing table with one sealed box. The first sentence is the last day that studio can still ship, spoken before any greeting. The box has no writing. The caption repeats the day and says the host is AI, because the face looks like a real person. Stand at the table, say the studio's last ship day first, and leave the box unmarked. The first 3 seconds show one sealed carton and say that day. Reject a greeting before it. One speaker, 15–45 seconds. If the face looks like a real person, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro has one person speak the day, with the line set in one of 13 caption styles. Export 9:16 so the box and the face both fit. If the face or the voice is realistic, label it as AI. Set the day in one caption style and export 9:16 so the box and the face both fit. The first 3 seconds show the bench and say the last shipping day. Reject a painted date. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Say the real last shipping day first.",
      "Leave the box free of painted words.",
      "Label a realistic host as AI.",
    ],
  },
  {
    id: 19,
    slug: "quiet-christmas-for-a-small-shop",
    title: "A Quiet Christmas for a Small Shop",
    excerpt:
      "One person, one counter, no crowd. A short reel can carry the hours or the offer without a busy shop behind you.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult alone behind a small shop counter, the room empty of a crowd, one warm lamp, no text",
    cta: "Film the quiet counter",
    answer:
      "A quiet Christmas reel is one person and one counter. Do not fill the frame with a crowd, a queue, or a busy street pasted behind the speaker. Small shops look more like themselves when the room is empty enough to hear the sentence. A practical cut is 15–45 seconds, inside a reel that may run from 3 seconds to 3 minutes. The first 3 seconds carry the hours or the offer. One person speaks. If that face or voice could be a real person, say in the caption that it is AI. Film before the door is unlocked, leave the crowd out, and give the first sentence to the hours or the offer. One speaker at one counter. A practical reel is 15–45 seconds. The first 3 seconds show the empty shop and the grocer, and they say the day's open and close. Reject extra people, a second topic, or a generated chorus behind the voice. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it appears.",
    points: [
      {
        h: "Leave the room empty",
        p: "The counter, the speaker, and one lamp are the set. Extra people, even soft in the background, turn a quiet shop into a market. If the real shop is calm before open, film it then. Do not ask for a crowd to make the day look more important than it is. Build the set from the counter, the speaker, and one lamp, and do not ask for a queue to make the day look bigger. The first 3 seconds show that quiet counter and say the hours. Reject soft figures in the background before you post.",
      },
      {
        h: "Let the sentence be small",
        p: "Say the hours, the offer you are running, or the day you close. One claim. A quiet picture cannot support three announcements. The first 3 seconds are that claim. The rest of a 15–45 second cut can show the counter and stop. Silence at the end is finer than a second topic. Pick one claim, the hours or the offer or the closing day, and let the rest of the cut hold on the counter and stop. In the first 3 seconds the picture stays small and the words are that one claim. Do not post three announcements in a quiet frame.",
      },
      {
        h: "Keep one voice",
        p: "One person speaks. A second voice off camera, or a generated chorus, breaks the quiet you set up. If the face or the voice is realistic, label it as AI and leave the platform label visible. The counter stays in frame so the shop is identifiable without a painted sign. Keep a single voice, with no off-camera partner, and repeat the claim in the caption. In the first 3 seconds, viewers see one person and hear the open and close. Throw out a painted sign you did not write, before the file goes up.",
      },
    ],
    example:
      "A neighborhood grocer stands alone at the counter before the door is unlocked. The first sentence is the day's open and close. No queue is added behind the shelves. The reel holds on the counter and ends. The caption repeats the hours and says the host is AI. Stand alone at the counter, say the open and the close, and end on the empty shop. The first 3 seconds show the grocer with no queue and say those hours. Reject a crowd added behind the shelves. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro keeps one person speaking at this counter. Choose one of 13 caption styles for the hours or the offer, and export 9:16. If the face or the voice is realistic, label it as AI and leave the platform label where it appears. Choose one caption style for the hours or the offer and export 9:16 from this quiet counter. The first 3 seconds show one person and say the claim. Reject a second voice. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Keep one person and one counter.",
      "Leave the crowd out.",
      "Label a realistic face or voice as AI.",
    ],
  },
  {
    id: 20,
    slug: "leave-children-out-of-frame",
    title: "Leave Children Out of the Christmas Frame",
    excerpt:
      "Adults only. Leave children out of the frame, including hands, reflections, and anyone smaller at the edge.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult arranging greenery on a shop table, only that adult in frame, warm indoor light, no text",
    cta: "Keep the frame adult",
    answer:
      "Leave children out of the Christmas frame. The host is one adult, and kids stay out of the shot. That includes a hand at the edge, a reflection in the window, a toy on the floor, and any smaller face in the background. Do not generate a child's face, and do not describe one in the still. If a child is in the room while you work, they stay outside the camera. The locked host is the adult you approved. Life photos that reuse that host follow the same rule: adults only. If the adult host looks real, say the host is AI. Frame one adult, check the edges and the glass, and reject the still if a child, a small hand, or a reflection would be visible. Keep one speaker, the adult host, for a practical reel of 15–45 seconds. The first 3 seconds show that adult arranging greenery on the work table, and they say the shop point. Do not generate a younger face, a family group, or a smaller person beside the host. If the adult face or voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Frame one adult",
        p: "The picture holds the adult host and the work on the table. Check the edges, the glass, and the background for anyone younger before you approve the still. A partial figure counts. If a child would be visible, move the camera or wait. Do not crop a child down to a hand and call the frame clear. Scan the edges, the window, and the background for anyone younger before you approve, and move the camera if you would have to crop a child down to a hand. The first 3 seconds show only the adult and say the shop point. Reject a partial figure before you post.",
      },
      {
        h: "Do not generate a younger face",
        p: "The description names one ordinary adult. It does not ask for children, a family group, or a smaller person beside the host. If a still arrives with a child in it, reject it. Do not try to use that frame. The next still starts again from the adult alone. Name one ordinary adult in the description, and start again if a still arrives with a child in it. In the first 3 seconds the frame is the adult alone and the voice says the shop line. Do not post that failed still, and do not try to use it.",
      },
      {
        h: "Keep later photos on the adult",
        p: "Life photos reuse the locked adult host, not a new group. Clothes can change. The rule about children does not. Approve the still before motion so a clip cannot wander into a wider room. Label the realistic adult face as AI, and leave the platform label visible. Reuse only the locked adult in a later life photo, approve before motion, and keep clothes as the only change. In the first 3 seconds, viewers see that adult and hear the shop point. Throw out a wider room that wandered into a child before the file goes up.",
      },
    ],
    example:
      "A frame-shop owner films one adult at the work table, arranging greenery beside a finished frame. Kids who are elsewhere in the shop stay out of the shot, including the window reflection. The approved still shows only that adult. The caption says the host is AI. Any still with a child in it is rejected. Film the frame-shop owner at the table, keep every reflection adult, and reject any still with a child. The first 3 seconds show one adult with the greenery and say the shop point. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro locks one adult host face. Leave children out of every still, approve those stills before motion, and reuse only that adult in life photos. Change clothes only if you mean to. Export 9:16, and label the realistic face as AI. Export 9:16 only after every edge is an adult frame. The first 3 seconds show the locked adult and say the shop point. Reject any child in the picture, including a hand or a reflection. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Leave children out of the frame.",
      "Reject any still that includes a child.",
      "Label the adult host as AI.",
    ],
  },
  {
    id: 21,
    slug: "stocking-the-shelf-before-open",
    title: "Stocking the Shelf before Open",
    excerpt:
      "Film the shelf from the same angle every morning. One product stays the hero, and its label stays blank.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one shop shelf of plain jars, camera square to the shelf, morning light, no labels and no text",
    cta: "Match the morning angle",
    answer:
      "Stock the shelf from the same angle every morning. Put the camera at the same height, square to the same shelf, so a viewer can see what changed and what did not. One product is the hero even when neighbors sit beside it. The hero's label stays blank, with no invented logo. Say the offer you are actually running, and type the shop name in the caption. The first 3 seconds should already be that shelf, recognizable as yesterday's shelf. A new angle every day looks like a new shop. Mark the tripod height, square the camera to the same shelf, and pull one tin forward before you say the offer. Keep one product. A practical reel is 15–45 seconds. The first 3 seconds show yesterday's shelf from the same angle, with that tin as the hero and a blank label, and they say the offer you are running. Reject a higher hurried angle, a second hero in the same breath, or a wordmark on the glass. If the voice could be mistaken for a real person, the caption must say it is AI.",
    points: [
      {
        h: "Lock the camera, not just the goods",
        p: "Mark the tripod height or the spot on the floor, and use it again. The shelf edge should hit the same part of the frame. A slightly higher morning makes the rows look like a different set. If you cannot return the camera, do not post the odd angle as part of the series. Use the same spot on the floor, and leave the odd angle out of the series if you cannot return the camera. The first 3 seconds show the shelf edge in its usual place and say the offer. Reject a slightly higher morning that makes the rows look like a different set.",
      },
      {
        h: "One hero on a full shelf",
        p: "Neighbors can be present because this is a shelf, but one jar, tin, or box is the product the sentence is about. Bring that one forward, or leave a small gap so the eye lands. Do not feature a different hero in the same breath. The next product gets the next morning. Bring one jar, tin, or box forward, or leave a small gap, and save the next product for the next morning. In the first 3 seconds the eye lands on that one hero and the voice says its offer. Do not post a sentence that features two products.",
      },
      {
        h: "Blank label, real caption",
        p: "The generated label stays blank. Do not ask for a wordmark, a price painted on the glass, or a fake brand. Speak the offer, and put the shop name in the caption. If a realistic AI voice carries the line, label the clip as AI. The shelf angle is the continuity. The words are yours. Leave the generated label blank, speak the offer, and type the shop name in the caption. In the first 3 seconds, viewers see the unmarked tin and hear the offer. Throw out a price painted on the glass or a fake brand before the file goes up.",
      },
    ],
    example:
      "A spice shop sets the camera square to the same shelf each morning before the door opens. One tin is pulled a little forward. Its label is blank. The spoken line is the offer the shop is running, and the shop name is typed in the caption. A higher angle from a hurried morning is left out of the series. Set the camera square, pull one tin forward, and drop the hurried high angle. The first 3 seconds show the same shelf and the blank label and say the offer the spice shop is running. One product, 15–45 seconds. Reject a wordmark. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro holds this to one product, with a blank label and no invented logo. Say the offer, put the shop name in the caption, and export 9:16. The same shelf angle is what makes the next morning readable as the same shop. Export 9:16 from the locked shelf angle. The first 3 seconds show one tin and say the offer. Reject an invented logo. Type the shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Return to the same shelf angle.",
      "Feature one product.",
      "Leave the label blank, and type the shop name in the caption.",
    ],
  },
  {
    id: 22,
    slug: "steam-on-a-mug-blank-label",
    title: "Steam on a Mug, Blank Label",
    excerpt:
      "Steam can rise from the mug. The label stays blank, with no letters and no invented logo on the sleeve.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of a mug with a soft wisp of steam, the label area blank, window light, no letters and no logo",
    cta: "Keep the sleeve blank",
    answer:
      "Steam may rise from the mug. The label stays blank. A wisp of steam tells you the drink is hot, and it should not hide a logo because there is no logo to hide. Do not ask for letters, a cafe mark, or a festive word on the sleeve or the ceramic. Say the drink and the offer you actually sell. The shop name goes in the caption. One mug is the product. If the steam becomes a fog that covers the cup, the still has lost the object. If a realistic AI voice speaks, label the clip as AI. Ask for a thin wisp, keep the handle and the blank sleeve visible, and say the roast you are actually pouring. One product, and a practical reel is 15–45 seconds. The first 3 seconds show the mug by the window with steam already breaking up, and they say that roast and the offer. Reject a dense cloud, a crest on the sleeve, or a second cup that splits the hero. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "A little steam, not a cloud",
        p: "Ask for a thin wisp, rising and already breaking up. A dense cloud hides the rim and invites shapes that look like writing. You should still see the handle, the lip, and the blank label area. If the mug disappears, the steam is the subject, and that is a different reel. Keep the steam thin enough that the rim still reads, and reshoot if the mug disappears. The first 3 seconds show the lip, the handle, and the blank label area, and say the drink. Reject a fog that looks like writing before you post.",
      },
      {
        h: "The label area is empty",
        p: "Describe a plain sleeve or a bare ceramic face. Reject any still where a stroke, a badge, or a word appears. Generated marks are not your brand. Your name is typed in the caption after the picture is clean. The offer is spoken, not printed on the mug. Describe bare ceramic or a plain sleeve, zoom in, and reject strokes, badges, or words. In the first 3 seconds the sleeve is empty and the voice says the offer, not a slogan printed on the mug. Do not post a generated mark as if it were your brand.",
      },
      {
        h: "One mug, true color",
        p: "The coffee or cocoa should look like what you serve, not a generic foam sculpture. One mug, one surface, morning light or the shop lamp, chosen and named. A second cup in the background splits the hero. Hold the frame long enough for the steam to read, inside a practical 15–45 second cut. Match the coffee or cocoa to what you serve, name the window or the shop lamp, and hold long enough for the wisp to read. In the first 3 seconds, viewers see one mug and hear the roast. Throw out a foam sculpture or a background cup before the file goes up.",
      },
    ],
    example:
      "A coffee roaster films one mug by the window. A thin steam wisp rises, and the sleeve is blank paper. The spoken line names the roast they are actually pouring this week. The roaster's name is typed in the caption. A still with a fake crest on the sleeve is rejected. Film the one mug, confirm the sleeve is blank paper, then name the roast. The first 3 seconds show the thin wisp and the unmarked sleeve and say the roast being poured this week. Reject the fake crest. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps one product in frame, with a blank label and no invented logo. Say the offer, put the shop name in the caption, and export 9:16. The steam is atmosphere. The blank sleeve is the rule. Export 9:16 with the sleeve large enough to check. The first 3 seconds show one mug and say the offer. Reject an invented logo in the steam or on the ceramic. Type the roaster's name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep the steam thin enough to see the mug.",
      "Leave the label blank.",
      "Say the real drink, and type the shop name in the caption.",
    ],
  },
  {
    id: 23,
    slug: "knit-texture-not-plastic-red",
    title: "Knit Texture, Not Plastic Red",
    excerpt:
      "Show the wool stitch. A matte red knit should look like yarn, not a shiny costume, on the locked face.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "Close view of an ordinary adult in a wool knit, the stitch texture visible, matte red yarn, natural skin, window light, no text",
    cta: "Show the wool",
    answer:
      "Show the knit of the wool, and keep the red matte. A Christmas sweater on your own host should read as yarn: stitches, a little fuzz, a soft highlight. A shiny, smooth red reads as a plastic costume, and it pulls the face toward the same fake finish. Lock the face first. Change only the knit. Approve the still when you can see the stitch on a phone, before the fabric moves. If the host looks real, say the host is AI. The red is a wool color you chose, not a character's uniform. Name wool, rib, or cable, ask for matte yarn, and approve the still only when you can point at a stitch on a phone. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the matte red crewneck on the locked face, cuff rib visible, and they say the shop line. Reject a glossy chest with no texture, red spilled onto the cheeks, or a jaw that no longer matches the reference. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Ask for the stitch",
        p: "Name wool, rib, or cable, and say the yarn is matte. Words like glossy, latex, satin, or perfect red push the cloth toward plastic. You should be able to point at a stitch. If the chest is a flat red shape with no texture, reject the still and ask for the yarn again. Avoid words like glossy, satin, or perfect red, and reject a flat red shape that has no yarn. The first 3 seconds show the stitch and say the shop line. Do not post plastic cloth before you have asked for the wool again.",
      },
      {
        h: "Keep the face out of the dye",
        p: "The sweater can be red. The skin stays its real color, and a white cuff stays white. If the red spills onto the neck or the cheeks, the garment is lighting the person. That is a failed still, even when the stitch is visible. Approve color and texture together. Keep the skin its real color and a white cuff white, even when the sweater is red. In the first 3 seconds the neck is still skin and the voice says the line. Check the neck before you approve the still. Reject a garment that is lighting the person.",
      },
      {
        h: "Same face, new knit",
        p: "The locked face does not change because the sweater did. Compare eyes and hairline with the reference before motion. Life photos can reuse this host in this wool once the still is right. Label the realistic face as AI, and leave the platform label visible. Compare eyes and hairline with the reference after the knit is on, then allow motion. In the first 3 seconds, viewers see the same face in the new wool and hear the shop line. Throw out a new head wearing a good sweater before the file goes up.",
      },
    ],
    example:
      "A yarn shop owner wears a matte red wool crewneck by the window. The rib at the cuff is visible, the yarn is not shiny, and the skin stays a natural color. The face matches the locked reference. A smooth, plastic red version is rejected. The caption says the host is AI. Stand at the window in the matte red crewneck, check the cuff rib, and reject the smooth plastic version. The first 3 seconds show the yarn and the locked face and say the shop line. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro locks the face and lets you change clothes only, so the wool can swap without a new head. Approve the still before motion, and reuse the host in life photos. Export 9:16. Label the realistic face as AI. Change the wool only, approve the stitch and the face together, then export 9:16. The first 3 seconds show the matte knit and say the shop line. Reject plastic red. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Show a visible wool stitch.",
      "Keep the red matte and the skin real.",
      "Match the locked face, and label the host as AI.",
    ],
  },
  {
    id: 24,
    slug: "one-spoken-christmas-line",
    title: "One Spoken Christmas Line",
    excerpt:
      "Speak one original line, the length of a card, then the offer. Skip the carol and the second sentiment.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult facing the camera in a quiet shop, empty hands, warm lamp, face clear, no text",
    cta: "Speak one line, then the offer",
    answer:
      "Speak one original Christmas line, the length of something you would write on a card, and then say the offer. The card line is one sentence of your own. It is not a carol, not a famous poem, and not a greeting that delays the point. The offer you are actually running comes next, inside the first 3 seconds if you can keep both that short, or immediately after the line if the line itself is the opening. One person speaks. Burn the words in if the file will also go to TikTok or Shorts. If the face or voice is realistic, label it as AI. Write one original card line in your own words, say it, and let the offer be the next thing out of the same mouth. One speaker. A practical reel is 15–45 seconds. The first 3 seconds show the cheesemonger with empty hands and say that line, then the platter people can actually order. Reject a carol, a famous poem, a second sentence that the card line needed in order to make sense, or a cut to another face. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it appears.",
    points: [
      {
        h: "One line, then stop",
        p: "Write the card line before you record it. If it needs a second sentence to make sense, it is too long. Your own words only. A quoted song brings someone else's work into the reel. After the line, the offer is the next thing said, in the words you use at the counter, with no extra deal attached. Record the card line you wrote, then the counter offer, and attach no extra deal. The first 3 seconds show the one speaker and say those two parts in that order. Reject a quoted song or a second card line before you post.",
      },
      {
        h: "Put the words where they can be read",
        p: "The upper middle holds the line, clear of the mouth. Choose one caption style and keep it. Burned-in captions help when the same file goes to TikTok or Shorts, because the app's own text will not travel with the download. The spoken line and the burned-in line should match. Place the same words in the upper middle, pick one caption style, and burn them in if the file will also go to TikTok or Shorts. In the first 3 seconds the burned-in line matches the voice. Do not post spoken words and on-screen words that disagree.",
      },
      {
        h: "One person carries both",
        p: "The same speaker says the card line and the offer. A cut to a second face breaks a reel this short. A practical length is 15–45 seconds: the line, the offer, and a hold. Label a realistic face or voice as AI, and leave the platform label where it appears. Keep the same person for the line and the offer, then hold and stop. In the first 3 seconds, viewers see one face and hear the card line moving into the offer. Throw out a second speaker or a montage before the file goes up.",
      },
    ],
    example:
      "A cheesemonger says one original line about sharing a table, in their own words, then names the platter they are actually taking orders for. No carol is sung. The caption repeats both parts in the upper middle and says the host is AI. The reel ends on the counter. Say the table line in your own words, name the platter, and end on the counter. The first 3 seconds show the cheesemonger and say that original line and the real order. Reject a carol. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays visible.",
    bridge:
      "Scro has one person speak, and it offers 13 caption styles for that card line and the offer. Export 9:16. If the face or the voice is realistic, label it as AI and leave the platform label in place. Use one caption style for the card line and the offer, then export 9:16. The first 3 seconds show one speaker and say the line, then the offer. Reject a song. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Speak one original line, then the offer.",
      "Leave songs and poems out.",
      "Label a realistic host as AI.",
    ],
  },
  {
    id: 25,
    slug: "ribbon-bow-as-the-hero",
    title: "Ribbon Bow as the Hero",
    excerpt:
      "One bow is the subject. Give it a single contact shadow, keep the tag blank, and say the offer.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one ribbon bow on a wrapped box, a single soft contact shadow on the table, daylight, no text",
    cta: "Feature the one bow",
    answer:
      "The ribbon bow is the hero of this reel. One bow, on one box, with one contact shadow where the box meets the table. The shadow should touch the box, not float beside it. The tag stays blank, and the ribbon carries no invented logo or lettering. Say the offer you are actually running while the bow is already large in the frame. The shop name goes in the caption. The first 3 seconds are the bow, close enough that the knot reads. If a realistic AI voice speaks the offer, label the clip as AI. Fill the frame with one knot, give the box a single contact shadow that touches the table, and say the wrapping offer while the bow is already large. Keep one product. A practical reel is 15–45 seconds. The first 3 seconds show the linen bow and the shadow falling the same way as the tail, and they say the wrapping the shop actually sells. Reject a second bow, a floating shadow, or a gold word on the cloth. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "One bow, large enough",
        p: "Fill the frame with the knot and the tails. A bow the size of a button is not the hero, even if it is the only one. Crop out extra ribbon scraps. A second bow on a second box starts a catalog. This reel ends when this bow has been seen and the offer has been said. Crop extra ribbon scraps and stop when this bow has been seen and the offer said. The first 3 seconds show the knot and the tails large enough to read and say the offer. Reject a button-sized bow or a second box starting a catalog.",
      },
      {
        h: "One contact shadow",
        p: "The box casts a single soft shadow that touches its base. A shadow that floats, or a second shadow going the other way, means the light was not decided. Name the window or the lamp so the shadow has an owner. The bow's own small shadow on the paper should agree with that same light. Name the window or the lamp so the shadow has an owner, and check that the bow's small shadow agrees. In the first 3 seconds the box shadow touches the base and the voice says the offer. Do not post a second shadow going the other way.",
      },
      {
        h: "No writing on the ribbon",
        p: "Leave the cloth unmarked. A gold word, a fake crest, or a painted shop name is an invented logo. Speak the offer, and type the shop name in the caption. The upper middle can hold that caption without covering the knot. One product, one bow, one shadow. Leave the cloth unmarked, type the shop name in the caption, and keep the upper middle off the knot. In the first 3 seconds, viewers see a blank ribbon and hear the offer. Throw out a fake crest or a painted shop name before the file goes up.",
      },
    ],
    example:
      "A stationer films one linen bow on a kraft box by the window. The box shadow touches the table and falls to the right, the same way the tail's shadow falls. The tag is blank. The spoken offer is the wrapping the shop actually sells, and the shop name is typed in the caption. Film the kraft box by the window, match the tail shadow to the box shadow, and leave the tag blank. The first 3 seconds show the one linen bow and say the wrapping offer. Reject a gold word on the ribbon. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps the frame to one product, with a blank label and no invented logo on the ribbon. Say the offer, put the shop name in the caption, and export 9:16 so the bow can occupy the vertical frame. Export 9:16 so the bow occupies the vertical frame, with no invented logo on the cloth. The first 3 seconds show the knot and say the offer. Reject a floating shadow. Type the shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Use one bow as the hero.",
      "Keep a single contact shadow under the box.",
      "Leave the ribbon blank, and type the shop name in the caption.",
    ],
  },
];
