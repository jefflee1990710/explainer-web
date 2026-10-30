import type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";

const explain = ["Christmas", "AI Video", "Explainer"] as string[];
const host = ["Christmas", "AI Video", "Talking Head"] as string[];
const product = ["Christmas", "AI Video", "Product Promo"] as string[];
const face = ["Christmas", "AI Video", "AI Influencer"] as string[];

// Christmas production guides 51–75.
export const SPECS_C: SeasonGuideSpec[] = [
  {
    id: 51,
    slug: "original-outfit-not-a-film",
    title: "An Original Outfit, Not a Film",
    excerpt:
      "Name the cloth and the color. A film costume title pulls the still toward a poster the shop does not own.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a charcoal corduroy jacket and a cream scarf, face visible, small wool shop, natural window light, no costume trim and no text",
    cta: "Lock an original outfit",
    answer:
      "Describe the cloth and the color, and leave every film costume name out of the prompt. Lena hosts a small wool shop, and the outfit she can post is one she could already lift off a hanger: charcoal corduroy, a cream ribbed scarf, and plain brown buttons. Those words give the still a surface you can check. A costume title gives the generator a poster, a crest, or a cut she does not own. If the frame comes back with trim you never described, reject it while it is still a picture. The face stays the locked host. A realistic face is labeled as AI when the reel goes up. The first three seconds can show the jacket, and the practical cut for the post sits between fifteen and forty-five seconds. Take the cloth still in this order: write charcoal corduroy, cream rib, and brown buttons; generate Lena in the wool shop; compare the weave with a hanger she could lift; allow motion only after the buttons and the jaw match. The first three seconds show that jacket and the cream scarf while she says the scarf is the cream rib already on the table. Before you post, reject a crest, theatrical trim, or a hairline that is not the lock. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "Name the weave and the dye",
        p: "Write charcoal corduroy, cream rib, and brown buttons before you write anything about the season. Lena's shop already has those textures on the table, so the still has a real reference. A single famous wardrobe name replaces that reference with someone else's design. If you cannot point to the cloth in the sentence, the prompt is not ready. Name the weave and the dye before any seasonal word, then generate the still, then check the cloth against the table, and only then start motion. The first three seconds show charcoal corduroy and cream rib while Lena says this scarf is already on the table. Reject, before posting, a frame that swapped the shop cloth for a costume fabric you cannot point to.",
      },
      {
        h: "Reject a costume that arrived",
        p: "Compare the still with the sentence, not with a memory of a poster. A crest on the chest, braiding you did not ask for, or a hat from a show means the frame missed. Regenerate from the cloth words. Do not keep a pretty frame that missed and hope the moving clip will turn it back into her jacket. Put the written sentence beside the still, check the chest, the collar, and the hat line, and stop before motion if any of those miss. The opening three seconds show plain brown buttons and the cream scarf, and she says the jacket is the one off her own hanger. The still to reject before posting wears a crest, braiding, or a theatrical hat.",
      },
      {
        h: "Keep the locked face in the cloth",
        p: "The jacket can change later only as clothes. The hairline and the jaw stay Lena's. A new nose that arrived with the corduroy is a new person, and the wool shop then has two hosts. Label the realistic face as AI on the post. The platform's own disclosure stays where the app puts it. Confirm the hairline and the jaw, keep the corduroy as clothes on that same head, approve the still, and only then export. The first three seconds show Lena's locked face above the jacket while she says the outfit is hers. Before you post, reject a new nose that arrived with the cloth, and keep the caption saying the face is AI.",
      },
    ],
    example:
      "Lena's wool shop on Peel Street is the concrete case. The prompt says charcoal corduroy, a cream ribbed scarf, and brown buttons, with her locked face. The approved still shows that jacket and that face beside a folded stack of knit. A second still arrived with a crest and theatrical trim. It was rejected before motion. The caption says the host is AI. On Peel Street the order is the hanger, the still, the face check, then motion. The first three seconds show the charcoal jacket beside the folded knit while Lena says the cream scarf is the one on the table today. Reject the crest frame before posting. The caption says the host is AI, and the cut stays within fifteen to forty-five seconds.",
    bridge:
      "Scro locks one host face, Lena's, and a wardrobe change changes clothes only, so the corduroy does not bring a new head. Approve the stills before motion. Life photos reuse that host. Export the reel at 9:16. Lock Lena's face, approve the corduroy still, then export the vertical file, in that order. The first three seconds show the charcoal jacket and cream scarf while she says the scarf is the one on the table. A still whose face drifted, or whose trim you never described, is the one you reject before posting. The caption says the face is AI.",
    checks: [
      "The prompt names cloth and color.",
      "No film costume name is in the prompt.",
      "The face still matches the locked host.",
    ],
  },
  {
    id: 52,
    slug: "red-coat-is-your-coat",
    title: "A Red Coat Is Your Coat",
    excerpt:
      "A plain red wool coat stays on the locked host. Costume fur, a sack, or a theatrical beard means the coat left her.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult wearing a plain red wool coat, face fully visible, standing in a small shop, soft window light, no costume trim and no text",
    cta: "Keep the coat on your host",
    answer:
      "The red coat belongs to the locked host. It is Lena's plain wool coat, the one that already hangs in her shop, and it is not a mascot uniform. Ask for red wool, a simple collar, and her face visible. Leave costume fur, a sack, and a theatrical beard out of the sentence. Those extras turn a garment she owns into a character the shop does not employ. If they show up, reject the still. The coat can be the wardrobe change. The face cannot change with it. A realistic face is labeled as AI. The disclosure stays on the post. Build the coat still in this order: start from the red wool already on Lena's hanger; ask for a simple collar and a visible face; check both eyes and the jaw; allow motion only when a regular customer would still know her. The first three seconds show the plain red wool coat while she says the coat is the plain wool one from her own hanger. Before you post, reject costume fur, a sack, or a theatrical beard. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "Start from her hanger",
        p: "Describe the coat she already owns: plain red wool, simple collar, buttons you could buy in a notions tin. Lena's locked face sits above that collar with the hairline unchanged. If the prompt starts from a mascot instead of the hanger, the still will chase the mascot. The shop post then features a character, not the host. Open from the hanger, then describe plain red wool and a simple collar, then place the locked face above that collar, and only then generate motion. The first three seconds show the red coat and the buttons while Lena says the coat is the one that already hangs in the shop. Reject, before posting, a still that began as a mascot and hid her jaw.",
      },
      {
        h: "Keep the face out of the costume",
        p: "The collar can cover a little of the neck and must not swallow the jaw. Both eyes stay readable. A hood that hides the hairline removes the lock you are trying to keep. Approve only the frame where a regular customer of the wool shop would still recognize Lena under the red wool. Check the collar, then the jaw, then both eyes, and approve only when the hairline is still in view. The opening three seconds show Lena's face above the simple collar while she says the red wool is her coat. Before you post, reject a hood that swallows the hairline or fur that covers the jaw.",
      },
      {
        h: "Use the coat as clothes",
        p: "A later still may change clothes only, and this coat is that change. Life photos of the same week should still be Lena, whether she is in the coat or back in the corduroy. A new jaw that arrived with the red dye is a failed still. Label the realistic face as AI and leave the platform disclosure in place. Treat the red wool as a clothes change on the locked face, compare a later still with the earlier shop week, and export only the match. The first three seconds show the same jaw in the red coat while she says she is still the wool-shop host. Reject, before posting, a new jaw that arrived with the dye, and say in the caption that the face is AI.",
      },
    ],
    example:
      "Lena's wool shop uses her own red wool coat for the week of posts. The prompt names plain red wool and a simple collar, plus the locked face. The approved still is that coat in the shop doorway, eyes clear. Another frame added costume fur and a sack. That frame never moved. The caption labels the host as AI. The week's order is hanger, prompt, eye check, then motion. The first three seconds show Lena in the doorway in plain red wool while she says the coat is hers. The frame with costume fur and a sack is the one you reject before posting. The caption says the host is AI.",
    bridge:
      "Scro locks one host face and lets a wardrobe change change clothes only, so the red wool stays a coat on Lena. Approve the stills before motion. Life photos reuse that host. Export at 9:16. Keep the lock, change clothes only, approve the red-wool still, then export, in that order. The first three seconds show the plain coat on Lena while she says it is the shop coat. Reject, before posting, costume fur, a sack, or a beard, and write that the face is AI.",
    checks: [
      "The coat is plain red wool.",
      "Eyes and jaw still match the lock.",
      "Costume extras are absent.",
    ],
  },
  {
    id: 53,
    slug: "wooden-table-not-a-mall",
    title: "A Wooden Table, Not a Mall",
    excerpt:
      "Keep the product on one wooden table. A mall atrium, a crowd, or a second room is a different film.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label on a single wooden table, one window, one shadow, no crowd and no text",
    cta: "Stay on one wooden table",
    answer:
      "The set stays one wooden table. Hearth Bakery's biscuit tin sits on the baker's table, with the window they actually have and one shadow under the tin. A mall atrium, a crowd, and a second room are a different film, and they pull the tin away from the shop that sells it. The reel has one product. The label on the tin stays blank, with no invented logo. The offer is spoken. The shop name goes in the caption. A practical cut runs fifteen to forty-five seconds, and the first three seconds already show the tin on that wood. Set the bakery still in this order: choose the one wooden table by the window; place a single biscuit tin on it; confirm the blank label and one shadow; then speak the offer over that same wood. The first three seconds show the tin on the table while the line says the tins stay on the counter until closing at four. Before you post, reject a mall atrium, a crowd, or a second room. One product, fifteen to forty-five seconds, and if the voice sounds like a real person the caption says it is AI.",
    points: [
      {
        h: "Name the one table",
        p: "Write the baker's wooden table, the window side, and the tin. Hearth Bakery does not need a food court, an escalator, or a decorated hall. Those places add people and signs, and signs become fake lettering on a label that was supposed to stay blank. If you cannot point to one tabletop, the set is not decided. Name the baker's table, the window side, and the tin before you generate, then check you can point at one tabletop, and only then record the line. The first three seconds show that wood and the tin while the voice says the tins stay out until four. Reject, before posting, a food court, an escalator, or lettering that appeared on the blank label.",
      },
      {
        h: "Keep later frames on that wood",
        p: "The tin can turn. The table does not become tile, marble, or a street. A cut to a wide mall makes the viewer look for a store that is not in the shot. The spoken offer can be the real one: the tins stay on the counter until the bakery closes at four. The tin itself stays free of printed marks. Keep the later frames on the same wood: turn the tin if you need a new angle, check the grain still matches, and hold the offer there. The opening three seconds show the tin on the wooden table, and the spoken line says the tins stay on the counter until four. Before you post, reject a cut to tile, marble, or a mall.",
      },
      {
        h: "Leave the label empty",
        p: "The tin's label is blank paper. The shop name Hearth Bakery is typed in the caption by you, after export, not painted by the picture. An invented crest on the lid is a reject. One product fills the hero spot. Extra tins in a pile become a second subject and break the set. Leave the label as blank paper, put Hearth Bakery in the caption yourself, and speak the offer only after the lid is clean. The first three seconds show the unmarked tin while the voice says the tins stay out until four. Reject, before posting, an invented crest on the lid or a pile of extra tins in the hero spot.",
      },
    ],
    example:
      "Hearth Bakery places one biscuit tin on the wooden table by the window. The label is blank. The spoken line is that the tins stay on the counter until closing at four. The caption carries the name Hearth Bakery. A still that opened into a mall atrium was discarded. The export is a vertical reel of that same table. Hearth Bakery's order is table, tin, blank label, then the spoken line. The first three seconds show one biscuit tin on the wooden table while the voice says the tins stay on the counter until four. The mall-atrium still is the one you reject before posting. The caption carries the shop name, and a realistic voice is labeled as AI.",
    bridge:
      "Scro keeps this Hearth Bakery promo to one product, the biscuit tin, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export the reel at 9:16. Hold one product, approve the blank label, then export the vertical reel, in that order. The first three seconds show the tin on the wooden table while the offer says the tins stay out until four. Reject a second room or a painted logo before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The tin stays on one wooden table.",
      "The label is blank.",
      "The shop name is only in the caption.",
    ],
  },
  {
    id: 54,
    slug: "ornament-in-front-face-sharp",
    title: "Ornament in Front, Face Sharp",
    excerpt:
      "A glass ornament close to the lens can go soft. Lena's eyes stay sharp. Blur on the face means the still is wrong.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult holding a plain glass ornament close to the lens, ornament softly blurred, eyes sharp, warm shop light, no text",
    cta: "Keep the face sharp",
    answer:
      "Put the ornament in front and keep the face sharp. The glass ball near the lens is allowed to go soft. Lena's eyes, the near eyebrow, and the hairline stay crisp, because the locked face is the subject and the ornament is foreground blur. If the eyes melt and the bauble is the sharpest thing in the frame, the focus plane is backwards and the still is rejected. This is a clothes-and-prop setup on one host, not a new person hiding behind glass. A realistic face is labeled as AI. The platform label stays where the app places it. Set the focus in this order: put one plain glass ornament close to the lens; ask for Lena's eyes, the near eyebrow, and the hairline to stay sharp; check the catchlight in each eye; allow motion only if the glass is the soft plane. The first three seconds show the soft ornament in front of her sharp eyes while she says the eyes stay the subject. Before you post, reject a frame where the ornament is crisp and the eyes are smeared. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "Say what stays sharp",
        p: "The prompt should say the ornament is close and soft, and Lena's eyes are sharp. A request for dreamy blur without that split invites the generator to smear the head. Dreamy belongs on the glass in front of her, not on the iris. You should still be able to see the catchlight in each eye. Write the split in the prompt, sharp eyes and a soft close ornament, then generate, then look for the catchlight before any motion. The first three seconds show that soft glass and Lena's sharp irises while she says the ornament is in front and the face stays clear. Reject, before posting, a dreamy smear across the iris.",
      },
      {
        h: "Check the focus plane",
        p: "The ornament is nearer than the face, so it may be softer than the eyes. The wall behind her may be softer still. If the collar is blurrier than the far wall, or the eye is blurrier than the ornament, the plane is nonsense. Reject that still before any motion. Motion will not invent a sharp iris. Read the planes from front to back: soft ornament, sharp eyes, softer wall, and stop if that order flips. The opening three seconds show the bauble softer than the eyes while Lena says her face is the lock. Before you post, reject a still where the eye is blurrier than the glass, because motion will not invent a sharp iris.",
      },
      {
        h: "Do not let the prop replace her",
        p: "One plain glass ornament is enough. A cluster that covers the mouth removes the host. The face has to match the lock at the hairline and the jaw. Clothes can be the red knit she already wears. Label the realistic face as AI when you post the reel. Keep one ornament below the eyes, match the hairline and the jaw, approve the knit only as clothes, then move. The first three seconds show both eyes clear of the glass while she says she is the same host. Reject, before posting, a cluster that covers the mouth or a new jaw behind the bauble, and label the face as AI.",
      },
    ],
    example:
      "Lena, the wool-shop host, holds one plain glass ornament toward the lens. The ball is soft. Both eyes are sharp, and the hairline matches the lock. A still where the ornament was crisp and the eyes were smeared was rejected. The post is labeled as AI. The shop stays her small wool shop, not a new set. Lena's order is ornament close, eyes sharp, lock check, then motion. The first three seconds show the soft glass ball and her sharp eyes while she says the face is the subject. The still with a crisp ornament and smeared eyes is the one you reject before posting. The caption says the host is AI.",
    bridge:
      "Scro locks one host face so a soft ornament cannot become a new identity. A wardrobe change changes clothes only. Approve the stills before motion. Life photos reuse that host. Export at 9:16. Lock the face, approve the sharp-eye still, then export, in that order. The first three seconds show the soft ornament and Lena's eyes while she says the face stays the host. Reject a smeared iris or a covered mouth before posting. The caption says the face is AI.",
    checks: [
      "The eyes are sharper than the ornament.",
      "The hairline matches the lock.",
      "One ornament does not cover the face.",
    ],
  },
  {
    id: 55,
    slug: "lights-behind-product-front",
    title: "Lights Behind, Product in Front",
    excerpt:
      "Hang the string lights behind the tin and keep the tin in front. Depth comes from that order, not from a glow on the lid.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label in front of warm string lights, lights behind and soft, tin sharp, wooden table, no text",
    cta: "Put the product in front",
    answer:
      "Put the lights behind the product and keep the product in front. At Hearth Bakery the biscuit tin is sharp on the wooden table, and the string lights hang on the wall behind it, soft enough to read as depth. If the lights cross the lid, glare eats the blank label and the tin stops being the hero. One product, one table, lights in the background. The offer is spoken. The shop name stays in the caption. The first three seconds show the tin already in front of those lights, inside a practical cut of fifteen to forty-five seconds. Separate the layers in this order: hang the string lights on the back wall; set the biscuit tin sharp on the wooden table in front; check the blank lid is clearer than the bulbs; then speak the offer. The first three seconds show the tin already in front of the soft lights while the voice says the tins stay on the counter until four. Before you post, reject glare across the lid or bulbs sharper than the tin. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI in the caption.",
    points: [
      {
        h: "Separate the layers",
        p: "Write the order in the prompt: tin on the table, lights on the back wall, space between them. Hearth Bakery's real window can be the source that catches the bulbs. A prompt that only says festive lights will paint sparks across the lid. The lid should stay a quiet blank label you can still see. Write the stacking into the prompt, tin then back-wall lights then the gap between them, generate, and check the lid before you record. The first three seconds show the quiet blank label in front of the bulbs while the voice says the tins stay out until four. Reject, before posting, sparks painted across the lid.",
      },
      {
        h: "Keep the tin sharper than the bulbs",
        p: "The product is the focus plane. Bulbs behind it can bloom a little. Bulbs sharper than the tin, or a flare that wipes the front face of the tin, means the depth is reversed. Reject that still. A second product beside the tin would split the hero, so the table holds one tin. Set the tin as the focus plane, let the bulbs bloom behind it, and compare sharpness before motion. The opening three seconds show a sharp tin and soft lights while the line says the tins stay on the counter until four. Before you post, reject bulbs sharper than the tin, a flare that wipes the front, or a second product beside it.",
      },
      {
        h: "Say the offer out loud",
        p: "The spoken line can be the real counter fact: the tins stay out until the bakery closes at four. That sentence does not need to be printed on the tin. The caption carries Hearth Bakery. An invented mark on the metal is a failed still, even if the lights look pretty behind it. Speak the counter fact only after the lid is clean, type Hearth Bakery in the caption, and export that one setup. The first three seconds show the tin in front of the lights while the voice says the tins stay out until four. Reject, before posting, an invented mark on the metal even when the lights look pretty.",
      },
    ],
    example:
      "Hearth Bakery sets one biscuit tin on the wooden table with a blank label. String lights hang on the back wall, out of focus. The tin is sharp. The host's spoken line says the tins stay on the counter until four. The caption names Hearth Bakery. A frame with bulbs glaring across the lid was not used. The bakery's order is back-wall lights, sharp tin, blank lid, then the line. The first three seconds show the tin in front of the soft bulbs while the voice says the tins stay on the counter until four. The frame with bulbs glaring across the lid is the one you reject before posting. The caption names Hearth Bakery.",
    bridge:
      "Scro keeps the promo to one product, this biscuit tin, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export the vertical reel at 9:16. Approve the layered still, keep one product, then export at 9:16, in that order. The first three seconds show the tin in front of the lights while the offer says the tins stay out until four. Reject glare or a logo on the lid before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The tin is in front of the lights.",
      "The lid is sharper than the bulbs.",
      "The label has no logo.",
    ],
  },
  {
    id: 56,
    slug: "one-shadow-under-the-box",
    title: "One Shadow under the Box",
    excerpt:
      "One contact shadow should touch the box. A gap means the tin is floating. A second shadow means a second light.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label on a wooden table, a single soft contact shadow touching the base, window light from one side, no text",
    cta: "Set one shadow under the box",
    answer:
      "Give the box one contact shadow so it sits on the table. At Hearth Bakery the biscuit tin meets the wood, and the shadow touches the base on the side away from the window. A gap under the tin means it is floating. A second shadow going the other way means a second light. Either fault makes the product look pasted on. Keep one product, a blank label, and no invented logo. The offer is spoken, and the shop name stays in the caption. Fix the shadow in the still. A moving clip will not plant the tin back onto the wood. Plant the tin in this order: name the window as the only light; set the biscuit tin on the wood; check that one soft shadow touches the base and falls away from the window; then speak. The first three seconds show the tin and that touching shadow while the voice says the tins stay on the counter until four. Before you post, reject a bright gap under the base or a second shadow going the other way. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "The shadow has to touch",
        p: "Look at the line where metal or card meets the table. Hearth Bakery's tin should have a soft dark band that starts at that line and falls away from the window. If you can see table grain in a bright gap under the base, the tin is hovering. Regenerate. Do not cover the gap with a prop. Look at the contact line first, regenerate when table grain shows through a bright gap, and only then record the offer. The first three seconds show the shadow starting at the base while the voice says the tins stay out until four. Reject, before posting, a hovering tin. Leave the gap visible until the regenerate fixes it, instead of parking a prop on top.",
      },
      {
        h: "One light, one direction",
        p: "Name the window as the only source. The shadow, the highlight on the lid edge, and the darker side of the tin should agree. Two equal shadows mean two suns. A string light in the back can glow and should not paint a second hard shadow under the tin. One product keeps the shadow easy to read. Agree the highlight, the dark side, and the shadow with the same window, in that order, before you approve. The opening three seconds show one shadow direction under the tin while the line says the tins stay on the counter until four. Before you post, reject two equal shadows or a string light that paints a second hard shadow.",
      },
      {
        h: "Leave the label alone",
        p: "A blank label lets you see whether the shadow is honest. Lettering or a crest would hide the edge you need to judge. The spoken offer is the counter fact: tins stay out until closing at four. Type Hearth Bakery in the caption. The picture does not invent a mark to explain the shadow. Keep the label blank so the edge stays visible, judge the contact shadow, then type the shop name in the caption and speak. The first three seconds show the blank lid and the single shadow while the voice says the tins stay out until four. Reject, before posting, lettering or a crest that hides the edge you need to judge.",
      },
    ],
    example:
      "Hearth Bakery's biscuit tin sits on the wooden table by the side window. One soft shadow touches the base and falls to the right. The label is blank. The spoken line says the tins remain until four, and the caption names the bakery. A still with a bright gap under the tin and a second shadow to the left was rejected. Hearth Bakery's order is window light, tin, contact shadow, then the line. The first three seconds show one soft shadow touching the base and falling to the right while the voice says the tins remain until four. The still with a bright gap and a second shadow to the left is the one you reject before posting.",
    bridge:
      "Scro holds this promo to one product, the tin, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export at 9:16 after the contact shadow agrees with the window. Approve the contact shadow, keep the label blank, then export, in that order. The first three seconds show the tin sitting on the wood while the offer says the tins stay out until four. Reject a floating base or a second light before posting. A realistic voice is labeled as AI in the caption.",
    checks: [
      "The shadow touches the base.",
      "Only one shadow direction is visible.",
      "The label is blank.",
    ],
  },
  {
    id: 57,
    slug: "crumbs-on-a-real-plate",
    title: "Crumbs on a Real Plate",
    excerpt:
      "Show one pastry and the crumbs on a real plate. A printed brand on the icing or the china makes the still a fake packshot.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain mince pie with a few crumbs on a ceramic plate, wooden bakery table, soft window light, one shadow, no logo and no text",
    cta: "Show one pastry on a plate",
    answer:
      "Show one pastry and the crumbs on a real plate, and keep every brand off the food. Hearth Bakery's mince pie sits on a ceramic plate that has already been used: a few crumbs, a dull glaze, one shadow. The pie is the product. A logo on the icing, a word on the rim, or a second pastry turns the plate into an advertisement the bakery did not print. The label area stays blank because there is no label. The offer is spoken. The shop name goes in the caption. The first three seconds are the pie, not a hello. Plate the hero in this order: set one mince pie on a ceramic plate; leave a few real crumbs and one window shadow; check the icing, the sugar, and the rim for marks; then say the offer. The first three seconds show the pie and the crumbs while the voice says the last mince pies are on the plate this afternoon. Before you post, reject a logo on the icing, a word on the rim, or a second pastry. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "One pie, a used plate",
        p: "Crumbs prove the plate is in a bakery, not in a glossy template. Hearth Bakery can show the irregular edge of a real mince pie and a small scatter of pastry on the china. A perfect ring of identical pies is a catalog, and the hero disappears. Keep the second pie for another day. Use a plate that already looks used, keep a single irregular pie, and approve the crumb scatter before you speak. The first three seconds show that pie and the crumbs on the china while the voice says the last pies are on the plate this afternoon. Reject, before posting, a perfect ring of identical pies that turns the plate into a catalog.",
      },
      {
        h: "No mark on the food",
        p: "Icing, sugar, and the rim of the plate stay free of words and crests. If the generator stamps a fake bakery mark into the crust, reject the still. You will type Hearth Bakery in the caption yourself. The picture's job is the pie, the crumbs, and the wood of the table under one window. Inspect the crust, the icing, and the rim, and regenerate the moment a mark appears, before any motion. The opening three seconds show a plain mince pie on the wooden table while the line says the last pies are out this afternoon. Before you post, reject a crest pressed into the icing. The shop name Hearth Bakery goes in the caption.",
      },
      {
        h: "Speak the counter fact",
        p: "The spoken offer is availability, said in a plain sentence: the last mince pies are on the plate this afternoon. That line is not iced onto the pastry. A practical reel of fifteen to forty-five seconds can hold on the plate after the line. One product remains the pie, even if the kitchen behind is soft. Speak the availability line only after the plate is clean of type, hold on the pie, and end on that same plate. The first three seconds show the crumbs and the single pie while the voice says the last mince pies are on the plate this afternoon. Reject, before posting, words iced onto the pastry or a second product in the hero spot.",
      },
    ],
    example:
      "Hearth Bakery sets one mince pie on a ceramic plate with a few real crumbs and one shadow from the window. No word appears on the crust or the rim. The spoken line says the last pies are on the plate this afternoon. The caption names Hearth Bakery. A still with a crest pressed into the icing was thrown out. The order is one pie, real crumbs, a mark check, then the line. The first three seconds show the mince pie on the ceramic plate while the voice says the last pies are on the plate this afternoon. The crest-in-the-icing still is the one you reject before posting. The caption names Hearth Bakery.",
    bridge:
      "Scro keeps the promo to one product, this mince pie, with a blank label and no invented logo on the food. The offer is spoken over the plate. The shop name goes in the caption. Export the reel at 9:16. Keep one product, approve the unmarked plate, then export the vertical reel, in that order. The first three seconds show the pie and the crumbs while the offer says the last pies are out this afternoon. Reject a logo on the food before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "Only one pastry is the hero.",
      "Crumbs sit on a real plate.",
      "No logo appears on the food.",
    ],
  },
  {
    id: 58,
    slug: "rain-on-the-shop-window",
    title: "Rain on the Shop Window",
    excerpt:
      "Rain stays on the shop window. Jun inside stays dry. Water on the hair or the counter means the weather entered the room.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult inside a bakery, dry hair and dry counter, raindrops on the window glass behind, warm indoor light, no text",
    cta: "Keep the rain on the glass",
    answer:
      "Keep the rain on the shop window and keep the inside dry. Jun speaks for Hearth Bakery from behind the counter. Beads of water sit on the glass. His hair, his apron, and the wood in front of him stay dry. If the face is wet, the storm moved into the room and the still is wrong. One person speaks. The first three seconds can be the closing line, with captions in the upper-middle where the reel interface is not covering the words. A realistic face or voice is labeled as AI. Leave any platform label where the app puts it. Split the weather in this order: put the raindrops on the shop window; place Jun a step back with dry hair, a dry apron, and a dry counter; check the mouth is clear; then let him speak. The first three seconds show the wet glass and his dry face while he says the bakery closes at four. Before you post, reject a wet face, a soaked collar, or rain on the counter. One speaker, fifteen to forty-five seconds, captions in the upper-middle, and the caption says the face and voice are AI.",
    points: [
      {
        h: "Put the water on the pane",
        p: "Name the rain as drops on the window, outside the room. Jun is a step back from the glass, apron dry, counter dry. A prompt that only says rainy mood will soak the face and hide the mouth. You need the mouth clear because one person is speaking the bakery line, not posing in a storm. Name the drops as outside the room, keep Jun back from the glass, and approve a clear mouth before the line. The first three seconds show rain on the pane and a dry apron while he says they close at four. Reject, before posting, a still that soaked the face and hid the mouth.",
      },
      {
        h: "Match the light to indoors",
        p: "The face takes the warm shop light. The window can be a cool grey behind him. If the whole frame goes blue and wet, you lost the split the glass is supposed to make. Reject a still where the collar is darkened by rain. The talking clip should not start dripping after you approved a dry frame. Light the face with the warm shop lamp, leave the window a cool grey, and compare those two zones before motion. The opening three seconds show a dry Jun against the rainy glass while he says the bakery closes at four. Before you post, reject a blue wet grade across the collar or a clip that starts dripping after a dry approval.",
      },
      {
        h: "Label the realistic take",
        p: "Jun is one ordinary adult host, generated to look real, so the post is labeled as AI. The caption can carry the spoken line in the upper-middle. Bottom and right stay clear for the reel buttons. The platform disclosure remains on the upload beside the bakery line. Approve the dry still, speak the one line, burn it upper-middle, and write the AI disclosure on the post. The first three seconds show his clear mouth and the rain on the glass while he says they close at four. Reject, before posting, a realistic take whose caption never says the face and voice are AI.",
      },
    ],
    example:
      "Jun stands inside Hearth Bakery with rain on the street window and a dry counter. He says the bakery closes at four. His hair and apron are dry, and the mouth is clear. Captions sit upper-middle. The post is labeled as AI. A still that wetted his face was rejected before he spoke. Jun's order is rain on the glass, dry counter, clear mouth, then the line. The first three seconds show the street window beaded with water and his dry hair while he says the bakery closes at four. The still that wetted his face is the one you reject before posting. The post says the host is AI.",
    bridge:
      "Scro keeps Jun as the one person speaking in this rain reel. The line can use one of 13 caption styles. Export at 9:16. Label a realistic face or voice as AI, and leave the platform disclosure on the post. Approve the dry still, set the line in a caption style, then export at 9:16, in that order. The first three seconds show rain only on the glass while Jun says they close at four. Reject a wet face before posting. The caption says the face and voice are AI, and the platform label stays where the app puts it.",
    checks: [
      "Rain is only on the glass.",
      "Hair, apron, and counter are dry.",
      "The realistic host is labeled as AI.",
    ],
  },
  {
    id: 59,
    slug: "evening-blue-outside-warm-in",
    title: "Evening Blue Outside, Warm Inside",
    excerpt:
      "Evening blue stays outside the glass. The bakery interior stays warm. The two colors split at the window, not across Jun's face.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult inside a bakery at evening, warm lamp light on the face, cool blue light only outside the shop window, no text",
    cta: "Split the color at the window",
    answer:
      "Keep evening blue outside the glass and warm light inside. The two colors split at the window. Jun speaks for Hearth Bakery on the warm side of that line, with a lamp or the shop's practical light on his face. The street beyond the pane can go blue. If his skin, the apron, and the wall all turn the same blue, the grade swallowed the room. One person speaks. A realistic face or voice is labeled as AI. Captions for the line sit in the upper-middle, and the practical length is fifteen to forty-five seconds. Split the color at the glass in this order: keep the street blue outside the window; light Jun's face from the shop lamp; check a white plate on the counter stays pale ceramic; then speak. The first three seconds show his warm face against the blue street while he says they close at four. Before you post, reject a blue wash across both cheeks or an apron that turned the same blue as the street. One speaker, fifteen to forty-five seconds, and the caption says the face and voice are AI.",
    points: [
      {
        h: "Point at the split",
        p: "You should be able to put a finger on the window frame and say blue is outside it and warm is inside it. Jun's face is inside. A white plate on the counter should stay a pale ceramic, not a blue disc. If the plate and the street are the same color, the still has one grade and no glass. Find the window frame, confirm the street side is blue and the room side is warm, and only then approve. The first three seconds show the blue street beyond the pane and the warm counter while Jun says the bakery closes at four. Reject, before posting, a plate and a street that became the same color.",
      },
      {
        h: "Light the face from the room",
        p: "The key on Jun is the shop lamp or the interior side of the window, not the blue street. Eyes stay readable. A blue rim along the far shoulder is enough to admit the evening. A blue wash across both cheeks hides the mouth and makes the talking frame hard to trust. Reject that wash in the still. Key the face from the room, allow only a thin blue rim on the far shoulder, and read the eyes before motion. The opening three seconds show warm skin and a readable mouth while he says they close at four. Before you post, reject a blue wash across both cheeks that hides the mouth.",
      },
      {
        h: "One speaker, labeled",
        p: "Only Jun is in the frame. He can say the bakery closes at four, and one of the caption looks can burn that line in the upper-middle. Because the face and voice are realistic, the post is labeled as AI. Leave the platform's own label where the app places it. Keep only Jun in the frame, burn the hour upper-middle, and label the realistic take. The first three seconds show him on the warm side of the window while he says they close at four. Reject, before posting, a second speaker or a file whose caption never says the face and voice are AI.",
      },
    ],
    example:
      "At dusk, Jun stands inside Hearth Bakery. The street past the window is blue. His face and the wooden counter stay warm. He says they close at four. The caption sits upper-middle, and the post is labeled as AI. A frame that turned his apron blue was not approved. At dusk the order is blue street, warm face, plate check, then the line. The first three seconds show the evening outside the glass and Jun's warm face while he says they close at four. The frame that turned his apron blue is the one you reject before posting. The post says the host is AI.",
    bridge:
      "Scro keeps one person speaking, Jun, with the line in one of 13 caption styles. Export the reel at 9:16. A realistic face or voice is labeled as AI, and the platform label stays on the post. Approve the warm-side still, caption the line, then export, in that order. The first three seconds show Jun inside the warm room while he says they close at four. Reject a blue grade on the face before posting. The caption says the face and voice are AI.",
    checks: [
      "Blue is outside the window.",
      "The face is on the warm side.",
      "The realistic take is labeled as AI.",
    ],
  },
  {
    id: 60,
    slug: "do-not-turn-the-frame-red",
    title: "Do Not Turn the Whole Frame Red",
    excerpt:
      "Red can be a ribbon or a small prop. Skin, the wall, and a white shirt should stay their own colors.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a small shop, neutral wall, one small red ribbon on the table, natural skin tone, no red color cast and no text",
    cta: "Keep red on the prop",
    answer:
      "Use red as a prop, not as a grade. Lena can have one ribbon, one ornament, or the red wool she already wears, while the wall, her skin, and a white card on the table stay neutral. If the whole frame turns red, you no longer have a shop. You have a filter, and the locked face is dyed with it. Reject that still. Clothes may change. The face may not. A realistic face is labeled as AI when you post. The platform disclosure stays where the app puts it. Keep red on one object in this order: place a single ribbon on the table or keep the red wool she already wears; name the warm grey wall; check the white card and the skin against the lock; then move. The first three seconds show the small red ribbon and the neutral wall while Lena says the ribbon is the red in the shot. Before you post, reject a frame that flushed the wall, the card, and her face the same red. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "Give red a small job",
        p: "Name the red object: a ribbon on the table, or the coat that is already hers. Lena's wool shop wall stays warm grey. A prompt that says make it red, or festive red grade, paints the air. The air is not the prop. You should be able to point at the one red thing and then point at a neutral surface. Point at the one red thing, then point at a neutral surface, generate only after both are named, and check them in the still. The first three seconds show the ribbon on the table and the warm grey wall while Lena says red stays on that ribbon. Reject, before posting, a festive grade that painted the air.",
      },
      {
        h: "Keep a neutral reference",
        p: "A white card, a cream scarf, or the wall has to survive. If the card is pink, the grade leaked. Skin that matches the ribbon is the same fault. Compare the still with the locked face before motion. A red cast on the cheeks is not a wardrobe change. It is a failed color. Keep a white card or the cream scarf as the neutral reference, compare it with the lock, and stop if the card went pink. The opening three seconds show the white card still white beside the ribbon while she says her skin matches the locked still. Before you post, reject skin that has taken the ribbon's red.",
      },
      {
        h: "Leave the identity undyed",
        p: "Hairline and jaw still match Lena after the ribbon is added. Life photos later in the week reuse that host, not a red-tinted stranger. Label the realistic face as AI. Export only after the neutral wall and the skin look like the same room you approved on an ordinary day. Match the hairline and the jaw after the ribbon is in, approve the wall, and reuse that host in later life photos. The first three seconds show Lena's own skin tone and the grey wall while she says the room is the ordinary shop. Reject, before posting, a red-tinted stranger, and write that the face is AI.",
      },
    ],
    example:
      "Lena's wool shop keeps a warm grey wall and one red ribbon on the table. Her skin matches the locked still, and a white card on the table stays white. A frame that flushed the wall, the card, and her face the same red was rejected. The post labels the host as AI. The wool shop's order is one ribbon, grey wall, white card, then the face check. The first three seconds show the ribbon on the table and a white card that stays white while Lena says the red is the ribbon. The flushed frame is the one you reject before posting. The caption says the host is AI.",
    bridge:
      "Scro locks one host face, and a wardrobe change changes clothes only, not the color of the room or the skin. Approve the stills before motion. Life photos reuse that host. Export the reel at 9:16. Lock the face, approve a neutral wall, then export, in that order. The first three seconds show the ribbon and Lena's ordinary skin while she says the red stays on the prop. Reject a full-frame red grade before posting. The caption says the face is AI.",
    checks: [
      "Red is limited to a prop or the coat.",
      "A white card or the wall stays neutral.",
      "The face matches the lock.",
    ],
  },
  {
    id: 61,
    slug: "green-tree-neutral-wall",
    title: "Green Tree, Neutral Wall",
    excerpt:
      "The tree stays in the background. The wall stays neutral. The tin in front is the product, and the green does not take the room.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label on a wooden table, a small green tree soft in the background, neutral wall, no text",
    cta: "Leave the tree in the back",
    answer:
      "Let the green tree stay in the background and keep the wall neutral. At Hearth Bakery a small tree can sit behind the biscuit tin, out of focus, while the wall remains warm grey or off-white. The tin is the product and stays in front. If the wall turns green, or the tree fills the frame, the bakery became a tree and the tin is a prop. One product, blank label, no invented logo. The offer is spoken. The shop name goes in the caption. The first three seconds show the tin, with the tree only as depth. The first three seconds show the biscuit tin sharp on the wood, the tree only a soft green shape behind it, while the voice says the tins stay on the counter until four. Reach that open by setting the tin down, placing the small tree behind, naming the wall warm grey, and speaking only after the wall is still grey. A green wall, a tree that fills the frame, or baubles on the lid goes in the discard pile before you post. One tin, fifteen to forty-five seconds, and a realistic voice gets an AI line in the caption.",
    points: [
      {
        h: "Size the tree as background",
        p: "The tree should be smaller in attention than the tin. Place it behind the table, not on the lid and not in the extreme foreground. Hearth Bakery's wall color is named in the prompt so the generator does not paint the plaster the same green as the needles. A neutral wall keeps the tin readable. Size comes before color. Put the tree behind the table, keep it smaller in attention than the tin, name the plaster warm grey, and check the wall before any motion. The first three seconds show the sharp tin and the soft needles while the voice says the tins stay out until four. Plaster painted the same green as the needles is the still you reject.",
      },
      {
        h: "One hero on the table",
        p: "The biscuit tin, blank label, one shadow, is the product. Ornaments that migrate onto the tin become a second subject and invite fake marks. Keep baubles on the tree in the back, soft. The spoken line can say the tins stay on the counter until four. That offer is not written on the wall. Baubles stay on the back tree. Leave the blank label and one shadow on the tin, then speak. The open shows the tin as the hero and the line says the tins stay on the counter until four, inside the first three seconds. Ornaments that climbed onto the lid, or a second product on the table, are the stills you reject before posting.",
      },
      {
        h: "Caption the shop, not the plaster",
        p: "Hearth Bakery belongs in the caption. A word painted on the wall or the label is an invented mark and a reject. The practical cut is fifteen to forty-five seconds of this one setup. Later in the week the same neutral wall should still be the wall, so the tree never repaints the shop. Type Hearth Bakery in the caption after the picture is clean, and keep this warm grey wall for the next reel. The first three seconds show the tin against that wall while the voice says the tins stay out until four. A word painted on the plaster or on the label is a reject before upload.",
      },
    ],
    example:
      "Hearth Bakery puts one biscuit tin on the wooden table. A small tree is soft behind it against a warm grey wall. The label is blank. The spoken line says the tins stay out until four, and the caption names Hearth Bakery. A still that turned the wall green and covered the lid with baubles was rejected. Hearth Bakery reaches the open like this: tin, soft tree, grey wall, spoken hour. The first three seconds show one biscuit tin with the tree behind it while the voice says the tins stay out until four. The green-wall still, the one with baubles on the lid, is the frame you throw out before posting.",
    bridge:
      "Scro keeps the promo to one product, the tin in front of the tree, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export the vertical reel at 9:16. Approve the tin in front of the tree, leave the label blank, and export the vertical file only after that. The first three seconds show the product, tree as depth only, while the offer says the tins stay out until four. A green wall or a logo is the still you reject. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The tree is behind the tin.",
      "The wall is not green.",
      "The label has no logo.",
    ],
  },
  {
    id: 62,
    slug: "hook-title-in-the-spoken-language",
    title: "Hook Title in the Spoken Language",
    excerpt:
      "If the voiceover is English, the big hook title is English. It matches the first spoken line, unless on-screen text is off.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "A simple original marker drawing of a bakery counter on one dark wooden board, no letters, no grey strip, and no second background",
    cta: "Match the hook to the voice",
    answer:
      "If the voiceover is English, the hook title is English. The first three seconds carry one big hook title in the spoken language, unless on-screen text is turned off. For Hearth Bakery the spoken line is that they close at four, so the title says that same fact in English, in the upper-middle, and nowhere else. The picture is a cartoon or a paper-cutout on one wooden board, one idea, at most one arrow, and no blank grey strip. A cartoon figure is not a real person and is not a photo of a customer. Approve the stills before anything moves. A title in a second language, a blank grey strip, or a second policy is enough to discard the still. Write the English sentence that they close at four, draw the counter on one wooden board, place one English hook in the upper-middle, and approve that still before the paper moves. The first three seconds show the hook on the board while the narrator says the bakery closes at four. One narrator, fifteen to forty-five seconds. The figure stays a drawing, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Match the language of the voice",
        p: "The narrator speaks English, so the hook title is English. A title in another language splits the first three seconds into two messages. The words of the title are the point of the reel: the bakery closes at four. If on-screen text is off, there is no title, and that same English sentence has to land in the voice alone. Set the voice and the title to the same English fact before you draw a single shape. The opening three seconds show one big English hook while the narrator says they close at four. A title in another language is a reject. If on-screen text is off, those same seconds still have to say the hour in the voice alone.",
      },
      {
        h: "One board, one idea",
        p: "Draw the counter on one wooden board. Do not add a blank grey strip, a second room, or a second policy. At most one arrow may point at the door. The figure, if you use one, is an original paper shape, not a photograph of a customer and not a real person. Four beats can follow, and they all serve the closing time. One board, then one idea, then at most one arrow toward the door. The first three seconds show the wooden counter and the English hook while the narrator says the bakery closes at four. A blank grey strip, a second room, or a photograph of a customer is the frame you reject before posting.",
      },
      {
        h: "Approve the frames first",
        p: "Check the board, the missing grey strip, and the single hook before motion. The title sits upper-middle, which is the caption safe zone, so the reel buttons at the bottom and the right do not cover it. A practical cut is fifteen to forty-five seconds. The cartoon stays a drawing for the whole file. Check the board, confirm the grey strip is absent, and read the single hook, in that sequence, before motion. The first three seconds show the title in the upper-middle while the voice says they close at four. A title parked where the reel buttons would cover it, or a cartoon that has become a photo of a person, is the frame you reject before posting.",
      },
    ],
    example:
      "Hearth Bakery's English voiceover says they close at four. The first three seconds show one big English hook with that fact, upper-middle, on a cartoon counter drawn on one wooden board. There is no second language, no grey strip, and at most one arrow. On-screen text off would remove the title and leave the spoken sentence. The stills are approved before motion. The workable cut runs from the English sentence, to the wooden board, to the upper-middle hook, to a still approval. The first three seconds show that English hook on the cartoon counter while the narrator says they close at four. Anything with a second language or a grey strip is refused before posting. The figure remains a drawing.",
    bridge:
      "Scro draws this as a cartoon or a paper-cutout on one wooden board and keeps one idea. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Stills get approved, the board keeps one idea, and only then does the paper move. The first three seconds show one big hook in the spoken language while the narrator says the bakery closes at four. A grey strip or a second language is the reject. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The hook language matches the voiceover.",
      "The board has no grey strip.",
      "The reel carries one idea.",
    ],
  },
  {
    id: 63,
    slug: "show-the-product-before-hello",
    title: "Show the Product before Hello",
    excerpt:
      "The first frame is the tin. A wave or a hello can wait. Viewers should see the product before anyone greets them.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label filling the foreground on a wooden table, sharp, one shadow, no person and no text",
    cta: "Open on the product",
    answer:
      "The first frame is the product. Show Hearth Bakery's biscuit tin before any hello. At one second the tin is already large, sharp, and on the wooden table, with a blank label and no invented logo. A wave, a shop doorway, or a greeting delays the thing you sell and spends the first three seconds on courtesy. The offer is spoken after the tin is visible, or over that opening frame. The shop name goes in the caption. A practical cut is fifteen to forty-five seconds, even though a reel can run from three seconds to three minutes. First, fill the frame with the biscuit tin on the wooden table. Next, confirm the blank label and the single shadow. Then start the voice on the offer. Last, leave every hello out of the file. The first three seconds show the tin already large while the voice says the tins stay on the counter until four. A wave, a shop doorway, or a greeting in that open is the version you reject before posting. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Frame one is the tin",
        p: "Pause the reel immediately. If you see a hand waving, a street, or an empty counter, the open is late. Hearth Bakery's tin, blank label, one shadow, should occupy the hero spot before a voice says anything social. Hello is not the offer. The offer is that the tins stay on the counter until four, and it can ride over the tin. Pause the file at one second. The tin should already be the hero, and only then does the offer ride over it. The first three seconds show the blank label and the wood while the voice says the tins stay on the counter until four. A waving hand, a street, or an empty counter in that open is discarded.",
      },
      {
        h: "Keep the label empty",
        p: "Because the tin is on screen for the whole open, any fake word on the lid is obvious. Leave the label blank. Do not invent a logo to make the frame look finished. You will put Hearth Bakery in the caption. One product only: a second box in the foreground splits the first three seconds. Read the lid for the whole open, keep the paper blank, and type Hearth Bakery into the caption after export. The first three seconds show the unmarked tin while the voice says the tins stay out until four. A fake word on the lid, or a second box crowding the foreground, is the still you refuse.",
      },
      {
        h: "Save the greeting",
        p: "If a person appears at all, they appear after the tin has been seen, and they do not replace it. Many of these promos need no person. The spoken line states the real counter fact. The practical length stays inside fifteen to forty-five seconds so the tin does not have to compete with a long introduction. The tin has to be seen before any person enters, and the spoken fact stays on the counter. The first three seconds show the product with the offer already underway, and the voice says the tins stay on the counter until four. A hello that leads, or a person who replaces the tin, is rejected before posting. Keep the reel inside fifteen to forty-five seconds.",
      },
    ],
    example:
      "Hearth Bakery opens on the biscuit tin, blank label, wooden table, already filling the frame. The spoken line says the tins stay on the counter until four. The caption names Hearth Bakery. Nobody says hello first. A version that began with a wave at the door was recut so the tin leads. The export is vertical. Recut so the order is tin, blank label, spoken offer, export. The first three seconds show the biscuit tin filling the frame while the voice says the tins stay on the counter until four. The door-wave version is the one you reject. The caption names Hearth Bakery.",
    bridge:
      "Scro keeps the promo to one product, the tin in that opening frame, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export the file at 9:16. Frame one is the approved tin, the label stays blank, and the export is vertical, in that sequence. The first three seconds show the product while the offer says the tins stay out until four. A hello ahead of the tin, or a logo on the lid, is rejected before posting. A realistic voice is labeled as AI.",
    checks: [
      "The tin is visible in the first second.",
      "No hello comes before the product.",
      "The label is blank.",
    ],
  },
  {
    id: 64,
    slug: "end-on-the-offer",
    title: "End on the Offer",
    excerpt:
      "Hold the last spoken line. The reel ends on the offer Jun actually has, and it does not wander into a second topic.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult behind a bakery counter, mouth open as if speaking, warm indoor light, quiet background, no text",
    cta: "Hold the last line",
    answer:
      "End on the offer and hold the last line. Jun, the one person speaking for Hearth Bakery, finishes on the fact he wants remembered: the tins stay on the counter until they close at four. That sentence stays up. A new topic, a wave, or a second sentence about another day throws away the ending. Captions can burn the line in the upper-middle in one of the talking styles. A realistic face or voice is labeled as AI. The practical cut is fifteen to forty-five seconds, with the first three seconds already aimed at the same offer so the ending feels like a hold, not a surprise. In the bakery corner the last sentence is already chosen, so the open has to match it. Write that the tins stay on the counter until four, let Jun say it in the first breath, hold the same corner on the final line, and label the post after the hold. The first three seconds show him in that corner while he says the tins stay out until four. A new topic, a wave, or a sentence about another day is what you reject before posting. One speaker, fifteen to forty-five seconds, and the caption says the face and voice are AI.",
    points: [
      {
        h: "The last words are the offer",
        p: "Write the final sentence first, then build the short reel toward it. For Hearth Bakery the last line is that the tins stay out until four. Jun does not add a second policy after it. He does not say hello as the closer. The mouth stops on that line, and the frame holds long enough to read the caption. Draft the final sentence on paper, aim every earlier line at it, and stop his mouth on that sentence. The first three seconds show Jun already inside the offer while he says the tins stay on the counter until four. A hello used as the closer, or a second policy after the hold, is refused.",
      },
      {
        h: "Hold without a new idea",
        p: "The hold is the same corner, the same face, the same line. A cut to a different room in the last second drops the offer. Upper-middle captions stay clear of the bottom and the right, where the reel interface sits. One person remains in frame. If a realistic voice says the line, the post is labeled as AI. The hold is the same corner, the same face, and the same line, with the caption parked upper-middle before export. The opening three seconds show that corner while he says the tins stay out until four. A cut to another room in the last second, or words sitting on the bottom button bar, is rejected before posting.",
      },
      {
        h: "Match the open to the close",
        p: "The first three seconds can already say they close at four, and the ending repeats that offer as the held line. Repetition here is the point. A practical length of fifteen to forty-five seconds gives the line room without a second subject. Leave the platform's AI label in place if the app adds one. Let the open and the close carry one offer, keep a single person in frame, and label the realistic voice once the hold is clean. The first three seconds show Jun while he says they close at four, and the ending holds that same line. A surprise topic in the last breath, or a realistic file with no AI line in the caption, is the reject.",
      },
    ],
    example:
      "Jun at Hearth Bakery speaks one offer and ends on it: the tins stay on the counter until four. He holds that line in the same corner. The caption sits upper-middle. The post labels the realistic face and voice as AI. A cut that wandered into tomorrow's bake after the offer was removed. One person speaks for the whole file. He writes the last line first, opens on it, holds it, and labels the upload. The first three seconds show Jun in the corner while he says the tins stay on the counter until four. The cut that wandered into tomorrow's bake is thrown out before posting. The post says the face and voice are AI.",
    bridge:
      "Scro keeps one person speaking and can set the held line in one of 13 caption styles. Export at 9:16. Label a realistic face or voice as AI, and leave any platform label on the post. Put the held line in one caption style, keep the single speaker, and export after the hold matches the open. The first three seconds show Jun on the offer while he says the tins stay out until four. A second topic at the end is rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "The last line is the offer.",
      "The ending holds on that line.",
      "The realistic voice is labeled as AI.",
    ],
  },
  {
    id: 65,
    slug: "leave-room-for-the-reel-ui",
    title: "Leave Room for the Reel UI",
    excerpt:
      "Keep the bottom and the right clear. Captions and the face sit in the upper-middle, where the reel buttons do not cover them.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult behind a bakery counter, face in the upper half, empty space along the bottom and the right side, warm light, no text",
    cta: "Clear the bottom and the right",
    answer:
      "Leave the bottom and the right clear for the reel interface. Jun's face sits in the upper half, and the caption sits upper-middle, which is the safe zone. Likes, comments, and the app's own caption bar occupy the bottom and the right. If the mouth or the words sit there, the interface covers the point. One person speaks. Burned-in captions help when the same file is watched on TikTok or Shorts with the sound off. A realistic face or voice is labeled as AI. This framing is decided in the still, before the mouth moves. Export only after the crop is safe: Jun's eyes in the upper half, the bottom and the right left empty, the closing line in the upper-middle. The first three seconds show his face high and the words clear of the buttons while he says the bakery closes at four. A mouth on the bottom bar, or type on the right where the buttons sit, is the frame you reject before posting. One speaker, fifteen to forty-five seconds, and the caption says the face and voice are AI.",
    points: [
      {
        h: "Park the face high enough",
        p: "Jun stands so his eyes fall in the upper half and his hands do not stretch into the right edge. Hearth Bakery's counter can run along the lower part of the frame as empty wood. A face cut off by the top, or a mouth sitting on the bottom bar, fails the still. Regenerate the crop before you approve speech. Stand him so the eyes land in the upper half, keep the hands off the right edge, and regenerate the crop before any speech. The first three seconds show the face high, with empty wood along the bottom, while he says they close at four. A face sliced by the top edge, or a mouth on the bottom bar, is discarded.",
      },
      {
        h: "Put words upper-middle",
        p: "The caption safe zone is the upper-middle. The line about closing at four belongs there, in a caption style you can read at phone size. Words along the bottom collide with the app caption. Words on the right collide with the buttons. Burned-in captions stay in that upper-middle band so the file still reads on TikTok and Shorts. After the face is framed, burn the hour in the upper-middle, in a caption look you can read on a phone, so a silent play on TikTok or Shorts still shows it. The opening three seconds show those words clear of the buttons while Jun says they close at four. Words along the bottom, or stacked on the right, are the layout you reject.",
      },
      {
        h: "One speaker, labeled",
        p: "Only Jun is in the shot, so the empty zones stay empty. A second person walking into the right edge is a framing error. Because the face and voice are realistic, label the post as AI. Leave the platform label where the app places it. The practical cut of fifteen to forty-five seconds uses this same frame. One person keeps the empty zones empty. Label the realistic face after the crop passes, and export this same frame for the whole practical cut. The first three seconds show that single speaker high in the frame while he says the bakery closes at four. A second person walking into the right edge is refused before posting.",
      },
    ],
    example:
      "Jun at Hearth Bakery is framed with his face high, counter wood along the bottom, and the right side quiet. The line about closing at four is captioned upper-middle. The post is labeled as AI. A still that put his hands on the right edge and the words along the bottom was rejected before he spoke. Face high, bottom clear, line upper-middle, then speech. That is the order. The first three seconds show Jun with counter wood along the bottom while he says they close at four. The still that put his hands on the right and the words along the bottom is the one you throw out. The post says the host is AI.",
    bridge:
      "Scro keeps one person speaking and offers 13 caption styles for the line in the upper-middle. Export at 9:16. Label a realistic face or voice as AI, and leave the platform disclosure on the post. Approve the safe-zone still, set one of 13 caption styles in the upper-middle, and export at 9:16 after that. The first three seconds show the line clear of the reel buttons while Jun says they close at four. A covered mouth is rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "The bottom and the right are clear.",
      "Captions sit upper-middle.",
      "The realistic host is labeled as AI.",
    ],
  },
  {
    id: 66,
    slug: "approve-stills-before-motion",
    title: "Approve Stills before Motion",
    excerpt:
      "Reject a drifted face while it is still a picture. Motion will not restore a hairline or a jaw that already changed.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a wool shop, face fully visible and evenly lit, plain background, natural skin, no text",
    cta: "Approve the still first",
    answer:
      "Approve the stills before motion, and reject a face that has drifted. Lena's lock is the hairline, the jaw, and the way the eyes sit. The wool-shop still has to match that lock before any clip is allowed to move. A moving reel does not repair a new nose or a shifted jaw. It repeats them. Clothes may change. The face may not. If you would not post the still as a life photo of the same host, do not start motion. A realistic face is labeled as AI. Leave the platform label in place. Put the new wool-shop still beside the locked reference, check hairline, jaw, and eye spacing on a phone, and allow motion only when you would post that still as the same host. The first three seconds show Lena's matched face in the shop while she says she is the locked host. A new nose, a shifted jaw, or plastic cheeks is the picture you reject before it ever moves. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "Compare before you move",
        p: "Put the new still beside the locked reference and check hairline, jaw, and eye spacing. Lena in the wool shop should pass that look on a phone, not only on a large monitor. A small drift is still a drift. Approve only the frame that is clearly the same person. The season does not excuse a new face. Compare on a phone, temple to temple and then jaw to jaw, and keep only the frame that is clearly the same person. The first three seconds show that matched face while Lena says the wool-shop still is the lock. A small drift is still the frame you reject. The season does not make a new face acceptable.",
      },
      {
        h: "Clothes are the only swap",
        p: "The red knit or the plain coat can differ from the reference clothes. That is a wardrobe change. A different age, a different jaw, or a beauty smear across the skin is not. Reject it and generate the clothes again on the locked face. Life photos later must reuse this same approved host. The red knit or the plain coat may differ from the reference clothes. Recheck age, jaw, and skin, and generate the clothes again on the locked face if those moved. The opening three seconds show the approved clothes on the same jaw while she says the clothes are the only swap. A beauty smear, or a different age, is refused before posting.",
      },
      {
        h: "Label the realistic host",
        p: "Once the still is approved, the post still tells viewers the face is AI. The platform may add its own disclosure. Leave that disclosure where it appears. Export the vertical file only after the still has passed the lock. Once the still passes, write that the face is AI, leave the platform label where the app puts it, and export the vertical file from that approved frame. The first three seconds show the lock while Lena says the face is the same host. A file that started moving before the still passed is the one you reject.",
      },
    ],
    example:
      "Lena's wool-shop still is placed next to her lock. The hairline and jaw match, so it is approved, and only then does the reel move. A frame with a narrower jaw and smoother, plastic cheeks was rejected in the still. The posted reel is labeled as AI. A life photo the next day uses the same approved face. Lock, phone comparison, approval, then motion. The first three seconds show Lena's matched hairline and jaw while she says this is the same host. The narrower jaw and the plastic cheeks are thrown out while they are still a picture. The caption says the face is AI.",
    bridge:
      "Scro locks one host face and changes clothes only. Approve the wool-shop stills before motion so a drifted face never starts moving. Life photos reuse that host. Export the vertical reel at 9:16. Approve the wool-shop still before motion, reuse that host in life photos, and export only the match. The first three seconds show the locked face while Lena says she is the same person. A drifted jaw is rejected before it moves. The caption says the face is AI.",
    checks: [
      "The still matches the lock.",
      "A drifted face is rejected before motion.",
      "The realistic face is labeled as AI.",
    ],
  },
  {
    id: 67,
    slug: "same-host-in-a-later-life-photo",
    title: "Same Host in a Later Life Photo",
    excerpt:
      "A life photo later in the week uses the same locked host. A festive room is not permission to generate a new person.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a plain red wool coat walking past a small shop window, face visible, daylight, no text",
    cta: "Reuse the locked host",
    answer:
      "A later life photo uses the same locked host. Lena's errand past the wool shop, coat on, is still Lena: same hairline, same jaw, same eyes. The life photo reuses that host. It does not invent a festive stranger because the street looks seasonal. Clothes can be the coat she already approved. The face stays the lock. Approve the still before any motion. A realistic face is labeled as AI on the life photo as well as on the reel. The platform label stays on the post. Two days later the life photo still starts from the approved lock. Put Lena outside in the plain red wool coat, match hairline, jaw, and eyes, and approve that street still before it moves. The first three seconds show her passing the wool shop in that coat while she says this errand is the same host. A festive stranger, or a prettier jaw, is the frame you reject before posting. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "The errand still uses the lock",
        p: "A life photo is the same person in a simple real moment: walking past her shop, holding a paper bag, standing at the door. The background can change. The identity cannot. If the life still could be a different adult in a red coat, it failed. Compare hairline and jaw with the lock before you keep it. Keep the life photo to one ordinary moment, a walk past the shop or a pause at the door, and compare identity before you keep the file. The first three seconds show the locked face at the door while she says she is Lena. A still that could be a different adult in a red coat is discarded.",
      },
      {
        h: "Wardrobe stays clothes",
        p: "The plain red wool coat is a clothes change on the locked face, not a new character. Do not add costume fur or a sack in the life photo either. Those extras break the host the same way they break the shop still. Approve the life still before you let it move. The plain red wool is clothes on the locked face. Scan for costume fur and a sack, then approve, then move. The opening three seconds show the coat and the same jaw while she says the coat is the approved clothes and the face is the lock. Fur, a sack, or a new jaw in the life photo is refused.",
      },
      {
        h: "Label it again",
        p: "A realistic life photo is still an AI face. Say so on the post. Reusing the lock keeps the week coherent, and the label keeps the post honest. Leave any platform disclosure where the app puts it. Export the vertical frame only after the face matches. Call the life photo an AI face in the caption, so the week stays one host and stays honest. The first three seconds show the errand frame while she says the face is the locked host. A realistic life photo with no AI line in the caption is the post you reject. Leave any platform label where the app puts it.",
      },
    ],
    example:
      "Two days after the shop still, Lena appears in a life photo outside the wool shop in the same plain red wool coat. The hairline and jaw match the lock. The still is approved before motion, and the post is labeled as AI. A prettier frame with a different jaw was not used as the life photo. The errand order is lock, coat, street still, approval. The first three seconds show Lena outside the wool shop in the plain red coat while she says she is the same host. The prettier frame with a different jaw is the one you reject. The caption says the face is AI.",
    bridge:
      "Scro locks one host face, changes clothes only, and reuses that same host in later life photos. Approve the stills before motion so the errand frame matches. Export the life photo and the reel at 9:16. Reuse the locked host, approve the errand still, and export the life photo after the match. The first three seconds show Lena in the red coat while she says the face matches the lock. A new jaw is rejected before posting. The caption says the face is AI.",
    checks: [
      "The life photo uses the locked face.",
      "Hairline and jaw match.",
      "The realistic photo is labeled as AI.",
    ],
  },
  {
    id: 68,
    slug: "eve-day-and-boxing-day",
    title: "Eve, Day, and Boxing Day",
    excerpt:
      "Three posts, one face, one corner. Eve, Christmas Day, and Boxing Day change the sentence, not the host or the camera.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult in the same bakery corner, wooden counter, warm lamp, face visible, no text",
    cta: "Keep one face in one corner",
    answer:
      "Eve, Christmas Day, and Boxing Day are three posts, one face, and one corner. Jun speaks for Hearth Bakery from the same side of the counter each time. The sentence changes. The face, the lamp, and the camera height do not. Eve: they close at four. Christmas Day: they are shut. Boxing Day: they are open in the morning. One person speaks in each file. Captions sit upper-middle. A realistic face or voice is labeled as AI on every post. Each cut is a practical fifteen to forty-five seconds, and the first three seconds carry that day's sentence. Mark the corner once: eye height, lamp side, window. Then record three separate files. Eve says they close at four. Christmas Day says they are shut. Boxing Day says they are open in the morning. The first three seconds of each reel show that same corner while he says that day's sentence. A new angle, a second speaker, or a drifted jaw on any file is rejected before posting. One speaker each time, fifteen to forty-five seconds, and each caption says the face and voice are AI.",
    points: [
      {
        h: "Same corner, three lines",
        p: "Mark the corner so you can repeat it: Jun's eyes at the same height, the lamp on the same side, the window in the same place. Only the sentence changes. A new angle on Boxing Day makes the series look like three shops. Viewers should recognize the corner before they finish the first line. Fix the eyes, the lamp, and the window, and change the sentence only. The first three seconds show the familiar corner while Jun says the day's line, whether that is the eve hour, the shut day, or the morning opening. A Boxing Day angle that makes the series look like three shops is the still you throw out.",
      },
      {
        h: "One fact per post",
        p: "Eve carries the closing time. Christmas Day carries the closed message. Boxing Day carries the morning opening. Do not stack all three facts into one reel and do not add a second speaker. The first three seconds of each file say that day's point. Captions use a readable style in the upper-middle. Eve carries the closing time, Christmas Day carries the closed message, and Boxing Day carries the morning opening, each in its own file. The first three seconds show Jun in the corner while he says only that day's sentence. A reel that stacks all three facts, or adds a second speaker, is refused.",
      },
      {
        h: "Label every realistic file",
        p: "Each of the three posts shows a realistic face and may use a realistic voice, so each post is labeled as AI. The platform label stays on each upload. One person, Jun, is the only face. A drifted jaw on the Boxing Day still means that still is rejected before it speaks. Label every realistic file, and hold the Boxing Day jaw up to the lock before that mouth moves. The first three seconds show the same face while he says the day's hours. A new jaw on Boxing Day, or any of the three posts missing the AI line, is the upload you reject.",
      },
    ],
    example:
      "Jun at Hearth Bakery records three vertical reels from the same corner. Eve he says they close at four. Christmas Day he says they are shut. Boxing Day he says they are open in the morning. The lamp and the camera match. Each post is labeled as AI. A Boxing Day still with a new jaw was rejected. One corner, then Eve, then the shut day, then Boxing Day morning. The first three seconds of each file show that corner while Jun says they close at four, they are shut, or they are open in the morning. The Boxing Day still with a new jaw is thrown out. Each caption says the host is AI.",
    bridge:
      "Scro keeps one person speaking across these three posts and can set each line in one of 13 caption styles. Export each reel at 9:16. Label a realistic face or voice as AI on every upload. Repeat the corner, set each day's line in a caption style, and export each reel on its own. The first three seconds show the same corner while Jun says that day's sentence. A drifted face is rejected before that file speaks. Every caption says the face and voice are AI.",
    checks: [
      "All three posts use the same corner.",
      "Each post has one sentence.",
      "Each realistic post is labeled as AI.",
    ],
  },
  {
    id: 69,
    slug: "boxing-day-same-camera",
    title: "Boxing Day, Same Camera",
    excerpt:
      "On Boxing Day the shelf can hold less. The camera height and the angle stay the same as the earlier tin reel.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label on a wooden table, same side window, one shadow, a quieter shelf behind, no text",
    cta: "Keep the Boxing Day angle",
    answer:
      "On Boxing Day the shelf can change and the camera angle does not. Hearth Bakery still shows one biscuit tin on the same wooden table, from the same height and the same window side as the earlier reel. Fewer plain boxes may sit on the shelf behind. The hero stays one tin, with a blank label and no invented logo. The offer is spoken: they are open this morning and the tins are on the counter. The shop name goes in the caption. If you overlaid the two reels, the table edge would line up. Write the eve camera note first, height and window side, and make Boxing Day obey it. One biscuit tin returns to the same table, the shelf behind may be quieter, and the line says they are open this morning. The first three seconds show the tin from that familiar angle while the voice says the bakery is open this morning and the tins are on the counter. A higher angle, a second hero, or a logo that appeared on the bare shelf is rejected before posting. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Lock the camera, not the stock",
        p: "Write down the height and the window side when you approve the first tin still. Boxing Day uses that note. The shelf behind may be emptier. The tin on the table stays the product and stays in the same place in the frame. A new overhead angle is a different promo, not a continuation. Read the height note, match the window side, and keep the tin in the same place in the frame before you judge the shelf. The first three seconds show that familiar table while the voice says they are open this morning. An overhead angle, or an emptier shelf that became the subject, is the still you discard.",
      },
      {
        h: "One tin remains the hero",
        p: "An emptier shelf is background. It is not an invitation to fill the frame with every remaining item. One product, blank label, one shadow that still agrees with the same window. A logo that appears on Boxing Day because the shelf looks bare is still an invented mark. Reject it. The quiet shelf is background. One blank label and one shadow stay on the hero, and the lid is checked before export. The opening three seconds show the single tin while the line says the tins are on the counter. A frame filled with every remaining item, or a mark invented on the label, is refused.",
      },
      {
        h: "Speak today's fact",
        p: "The spoken offer is the Boxing Day fact: the bakery is open this morning and the tins are on the counter. The caption names Hearth Bakery. The first three seconds show the tin from the familiar angle so regular viewers recognize the table before the sentence ends. The practical cut stays within fifteen to forty-five seconds. Say today's fact over the matched angle, put Hearth Bakery in the caption, and keep the cut practical. The first three seconds show the tin from the eve height while the voice says they are open this morning and the tins are on the counter. A new window side, or an hour baked onto the tin, is the reject.",
      },
    ],
    example:
      "Hearth Bakery's Boxing Day reel uses the same camera height and the same window side as the eve tin reel. One biscuit tin with a blank label sits on the table. The shelf behind is quieter. The spoken line says they are open this morning. The caption names Hearth Bakery. A higher angle was not used. Eve note, same height, one tin, then today's line. The first three seconds show the biscuit tin from the familiar window side while the voice says they are open this morning. The higher angle is thrown out before posting. The caption names Hearth Bakery.",
    bridge:
      "Scro keeps the Boxing Day promo to one product, the same tin, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export the reel at 9:16. Match the earlier angle, keep one blank-label tin, and export after the table edge would still line up. The first three seconds show the same table while the offer says they are open this morning. A new camera height or a logo is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "Camera height matches the earlier reel.",
      "One tin is still the hero.",
      "The label is blank.",
    ],
  },
  {
    id: 70,
    slug: "returns-queue-as-a-cartoon",
    title: "A Returns Queue as a Cartoon",
    excerpt:
      "Explain one returns policy with a cartoon queue. The figures are drawings. They are not photos of real customers.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "A still life of original paper-cutout figures in plain coats on one dark wooden board, white paper edges, one counter shape, no letters and no photographs",
    cta: "Draw the queue, skip real faces",
    answer:
      "Explain one returns policy as a cartoon, and do not use real customers' faces. Hearth Bakery's rule in this reel is a single fact: an unopened tin can come back. The queue is paper-cutout or a cartoon on one wooden board. Those figures are drawings. They are not a real person, and they are not photographs of people who shopped there. One idea, at most one arrow, no blank grey strip. The first three seconds carry one big hook title in the spoken language, unless on-screen text is off. Approve the stills before motion. The only spoken rule is that an unopened tin can come back. Draw that as a paper queue on one wooden board, keep every figure a drawing, and approve the stills before the paper moves. The first three seconds show one English hook with that rule while the narrator says an unopened tin can come back. A second policy, a photograph of a customer, or a grey strip is rejected before posting. One idea, fifteen to forty-five seconds, and a realistic narrator is labeled as AI in the caption.",
    points: [
      {
        h: "One rule only",
        p: "The spoken idea is the returns fact and nothing beside it. Hearth Bakery does not also explain shipping, hours, and the menu in this file. Four beats can show the unopened tin, the counter, the paper queue, and the tin accepted back. If a second policy appears, cut it. The cartoon is there so you never need a customer's real face. Write the returns fact, then plan four beats: the unopened tin, the counter, the paper queue, and the tin accepted back. The first three seconds show the hook while the narrator says an unopened tin can come back. Shipping, hours, or a menu in this same file is the material you reject before posting.",
      },
      {
        h: "Drawings, not photos",
        p: "Paper figures with white cut edges, or a marker cartoon, stay on one wooden board. Do not paste a photograph of a queue into the frame. A cartoon figure is not a real person, so you do not present it as a customer who came in. No blank grey strip and no second background. At most one arrow points at the counter. Paper figures with white cut edges stay on one wooden board from the first still. The first three seconds show those shapes and the English hook while the narrator says an unopened tin can come back. A photograph of a real queue, or a second background, is the frame you refuse.",
      },
      {
        h: "Hook in the spoken language",
        p: "If the narrator speaks English, the big hook title in the first three seconds is English and states the one rule, unless on-screen text is off. The title sits upper-middle. Approve every still before the paper moves. A practical cut of fifteen to forty-five seconds is enough for one policy. Place the hook upper-middle in the spoken language, approve every still, and only then let the paper move. The first three seconds show the one rule while the narrator says an unopened tin can come back. On-screen text that fights the voice, or a beat that adds a second policy, is discarded. If text is off, the voice alone carries the rule.",
      },
    ],
    example:
      "Hearth Bakery explains one rule in a paper-cutout queue on a wooden board: an unopened tin can come back. The figures are original drawings, not photos of customers. The English hook in the first three seconds states that rule. There is no grey strip and only one arrow. Stills are approved before motion. One rule, a paper queue, a language check, then approval. The first three seconds show the English hook on the wooden board while the narrator says an unopened tin can come back. A photo of real customers is the still you reject. The figures stay drawings.",
    bridge:
      "Scro draws the queue as a cartoon or a paper-cutout on one wooden board and keeps one idea. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Approve the stills, keep one idea and at most one arrow, and move the paper after that. The first three seconds show the hook in the spoken language while the narrator says an unopened tin can come back. A grey strip or a real face is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "Only one returns rule is explained.",
      "No real customer's face appears.",
      "The figures stay on one wooden board.",
    ],
  },
  {
    id: 71,
    slug: "what-to-post-when-shut",
    title: "What to Post When the Shop Is Shut",
    excerpt:
      "Post one closed message and the next time the door opens. A shut bakery does not need a second topic in the same reel.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult inside a quiet bakery, coat on a hook, wooden counter clear, warm lamp, face visible, no text",
    cta: "Post the closed message",
    answer:
      "When the shop is shut, post one closed message and the next open time. Jun speaks for Hearth Bakery: they are shut today, and they open on Boxing Day morning. That is the whole reel. One person, one corner, no tour of the empty kitchen and no second offer. The first three seconds carry the closed message. Captions sit upper-middle. A realistic face or voice is labeled as AI. The practical length is fifteen to forty-five seconds. Leave any platform label where the app puts it. The shut-day file has two facts and then it stops: they are shut today, and they open on Boxing Day morning. Frame the usual quiet corner, say the shut line in the open, and add the return time as the next breath. The first three seconds show Jun with a clear counter while he says they are shut today. A kitchen tour, a second offer, or a new decoration pass is rejected before posting. Jun stays the only person in a reel of fifteen to forty-five seconds, and the caption says the face and voice are AI.",
    points: [
      {
        h: "Two facts, one message",
        p: "The closed message and the next open time belong in one short speech. Jun can say they are shut today and open on Boxing Day morning. He should not add the menu, a story about the morning, or a third date. Viewers who see a dark shop need the status and the return, then they can leave the reel. Put the closed message and the next open time into one short speech, shut line first. The first three seconds show Jun at the clear counter while he says they are shut today. A third date, a story about the morning, or a menu after the Boxing Day line is the extra you reject.",
      },
      {
        h: "Keep the room quiet",
        p: "The counter can be clear. The coat can be on the hook. Do not fill the shut-day frame with a new decoration pass that changes the corner. One person speaks. The mouth stays visible, and the caption in the upper-middle repeats the two facts so a silent play on TikTok or Shorts still lands. Coat on the hook, counter clear, two facts repeated upper-middle, familiar corner unchanged. The first three seconds show that quiet room while he says they are shut today. A new decoration pass, or a caption a silent play cannot read, is rejected before posting.",
      },
      {
        h: "Say that the host is AI",
        p: "A realistic Jun is labeled as AI on this post the same way he is labeled on an open day. The shut message does not change the disclosure. Leave the platform label in place. Approve the still, with the familiar corner, before the mouth moves. Approve the familiar corner before the mouth moves, then label this shut-day file the same way as an open day. The first three seconds show one person while he says they are shut today and open on Boxing Day morning. A realistic host whose caption never says the face and voice are AI is the post you refuse.",
      },
    ],
    example:
      "On the shut day, Jun stands in the usual Hearth Bakery corner and says they are shut today and open on Boxing Day morning. The counter is clear. The caption sits upper-middle. The post is labeled as AI. He does not add a second topic. The file is a short vertical reel from that same camera height. Two facts, the usual corner, the upper-middle caption, then the label. The first three seconds show Jun with a clear counter while he says they are shut today and open on Boxing Day morning. A kitchen tour is the cut you reject. The caption says the host is AI.",
    bridge:
      "Scro keeps one person speaking and can put the closed message in one of 13 caption styles. Export at 9:16. Label a realistic face or voice as AI, and leave the platform label on the post. Approve the quiet corner, put the closed message in a caption style, and export after the second topic is gone. The first three seconds show Jun while he says they are shut today. A second topic is rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "The reel says they are shut.",
      "The next open time is included.",
      "The realistic host is labeled as AI.",
    ],
  },
  {
    id: 72,
    slug: "advent-one-idea-a-day",
    title: "One Idea a Day until Christmas",
    excerpt:
      "Run a daily series with one idea and the same original figure. A new character every day resets the board.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "An original paper-cutout cat with one torn ear and a short tail on one dark wooden board, plain and simple, no letters and no grey strip",
    cta: "Repeat one character",
    answer:
      "Post one idea a day, and keep the same original figure instead of inventing a new character every morning. Hearth Bakery's series uses one paper cat: round head, one torn ear, short tail. Monday can be the closing time. Tuesday can be where the tins sit. Each reel is one idea on one wooden board, as a cartoon or a paper-cutout. The cat is a drawing, not a real person. The first three seconds carry one big hook title in the spoken language, unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before motion. The torn ear and the short tail are redrawn before the day's fact is chosen. Monday can be the closing time. Tuesday can be where the tins sit. Each fact lands on the same wooden board, and the still is approved before the paper moves. The first three seconds show that paper cat and one English hook while the narrator says the day's single fact. A new animal, a grey strip, or a famous character is rejected before posting. The cat stays a drawing for a reel of fifteen to forty-five seconds.",
    points: [
      {
        h: "Same cat, new fact",
        p: "Draw the torn ear and the short tail the same way each day. Viewers should recognize the figure before they read the hook. A new animal every morning is a new show, and the bakery series never settles. The cat is original. It is not a famous character, and it is not a photograph of anyone's pet or of a customer. Redraw the torn ear and the short tail, then add one fact, and stop when a new animal tries to appear. The first three seconds show the same paper cat while the narrator says today's one idea. A famous character, or a photograph of a pet or a customer, is the still you throw out.",
      },
      {
        h: "One idea on one board",
        p: "Each day picks a single bakery fact and stops. The board stays wooden. A blank grey strip or a second background means that day's still is rejected. At most one arrow helps the idea. If the voiceover is English, the hook title is English, unless on-screen text is off. Four beats are enough inside fifteen to forty-five seconds. One fact, one wooden board, an English hook with the English voice, and at most one arrow. The first three seconds show that hook while the narrator says the closing time or, on the next day, where the tins sit. A blank grey strip or a second background is refused before posting.",
      },
      {
        h: "Approve before the paper moves",
        p: "Check the cat's ear, the board, and the single hook in the still. Motion should not redraw the cat into a smoother, different animal halfway through. Because the figure is a cartoon, do not present it as a real person. The series stays honest by keeping the drawing obviously drawn. In the still, check the ear, then the board, then the single hook, and move the paper only if the cat is the same animal. The first three seconds show the torn ear and the hook while the narrator says the day's fact. A smoother, different animal halfway through, or a drawing presented as a real person, is the reject.",
      },
    ],
    example:
      "Hearth Bakery posts one cartoon a day until Christmas, always the paper cat with one torn ear and a short tail, always on the same wooden board. One day the idea is the closing time. The next day the idea is where the tins sit. No new character appears. The English hook matches the English voiceover. Stills are approved before motion. Monday runs same cat, closing time, board, approval. The first three seconds show the torn ear and the English hook while the narrator says they close at four. A new character is thrown out before posting. Tuesday may swap the fact for where the tins sit. The cat stays.",
    bridge:
      "Scro keeps each day as a cartoon or a paper-cutout on one wooden board, with one idea. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Approve the cat's ear, keep one idea on the board, and move the paper after that check. The first three seconds show the same figure and the hook while the narrator says the day's fact. A grey strip or a new animal is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The same original figure returns.",
      "Each day has one idea.",
      "The board stays wooden.",
    ],
  },
  {
    id: 73,
    slug: "christmas-eve-open-hours",
    title: "Christmas Eve Open Hours",
    excerpt:
      "The closing time is the hook. Say when Hearth Bakery shuts before you say anything else about Christmas Eve.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult behind a wooden bakery counter, face visible at eye level, warm indoor light, coat on a hook, no text and no clock face",
    cta: "Lead with the closing time",
    answer:
      "The closing time is the hook. On Christmas Eve, Jun's first sentence is that Hearth Bakery closes at four. One person speaks. The hour is not saved for the end and not buried under a greeting. The first three seconds carry that point, with the caption in the upper-middle. A realistic face or voice is labeled as AI. The practical cut is fifteen to forty-five seconds, which is enough for the closing time and one short reason to come before then, such as the tins still being on the counter. A reel can run from three seconds to three minutes. This one stays in the practical range. Sentence one is the hour, so the camera work is built under it. Write that Hearth Bakery closes at four, frame the usual counter at eye level, let the tins on the counter support that hour, and end by saying four again. The first three seconds show Jun at the counter while he says they close at four. A greeting, the weather, or the shop name in front of the hour is the open you reject. One speaker, fifteen to forty-five seconds, and the caption says the face and voice are AI.",
    points: [
      {
        h: "Sentence one is the hour",
        p: "Jun does not open with a greeting, the weather, or the shop name. He says they close at four. The shop name can live in the caption and in a later breath if you need it. People deciding whether to walk over need the hour immediately. The upper-middle caption repeats those words for a silent play. The mouth starts on the hour. The shop name can live in the caption, and the upper-middle repeats the words for a silent play. The first three seconds show Jun looking into the lens while he says they close at four. A greeting, the weather, or the shop name before that hour is discarded.",
      },
      {
        h: "One corner, one speaker",
        p: "The familiar counter, eye-level camera, one adult. A tour of the kitchen spends the hook on geography. If you add that the tins are still on the counter, that is support for the same hour, not a second topic. Hold the closing time again at the end so the last line matches the first. Stay on the familiar counter with one adult, and let the tins on the counter support the same hour. The opening three seconds show that corner while he says they close at four. Stay on that counter first, and only then decide the file is done. A kitchen tour, or a second topic that spends the hook on the layout of the room, is the cut you reject.",
      },
      {
        h: "Label the realistic voice",
        p: "If Jun's face or voice is realistic, the Christmas Eve post is labeled as AI. Leave the platform disclosure where the app places it. Approve the still, with a clear mouth and no clock-face numerals baked into the picture, before he speaks. Approve a clear mouth, keep clock numerals out of the picture, speak, and then label the realistic voice. The first three seconds show Jun while he says they close at four. Baked-in clock numerals, or a realistic file whose caption never says the face and voice are AI, are rejected before posting.",
      },
    ],
    example:
      "On Christmas Eve, Jun at Hearth Bakery looks into the lens and says they close at four. The caption in the upper-middle repeats it. He adds that the tins are on the counter until then, and he ends on the hour. The post is labeled as AI. The file is a short vertical reel from the usual corner. On Christmas Eve the path is the hour, the usual corner, the support line about the tins, and the hour again. The first three seconds show Jun at the counter while he says they close at four. A greeting before the hour is the open you reject. The caption says the host is AI.",
    bridge:
      "Scro keeps one person speaking and can set the closing-time line in one of 13 caption styles. Export at 9:16. Label a realistic face or voice as AI, and leave the platform label on the post. Set the closing-time line in a caption style, keep one speaker, and export after sentence one is the hour. The first three seconds show Jun while he says they close at four. A hello ahead of the hour is rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "The first sentence is the closing time.",
      "One person speaks.",
      "The realistic voice is labeled as AI.",
    ],
  },
  {
    id: 74,
    slug: "wrapping-paper-no-brand",
    title: "Wrapping Paper with No Brand",
    excerpt:
      "Use a pattern you can describe, such as plain kraft and cotton string. A logo or a word on the paper is a reject.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain box wrapped in kraft paper and cotton string on a wooden table, no pattern of letters, one shadow, no logo and no text",
    cta: "Use paper you can describe",
    answer:
      "Use wrapping paper you can describe as a pattern, and keep every brand off it. Hearth Bakery wraps one biscuit tin in plain kraft with cotton string. That sentence is the whole surface: brown paper, pale string, no print. A logo, a word, or a famous repeat you do not own means the still is rejected. One product sits inside the wrap. The label underneath stays blank, and no invented logo replaces it. The offer is spoken. The shop name goes in the caption, not on the paper. Materials first, marks never. Cover the one biscuit tin in plain kraft and cotton string, read every fold, set a shadow that touches the table, and speak after the paper is blank. The first three seconds show the kraft parcel while the voice says wrapped tins are on the counter until four. A logo, a slogan, or a famous repeat on the paper is rejected before posting. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Describe the paper in materials",
        p: "Say kraft, cotton string, and a soft crease. You can also say narrow plain stripes if you truly use that paper and it has no mark. Hearth Bakery's example is the blank kraft. If the prompt names a brand of wrap, the picture will chase that brand. Materials keep the sheet yours. Say kraft, cotton string, and a soft crease, generate from those materials, and check the sheet against the sentence. The first three seconds show the brown paper and pale string while the voice says wrapped tins are on the counter until four. A prompt that named a brand of wrap is the still you regenerate and then reject if the brand remains.",
      },
      {
        h: "Reject printed words",
        p: "Look at the folds. A word, a crest, or a character in the pattern is a fail even when the string looks charming. The paper is not a place to sneak the shop name. You will write Hearth Bakery in the caption. One shadow under the parcel should still touch the table so the wrap does not float. Read the folds first, then check that the shadow meets the table, and only then approve. The opening three seconds show the blank kraft while the line says wrapped tins stay out until four. Printed type is refused. Hearth Bakery is typed in the caption by you.",
      },
      {
        h: "One parcel is the product",
        p: "The wrapped tin is the hero. A pile of differently printed gifts becomes a catalog and invites more fake marks. The spoken offer can be that wrapped tins are on the counter until four. The first three seconds show the kraft parcel. The practical cut stays within fifteen to forty-five seconds. One parcel stays the hero. Speak the offer over it and leave the other gifts for another reel. The first three seconds show the single kraft tin while the voice says wrapped tins are on the counter until four. A pile of differently printed gifts is the frame you throw out.",
      },
    ],
    example:
      "Hearth Bakery shows one biscuit tin wrapped in plain kraft and cotton string on the wooden table. No word or crest is on the paper. The spoken line says wrapped tins are on the counter until four. The caption names Hearth Bakery. A still that added a printed slogan across the kraft was rejected. Kraft, cotton string, a fold check, then the line. The first three seconds show the plain parcel on the wooden table while the voice says wrapped tins are on the counter until four. The still with a printed slogan across the kraft is rejected before posting.",
    bridge:
      "Scro keeps the promo to one product, the wrapped tin, with a blank label and no invented logo on the paper. The offer is spoken. The shop name goes in the caption. Export the reel at 9:16. Approve the unmarked wrap, keep one product, and export after the folds are clean. The first three seconds show the kraft and string while the offer says wrapped tins are on the counter until four. A word on the paper is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The paper can be described as materials.",
      "No logo or word is on the wrap.",
      "The shop name is in the caption.",
    ],
  },
  {
    id: 75,
    slug: "same-apron-different-gift",
    title: "Same Apron, Different Gift",
    excerpt:
      "Keep Lena's apron locked and swap the gift in her hands. A new apron and a new jaw means the still missed.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a plain linen apron holding a small kraft parcel, face visible, wool shop interior, natural light, no text",
    cta: "Keep the apron, swap the gift",
    answer:
      "Keep the same apron and swap only the gift. Lena's linen apron, the knot, and the strap stay as approved. One still can put a skein in her hands. The next can put a kraft parcel there. The face stays the locked host. The apron is clothes you are refusing to redesign. A wardrobe change, when you do make one, changes clothes only and must not quietly replace the apron and the jaw together. Approve each still before motion. Life photos reuse that host. A realistic face is labeled as AI. The apron is locked before the gift moves. Note the linen knot and the strap, put a skein in the hands for one still and a kraft parcel in the next, and match the jaw both times before motion. The first three seconds show that same apron and the day's object while Lena says the gift is the swap and the apron stayed. A frilled costume apron, or a narrower jaw that arrived with the parcel, is rejected before posting. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "Lock the apron details",
        p: "Note the knot, the strap width, and any small stain you are willing to keep. Lena's wool-shop stills this week all show that apron. If the generator offers a frilled costume apron, reject it. The gift is the only planned change. A new apron is a different outfit and, too often, a different person. Note the knot, the strap width, and any small stain you mean to keep. Generate the wool-shop still, compare the apron, and only then look at the object in the hands. The first three seconds show that linen knot while Lena says the apron is the one you locked. A frilled costume apron is the still you reject.",
      },
      {
        h: "The gift is a prop",
        p: "The skein and the kraft parcel are objects in the hands, with no logos and no words. They should not cover the jaw or the hairline you need for the comparison. If a hand looks wrong, crop below the chest in a later still only after the face in the master still has already passed. The face check comes first. The skein and the kraft parcel carry no logos and no words, and they sit below the collar so the face check can happen. The opening three seconds show the plain object under a clear jaw while she says the object is a prop in the hands. A gift that covers the hairline, or type printed on the kraft, is refused before posting.",
      },
      {
        h: "Approve every swap",
        p: "Each new gift is a new still, compared with the lock before motion. Hairline and jaw match. The apron matches. Then the clip may move. Life photos of Lena reuse this host, apron or coat, without a new face. Label the realistic face as AI and leave the platform disclosure in place. Each new gift is a new comparison: hairline, jaw, apron, then export, then the AI line. The first three seconds show the matched apron and the swapped gift while Lena says she is the same host. A life photo that kept the gift and replaced the face is the frame you throw out. The caption says the face is AI.",
      },
    ],
    example:
      "Lena at the wool shop wears the same linen apron in two stills. The first puts a plain skein in her hands. The second swaps in a small kraft parcel. The knot and the jaw match the lock both times. A still that changed the apron to a costume and narrowed the jaw was rejected. The posts are labeled as AI. Locked apron, skein still, parcel still, then motion. The first three seconds show the same knot and the day's gift while Lena says the gift is the only planned change. The costume apron with a narrower jaw is rejected before posting. The caption says the face is AI.",
    bridge:
      "Scro locks one host face, and a wardrobe change changes clothes only, so the approved apron is not redrawn when the gift swaps. Approve the stills before motion. Life photos reuse that host. Export at 9:16. Keep the approved apron, swap the prop, approve the still, and export after the jaw matches. The first three seconds show the linen apron and the gift while Lena says the face is the lock. A new jaw is rejected before posting. The caption says the face is AI.",
    checks: [
      "The apron matches the approved still.",
      "Only the gift changes.",
      "The face matches the lock.",
    ],
  },
];
