import type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";

const explain = ["Christmas", "AI Video", "Explainer"] as string[];
const host = ["Christmas", "AI Video", "Talking Head"] as string[];
const product = ["Christmas", "AI Video", "Product Promo"] as string[];
const face = ["Christmas", "AI Video", "AI Influencer"] as string[];
const voice = ["Christmas", "AI Video", "Cantonese"] as string[];

void voice;

// English Christmas production guides, ids 26–50.
export const SPECS_B: SeasonGuideSpec[] = [
  {
    id: 26,
    slug: "christmas-window-one-item",
    title: "Christmas Window, One Item",
    excerpt:
      "The shop window holds one product. A second hero splits the glance, and the pack stays blank.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of a shop window holding one ceramic vase on a stand, street light outside, no lettering and no logo",
    cta: "Dress the window with one item",
    answer:
      "The Christmas window holds one product. A display that tries to show the whole shop gives every object equal weight, and none of them land. Put one item on a stand, with space around it, and let the glass and the street stay as setting. The pack or the object stays free of an invented logo and free of painted letters. Say the offer you are actually running. The shop name goes in the caption, not on the glass. The first 3 seconds should already be that one item, readable from the pavement. If a realistic AI voice speaks, label the clip as AI. Clear the other pots into the back room, set one vase on the stand, and say the offer only after that object reads from the pavement. Keep one product. A practical reel is 15–45 seconds. The first 3 seconds show the single vase with space around it and say the offer the studio is running, with no letters on the glass. Reject a second hero, painted words, or a reflection that looks like a sign. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it was placed.",
    points: [
      {
        h: "One object, real space",
        p: "Choose the item a passerby could name in a glance: one vase, one coat, one cake stand. Neighbors come out of the window for this reel. Empty space is what makes the object look chosen. If you cannot crop the rest of the display away, the window is not ready to film. Name the one item a passerby could identify, then take every neighbor out of the window before you record. The first 3 seconds show that vase, coat, or cake stand with real space around it and say the offer. Reject a display you cannot crop down to one object.",
      },
      {
        h: "No lettering on the glass",
        p: "Leave the pane and the product unmarked. A generated word on glass is rarely your real sign, and it fights the object. Type the shop name and the offer in the caption. If a reflection looks like letters, change the angle until the glass reads as glass. Leave the pane and the product unmarked, and change the angle if a reflection starts to look like letters. In the first 3 seconds the glass reads as glass and the voice says the offer. Do not post a generated word on the window.",
      },
      {
        h: "Say what the window is selling",
        p: "The spoken line names the one item and the offer you are running. Do not add a second product in the sentence. A practical cut of 15–45 seconds can hold on the window, then come a step closer, and stop. The item never leaves the center of the idea. Say the item and the offer in one sentence, then come a step closer and stop. In the first 3 seconds, viewers see the one window item and hear that offer. Throw out a second product tucked into the same breath before the file goes up.",
      },
    ],
    example:
      "A ceramic studio dresses the street window with one vase on a stand. The other pots stay in the back room for this reel. No letters are painted on the glass. The spoken line is the offer the studio is running, and the studio name is typed in the caption. Dress the street window with the one vase, keep the other pots in back, and type the studio name only in the caption. The first 3 seconds show the vase on the stand and say the offer. Reject letters on the glass. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps the reel to one product, with a blank label and no invented logo. Say the offer, put the shop name in the caption, and export 9:16 so the single window item can fill the vertical frame. Export 9:16 so the single window item can fill the frame, after the pack is still blank. The first 3 seconds show that vase and say the offer. Reject an invented logo. Type the shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Put only one item in the window.",
      "Leave the glass and the pack free of invented marks.",
      "Say the real offer, and type the shop name in the caption.",
    ],
  },
  {
    id: 27,
    slug: "explain-gift-receipts-in-beats",
    title: "Explain Gift Receipts in Four Beats",
    excerpt:
      "Use a cartoon to explain the gift-receipt policy you actually use. One policy, no fake brand, four beats.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "Simple cartoon doodles of a plain receipt shape and a gift box on a whiteboard, no letters and no people",
    cta: "Draw the receipt policy",
    answer:
      "Explain gift receipts in four beats, as a cartoon, and explain only the policy you actually use. Do not invent a softer rule, a longer window, or a fake brand to make the drawing prettier. The doodle is not a real person, and it is not a character from a film. One idea: what your gift receipt does. Clip 1 opens with one big hook title in the spoken language unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before they move. Draw only the gift-receipt rule you actually use, in four beats, and approve each still before the marker moves. One product on the board, a plain slip and a plain box, inside a practical reel of 15–45 seconds. The first 3 seconds show one hook title in the spoken language, unless on-screen text is off, and they say what your gift receipt does. Reject a softer rule, a longer window, a fake brand, a film character, or a blank grey strip. If a face or voice could be mistaken for a real person, the caption must say it is AI. The doodle is not a person.",
    points: [
      {
        h: "Four beats, one policy",
        p: "Beat one names the gift receipt. Beat two shows what the recipient can do under your real rule. Beat three shows the limit you actually keep. Beat four points back to the counter, where the person asks. If you do not offer a step, leave it out rather than borrowing one from another shop. The drawing never adds a brand that is not yours. Name the slip, then what the recipient can do under your real rule, then the limit you keep, then the counter where someone asks. The first 3 seconds show beat one and say the policy. Reject a step borrowed from another shop before you post.",
      },
      {
        h: "Words you can proofread",
        p: "The hook title states the idea in the spoken language, unless you turn on-screen text off. Do not ask the doodle to paint a tiny policy on the receipt shape. Those letters come out wrong. The caption can carry the precise rule in your own typing. The picture stays shapes: a slip, a box, a counter. Put the precise rule in the caption you type, and keep the receipt shape free of tiny painted policy. In the first 3 seconds the picture is a slip, a box, and a counter, and the voice says the idea. Do not post nonsense letters on the slip.",
      },
      {
        h: "Original marks only",
        p: "The receipt is a plain rectangle. It does not copy another shop's layout, crest, or character. One arrow may point at the slip. A blank grey strip is the wrong way to cross anything out. Approve each of the four stills before the paper or the marker moves. Use a plain rectangle, one arrow at most, and approve the four stills in order. In the first 3 seconds, viewers see the original slip and hear your rule. Throw out another shop's crest, a copied character, or a grey strip before the file goes up.",
      },
    ],
    example:
      "An independent bookshop draws four beats on one whiteboard: a plain slip, the slip with a gift box, the limit the shop really uses, and the counter where someone asks. No publisher logo appears. The hook title is the idea in English. The doodle has no film character, and the stills are approved first. Draw the bookshop's real limit, leave every publisher mark off the board, and approve the four stills first. The first 3 seconds show the hook title in English and say what the gift receipt does. Reject a fake brand. One product shape, 15–45 seconds. If a voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro tells this as a cartoon doodle, one idea, with no filmed host. Clip 1's first 3 seconds are one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, skip any blank grey strip, and approve the stills before motion. The doodle is not a real person. Export after the four stills are approved and the hook title matches the spoken language, unless on-screen text is off. The first 3 seconds show that title and say the real policy. Reject a grey strip or a film character. If a face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Explain only the policy you use.",
      "Keep the drawing free of a fake brand.",
      "Approve four stills before they move.",
    ],
  },
  {
    id: 28,
    slug: "click-and-collect-christmas-cartoon",
    title: "Click and Collect, as a Cartoon",
    excerpt:
      "Show click and collect in four faceless steps. Use the path your shop actually runs, on one cartoon board.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "Four simple faceless paper shapes in a row on a whiteboard, original marker drawings of a box and a counter, no letters",
    cta: "Draw the four steps",
    answer:
      "Click and collect can be a cartoon in four steps, and the figure stays faceless. Draw the path you actually run: the order, the pack, the message you really send, and the counter where the person collects. Do not invent a courier, a brand, or a character from a film. The doodle is not a real person. One idea only. Clip 1's first 3 seconds are one big hook title in the spoken language unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before motion. Walk the path you actually run: the order, the pack, the message you really send, and the counter where the plant is collected. Keep one product, the wrapped pot, in a practical reel of 15–45 seconds. The first 3 seconds show a faceless board and one hook title that says click and collect, unless on-screen text is off, and the voice says the same path. Reject a courier you do not use, a film character, a realistic face grown halfway, or a blank grey strip. If a voice could be mistaken for a real person, the caption must say it is AI.",
    points: [
      {
        h: "Four steps you can walk",
        p: "Each step is something your shop does this month. If you do not send a message, do not draw one. If collection is at the side door, draw the side door as a simple shape. A prettier process that you do not run will create a queue you cannot serve. The order of the steps matches the order a customer meets them. Draw each step in the order a customer meets it, and leave out a message if you do not send one. The first 3 seconds show the first real step and say click and collect. Reject a prettier process that would create a queue you cannot serve.",
      },
      {
        h: "Faceless on purpose",
        p: "A circle without a portrait is enough if you need a person-shape at the counter. Do not grow a realistic face halfway through, and do not borrow a famous outline. The drawing is not staff, and it is not a film character. Stay on the same whiteboard so the four steps feel like one path. Use a circle without a portrait if you need a person-shape, and stay on the same whiteboard. In the first 3 seconds the figures stay faceless and the voice says the path. Do not post a famous outline or a switch to a filmed host.",
      },
      {
        h: "One arrow for the handoff",
        p: "If you need an arrow, use it once, at the moment the box reaches the counter. Extra arrows and a blank grey strip clutter the path. The hook title carries the idea. Small labels painted inside the drawings tend to come out as nonsense, so keep those words in the caption instead. Spend the single arrow on the handoff at the counter, and keep small labels out of the drawings. In the first 3 seconds, viewers see the pot reaching the counter and hear the real step. Throw out extra arrows and a grey strip before the file goes up.",
      },
    ],
    example:
      "A plant shop draws four faceless steps: a plain order card, a wrapped pot, a simple bell shape for the message they really send, and the counter where the plant is collected. The hook title states click and collect in English. No film character appears. The stills are approved before anything moves. Draw the order card, the wrapped pot, the bell you really use, and the counter, then approve those stills. The first 3 seconds show the hook title in English and say click and collect. Reject a film character. One product, 15–45 seconds. If a voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro draws these steps as a cartoon doodle and one idea, with no filmed host. Clip 1's first 3 seconds are one big hook title in the spoken language, unless on-screen text is off. Keep at most one arrow, leave out any blank grey strip, and approve the stills before motion. The doodle is not a real person. Keep the four steps as one cartoon path and export only after the stills are approved. The first 3 seconds show the hook title, unless on-screen text is off, and say the path you run. Reject a grey strip. If a face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Draw the four steps you actually run.",
      "Keep every figure faceless and original.",
      "Use at most one arrow and no blank grey strip.",
    ],
  },
  {
    id: 29,
    slug: "say-the-offer-before-the-greeting",
    title: "Say the Offer before the Greeting",
    excerpt:
      "The first words are the offer. Skip the hey-guys opening, and let the greeting wait or leave it out.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult behind a shop counter, mouth open as if mid-sentence, one bottle beside them, warm light, no text",
    cta: "Lead with the offer",
    answer:
      "Say the offer before the greeting. The first words are the thing a customer can use, and a hey-guys opening spends them. Welcome, happy holidays, and the shop's name can wait until the offer has been heard, or they can stay in the caption. Speak the offer you are actually running. The first 3 seconds carry that line. One person speaks. If the face or the voice could be mistaken for a real person, say in the caption that it is AI, and leave the platform label where it appears. Cut any hey-guys opening, put the offer you are running in word one, and let the shop name wait in the caption. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the olive oil seller and one bottle, and they say the offer with no holiday wish ahead of it. Reject a second deal in the same breath, a wave, or a crowd. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it appears.",
    points: [
      {
        h: "Start on the usable fact",
        p: "Write the offer as a sentence you could say at the counter, then record that sentence first. If the take begins with hey guys, cut it. Do not hide the greeting inside a longer hello that still delays the offer. The viewer should know what to do before they know your name. Write the counter sentence, record that sentence first, and delete a take that begins with hey guys. The first 3 seconds show the seller and say the usable offer. Reject a longer hello that still delays the point before you post.",
      },
      {
        h: "One offer, one speaker",
        p: "A second deal in the same breath sounds like a list and neither part lands. One person holds the frame. The product can sit beside them as evidence, but the mouth is already on the offer in the first 3 seconds. A pan, a wave, or a crowd is a different reel. Hold one person and one bottle, with the mouth already on the offer, and skip the pan. In the first 3 seconds the picture is the bottle as evidence and the words are the single offer. Do not post a second deal or a crowd in that opening.",
      },
      {
        h: "Repeat it where silence still works",
        p: "Put the same offer in the caption, in the upper middle, clear of the mouth. One caption style is enough. If the face or the voice is realistic, the caption also says the host is AI. Leave the platform label visible. The greeting, if you still want it, comes after the offer or not at all. Repeat the offer in the upper middle, add that the host is AI if the face looks real, and leave the greeting for later or leave it out. In the first 3 seconds, viewers see the seller and hear the offer, and they can read it. Throw out a caption that leads with welcome before the file goes up.",
      },
    ],
    example:
      "An olive oil seller faces the camera with one bottle on the counter. The first words are the offer the shop is running. There is no hey-guys opening and no holiday wish before that sentence. The caption repeats the offer and says the host is AI, because the face looks real. Face the camera with the one bottle, say the offer first, and skip the holiday wish. The first 3 seconds show the seller and the bottle and say the offer the shop is running. Reject a hey-guys opening. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays visible.",
    bridge:
      "Scro has one person speak the offer first. Set that line in one of 13 caption styles, and export 9:16. If the face or the voice is realistic, label it as AI and leave the platform label in place. Set the offer in one caption style and export 9:16 after the greeting is gone. The first 3 seconds show one speaker and say the offer. Reject a hello-first file. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Say the offer before any greeting.",
      "Cut a hey-guys opening.",
      "Label a realistic face or voice as AI.",
    ],
  },
  {
    id: 30,
    slug: "do-not-invent-a-luxury-logo",
    title: "Do Not Invent a Luxury Logo",
    excerpt:
      "Keep the pack blank. A generated crest is not your brand. Type the shop name in the caption.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of a plain unmarked box and a plain jar, soft daylight, no logo and no letters",
    cta: "Leave the pack blank",
    answer:
      "Do not invent a luxury logo. A crest, a gold monogram, or a wordmark the model paints on the pack is not your brand, even when it looks expensive. The pack stays blank. You say the offer you are actually running, and you type the shop name in the caption. One product fills the frame. The first 3 seconds should show that clean pack so you can reject a still the moment a mark appears. The shop name is never painted on. If a realistic AI voice speaks the offer, label the clip as AI. Describe plain paper, plain glass, or a plain tin, zoom in before you approve, and say the offer only when every face of the pack is blank. Keep one product. A practical reel is 15–45 seconds. The first 3 seconds show the honey jar with no crest and no gold letters, and they say the offer the seller is running. Reject embossing, foil, a badge, a partial letter, or a generated slogan. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Blank means no crest",
        p: "Describe plain paper, plain glass, or a plain tin. Do not ask for embossing, foil, or a luxury mark. Those words are how a fake logo arrives. If the still grows a badge, a signature, or even a partial letter, reject it. Zoom in before you approve. Small gold marks hide at thumbnail size. Do not ask for a luxury mark, then inspect the lid at a size larger than the thumbnail. The first 3 seconds show the blank pack and say the offer. Reject a tiny shield you would miss when the frame is small, before you post.",
      },
      {
        h: "Your name stays typed",
        p: "The caption is where the shop name belongs, because you can spell it. The picture does not need to prove the brand with paint. Speak the offer in the words you use in the shop. A generated slogan on the box is another invented logo, even if the words are flattering. Type the shop name in the caption, spelled the way the real label is, and speak the offer in shop words. In the first 3 seconds the picture proves nothing with paint and the voice says the offer. Do not post a flattering slogan generated on the box.",
      },
      {
        h: "One pack, one check",
        p: "A second box is a second chance for a fake mark. Film one pack, turn it if you must, and keep every face of it blank. The upper middle can hold the caption without covering the surface you are trying to keep clean. Hold long enough to see the pack is unmarked. Film one pack, turn it if you must, and keep the caption off the surface you are checking. In the first 3 seconds, viewers see an unmarked jar and hear the offer. Throw out a second box that gives a fake mark somewhere to hide.",
      },
    ],
    example:
      "A honey seller films one plain jar. The lid and the glass have no crest and no gold letters. A still that added a tiny shield on the lid is rejected. The spoken line is the offer the seller is running, and the seller's name is typed in the caption, spelled the way the label really is. Film the plain jar, reject the still with a shield on the lid, and type the seller's name yourself. The first 3 seconds show glass with no gold letters and say the offer. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI, and the platform label stays in place.",
    bridge:
      "Scro's product reel uses one product, a blank label, and no invented logo. Say the offer in the video. The shop name goes in the caption. Export 9:16 so the plain pack is large enough to check. Export 9:16 so the plain pack is large enough to check. The first 3 seconds show the blank jar and say the offer. Reject any crest. Put the shop name in the caption, not on the lid. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Reject any crest or monogram.",
      "Keep every face of the pack blank.",
      "Type the real shop name in the caption.",
    ],
  },
  {
    id: 31,
    slug: "white-shirt-near-red-decor",
    title: "White Shirt near Red Decor",
    excerpt:
      "Red ornaments can sit behind the host. The white shirt stays white, and the face keeps its own color.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a white shirt beside red ornaments, the shirt staying white, window light, natural skin, no text",
    cta: "Keep the shirt white",
    answer:
      "Red decor can sit near a white shirt, and the shirt stays white. Ornaments, a bow, or a blanket belong behind the host or off to the side, far enough that they do not dye the cloth. If the red light spills onto the cotton, the still is wrong, even when the face is flattering. Lock the face first. Approve the still before motion, and check the shirt on a phone. The skin keeps its real color too. If the host looks real, say the host is AI, and leave the platform label visible. Place the red ornaments behind one shoulder, approve the white shirt on a phone, and only then let the host move. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the cookware seller in a shirt that stays white, with skin still a real color, and they say the shop line. Reject a pink placket, an overall rose cast, or a face that drifted because the background changed. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Separate the red from the cloth",
        p: "Place the red objects behind the shoulder or deep in the background, out of focus. A red blanket on the same plane as the shirt will bounce onto the cotton. Say that the shirt is white and stays white. If the placket turns pink, move the decor in the description before you do anything else. Push the red bowl deep and out of focus before you judge the cotton, and say in the description that the shirt stays white. The first 3 seconds show white cloth and say the shop line. Reject a red blanket on the same plane as the shirt.",
      },
      {
        h: "Check collar, cuff, and cheek",
        p: "The collar and the cuff are the easy tells. They should match the white you know, not the ornament. The cheek nearer the red may warm slightly and should still look like skin. An overall rose cast means the decor became the light. Reject that still. Check collar, cuff, and the near cheek, and allow only a slight warmth that still looks like skin. In the first 3 seconds the collar matches the white you know and the voice says the line. Do not post a still where the ornament became the light.",
      },
      {
        h: "Same face, same shirt rule",
        p: "Changing the background red does not entitle the face to change. Compare the locked face, then look at the cloth. Life photos of this host in this corner follow the same white-shirt check. Approve before motion. Label the realistic face as AI, and leave the platform label visible. Compare the locked face after you look at the cloth, and use the same white-shirt check on a later life photo. In the first 3 seconds, viewers see the same person in a white shirt and hear the shop line. Throw out a new head in a flattering pink cast before the file goes up.",
      },
    ],
    example:
      "A cookware seller wears a white shirt by a window, with a bowl of red ornaments on a shelf behind one shoulder. The shirt stays white and the skin stays a real color. A still where the collar turned pink is rejected. The face matches the lock, and the caption says the host is AI. Set the ornament bowl on the shelf behind one shoulder, confirm the collar is white, and reject the pink version. The first 3 seconds show the white shirt and the locked face and say the shop line. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro locks the face and lets you approve the still before motion, which is when the white shirt is easiest to judge. Change clothes only if you mean to. Life photos can reuse this host. Export 9:16, and label the realistic face as AI. Approve the shirt color before motion, then export 9:16. The first 3 seconds show white cloth beside red decor and say the shop line. Reject a pink collar. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep red decor behind the host.",
      "Leave the white shirt white.",
      "Match the locked face, and label the host as AI.",
    ],
  },
  {
    id: 32,
    slug: "night-shop-one-warm-lamp",
    title: "Night Shop, One Warm Lamp",
    excerpt:
      "After dark, one warm lamp lights the host. Skip the red wash, and keep the face a natural color.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult in a dark shop lit by one warm lamp, face a natural color, the rest of the room dim, no text",
    cta: "Switch on one lamp",
    answer:
      "A night shop needs one warm lamp, not a red wash. The lamp is in the frame or just beside it, and it is the only source on the face. The cheeks keep a natural color, with warmth on the side nearer the bulb and a real shadow on the other. Flooding the room red turns the person into a filter. One person speaks, and the first 3 seconds carry the point of the reel. If the face or the voice looks real, label the clip as AI and leave the platform label in place. Name the one lamp, kill the red wash, and say tomorrow's open under that bulb. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the baker with a warm near cheek and a far cheek that is still a skin color, and they say the open. Reject a string plus a gel plus the lamp, teeth that match a gel, or a cut to a brighter redder frame. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays in place.",
    points: [
      {
        h: "Name the lamp",
        p: "Say where the lamp sits and that it is the only practical. A string, a red gel, and the lamp together are three lights. Pick the lamp. The rest of the shop can fall off into dark. If you cannot point at the bright side of the face, the source is not decided. Point at the lamp and at the bright side of the face before you add any other source. The first 3 seconds show that single practical and say the open or the offer. Reject a room you cannot explain from one bulb before you post.",
      },
      {
        h: "Stop the red wash",
        p: "Warm is a bias toward the bulb. Red is a costume on the skin. The far cheek, the teeth, and a white collar should not match a gel. If they do, the still is a wash and it should not move. Correct the color while it is a picture. Night is the hour. It is not a tint slider. Keep warm as a bias toward the bulb, and reject the still if the far cheek, the teeth, or a white collar match a gel. In the first 3 seconds the apron keeps its real cloth color and the voice says the line. Do not post a red costume on the skin.",
      },
      {
        h: "Speak in that light",
        p: "The mouth moves under the same lamp you approved. A cut to a brighter, redder frame breaks the night. One person, one sentence that is the offer, the hours, or the date. Caption it in the upper middle. A realistic face or voice is labeled as AI. Leave the mouth under the approved lamp, put the line in the upper middle, and stop. In the first 3 seconds, viewers see the night shop and hear tomorrow's open. Throw out a second voice or a redder insert before the file goes up.",
      },
    ],
    example:
      "A baker locks the door and stands by the one lamp over the counter. The near cheek is warm, the far cheek is darker and still a skin color, and the apron stays its real cloth color. A version bathed in red is rejected. The first sentence is tomorrow's open, and the caption says the host is AI. Lock the door, stand by the counter lamp, and reject the version bathed in red. The first 3 seconds show the one warm lamp and say tomorrow's open. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays visible.",
    bridge:
      "Scro has one person speak under the light you approved in the still. Use one of 13 caption styles for the line, and export 9:16. If the face or the voice is realistic, label it as AI. Export 9:16 under the lamp you approved in the still. The first 3 seconds show that bulb and say the shop point. Reject a red wash. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Use one warm lamp as the only source.",
      "Keep the face a natural color.",
      "Label a realistic host as AI.",
    ],
  },
  {
    id: 33,
    slug: "morning-prep-window-plus-lamp",
    title: "Morning Prep, Window plus One Lamp",
    excerpt:
      "Name the cool window and the warm lamp. Both are in the morning prep still, and the face stays real.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult at a prep table, cool daylight from a window on one side and one warm lamp on the other, natural skin, no text",
    cta: "Name the window and the lamp",
    answer:
      "Morning prep uses two named lights: a cool window and one warm lamp. The window is daylight on one side. The lamp is the practical on the bench, warmer and smaller. Say both in the description so neither becomes a mystery wash. The face keeps a real color, cooler toward the glass and warmer toward the bulb. Lock that face, and approve the still before motion. If the host looks real, say the host is AI. A third source, or an unnamed glow, means the still is not finished. Write which side the cool window is on and which side the warm lamp is on, put both in the frame, and approve the still before the hands work. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the flower-workshop owner with a cooler left cheek and a warmer right cheek, and they say the shop line. Reject a flat morning with no lamp, matching cheeks, or an unnamed third glow. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Say cool window, warm lamp",
        p: "Write which side the glass is on, and which side the lamp is on. Cool and warm are the point of the mix. If you only say morning, the picture may arrive with one flat light and no lamp at all. The lamp should be visible, or its shade should be, so the warmth has an owner. Name the glass and the shade before you generate, so the warmth has an owner you can see. The first 3 seconds show both lights and say the shop line. Reject a picture that only says morning and arrives with one wash before you post.",
      },
      {
        h: "Let the two sides disagree",
        p: "The cheek toward the window is cooler. The cheek toward the lamp is warmer. If both cheeks match, one of the lights lost. White cloth should not turn orange, and it should not turn blue. Skin stays skin. Judge this on the still, at phone size, before the hands start working. Let the cheeks disagree, and keep white cloth from turning orange or blue. In the first 3 seconds the left cheek is cooler than the right and the voice says the line. Do not post a face where one of the two lights has lost.",
      },
      {
        h: "Prep is the action, light is the lock",
        p: "The work on the table can change. The window and the lamp do not, and the face does not. Approve the still, then let the motion happen in that light. Life photos can reuse this host at the same bench. Label the realistic face as AI, and leave the platform label visible. Change the work on the table only after the window, the lamp, and the face are locked. In the first 3 seconds, viewers see the same bench and hear the shop line. Throw out a new head or a third source before the file goes up.",
      },
    ],
    example:
      "A flower workshop films the owner at the bench. The window is camera-left and cool. A small lamp is camera-right and warm, and you can see the shade. The left cheek is cooler than the right, and the skin still looks real. The face matches the lock. The caption says the host is AI. Put the window camera-left and the small lamp camera-right, check that the cheeks disagree, then approve. The first 3 seconds show both named lights and say the shop line. Reject a flat single wash. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro locks this face and waits for you to approve the still before motion, with both lights already in the frame. Life photos can reuse the host. Change clothes only if you mean to. Export 9:16, and label the realistic face as AI. Approve the still with both lights already in frame, then export 9:16. The first 3 seconds show the cool window and the warm lamp and say the shop line. Reject an unnamed glow. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Name the cool window and the warm lamp.",
      "Let the two cheeks disagree.",
      "Approve the still, and label the host as AI.",
    ],
  },
  {
    id: 34,
    slug: "three-clips-one-christmas-promise",
    title: "Three Clips, One Christmas Promise",
    excerpt:
      "Say one promise, then show it, then say it again. Three clips, the same words, on one paper board.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "Three paper-cutout shapes on one dark wooden board, a plain box repeated, white paper edges, no letters and no people",
    cta: "Repeat the one promise",
    answer:
      "Three clips can carry one Christmas promise, and they should not carry three. A reel may run from 3 seconds to 3 minutes. A practical cut is 15–45 seconds, which is enough for three short beats of the same promise. Clip one states it. Clip two shows the step that makes it true. Clip three says the same words again. Use a paper-cutout on one wooden board. The figure is paper, not a real person, and not a character from a film. One idea. Approve the stills before they move. Write the promise the way you would say it at the counter, show the step that makes it true, then say those same words again. One product on one wooden board, in a practical reel of 15–45 seconds. The first 3 seconds show clip 1's hook title, unless on-screen text is off, and they say the alteration promise. Reject a paraphrase that becomes a new offer, a second board, a realistic face in clip three, or a blank grey strip. If a face or voice could be mistaken for a real person, the caption must say it is AI. The cutout is paper.",
    points: [
      {
        h: "The same sentence three times",
        p: "Write the promise the way you would say it at the counter, and use those words in the first and third clips. A paraphrase in the last clip feels like a new offer. If you cannot keep the promise, do not make the reel. The middle clip is evidence, not a second deal. Use the same sentence in the first and third clips, and keep the middle clip as evidence rather than a second deal. The first 3 seconds show the promise on the board and say those words. Reject a last clip that restates a different offer.",
      },
      {
        h: "One board under all three",
        p: "The wooden board stays the same grain and the same color. Pieces can change. The table does not. At most one arrow in a clip, and no blank grey strip to wipe the old beat away. Slide a piece off instead. The hook title on clip 1 is the promise, in the spoken language, unless on-screen text is off. Hold the grain and the color, slide a piece off instead of wiping it, and limit yourself to one arrow in a clip. In the first 3 seconds the wood matches the first frame and the voice says the promise. Do not post a grey strip or a new table.",
      },
      {
        h: "Paper, not a person",
        p: "The cutout is a drawing of the work, not a staff portrait and not a film character. Do not switch to a realistic face in clip three for emphasis. Approve each still before motion so the promise does not pick up a new object halfway through. One idea survives all three clips. Keep the figure a cutout of the work, and approve each still before motion so a new object cannot arrive halfway. In the first 3 seconds, viewers see paper and hear the same promise. Throw out a staff portrait or a film character before the file goes up.",
      },
    ],
    example:
      "A tailor's paper-cutout says the shop's real promise about finishing alterations, shows the garment on the board, then repeats the same promise. All three clips share one wooden board. There is one arrow at most, no grey strip, and no film character. The stills are approved before the paper moves. State the real finishing promise, show the garment on the board, then repeat the same words. The first 3 seconds show one hook title and say that promise. Reject a second offer and a film face. One product shape, 15–45 seconds. If a voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro builds this promise as a paper-cutout on one wooden board, one idea across the three clips. Clip 1's first 3 seconds are one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave out any blank grey strip, and approve the stills before motion. The cutout is not a real person. Build the three clips on one board and export after the stills are approved. The first 3 seconds show the hook title, unless on-screen text is off, and say the one promise. Reject a grey strip. The cutout is not a real person. If a voice could be mistaken for one, the caption says it is AI.",
    checks: [
      "Use the same promise in the first and last clip.",
      "Stay on one wooden board.",
      "Approve the stills, and keep the figure a cutout.",
    ],
  },
  {
    id: 35,
    slug: "host-says-the-hours-once",
    title: "The Host Says the Hours Once",
    excerpt:
      "Speak the hours once. Repeat them in the caption so a silent viewer still gets the open and the close.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult at a shop doorway, mouth open as if speaking, a plain wall, one warm lamp, no sign lettering and no text",
    cta: "Say the hours once",
    answer:
      "The host says the hours once. The caption says them again, in the same order, so someone with the sound off still gets the open and the close. Repeating the times out loud makes a short reel feel like an announcement loop. Speak the hours you actually keep, in the first sentence, inside the first 3 seconds. Then stop. One person speaks. Put the caption in the upper middle. Burn it in if the same file will also go to TikTok or Shorts. If the face or the voice is realistic, label it as AI. Say the open and the close once, including a different day only if you keep it, and let the caption do the repeat. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the gallery host at the door and say those hours a single time. Reject a second spoken pass, painted times on the wall, or a platform label that was covered. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it appears.",
    points: [
      {
        h: "One spoken pass",
        p: "Say the open, then the close, once. If a day is different, include that day in the same pass, and do not come back to it. A second verbal repeat is how people lose the thread. Trust the caption to hold the line for the rest of the reel. The picture can stay on the door or the counter. Speak the open, then the close, once, and trust the caption for the rest of the hold on the door. The first 3 seconds show the doorway and say the hours. Reject a verbal loop that makes the short reel feel like an announcement.",
      },
      {
        h: "The caption is the repeat",
        p: "Choose one caption style and type the hours exactly as you spoke them. The upper middle keeps the line off the face and off the bottom buttons. Burned-in captions help when the file goes to TikTok or Shorts, because a platform-only caption will not travel with the download. Silent viewers are the reason for the repeat. Type the hours exactly as you spoke them, in the upper middle, and burn them in if the file will also go to TikTok or Shorts. In the first 3 seconds the silent viewer can already read the times while the voice says them once. Do not post a caption that drifts from the spoken order.",
      },
      {
        h: "No painted hours",
        p: "The wall and any sign shape in the still stay blank. You are not asking the picture to letter the times. Your voice says them once, and your caption types them. A realistic face or voice is labeled as AI in that same caption. Leave the platform label where it appears. Leave the wall and any sign shape blank, and put the AI sentence in that same caption if the face looks real. In the first 3 seconds, viewers hear the hours once and see no painted clock. Throw out lettering you asked the picture to invent before the file goes up.",
      },
    ],
    example:
      "A small gallery host stands at the door and says the Christmas week open and close once, including the shorter day if that is the real schedule. The caption in the upper middle repeats those hours and says the host is AI. The wall has no painted times. The mouth does not say the hours a second time. Stand at the door, say the Christmas week hours once, and let the upper-middle caption repeat them. The first 3 seconds show the host and say the open and the close. Reject a second spoken pass and painted times. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro has one person speak the hours once, then offers 13 caption styles so the caption can repeat them. Export 9:16. If the face or the voice is realistic, label it as AI and leave the platform label in place. Use one caption style as the repeat and export 9:16. The first 3 seconds show one person and say the hours once. Reject a second verbal pass. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Speak the hours once.",
      "Repeat them in the caption.",
      "Label a realistic host as AI.",
    ],
  },
  {
    id: 36,
    slug: "price-spoken-not-a-fake-tag",
    title: "Price Spoken, Not a Fake Tag",
    excerpt:
      "Say the amount you actually charge, out loud. The tag stays blank, with no painted number and no fake mark.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of a tin with a blank hanging tag, the tag unmarked, soft daylight, no letters and no logo",
    cta: "Speak the real amount",
    answer:
      "Say the price you actually charge, out loud, and never paint it on the tag. The tag in the still stays blank. A number generated on cardboard is a fake label, and a number you do not charge is a fake offer. Speak only the amount on your real tag today. Do not round it into a prettier deal for the video, and do not invent a second figure. The shop name goes in the caption, typed by you, along with the amount if you want it readable with the sound off. One product. If a realistic AI voice says the line, label the clip as AI. Say only the amount you actually charge for the tin in the frame, and keep every digit off the tag. Keep one product. A practical reel is 15–45 seconds. The first 3 seconds show the tea tin and the blank hang tag, and they say the real price in the words you use at the counter. Reject a painted numeral, a currency mark, a sale slash, a second item, or a prettier figure you do not charge. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Voice carries the amount",
        p: "The spoken sentence is the price, in the words you use at the counter, for the item in the frame. If you would not charge it, do not say it. The first moments of the reel should already be that product, so the amount has an object. A greeting before the price wastes the opening on people who came for the number. Put the product in frame first, then say the amount, and skip a greeting that wastes the opening on people who came for the number. The first 3 seconds show the tin and say the price you charge. Reject an amount you would not ask for at the counter.",
      },
      {
        h: "The tag stays empty",
        p: "Describe a blank tag and a blank face of the pack. Do not ask the picture for digits, a currency mark, or a sale slash. If any stroke appears, reject the still. You can type the real amount in the caption and proofread it. You cannot proofread paint that only looks like a price. Describe a blank tag, and type the real amount in the caption only after you can proofread it. In the first 3 seconds the card has no strokes and the voice says the price. Do not post paint that only looks like a number.",
      },
      {
        h: "One item, one amount",
        p: "A second product invites a second number and a comparison you may not mean. Hold on the one item while you say what it costs. No invented logo beside the empty tag. The shop name and the spoken price agree with the shop, not with a luxury mark the model added. Hold on the one tin while you say what it costs, with no comparison item beside it. In the first 3 seconds, viewers see one pack and hear one amount. Throw out an invented logo next to the empty tag before the file goes up.",
      },
    ],
    example:
      "A tea seller sets one tin on the counter with a blank hang tag. The spoken line is the amount that tin actually costs in the shop that day. Nothing is painted on the tag. The caption repeats the amount and the shop name. A still that grew a fake numeral on the card is rejected. Set the tin down, leave the hang tag blank, and say the amount that tin costs in the shop that day. The first 3 seconds show the unmarked card and say that real price. Reject a fake numeral. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps one product in frame, with a blank label and no invented logo. Say the real price out loud. The shop name goes in the caption, where you can also type the amount. Export 9:16 so the blank tag is large enough to check. Export 9:16 so the blank tag is large enough to check. The first 3 seconds show the tin and say the amount you charge. Reject painted digits. Type the shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Say only the amount you charge.",
      "Leave the tag blank.",
      "Type the shop name in the caption.",
    ],
  },
  {
    id: 37,
    slug: "table-for-two-adults",
    title: "A Table Set for Two Adults",
    excerpt:
      "Set two places for two adults. Keep the extra chairs out, and leave the room empty of a crowd.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "Still life of a table with two adult place settings, a window beyond, empty of a crowd, warm lamp, no text",
    cta: "Set two places",
    answer:
      "Set the table for two adults. Two place settings, two glasses, and the host if the host is in the frame. Leave extra chairs out of the shot, and leave the room empty of a crowd. A third place changes the picture into a party you did not plan. The locked face, if you show it, is one adult. Approve the still before motion. Life photos can reuse that host at this table. If the face looks real, say the host is AI. The settings stay simple: cloth, plates, and the light you named. Count two plates, two glasses, and two napkins, seat one adult or none, and leave the other place empty. Keep one speaker if a host is in frame. A practical reel is 15–45 seconds. The first 3 seconds show the two adult settings by the window with nobody behind the chairs, and they say the supper point. Reject a third plate, an extra chair, a crowd, or a second generated person. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Two settings, then stop",
        p: "Count the plates, the glasses, and the napkins. Two is the whole table. A third setting at the edge reads as another guest you will then have to explain. Crop the table rather than fill it. The background stays quiet: a wall, a window, or a sideboard, with nobody standing behind the chairs. Crop the table rather than fill it, and keep the background to a wall, a window, or a sideboard. The first 3 seconds show exactly two places and say the supper line. Reject a third setting lingering at the edge before you post.",
      },
      {
        h: "One adult host, or none",
        p: "Either one ordinary adult sits at one of the places, or the reel is a still life of the table. Do not add a second generated person to fill the other chair. An empty place is a place. The face you do show is the locked face. Compare it before the hands move. Label that realistic face as AI. Leave the second chair empty, compare the locked face if you sit at one place, and do not invent a guest. In the first 3 seconds one adult or no one is seated and the voice says the line. Do not post a second generated person filling the place.",
      },
      {
        h: "Same table if you return",
        p: "If this supper is a series, the cloth, the window, and the lamp stay. Change the dish, not the room and not the head. Approve each still before motion. Life photos can reuse the host here. The caption says the host is AI when a real-looking face is in the frame, and the platform label stays visible. Return to the same cloth, window, and lamp if this supper is a series, and change the dish rather than the head. In the first 3 seconds, viewers see the same table and hear the line. Throw out a new room or a new face before the file goes up.",
      },
    ],
    example:
      "A supper host sets two places by the window and sits at one of them. The other plate is empty. No crowd stands behind the table, and no extra chair crowds the frame. The face matches the lock. The still is approved before the host speaks, and the caption says the host is AI. Set two places, sit at one, leave the other plate empty, and approve the face before speaking. The first 3 seconds show the two settings and say the supper point. Reject a crowd behind the table. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro locks one host face for this table and lets you approve the still before motion. Life photos can reuse that adult host. Change clothes only if you mean to. Export 9:16, and label the realistic face as AI. Approve the still of this one adult host, then export 9:16. The first 3 seconds show two places and say the supper line. Reject an extra chair or a second person. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Set exactly two adult places.",
      "Leave the crowd and the extra chairs out.",
      "Label a realistic host as AI.",
    ],
  },
  {
    id: 38,
    slug: "your-own-closed-sign",
    title: "Your Own Closed Sign",
    excerpt:
      "Leave the sign in the still blank. Type the closed hours in the caption, in your own words.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult beside a shop door, a blank board in the window with no marks, warm interior light, no letters",
    cta: "Leave the board blank",
    answer:
      "Your closed sign's words belong in the caption. The board in the still stays blank, with no letters, no hours, and no logo painted on it. You say, once, that you are closed, and you name the day or the hours you actually mean. The first 3 seconds carry that fact. One person speaks beside the door. Type the same words in the upper middle. Burn them in if the file will also go to TikTok or Shorts. If the face or the voice looks real, label it as AI, and leave the platform label visible. Stand at the door with a blank board in the window, say the real close once, and type those same words in the upper middle. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the baker and the unmarked board, and they say the shop is closed and name the day that closure is real. Reject strokes on the board, a greeting before the fact, or a tour of the street. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "A blank board is the prop",
        p: "The shape of a sign can be in the window so the picture reads as a door. The surface stays unmarked. Do not ask the model to letter it. Generated writing will not match your real hours, and it is painful to correct. If a stroke appears, reject the still before the host speaks. Let the sign shape read as a door, then reject the still if a letter appears, before the host speaks. The first 3 seconds show the blank board and say the close. Do not ask the model to letter the hours onto the board before you post.",
      },
      {
        h: "You type the real close",
        p: "The caption states the closed day or the hours you keep, in words you would put on the actual board. The upper middle holds that line, clear of the face. Burned-in captions help when the same file goes to TikTok or Shorts. The spoken line and the typed line match. A greeting does not come first. Type the closed day or the hours you keep, burn the line in if the file will also go to TikTok or Shorts, and match it to the voice. In the first 3 seconds the caption and the mouth agree on the close. Do not post a greeting in front of that fact.",
      },
      {
        h: "One person at the door",
        p: "The host stands where the blank board and the face both fit. One speaker. The first 3 seconds are the close, not a tour of the street. A realistic face or voice is labeled as AI in the caption. The platform label stays where it was placed. The board remains blank in every frame. Frame the blank board and the face together, one speaker, and keep the board blank in every later frame. In the first 3 seconds, viewers see the door and hear the close. Throw out a street tour or a covered platform label before the file goes up.",
      },
    ],
    example:
      "A baker stands at the door with a plain board in the window. The board has no letters. The first sentence says the shop is closed and names the day that closure is real. The caption repeats it in the upper middle and says the host is AI. A still that painted a word on the board is rejected. Hold the plain board in the window, say the real closed day, and reject the still that painted a word. The first 3 seconds show the baker and the blank board and say the close. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro has one person speak the close, with 13 caption styles for the words that would have been on the sign. Export 9:16. If the face or the voice is realistic, label it as AI and leave the platform label in place. Put the words that would have been on the sign into one caption style, then export 9:16. The first 3 seconds show the blank board and say the close. Reject painted letters. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep the sign blank in the still.",
      "Type the real close in the caption.",
      "Label a realistic host as AI.",
    ],
  },
  {
    id: 39,
    slug: "delivery-cutoff-without-panic",
    title: "Delivery Cutoff without Panic",
    excerpt:
      "Say the cutoff day, then say what you can still send. Keep the pace calm and the date exact.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult at a packing bench, one open box and one closed plain box, calm face, warm lamp, no text",
    cta: "Say the cutoff calmly",
    answer:
      "Say the delivery cutoff, then say what you can still send. The date is the hook, and the next sentence is the calm part: which orders still go out after that day, if any do. Use the day you actually stop, and the rule you actually keep. Do not raise the pace, stack three warnings, or invent a nearer day to create urgency. One person speaks. The first 3 seconds carry the date. If the face or the voice looks real, label the clip as AI and leave the platform label in place. Say the cutoff day you actually stop, then say what still ships, in an even pace at the bench. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the print-shop host with one open box and one closed plain box, and they say the dispatch day. Reject a nearer invented day, three stacked warnings, a wide-eyed performance, or dates painted on the cartons. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays in place.",
    points: [
      {
        h: "Date first, remainder second",
        p: "The first sentence is the cutoff day. The second sentence is what still ships, in plain words: local pickup, a later dispatch, or nothing further. If nothing ships after the day, say that once, without a drumbeat. People can act on a clear rule. They cannot act on a rush. Give the first sentence to the cutoff and the second to the remainder: local pickup, a later dispatch, or nothing further. The first 3 seconds show the bench and say the real day. Reject a drumbeat that repeats the warning before you post.",
      },
      {
        h: "A quiet bench",
        p: "One open box and one closed box are enough evidence. The boxes stay free of painted dates and fake marks. The host's face stays steady. A wide-eyed performance reads as panic even when the words are accurate. Speak the way you would speak to someone already at the counter. Keep the boxes blank and the face steady, and speak as you would to someone already at the counter. In the first 3 seconds the boxes have no writing and the voice stays calm. Do not post a panic face or a fake mark on the cartons.",
      },
      {
        h: "One pass, captioned",
        p: "Say the date once, and let the caption repeat the day and what still ships. The upper middle holds the line. One person, no crowd, no second voice. A realistic face or voice is labeled as AI. The platform label stays visible. The rule in the reel matches the rule in the shop. Say the date once, let the caption repeat the day and what still ships, and keep a single voice. In the first 3 seconds, viewers see the quiet bench and hear the cutoff and the remainder. Throw out a crowd, a second voice, or a rule that does not match the shop.",
      },
    ],
    example:
      "A print shop host sits at the bench and says the last day that shop can still dispatch, then says which local pickups remain possible after it. The pace is even. The boxes have no writing. The caption repeats both facts and says the host is AI, because the face looks real. Sit at the bench, say the last dispatch day, then say which local pickups remain, at an even pace. The first 3 seconds show the two plain boxes and say the cutoff. Reject an invented nearer day. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro has one person speak the cutoff and the remainder. Put both in one of 13 caption styles so the date survives with the sound off. Export 9:16. If the face or the voice is realistic, label it as AI. Put the date and the remainder in one caption style and export 9:16. The first 3 seconds show the quiet bench and say the cutoff. Reject a second invented day. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Say the real cutoff day first.",
      "Say what still ships, without a second invented day.",
      "Label a realistic host as AI.",
    ],
  },
  {
    id: 40,
    slug: "thank-you-reel-after-the-rush",
    title: "Thank-You Reel after the Rush",
    excerpt:
      "Thank people for one specific thing, on the same set you used all month. One person, one sentence.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult in a quiet shop corner after the counter is clear, calm expression, one warm lamp, no text",
    cta: "Thank them for one thing",
    answer:
      "After the rush, thank people for one specific thing, on the same set you already used. A specific thank-you names the orders, the patience, or the pickup hour you actually lived. A general holiday wish is not a thank-you. One person speaks. A practical cut is 15–45 seconds, which is long enough for one sentence and a hold on the quiet counter. The first 3 seconds carry the thanks. If the face or the voice looks real, label the clip as AI and leave the platform label in place. Name the specific thing you are thanking people for, return to the counter you used all month, and stop when that sentence is done. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the bookshop host at the cleared table under the same lamp, and they say the thanks for the patience on the title that actually sold out. Reject a general holiday wish, a new backdrop, or a montage of strangers. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Name the thing",
        p: "Say what you are thanking people for, in one sentence: the queue at the door, the late pickup, the sold-out item they waited on. If you cannot name it, you are about to post a greeting. Specific is shorter than a speech. Stop when the sentence is done. Say the queue, the late pickup, or the sold-out item, whichever you lived, and do not continue into a speech. The first 3 seconds show the quiet counter and say that specific thanks. Reject a greeting that never names the thing.",
      },
      {
        h: "Return to the same set",
        p: "Use the counter, the window, or the lamp from the reels that ran during the rush. A new backdrop makes the thanks look like a different shop. One person, no crowd added to suggest a bigger day. The room can be empty. Empty is the truth after close. Use the same window or lamp from the rush reels, and leave the room empty if empty is the truth after close. In the first 3 seconds the set matches the month and the voice says the thanks. Do not post a new shop behind the sentence.",
      },
      {
        h: "Keep the label with the thanks",
        p: "A realistic face or voice is still AI on a thank-you. Say so in the caption, and leave the platform label visible. The caption can repeat the specific line in the upper middle. One caption style. The thanks does not need a second speaker or a montage of strangers. Keep the AI sentence with the thanks if the face looks real, and repeat the specific line in one caption style. In the first 3 seconds, viewers see one person and hear the one thanks. Throw out a second speaker before the file goes up.",
      },
    ],
    example:
      "A bookshop host stands at the same counter used all month, after the table is clear, and thanks buyers for the patience on the sold-out title they actually ran out of. One sentence. The lamp matches the earlier reels. The caption repeats the thanks and says the host is AI. Stand at the same counter after the table is clear, thank buyers for the patience on the sold-out title, and stop. The first 3 seconds show that corner and say the specific thanks. Reject a generic wish. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro has one person speak the thanks on the set you kept. Choose one of 13 caption styles for that specific line, and export 9:16. If the face or the voice is realistic, label it as AI. Choose one caption style for that specific line and export 9:16 from the set you kept. The first 3 seconds show the same counter and say the thanks. Reject a new backdrop. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Thank them for one specific thing.",
      "Use the same set as the rush.",
      "Label a realistic host as AI.",
    ],
  },
  {
    id: 41,
    slug: "restock-reel-same-shelf",
    title: "Restock Reel, Same Shelf",
    excerpt:
      "Lock the camera on the shelf. The goods can change. The angle cannot, and the label stays blank.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of a shop shelf seen square on, one gap where a jar returns, morning light, no labels and no text",
    cta: "Lock the camera",
    answer:
      "A restock reel uses the same shelf and a locked camera. The angle does not drift between the empty gap and the jar that fills it. What changed is the product, not the point of view. One product is the hero of the return. Its label stays blank, with no invented logo. Say the offer you are actually running now that the item is back. The shop name goes in the caption. The first 3 seconds can be the gap, then the filled shelf, and then stop. If a realistic AI voice speaks, label the clip as AI. Tape the floor or note the tripod height, film the gap, then set the tin back without moving the camera. Keep one product. A practical reel is 15–45 seconds. The first 3 seconds show the empty gap and then the same gap with the tin returned, and they say the offer you are running now that it is back. Reject a handheld step forward, a rearranged neighbor row, or a wordmark celebrating the return. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Mark the camera and leave it",
        p: "Tape the floor or note the tripod height before the first frame. The shelf edge hits the same line in both beats. A handheld step forward makes the restock look like a different aisle. If the camera moved, reshoot. Do not try to fix a new angle by cropping the old one into agreement. Lock the shelf edge on the same line in both beats, and reshoot if the camera moved instead of cropping the old angle into agreement. The first 3 seconds show that locked line and say the restock offer. Reject a new aisle before you post.",
      },
      {
        h: "Show the gap, then the item",
        p: "The empty space is the reason for the reel. Then the same space holds the one product. Neighbors stay where they were. Do not rearrange the whole shelf in the same cut, or the viewer cannot see what came back. One hero. The next item is a later reel. Show the gap, then the one product in that gap, and leave every neighbor where it was. In the first 3 seconds the empty space is the reason and the voice is about to name the returning tin. Do not post a whole-shelf rearrange in the same cut.",
      },
      {
        h: "Blank label on the return",
        p: "The jar that returns has a blank label. Do not celebrate the restock with a generated wordmark. Speak the offer, and type the shop name in the caption. Hold the locked angle long enough to compare the two beats. A practical cut stays inside 15–45 seconds. Keep the returning jar's label blank, speak the offer, and hold the angle long enough to compare the two beats. In the first 3 seconds, viewers can see what came back and hear the offer. Throw out a generated wordmark before the file goes up.",
      },
    ],
    example:
      "A spice shop locks the camera square to the shelf, films the gap where the tin sold out, then sets the tin back without moving the tripod. The label is blank. The spoken line is the offer now that the tin is back, and the shop name is typed in the caption. Film the sold-out gap, set the tin back on the same tripod, and leave the label blank. The first 3 seconds show the gap, then the filled spot, and say the offer now that the tin is back. One product, 15–45 seconds. Reject a shifted camera. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps the reel to one product, with a blank label and no invented logo. Say the offer, put the shop name in the caption, and export 9:16. The locked shelf angle is what makes the restock readable. Export 9:16 from the locked shelf. The first 3 seconds show the gap and then the one product, and say the offer. Reject an invented logo. Type the shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Lock the camera before the first frame.",
      "Bring back one product.",
      "Leave the label blank, and type the shop name in the caption.",
    ],
  },
  {
    id: 42,
    slug: "staff-outfit-lock-for-the-week",
    title: "Staff Outfit Lock for the Week",
    excerpt:
      "Keep the same person and the same apron knot all week. Approve the still each time the clothes appear.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a shop apron, the knot visible at the back, face fully visible, soft window light, no text",
    cta: "Lock the apron",
    answer:
      "Lock the staff outfit for the week: the same person, and the apron knot tied the same way, on the same side. A new knot, a new apron color, or a new face makes Tuesday look like a different shop. Lock the face first. The apron is clothes, and clothes are the only thing that should have been chosen on purpose. Approve every still against the first morning before it moves. If the host looks real, say the host is AI. Life photos later in the week reuse this person in this apron. Photograph the apron knot on the left, lock the window-lit face, and compare both every morning before the still moves. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the same person with the knot on the same side, and they say the shop line. Reject a knot that jumped hips, a shinier apron you did not schedule, or a narrowed jaw under a perfect uniform. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Photograph the knot",
        p: "The knot is the continuity object. Show it at the back or the side, in the same place, with the same loops. If a still flips the knot to the other hip, reject it. Describe the apron color in plain words and keep that color. A cleaner, shinier apron is a wardrobe change you did not schedule. Show the loops in the same place, describe the apron color in plain words, and reject a flip to the other hip. The first 3 seconds show that knot and say the shop line. Do not post a cleaner wardrobe change you did not plan.",
      },
      {
        h: "Face first, cloth second",
        p: "Compare eyes, nose, jaw, and hairline with the locked still before you judge the apron. A perfect uniform on a new head is a failed day. Change clothes only when you mean to, and the apron is that change, already decided. Do not also change the hair to match a mood. Compare eyes, nose, jaw, and hairline before you judge the cloth, and do not change the hair to match a mood. In the first 3 seconds the face matches the first morning and the voice says the line. Reject a new head in the right apron.",
      },
      {
        h: "Approve every morning",
        p: "Motion keeps the face and the knot you approved. Check both on a phone. Life photos can reuse this host in this outfit once the still matches. Label the realistic face as AI, and leave the platform label visible. The week should look like one person who came to work. Check face and knot on a phone, then allow motion, and reuse this host in this outfit for a life photo only when both match. In the first 3 seconds, viewers see one person who came to work and hear the shop line. Throw out the morning where the knot and the jaw both drifted.",
      },
    ],
    example:
      "A cafe host locks a window-lit face and a natural apron knot on the left side. Each morning's still is compared with that frame. One day the knot jumped to the right and the jaw narrowed, so that still is rejected. The posted days match, and each caption says the host is AI. Compare each morning with the left-side knot and the locked face, and reject the day the knot jumped right. The first 3 seconds show the apron and the same face and say the shop line. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro locks one host face and lets you change clothes only, which is how the apron stays a decision instead of a new person. Approve stills before motion. Life photos can reuse that host. Export 9:16, and label the realistic face as AI. Treat the apron as the clothes change you already decided, approve the still, then export 9:16. The first 3 seconds show the same knot and say the shop line. Reject a new person. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep the apron knot on the same side.",
      "Match the locked face every morning.",
      "Label the realistic host as AI.",
    ],
  },
  {
    id: 43,
    slug: "glasses-and-fairy-lights",
    title: "Glasses and Fairy Lights",
    excerpt:
      "Fairy lights may leave one reflection in the glasses. The eyes stay visible through both lenses.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult wearing simple glasses, fairy lights behind, one small reflection in the lenses, eyes visible, no text",
    cta: "Keep the eyes visible",
    answer:
      "Glasses and fairy lights can share a frame if the eyes stay visible. One reflection in the lenses is enough, and it should match the string behind the host. A second glare that hides an eye is a failed still. The frames are part of the locked face for this reel. Do not remove them halfway through the week unless you mean a new look, approved again. Approve the still before motion. If the host looks real, say the host is AI, and leave the platform label visible. Keep the thin frames as part of the lock, place the string so each lens gets one small reflection, and approve the still only when both irises show. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the watchmaker's eyes through both lenses and say the shop line. Reject a second glare that hides an eye, two different blobs, or a white disc where a lens should be. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "One reflection, same in both lenses",
        p: "A small bright shape from the fairy lights may sit in each lens, in the same place. Two different blobs mean two light sources, or a broken pair of glasses. If the reflection covers the pupil, move the string in the description or dim it. You are keeping the lights, not sacrificing the eyes. Match the reflection in both lenses, and move or dim the string if it covers a pupil. The first 3 seconds show one shared glint and say the shop line. Reject two light sources pretending to be one pair of glasses before you post.",
      },
      {
        h: "Eyes first",
        p: "You should see both irises. A white lens is a mirror, not eyewear. Check the still at phone size, because a desktop zoom hides a lost eye. The face around the frames stays the locked face: same eyes, same bridge of the nose. Glasses do not excuse a new head. Check both irises at phone size, and compare the eyes and the bridge of the nose with the lock. In the first 3 seconds the eyes are visible and the voice says the line. Do not post a white mirror in place of the eyewear.",
      },
      {
        h: "Lock the frames with the face",
        p: "Treat the frames as part of this outfit lock. A later still that deletes them, or swaps them for sunglasses, is a different host until you approve it as a deliberate change. Life photos reuse the person with the eyes visible. Label the realistic face as AI, and leave the platform label in place. Treat a deleted pair of frames, or a swap to sunglasses, as a new host until you approve it on purpose. In the first 3 seconds, viewers see the same frames and hear the shop line. Throw out a later still that erases the glasses before the file goes up.",
      },
    ],
    example:
      "A watchmaker wears thin glasses beside a short string of lights. Each lens shows one small reflection, and both eyes are easy to see. The face matches the lock, including the frames. A still where one lens turned into a white disc is rejected. The caption says the host is AI. Seat the watchmaker beside the short string, confirm one reflection per lens, and reject the white disc. The first 3 seconds show both eyes and say the shop line. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro locks the face, frames included, and lets you approve the still before motion so the eyes are checked first. Life photos can reuse that host. Change clothes only when you intend to. Export 9:16, and label the realistic face as AI. Check the eyes before motion, frames included, then export 9:16. The first 3 seconds show the glasses with both irises visible and say the shop line. Reject a hidden eye. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep one matching reflection.",
      "Leave both eyes visible.",
      "Match the locked face, and label the host as AI.",
    ],
  },
  {
    id: 44,
    slug: "hair-edges-against-lights",
    title: "Hair Edges against the Lights",
    excerpt:
      "Use the lights as a rim. Hair edges stay sharp against the glow, and the face keeps its own color.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult with hair edges separated by a warm rim of fairy lights, the edges sharp, face a natural color, no text",
    cta: "Separate the hair",
    answer:
      "Fairy lights can rim the hair, and the edges stay sharp. The glow separates the head from the background. It should not melt the hair into a halo that eats the outline. The face keeps its real color, lit by the source you named, while the rim sits on the edge only. Lock the face, including the hairline. Approve the still before motion, at phone size, where a fuzzy edge shows up first. If the host looks real, say the host is AI, and leave the platform label visible. Put the string behind one shoulder, light the face from the window, and approve the still only when the hair outline stays sharp. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show a thin rim on the hair and skin at a real color, and they say the shop line. Reject a rim that has spread across the forehead, a foggy bloom, or a glow that hides the hairline. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Rim the edge, not the cheek",
        p: "The bright line belongs on the hair against the dark or the lights, a thin separation. If the same brightness spreads across the forehead and the nose, the rim has become the key. Name the window or the lamp that actually lights the face, and keep the string behind. You should still know which side is brighter. Keep the bright line on the edge, and name the window or lamp that actually lights the face. The first 3 seconds show that thin separation and say the shop line. Reject a rim that became the key light on the face before you post.",
      },
      {
        h: "Keep the outline sharp",
        p: "Individual edges, or at least a clear silhouette, should survive against the bulbs. A foggy bloom means the lights are too strong or too close in the description. Reject a still where the hair becomes a smear. Motion will not sharpen an edge the still already lost. Ask for an outline that survives against the bulbs, and reject a smear because motion will not sharpen it later. In the first 3 seconds the hair edge is sharp and the voice says the line. Do not post a halo that eats the head.",
      },
      {
        h: "The hairline is part of the lock",
        p: "A new haircut, a new part, or a glow that hides the hairline is a new person. Compare with the reference before you approve. Life photos can reuse this host once the edge is clean. Label the realistic face as AI, and leave the platform label visible. Compare the hairline with the reference, and treat a new part or a hidden hairline as a new person. In the first 3 seconds, viewers see the locked edge and hear the shop line. Throw out the bloomed still before the file goes up.",
      },
    ],
    example:
      "A soap maker stands with a string behind one shoulder. A thin rim traces the hair, the outline stays sharp, and the face is lit by the window at a real skin color. A still where the hair bloomed into the lights is rejected. The caption says the host is AI. Stand with the string behind one shoulder, trace a thin rim, and reject the still where the hair bloomed into the lights. The first 3 seconds show the sharp outline and the window-lit face and say the shop line. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro locks the face, hairline included, and waits for you to approve the still before motion. Life photos can reuse that host. Change clothes only if you mean to. Export 9:16, and label the realistic face as AI. Approve the hairline before motion, then export 9:16. The first 3 seconds show the rim on the edge only and say the shop line. Reject a fuzzy halo. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Keep the rim on the hair edge.",
      "Leave the outline sharp.",
      "Match the locked hairline, and label the host as AI.",
    ],
  },
  {
    id: 45,
    slug: "a-smile-for-a-real-shop",
    title: "A Smile for a Real Shop",
    excerpt:
      "Use the small, uneven smile from the shop. A wide identical grin reads as a stock photo, not as your host.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a real shop, a small uneven smile, window light, natural skin, no text",
    cta: "Keep the shop smile",
    answer:
      "Use the smile that belongs to the shop: small, a little uneven, the kind that shows up when a regular walks in. A wide, identical grin on both sides reads as a stock photo, and it often brings a new face with it. Lock the host first, then ask for that smaller expression. Approve the still before motion, and compare the eyes with the reference. Teeth, if they show, stay a real color. If the host looks real, say the host is AI, and leave the platform label visible. Ask for a slight, uneven smile, compare the eyes with the locked reference, and reject a wide identical grin that brings a new jaw. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show the grocer by the shop window with one corner slightly higher, and they say the shop line. Reject a beaming symmetrical catalog face, a beauty wash, or teeth turned an unreal color. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Ask for a small change",
        p: "Describe a slight smile, not a performance. A closed-mouth lift or a small opening is enough. Words like perfect, beaming, or symmetrical push the face toward a catalog. The eyes should still match the locked still. If the smile replaces the person, reject it. Describe a closed-mouth lift or a small opening, and stop if the smile replaces the person. The first 3 seconds show that small change and say the shop line. Reject the words perfect, beaming, or symmetrical in the description before you generate again.",
      },
      {
        h: "Uneven is believable",
        p: "One corner may lift more than the other. That is a person in a room. A mirror-image grin, with identical creases and a full row of even teeth, is the stock look. Skin keeps pores and a real color. The window or the lamp you already use stays the light. Do not add a beauty wash to sell the smile. Allow one corner to lift more than the other, keep pores, and leave the window or lamp you already use. In the first 3 seconds the grin is uneven and the voice says the line. Do not post a mirror-image row of even teeth.",
      },
      {
        h: "Approve the expression still",
        p: "The mouth you approve is the mouth that will move. Check it on a phone next to the locked face. Life photos can reuse this host with the same small smile. Label the realistic face as AI, and leave the platform label visible. The shop does not need a bigger expression to be welcoming. Approve the mouth on a phone beside the lock, and reuse that small smile in a life photo of the same host. In the first 3 seconds, viewers see the shop face and hear the line. Throw out the wide grin that also changed the jaw.",
      },
    ],
    example:
      "A grocer stands by the shop window with a small smile, one corner slightly higher, eyes matching the locked reference. The skin is not smoothed. A version with a wide identical grin is rejected because the jaw also changed. The approved still moves, and the caption says the host is AI. Stand at the window, keep the small uneven smile, and reject the version with the identical grin. The first 3 seconds show the grocer's real expression and say the shop line. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro locks the face so the smile is a change of expression, not a new head. Approve the still before motion. Life photos can reuse that host. Export 9:16, and label the realistic face as AI. Treat the smile as a change of expression on the locked face, then export 9:16. The first 3 seconds show that small smile and say the shop line. Reject a stock-photo grin. If the face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep the smile small and uneven.",
      "Match the eyes to the locked face.",
      "Label the realistic host as AI.",
    ],
  },
  {
    id: 46,
    slug: "one-prop-in-one-prop-out",
    title: "One Prop In, One Prop Out",
    excerpt:
      "On a paper-cutout, one object enters and one object leaves. The wooden board stays, with a single arrow at most.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "Paper-cutout shapes on one dark wooden board, one cup lifted as if moving in and one box set aside, white edges, no letters",
    cta: "Move one prop",
    answer:
      "One prop comes in, and one prop goes out. That is the whole motion of this paper-cutout. The wooden board stays. The entering piece and the leaving piece are the idea, so do not also change the background, the style, or the topic. The cutout is paper, not a real person, and not a character from a film. Clip 1 opens with one big hook title in the spoken language unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before anything slides. Name the cup that enters and the box that leaves, slide the box off the same wooden board, and approve the start and the end before anything moves. Keep the swap to the incoming cup and the outgoing box, with no third object. A practical reel is 15–45 seconds. The first 3 seconds show the hook title of the swap, unless on-screen text is off, and they say the cup is in and the box is out. Reject three moving pieces, a blank grey strip, a second arrow, or a realistic face invented in between. If a voice could be mistaken for a real person, the caption must say it is AI. The cutout is paper.",
    points: [
      {
        h: "Two pieces, opposite jobs",
        p: "Name the piece that enters and the piece that leaves before you draw them. They should be different objects so the swap is visible: a cup in, a box out. If both stay on the board, nothing happened. If three pieces move, the eye cannot tell which change mattered. Pick two different objects so the swap is visible, and do not leave both sitting as if nothing happened. The first 3 seconds show the outgoing box and say what is about to replace it. Reject a third piece moving in the same beat.",
      },
      {
        h: "Slide, do not cover",
        p: "The leaving piece slides off the board. A blank grey strip laid over it is not a removal, and it breaks the craft. One arrow may point at the piece that is arriving. A second arrow on the piece that is leaving is already too many. The grain of the wood stays identical underneath. Slide the leaving piece off the grain, and point one arrow at the cup that is arriving. In the first 3 seconds the wood stays identical and the voice says the swap. Do not post a grey strip laid over the box, or a second arrow on the piece that is leaving.",
      },
      {
        h: "Approve the start and the end",
        p: "The start still shows the old prop. The end still shows the new one, on the same board. Approve both before motion so the in-between cannot invent a third object or a realistic face. The hook title states the swap in the spoken language, unless on-screen text is off. One idea only. Approve the start still and the end still before motion, with the hook title in the spoken language unless on-screen text is off. In the first 3 seconds, viewers see one board and hear the one idea. Throw out a third object or a film face before the file goes up.",
      },
    ],
    example:
      "A cafe explainer, drawn as paper, starts with a closed box on the wooden board and ends with a cup in its place. The box slides off. One arrow points at the cup. There is no grey strip and no film character. The hook title names the swap in English, and both stills are approved first. Start with the closed box, slide it off, and end with the cup, one arrow on the cup. The first 3 seconds show the hook title in English and say the swap. Reject a grey strip and a film character. 15–45 seconds, one lesson. If a voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro builds this as a paper-cutout on one wooden board and one idea. Clip 1's first 3 seconds are one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave out any blank grey strip, and approve the stills before motion. The cutout is not a real person. Export after both stills are approved on the same board. The first 3 seconds show the hook title, unless on-screen text is off, and say the prop swap. Reject a grey strip. The cutout is not a real person. If a voice could be mistaken for one, the caption says it is AI.",
    checks: [
      "Move one prop in and one prop out.",
      "Stay on the same wooden board.",
      "Use no blank grey strip, and approve the stills.",
    ],
  },
  {
    id: 47,
    slug: "packing-a-gift-in-four-steps",
    title: "Packing a Gift in Four Steps",
    excerpt:
      "Show four original cartoon steps for packing a gift. No famous character, and no extra idea in the last step.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "Cartoon doodle steps of wrapping a plain box on a whiteboard, simple original shapes, no letters and no characters",
    cta: "Draw the four wraps",
    answer:
      "Pack a gift in four cartoon steps, and keep every step original. Place the box, fold the paper, hold the fold, and finish with one bow. That is one idea. Do not bring in a character from a film, a studio, or a famous cartoon to hold the paper. The doodle is not a real person. Clip 1's first 3 seconds are one big hook title in the spoken language unless on-screen text is off. At most one arrow. No blank grey strip. Approve the four stills before they move. Set one plain box on the paper, fold one side, hold that fold, and finish with one bow, approving each still before the drawing moves. Keep one product. A practical reel is 15–45 seconds. The first 3 seconds show the hook title of the packing task, unless on-screen text is off, and they say those four steps in order. Reject a second gift in the last frame, a character from a film, a famous outline, or a blank grey strip. If a face or voice could be mistaken for a real person, the caption must say it is AI. The doodle is not a person.",
    points: [
      {
        h: "Four steps, one box",
        p: "The same plain box travels through all four drawings. Step one sets it on the paper. Step two folds one side. Step three holds that fold. Step four adds one bow. A second gift in the last frame is a new idea. Stay on one whiteboard so the hands, if you draw simple shapes, belong to the same lesson. Carry the same book-shaped box through set-down, fold, hold, and bow, on one whiteboard. The first 3 seconds show step one and say the packing task. Reject a skipped fold that lets the bow appear too early, before you post.",
      },
      {
        h: "Original shapes only",
        p: "Paper, box, and bow are enough. If a figure helps, it is a faceless shape you invented, not a character anyone would recognize from a film. The doodle is not staff and not a portrait. A famous outline is a copy even when you only meant the pose. If you need a figure, invent a faceless shape, and keep paper, box, and bow as the whole cast. In the first 3 seconds the shapes are original and the voice says the task. Do not post a character anyone would recognize from a film.",
      },
      {
        h: "Clean board, approved stills",
        p: "One arrow may point at the fold that matters. A blank grey strip over an earlier step is the wrong way to advance. The hook title says what the reel is, in the spoken language, unless on-screen text is off. Approve each still in order before the drawing moves, so the bow does not appear before the fold. Point one arrow at the fold that matters, and approve the stills in order so the bow cannot arrive first. In the first 3 seconds, viewers see the plain box and hear the step. Throw out a grey strip over an earlier step before the file goes up.",
      },
    ],
    example:
      "A bookshop draws four whiteboard steps for packing one plain book-shaped box: set down, fold, hold, one bow. The shapes are original and faceless. The hook title is the task in English. There is a single arrow at the fold, no grey strip, and no character from a film. The stills are approved first. Draw set down, fold, hold, and one bow for the bookshop box, with a single arrow at the fold. The first 3 seconds show the hook title in English and say the packing task. Reject a film character. One product, 15–45 seconds. If a voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro teaches the four steps as a cartoon doodle, one idea, with no filmed host. Clip 1's first 3 seconds are one big hook title in the spoken language, unless on-screen text is off. Keep at most one arrow, skip any blank grey strip, and approve the stills before motion. The doodle is not a real person. Teach the four steps with no filmed host, and export after the stills are approved in order. The first 3 seconds show the hook title, unless on-screen text is off, and say the wrap. Reject a copied character or a grey strip. If a face or voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Keep four steps on one box.",
      "Use original shapes only.",
      "Approve the stills before they move.",
    ],
  },
  {
    id: 48,
    slug: "talking-from-the-counter",
    title: "Talking from the Counter",
    excerpt:
      "Stand so the counter is in frame, with the product beside you. One person speaks the offer from that spot.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult behind a shop counter with one plain tin beside them, both in frame, warm lamp, no text",
    cta: "Speak from the counter",
    answer:
      "Talk from the counter, with the counter in frame and the product beside the host. A face floating in a blurred room could be anywhere. The counter is how the shop enters the reel. One person speaks. The product is the one you are talking about, close enough to recognize, in the same light as the face. The first 3 seconds carry the offer, the hours, or the date. If the same file will also go to TikTok or Shorts, burn the caption in. If the face or the voice is realistic, label it as AI. Include the counter edge in the lower frame, set one tin at elbow height clear of the mouth, and say the offer from that spot. Keep one speaker and one product. A practical reel is 15–45 seconds. The first 3 seconds show the tea seller behind the counter with the tin in the same light as the face, and they say the offer the shop is running. Reject a floating portrait, a generated logo on the tin, or a close-up that loses the counter. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays where it appears.",
    points: [
      {
        h: "Include the counter edge",
        p: "The edge of the counter should cross the lower frame so the host is clearly behind it. Cropping it out turns the shot into a portrait. You do not need the whole shop. You need the surface the product sits on, and the person who can reach it. One lamp or the window, named, lights both. Cross the lower frame with the counter edge, and name the lamp or the window that lights both the face and the tin. The first 3 seconds show that surface and say the offer. Reject a crop that turns the shot into a portrait with no shop.",
      },
      {
        h: "The product stays beside the host",
        p: "Place the item on the counter, on the side that does not cover the mouth. It is evidence for the sentence, not a second subject with its own story. One product. A blank face of the pack is safer than a generated logo. The words, including the shop name, live in the caption. Keep the pack blank and the item as evidence, not a second story, and put the shop name in the caption. In the first 3 seconds the tin sits beside the host and the voice says the offer. Do not post a generated logo on the tin.",
      },
      {
        h: "One voice, labeled if real",
        p: "One person speaks from that spot for the whole reel. A cut to a close-up that loses the counter also loses the shop. Keep the caption in the upper middle, burned in if the file will travel to TikTok or Shorts. A realistic face or voice is labeled as AI. Leave the platform label where it appears. Stay at the counter for the whole reel, burn the caption in the upper middle if the file will travel to TikTok or Shorts, and leave the platform label visible. In the first 3 seconds, viewers see the counter and hear the offer. Throw out a cut that loses the shop.",
      },
    ],
    example:
      "A tea seller stands behind the counter with one tin at elbow height, clear of the mouth. The first sentence is the offer the shop is running. The counter edge stays in frame the whole time. The caption repeats the offer, names the shop, and says the host is AI. Stand behind the counter, keep the tin clear of the mouth, and say the offer with the edge still in frame. The first 3 seconds show the seller and the tin and say the offer. Reject a logo on the pack. One speaker, one product, 15–45 seconds. If the face looks real, the caption says the host is AI.",
    bridge:
      "Scro has one person speak from this counter, with 13 caption styles for the line beside the product. Export 9:16 so the face, the counter, and the item can share a vertical frame. Label a realistic face or voice as AI. Export 9:16 so the face, the counter, and the item share the vertical frame. The first 3 seconds show the counter and say the offer. Reject a portrait that lost the shop. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Keep the counter in frame.",
      "Set one product beside the host.",
      "Label a realistic face or voice as AI.",
    ],
  },
  {
    id: 49,
    slug: "wide-then-the-product",
    title: "Wide Shot, Then the Product",
    excerpt:
      "Two beats only: a wide shot of the place, then the product. Say the offer on the second beat and stop.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "A shop table with one skillet centered and the surrounding wood surface visible, daylight, no text and no logo",
    cta: "Cut wide, then close",
    answer:
      "Use two beats only. The first is a wide shot of the place. The second is the product. Then stop. A third beat, a story, or a second item turns a clear reel into a tour. A reel can run from 3 seconds to 3 minutes, and a practical cut for these two beats is 15–45 seconds. The first 3 seconds can be the wide shot if the place is the way in, but the product and the offer have to arrive before the cut feels like a room. One product, blank label, no invented logo. Say the offer you are running. The shop name goes in the caption. Open on the wood table wide enough to know the shop, cut once to the skillet, say the offer on that close view, and stop. Keep one product. A practical reel is 15–45 seconds. The first 3 seconds show the wide surface with no crowd, and the offer is said as soon as the blank skillet fills the second beat. Reject a third shot, a second item, an invented logo, or a thank-you pan after the offer. If the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "The wide shot names the place",
        p: "Show enough of the table, the counter, or the window to know this is your shop, and no more. People, crowds, and extra products stay out. The wide beat is orientation. It does not carry a second offer. If the wide shot already needs an explanation, it is too busy. Simplify the table before you film. Show the table, the counter, or the window, and clear extra products before you film if the wide shot already needs an explanation. The first 3 seconds show the place and do not say a second offer. Reject a busy table you did not simplify.",
      },
      {
        h: "The second beat is the product",
        p: "Move closer to the one item. The label stays blank, and nothing on it is an invented logo. This is where the offer is spoken, in the words you use in the shop. Hold until the object is obvious. Do not cut away to a detail of the room, a tool, or another product. Two beats means the next cut is the end. Move closer to the one skillet, leave the label area blank, and hold until the object is obvious. In the first 3 seconds the second beat arrives: viewers see the pan and hear the offer you use in the shop. Do not post a cut away to a tool or another product.",
      },
      {
        h: "Stop when the offer is said",
        p: "After the product and the offer, end. A thank-you, a pan, or a third angle is a new reel. Type the shop name in the caption, in the upper middle if you add words on the picture. If a realistic AI voice speaks the offer, label the clip as AI. The wide shot and the close-up should share the same light. End when the offer is said, and keep the wide shot and the close-up in the same daylight. Before you post, the first 3 seconds show the place, and the line on the product has said the offer. Throw out a third angle before you post.",
      },
    ],
    example:
      "A cookware shop opens on the wood table by the window, wide enough to see the surface, then cuts to one skillet. The skillet's label area is blank. The spoken offer is the one the shop is running, and it lands on the close view. The shop name is typed in the caption. There is no third shot. Open on the wood table by the window, cut to the one skillet, and say the offer on the close view. The first 3 seconds show the wide surface, then the blank pan, and say the offer the shop is running. Reject a third shot. One product, 15–45 seconds. If the voice could pass for a real person, the caption says it is AI.",
    bridge:
      "Scro keeps the reel to one product, with a blank label and no invented logo. Say the offer on the product beat, put the shop name in the caption, and export 9:16. Two beats are the whole cut. Export 9:16 after two beats and no more. The first 3 seconds show the place, then the product, and say the offer on the close view. Reject an invented logo and a third angle. Type the shop name in the caption. If the voice could be mistaken for a real person, the caption says it is AI.",
    checks: [
      "Shoot a wide view, then the product.",
      "Stop after the second beat.",
      "Leave the label blank, and say the real offer.",
    ],
  },
  {
    id: 50,
    slug: "no-celebrity-christmas-face",
    title: "No Celebrity Christmas Face",
    excerpt:
      "Use the locked host only. Do not ask for a famous face, a singer, or a lookalike in a Christmas knit.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "Close portrait of one ordinary adult, an everyday face, plain knit, soft window light, no famous likeness and no text",
    cta: "Use your locked host",
    answer:
      "The Christmas face is the host you locked, and only that host. Do not ask for a famous actor, a singer, a well-known presenter, or someone who looks like them. A lookalike is still someone else's face, even in a plain knit and even when you meant it as a joke. Describe your own host: the eyes, the hair, the clothes you already approved. Approve the still against that reference before it moves. If the face looks real, say the host is AI, and leave the platform label visible. Describe the host you locked, the hair and the plain wool you already approved, and compare eyes, nose, jaw, and hairline before the still moves. Keep one speaker. A practical reel is 15–45 seconds. The first 3 seconds show that ordinary face by the shop window, and they say the shop line. Reject a famous name, a role, a lookalike, or the phrase that asks for the style of a public person. If the face or the voice could be mistaken for a real person, the caption must say it is AI, and the platform label stays visible.",
    points: [
      {
        h: "Describe your host, not a public one",
        p: "Use the reference you locked: the hair, the face you already approved, and the knit. Do not type a famous name, a role, or the phrase 'in the style of' a public person. The model will try to oblige, and the still will not be yours. If a face arrives that you recognize from a screen, reject it. Type your own reference and nobody else's, and reject a face you recognize from a screen. The first 3 seconds show the locked host and say the shop line. Do not post a still that arrived because a public name was in the prompt.",
      },
      {
        h: "Compare before you fall for the picture",
        p: "A flattering still that is not your host is a failed still. Put it beside the locked face and check the eyes, the nose, the jaw, and the hairline. Clothes can change. The head cannot drift toward someone famous because the lighting got more dramatic. Approve only the match. Put the flattering still beside the lock before you fall for it, and allow clothes to change while the head stays. In the first 3 seconds the eyes match the October reference and the voice says the line. Reject a drift toward a well-known face when the light got more dramatic.",
      },
      {
        h: "Label the host you actually use",
        p: "The realistic face you keep is AI, and the caption says so. Leave the platform label where it appears. Life photos reuse this same locked host, not a new famous one in the same sweater. One person, one identity, for the whole Christmas run. Say the host is AI in the caption, leave the platform label where it appears, and reuse this same locked host in life photos. In the first 3 seconds, viewers see one identity and hear the shop line. Throw out a famous face in the same sweater before the file goes up.",
      },
    ],
    example:
      "A yarn shop posts the host it locked in October, in a plain wool knit by the shop window. The prompt names that person and the sweater, and it names nobody famous. A still that drifted toward a well-known face is rejected. The approved caption says the host is AI. Post the October host in the plain wool, name that person and the sweater, and reject the still that drifted toward a well-known face. The first 3 seconds show the locked ordinary face and say the shop line. One speaker, 15–45 seconds. If the face looks real, the caption says the host is AI, and the platform label stays in place.",
    bridge:
      "Scro locks one host face and does not need a famous one. Change clothes only, approve the still before motion, and reuse that host in life photos. Export 9:16. If the face looks real, say it is AI, and leave the platform label in place. Approve the still against the locked host, then export 9:16. The first 3 seconds show that face and say the shop line. Reject any famous or lookalike face. If the face or voice could be mistaken for a real person, the caption says it is AI, and the platform label stays put.",
    checks: [
      "Use only the locked host.",
      "Reject any famous or lookalike face.",
      "Label the realistic host as AI.",
    ],
  },
];
