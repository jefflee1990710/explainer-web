import type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";

const explain = ["Christmas", "AI Video", "Explainer"] as string[];
const host = ["Christmas", "AI Video", "Talking Head"] as string[];
const product = ["Christmas", "AI Video", "Product Promo"] as string[];
const face = ["Christmas", "AI Video", "AI Influencer"] as string[];
const voice = ["Christmas", "AI Video", "Cantonese"] as string[];

// Christmas production guides 76–100.
export const SPECS_D: SeasonGuideSpec[] = [
  {
    id: 76,
    slug: "cantonese-christmas-greeting-reel",
    title: "A Cantonese Christmas Greeting",
    excerpt:
      "Open with one Cantonese greeting, then one shop fact. The first spoken sentence is the point, and the captions are burned in.",
    locale: "en",
    landingPath: "/cantonese",
    tags: voice,
    scene:
      "An ordinary adult behind a small cake counter, warm indoor light, a plain cake with no writing, no text anywhere in the frame",
    cta: "Open in Cantonese",
    answer:
      "Open with one Cantonese greeting, then one shop fact. Mei at a cake counter in Sheung Wan speaks Cantonese. Her first sentence is the greeting, and that sentence is the point of the reel. The next sentence is the single fact: the counter closes at four on Christmas Eve. Burn the captions into the picture so a silent play still shows both lines. The caption safe zone is the upper-middle. A realistic face or a realistic voice is labeled as AI. Leave any platform label where the app puts it. The practical cut is fifteen to forty-five seconds, and the first three seconds carry the greeting. Mei's open is the Cantonese greeting, and the shop fact waits one breath. Say the greeting, follow it with the single fact that the counter closes at four on Christmas Eve, burn both lines into the upper-middle, and label the post. The first three seconds show her at the Sheung Wan cake counter while she says that greeting. An English hello first, a second shop fact, or writing on the cake is rejected before posting. One speaker, fifteen to forty-five seconds, and the caption says the face and the Cantonese voice are AI.",
    points: [
      {
        h: "Greeting first",
        p: "The first spoken sentence is the Cantonese greeting, short enough to finish inside the opening three seconds. Mei does not start with the shop name, a hello in English, or the closing time. Those can follow. If the first sentence is already a paragraph, the greeting stops being the point. Say the greeting, then stop, then give the one fact. Greeting, stop, then the one fact. Keep the greeting inside the opening. The first three seconds show Mei at the counter while she says the Cantonese greeting. A first sentence that is the shop name, an English hello, or the closing time is the take you reject.",
      },
      {
        h: "One shop fact after it",
        p: "The second sentence is one fact from the counter: they close at four on Christmas Eve. A second fact about flavors, delivery, and another day crowds the reel. The burned-in captions repeat the greeting and that fact in the upper-middle, where the reel buttons do not cover them. Bottom and right stay clear. Sentence two is only the Christmas Eve closing time. Burn the greeting and that fact where the buttons do not cover them. The first three seconds show the greeting in the upper-middle while she says it in Cantonese. A second fact about flavors or delivery, or captions on the bottom and the right, is refused before posting.",
      },
      {
        h: "Label a realistic voice",
        p: "If Mei's face or the Cantonese voice sounds and looks like a real person, the post is labeled as AI. A cartoon would be a drawing, but this reel is a person at a counter, so the disclosure matters. Leave the platform's own label in place, next to the greeting and the shop fact. The face and the Cantonese voice are realistic, so the caption says they are AI, and the platform label stays where the app puts it. The cake in frame stays free of writing. The first three seconds show Mei and the plain cake while she says the greeting. A file that looks and sounds like a real person and never says it is AI is the upload you reject.",
      },
    ],
    example:
      "Mei stands at her Sheung Wan cake counter. The first Cantonese sentence is the greeting. The next sentence says the counter closes at four on Christmas Eve. Both lines are burned into the upper-middle of the frame. The post is labeled as AI because the face and voice are realistic. The cake in frame has no writing on it. The export is vertical. Greeting, four-o'clock fact, burned-in lines, label. The first three seconds show her at the cake counter while she says the greeting. A cake with writing, or a second fact, is rejected before posting. The caption says the face and voice are AI.",
    bridge:
      "Scro uses a spoken Cantonese voiceover for Mei's reel, and the first sentence is the point, so the greeting leads. Burn the captions into the picture. Export the file at 9:16 so the same vertical reel can carry those lines. Lead with the Cantonese greeting, burn the captions, and export the vertical file after both lines are in the picture. The first three seconds show Mei while she says the greeting, and the following sentence says the counter closes at four on Christmas Eve. An English open, or type on the cake, is rejected before posting. The caption says the voice is AI.",
    checks: [
      "The first sentence is the Cantonese greeting.",
      "Only one shop fact follows.",
      "Captions are burned into the frame.",
    ],
  },
  {
    id: 77,
    slug: "explain-a-gift-card-in-cartoon",
    title: "Explain a Gift Card in a Cartoon",
    excerpt:
      "Four beats explain the gift card. The card stays blank. A cartoon on one wooden board is a drawing, not a customer.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "A blank cream paper card and a plain envelope as paper cutouts on one dark wooden board, white paper edges, no letters and no logos",
    cta: "Draw a blank gift card",
    answer:
      "Explain a gift card in four beats, and keep the card blank. Hearth Bakery's cartoon shows a blank card on one wooden board: the hook, the card itself, the handoff at the counter, and the card waiting for the guest. There is no value printed, no logo, and no shop name on the card. The figure, if you draw one, is a cartoon or a paper-cutout, not a real person and not a photo of a customer. One idea. The first three seconds carry one big hook title in the spoken language, unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before motion. Four beats, and the card stays blank the whole way. Hook that a gift card is at the counter, show the blank card, draw a paper handoff, and leave the card in a plain envelope. The first three seconds show one English hook on the wooden board while the narrator says a gift card is at the counter. A printed value, a logo, or a real customer's face is rejected before posting. One idea, fifteen to forty-five seconds, and the figures stay drawings.",
    points: [
      {
        h: "Four beats, one card",
        p: "Beat one is the hook: a gift card is at the counter. Beat two shows the blank card. Beat three shows it handed across the counter as a paper shape. Beat four leaves the card in a plain envelope. Hearth Bakery does not add a second product. If the voiceover is English, the hook title is English and matches that first idea, unless on-screen text is off. Map the four beats before you draw, and keep this reel to the one card. Match the English hook to the English voice. The first three seconds show the hook while the narrator says a gift card is at the counter. A second product, or a title in another language, is the beat you reject. If on-screen text is off, the voice alone says that first idea.",
      },
      {
        h: "The card has no mark",
        p: "The drawn card is blank paper. A number, a crest, or the words of the shop name on the card are a reject. You are not inventing a logo to make the drawing look official. The shop name can be spoken or left to the caption of the post. The board stays wooden, with no grey strip and no second background. The drawn card is blank paper. Check it for a number or a crest, and keep the board wooden. The first three seconds show the blank cream card and the hook while the narrator says a gift card is at the counter. The shop name painted on the card, or a grey strip behind it, is refused before posting.",
      },
      {
        h: "A drawing is not a person",
        p: "Any clerk or guest in the four beats is an original paper shape. Do not use a real customer's face, and do not treat the cartoon as a real staff member. At most one arrow points at the card. Approve each still, including the blank face of the card, before the paper moves. A practical cut fits in fifteen to forty-five seconds. Any clerk or guest is an original paper shape. Point at most one arrow at the card, and approve the blank face of the card before motion. The first three seconds show the card while the narrator says it is at the counter. A real customer's face, or a photograph of staff, is the still you throw out.",
      },
    ],
    example:
      "Hearth Bakery's paper-cutout reel uses four beats on one wooden board. The English hook says a gift card is at the counter. The card is blank cream paper. A simple paper handoff follows, then the card rests in an envelope. No logo appears. The figures are drawings, not customers. Stills are approved before motion. Hook, blank card, paper handoff, envelope. The first three seconds show the English hook while the narrator says a gift card is at the counter. A numbered card is rejected before posting. The figures are drawings, and the stills are approved before the paper moves.",
    bridge:
      "Scro explains the card as a cartoon or a paper-cutout on one wooden board, with one idea. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Approve the blank card, keep one idea on the board, and move the paper after that. The first three seconds show the hook in the spoken language while the narrator says a gift card is at the counter. A logo or a grey strip is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The card is blank.",
      "Four beats serve one idea.",
      "No real person's face is used.",
    ],
  },
  {
    id: 78,
    slug: "host-in-a-red-knit",
    title: "The Host in One Red Knit",
    excerpt:
      "Lena wears the same red knit all week. A new sweater is a new outfit, and it often arrives with a new face.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in one plain red knit sweater, face visible, small wool shop, soft window light, no extra costume pieces and no text",
    cta: "Keep the same red knit",
    answer:
      "Keep the host in one red knit for the whole week. Lena's sweater is a specific garment: the same red, the same rib at the cuff, the same neckline. Every still in the wool shop uses that knit. A different sweater is a wardrobe change you did not ask for, and it often brings a new jaw with it. Clothes may change only when you mean to change clothes. This week you are not changing them. Approve each still against the lock before motion. Life photos reuse that host in that knit or in clothes you explicitly approved. A realistic face is labeled as AI. Describe the sweater once, then stop redesigning it. Write the red, the cuff rib, and the neckline, reuse those words every day this week, and check the collar against the hairline and the jaw before motion. The first three seconds show that same red knit while Lena says this is the sweater for the week. A smoother knit, a logo on the chest, or a different neck is rejected before posting. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "Describe this sweater once",
        p: "Write the red, the cuff rib, and the neckline into the prompt and keep those words all week. Lena's wool shop does not need a new festive top each morning. If the still returns a smoother knit, a logo on the chest, or a different neck, reject it. The face check is the hairline and the jaw beside that same collar. The cuff and the neckline go into each day's prompt in the same words. Generate, then compare the collar with the lock, then move. The first three seconds show the rib and the neckline while Lena says the knit is the one you described. A new neck, or a mark on the chest, is the still you reject.",
      },
      {
        h: "Props can change around it",
        p: "A skein or a kraft parcel in the hands can change. The knit cannot. Keep the prop below the collar so it does not hide the lock. One plain glass ornament may sit soft in front if the eyes stay sharp. The room stays the shop, with red limited to the sweater rather than a grade over the wall. Hands may hold a skein one day and a kraft parcel the next. The knit stays, and the prop stays below the collar. The opening three seconds show the red sweater and a clear jaw while she says the prop is the change and the knit stayed. A grade that turns the wall red, or an ornament over the eyes, is refused.",
      },
      {
        h: "Approve, then reuse",
        p: "Each day's still is approved before motion. A life photo later in the week reuses Lena, not a cousin in a similar red top. Label the realistic face as AI on every post. Leave the platform disclosure where the app puts it. Export only the frames where the cuff and the jaw both match. Each day's still is approved before motion, the life photo reuses Lena, and every post carries the AI line. The first three seconds show the same cuff and the same jaw while she says she is the locked host. A different person in a similar red top is thrown out. The caption says the face is AI.",
      },
    ],
    example:
      "All week, Lena at the wool shop wears the same plain red knit, same cuff, same neckline. Monday she holds a skein. Wednesday she holds a kraft parcel. The face matches the lock both days, and both stills are approved before motion. A Tuesday frame in a different sweater was rejected. Each post is labeled as AI. One description for the week, Monday's skein, Wednesday's parcel, and a face check each time. The first three seconds show the same cuff while Lena says the knit stayed. Tuesday's different sweater is rejected before posting. Each caption says the face is AI.",
    bridge:
      "Scro locks one host face, and a wardrobe change changes clothes only, so this red knit stays the approved clothes. Approve the stills before motion. Life photos reuse that host. Export at 9:16. Lock the face, keep the approved knit, approve the still, and export after the cuff matches. The first three seconds show the red cuff and Lena's jaw while she says the sweater is the week's clothes. A new neckline is rejected before posting. The caption says the face is AI.",
    checks: [
      "The same red knit appears all week.",
      "The face matches the lock.",
      "The realistic host is labeled as AI.",
    ],
  },
  {
    id: 79,
    slug: "product-on-wood-not-glitter",
    title: "Product on Wood, Not Glitter",
    excerpt:
      "Set the tin on wood grain you can see. A sparkle overlay is a filter, and it hides the blank label.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label on a bare wooden table, visible wood grain, one soft shadow, no sparkles and no text",
    cta: "Set the product on wood",
    answer:
      "Set the product on wood grain, and do not cover the frame with a glitter overlay. Hearth Bakery's biscuit tin sits on the bare table. The grain stays visible at the edges. Sparkle stuck across the lid, the air, and the wood is a filter, and it hides the blank label you need to inspect. One product, no invented logo. The offer is spoken. The shop name goes in the caption. If a highlight exists, it is a real reflection from the window on metal, not a field of stars. The first three seconds show the tin on that wood. Grain you can see is the set. Ask for it around the base, place one biscuit tin with a blank label, keep glitter out of the prompt, and speak over that bare wood. The first three seconds show the grain and the tin while the voice says the tins stay on the counter until four. Sparkle across the lid, the air, or the wood is rejected before posting. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Show the grain",
        p: "Name the wooden table and ask for visible grain around the tin. Hearth Bakery's table has a direction to the grain, and the shadow agrees with the window. A prompt that asks for glitter, sparkle, or a magic dusting will scatter highlights that do not belong to any lamp. Reject a still where the wood has turned into a sticker. Name the table and the direction of the grain, match the shadow to the window, and regenerate if the wood looks like a sticker. The first three seconds show the grain around the base while the voice says the tins stay out until four. Highlights that belong to no lamp are the still you refuse.",
      },
      {
        h: "Keep the label readable",
        p: "The blank label is how you know no logo was invented. Glitter across that rectangle makes the check impossible and usually hides a fake crest. The lid can have one quiet window reflection. It should not twinkle. One product occupies the hero spot. A second glittering object splits the frame. Check the blank label first, then allow one quiet window reflection on the lid. One hero occupies the frame. The opening three seconds show that flat blank rectangle while the line says the tins stay on the counter until four. Glitter across the label, or a second glittering object, is discarded.",
      },
      {
        h: "Speak the offer over the wood",
        p: "The spoken line says the tins stay on the counter until four. That sentence is not spelled in sparkles. The caption carries Hearth Bakery. A practical reel of fifteen to forty-five seconds can hold on the grain and the tin. The same bare wood should return on Boxing Day so the table stays the set. The offer is spoken over the bare wood, the shop name goes in the caption, and this table is the one you can return to. The first three seconds show the grain and the tin while the voice says the tins stay out until four. A sentence spelled in sparkles is the frame you reject.",
      },
    ],
    example:
      "Hearth Bakery places one biscuit tin on the bare wooden table. Grain shows around the base, and one shadow touches the tin. The label is blank, with no sparkle overlay. The spoken line says the tins stay out until four. The caption names Hearth Bakery. A glittering version of the same table was rejected. Grain, one tin, a glitter check, then the line. The first three seconds show the bare wooden table and the blank label while the voice says the tins stay out until four. The glittering version is thrown out before posting. The caption names Hearth Bakery.",
    bridge:
      "Scro keeps the promo to one product, the tin on that bare wood, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export the vertical reel at 9:16. Approve the visible grain, keep the label blank, and export after the wood still looks like wood. The first three seconds show the tin on bare wood while the offer says the tins stay out until four. A sparkle overlay is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "Wood grain is visible.",
      "No glitter overlay covers the frame.",
      "The label is blank.",
    ],
  },
  {
    id: 80,
    slug: "no-indoor-snowstorm",
    title: "No Indoor Snowstorm",
    excerpt:
      "Fake snow inside the bakery hides Jun's face. Weather stays outside the glass. The air between the lens and the mouth stays clear.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult at a bakery counter in clear indoor air, face unobstructed, a window behind with weather kept outside, no flakes in the room and no text",
    cta: "Leave the snow outside",
    answer:
      "Do not add an indoor snowstorm. Fake snow hides the face. Jun speaks for Hearth Bakery in clear air, mouth and eyes readable. If the shop wants weather, it stays on the far side of the window, the way rain stays on the glass. Flakes between the lens and the mouth bury the person who is speaking and make the still fail. One person speaks. Captions sit upper-middle. A realistic face or voice is labeled as AI. Approve the clear still before motion so the clip does not start snowing after you signed off. Clear air is the first approval, not a seasonal extra. Check the space between the lens and Jun's eyes, leave the weather beyond the window, approve a sharp mouth, and only then let him speak. The first three seconds show his clear face and a dry counter while he says they close at four. Flakes on the eyelashes, the apron, or the counter are rejected before posting. Jun is the only speaker, the practical length stays fifteen to forty-five seconds, and the caption says the face and voice are AI.",
    points: [
      {
        h: "Keep the air empty",
        p: "Look at the space between the camera and Jun's eyes. It should be clear shop air. Flakes on the eyelashes, the apron, and the counter mean the storm is indoors. Reject that still. A white speckle grade is the same problem as flakes. The mouth has to be sharp because one person is carrying the line. Shop air first. Treat a white speckle grade the way you treat flakes, and record only after the air is empty. The first three seconds show a sharp mouth and clear eyes while Jun says they close at four. Snow on the lashes, or speckle across the face, is the still you throw out.",
      },
      {
        h: "Weather belongs outside",
        p: "The window can show a grey street. It should not leak snow onto the counter. Hair and the wooden top stay dry and clear, as they do on a rain day. If you cannot see the eyes, you cannot approve the face. The first three seconds still have to carry the point, which they cannot do through a cloud of flakes. Leave the street outside first, then confirm the hair and the wooden top stay dry and the eyes stay visible. The opening three seconds show the clear counter and the window while he says the bakery closes at four. Snow on the counter, or a cloud of flakes in the open, is refused.",
      },
      {
        h: "Label the clear take",
        p: "A realistic Jun is labeled as AI even when the frame is deliberately plain. The plain frame is what makes the face check possible. Captions for the spoken line sit upper-middle, clear of the bottom and the right. Leave any platform label where the app puts it. Do not cover a weak face with snow and hope it looks seasonal. The plain frame is what makes the face check possible, so label it, put the line upper-middle, and leave the platform label where the app puts it. The first three seconds show the uncovered face while Jun says they close at four. A weak face hidden with indoor snow is the picture you reject.",
      },
    ],
    example:
      "Jun at Hearth Bakery speaks with a clear face and a dry counter. The window shows the street, and no flakes hang in the room. He says they close at four. The caption is upper-middle, and the post is labeled as AI. A still full of indoor snow was rejected before motion because the mouth was hidden. Clear air, dry counter, the line, then the label. The first three seconds show Jun's eyes and mouth while he says they close at four. The still full of indoor snow is thrown out before motion, because the mouth is hidden. The caption says the host is AI.",
    bridge:
      "Scro keeps Jun as the one person speaking, with the line in one of 13 caption styles. Export the clear reel at 9:16. Label a realistic face or voice as AI, and leave the platform disclosure on the post. Approve the clear still, set the line in a caption style, and export after the air stays empty. The first three seconds show a readable face while Jun says they close at four. Indoor flakes are rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "No snow is inside the room.",
      "Eyes and mouth are clear.",
      "The realistic host is labeled as AI.",
    ],
  },
  {
    id: 81,
    slug: "pine-branch-not-a-forest",
    title: "A Pine Branch, Not a Forest",
    excerpt:
      "Use one pine branch in a jar. A forest backdrop turns Owen's table into a set and hides the product.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one pine branch standing in a clear glass jar on a wooden table, blank tag, one shadow, plain wall, no forest and no text",
    cta: "Use one branch in a jar",
    answer:
      "Use one pine branch in a jar, not a forest. At North Door Flowers, Owen's product is that single branch in a clear glass jar on the wooden table. The wall behind is plain. A woodland backdrop, a room full of trees, or a second arrangement makes the jar a souvenir in someone else's set. One product, a blank tag, no invented logo. The offer is spoken. The shop name goes in the caption. The first three seconds show the jar. A practical cut of fifteen to forty-five seconds is enough for one branch. One jar is the whole product. Stand a single pine branch in a clear glass jar, set it on the wooden table against a plain wall, leave the tag blank, and speak after you can count only one hero. The first three seconds show the jar while the voice says this jar is the bunch for the table until they close at four. A forest backdrop, a second arrangement, or a mark on the glass is rejected before posting. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "One jar, one branch",
        p: "The prompt names a single pine branch, a clear jar, the wooden table, and a plain wall. North Door Flowers does not need a forest, a cabin, or a row of identical trees. Those backgrounds add scale the table does not have, and they invite fake signage. If you can count a second hero branch, the still has two products. The prompt names one branch, one clear jar, the table, and a plain wall. Count heroes before you approve. The first three seconds show that jar while the voice says it is the bunch until four. A cabin, a row of trees, or a second branch that reads as another product is the still you discard.",
      },
      {
        h: "Keep the tag blank",
        p: "A tie or a tag on the jar stays blank. The shop name North Door Flowers belongs in the caption, typed by you. An invented mark on the glass is a reject. One shadow under the jar should touch the wood. Glitter in the air is a different problem and does not belong around a plain branch. Blank the tag first, then type North Door Flowers in the caption, and check that one shadow touches the wood. The opening three seconds show the clear jar and the blank tag while the line says the bunch is at the shop until four. An invented mark on the glass, or glitter in the air, is refused.",
      },
      {
        h: "Say what the jar is",
        p: "The spoken offer is the counter fact: this jar is the bunch for the table, and it is at the shop until they close at four. That sentence is not written on the glass. The first three seconds are the jar, before any hello. The same table and the same plain wall should be available the next day so the product stays recognizable. Say what the jar is only after the wall is plain, and keep this table available the next day. The first three seconds show the jar, ahead of any hello, while the voice says this is the bunch for the table until they close at four. Words written on the glass are the frame you reject.",
      },
    ],
    example:
      "Owen at North Door Flowers sets one pine branch in a clear jar on the wooden table against a plain wall. The tag is blank. The spoken line says the jar is the bunch for the table until they close at four. The caption names North Door Flowers. A forest backdrop version was rejected. One shadow sits under the jar. Owen's path is one branch, a plain wall, a blank tag, then the line. The first three seconds show the jar on the wooden table while the voice says it is the bunch until four. The forest backdrop is thrown out before posting. The caption names North Door Flowers.",
    bridge:
      "Scro keeps the promo to one product, the single jar, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export the vertical reel at 9:16. Approve the single jar, keep the tag blank, and export after the wall is still a wall. The first three seconds show the pine branch in the jar while the offer says it is the bunch until four. A forest or a logo is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "Only one branch is in the jar.",
      "The background is not a forest.",
      "The tag is blank.",
    ],
  },
  {
    id: 82,
    slug: "gold-ribbon-one-highlight",
    title: "Gold Ribbon, One Highlight",
    excerpt:
      "Let one highlight sit on the gold ribbon. The matte tin stays quiet. Specular sparkle across the whole frame is a filter.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label and a gold ribbon, a single highlight on the ribbon, matte tin, wooden table, no text",
    cta: "Light only the ribbon",
    answer:
      "Put one highlight on the gold ribbon, and leave the rest of the pack quiet. Hearth Bakery's biscuit tin is matte, the label is blank, and a narrow gold ribbon takes a single specular streak from the window. That streak is the highlight. Stars, dust, and a second shine on the lid are a glitter overlay, not light. One product, no invented logo. The offer is spoken. The shop name goes in the caption. The highlight has to agree with the same window that casts the one contact shadow. The highlight has one address: the gold ribbon, on the window side. Keep the biscuit tin matte, catch a single soft streak on that ribbon, check it agrees with the shadow, and speak after the lid stays quiet. The first three seconds show the ribbon and the tin together while the voice says the tins stay on the counter until four. Stars, dust, or a second shine on the lid are rejected before posting. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Name the one streak",
        p: "Write that the ribbon catches one soft streak from the window and the tin stays matte. Hearth Bakery's table already has a light direction. If the ribbon shines on the shadow side, the highlight is fake. A still with sparkles in the air fails even when the ribbon itself looks pretty. Reject it before you export. Write the single streak into the prompt, then compare it with the window. Stop if the ribbon shines on the shadow side. The first three seconds show that one highlight on the gold ribbon while the voice says the tins stay out until four. Sparkles in the air are the still you reject.",
      },
      {
        h: "Protect the blank label",
        p: "The label stays a flat blank rectangle. A highlight that slides onto the label washes out the area where a fake logo tends to appear, and it makes the check harder. Keep the shine on the ribbon only. No word is printed on the ribbon. The shop name Hearth Bakery is caption text, not foil type. Keep the shine on the ribbon first, then confirm the label stays a flat blank rectangle and the ribbon carries no words. The opening three seconds show the matte lid and the ribbon streak while the line says the tins stay on the counter until four. Foil type, or a highlight that washes the label, is refused. Hearth Bakery belongs in the caption.",
      },
      {
        h: "One product, one light",
        p: "The tin is the only product. The ribbon is part of that pack, not a second item. One shadow touches the base. The spoken offer says the tins stay on the counter until four. The first three seconds show the ribbon and the tin together so the highlight reads as part of the product, not as a title treatment. The ribbon is part of this pack, one shadow touches the base, and the open shows both the ribbon and the tin. The first three seconds show them together while the voice says the tins stay out until four. A second item, or a shine that behaves like a title treatment, is the frame you throw out.",
      },
    ],
    example:
      "Hearth Bakery ties a gold ribbon on one matte biscuit tin. A single window streak sits on the ribbon. The label is blank, and the wood shows a contact shadow. The spoken line says the tins stay out until four. The caption names Hearth Bakery. A frame with sparkles across the lid was rejected. Matte tin, one window streak, blank label, then the line. The first three seconds show the gold ribbon's single highlight while the voice says the tins stay out until four. The frame with sparkles across the lid is rejected before posting.",
    bridge:
      "Scro keeps the promo to one product, the tin and its ribbon, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export the vertical reel at 9:16. Approve the single streak, keep the label blank, and export after the shine agrees with the window. The first three seconds show the ribbon on the tin while the offer says the tins stay out until four. A glitter field is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "Only the ribbon carries the highlight.",
      "The tin stays matte.",
      "The label is blank.",
    ],
  },
  {
    id: 83,
    slug: "give-the-hands-a-job",
    title: "Give the Hands a Job",
    excerpt:
      "The hands hold the box, or the frame crops them out. Idle fingers at the edge of a product still tend to look wrong.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "An ordinary adult at a wooden counter holding a plain kraft box with both hands, blank label, one shadow, face partly out of the top of frame, no text",
    cta: "Give the hands a job",
    answer:
      "Give the hands a job: they hold the box, or you crop them out. At Hearth Bakery an ordinary adult can hold the biscuit tin with both hands so the fingers have a task. If the fingers look wrong, crop above the wrists and let the tin sit on the wood with one shadow. Do not leave a spare hand resting in the corner with nothing to do. One product, blank label, no invented logo. The offer is spoken. The shop name goes in the caption. The tin remains the hero even when the hands are in frame. Hands either hold the tin or leave the frame. Let one ordinary adult support the biscuit tin so the blank label stays visible, judge the fingers, and if the grip fails crop above the wrists so the tin sits on the wood with one shadow. The first three seconds show the tin, held or cropped, while the voice says the tins stay on the counter until four. A spare hand at the edge, or extra digits, is rejected before posting. One product, fifteen to forty-five seconds. If a face remains in the crop, the caption says it is AI.",
    points: [
      {
        h: "Holding is the job",
        p: "Both hands can support the tin from the sides or from underneath, with the blank label still visible. Hearth Bakery's holder is one ordinary adult, not a crowd. Fingers should read as a grip, not as a fan of extra digits. If the grip fails, do not hide it behind glitter. Crop the hands and keep the tin. A real grip supports the tin from the sides or from underneath, with one adult in the shot. Crop when the fingers fail. The first three seconds show the blank label in that grip while the voice says the tins stay out until four. A fan of extra digits, or glitter used to hide a bad hand, is the still you throw out.",
      },
      {
        h: "Cropping is the other job",
        p: "A clean crop shows the tin, the wood, and one contact shadow, with no fingertips sneaking in at the edge. A half hand at the border is worse than no hand. The first three seconds can be this cropped tin, before any hello. The spoken offer still says the tins stay on the counter until four. The clean crop is tin, wood, and one contact shadow, with the border checked for fingertips. The opening three seconds show that cropped tin while the line says the tins stay on the counter until four. A half hand at the edge, or a hello before the product, is refused.",
      },
      {
        h: "The pack stays unmarked",
        p: "Hands must not be covering a logo you then invent elsewhere. The label stays blank whether it is held or sitting. Type Hearth Bakery in the caption. One product only. A realistic person, if their face remains in the crop, is labeled as AI. If the face is out of frame, you are posting the product, and the picture still does not invent a mark. Blank label whether the tin is held or sitting. Hearth Bakery goes in the caption. A face that remains in frame is labeled as AI. The first three seconds show the unmarked tin while the voice says the tins stay out until four. A logo invented beside the hands, or a second product, is rejected before posting.",
      },
    ],
    example:
      "Hearth Bakery tries one still of an adult holding the biscuit tin, label blank and visible. The fingers fail, so the approved frame crops the hands out and leaves the tin on the wood with one shadow. The spoken line says the tins stay out until four. The caption names Hearth Bakery. No idle hand remains at the edge. Try the hold, check the fingers, crop when the grip fails, then say the line. The first three seconds show the tin on the wood with one shadow while the voice says the tins stay out until four. An idle hand at the edge is thrown out. The caption names Hearth Bakery.",
    bridge:
      "Scro keeps the promo to one product, the tin, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export the held or cropped frame at 9:16. Approve either a true grip or a clean crop, keep one product, and export after the border is empty of spare fingers. The first three seconds show the tin while the offer says the tins stay out until four. A spare hand or a logo is rejected before posting. A visible realistic face is labeled as AI.",
    checks: [
      "Hands hold the tin or are cropped out.",
      "No spare hand sits at the edge.",
      "The label is blank.",
    ],
  },
  {
    id: 84,
    slug: "music-you-can-post",
    title: "Music You Are Allowed to Post",
    excerpt:
      "Skip a carol you have not cleared. Room tone is allowed. The voice can carry the reel without someone else's track.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult at a quiet bakery counter, mouth open as if speaking, no headphones and no speakers, warm light, no text",
    cta: "Use audio you can post",
    answer:
      "Use music you are allowed to post. An uncleared carol is not allowed under Jun's voice. Room tone is allowed: the small sound of Hearth Bakery, with one person speaking over it. If the shop has a track it actually has the right to use, that track can sit under the line. A famous seasonal song you do not have rights to cannot. The first three seconds still carry the spoken point. Captions in the upper-middle keep the offer readable if the viewer never hears the room. A realistic face or voice is labeled as AI. Room tone is the bed you can defend. Keep the quiet of the counter under Jun, take out any carol you cannot clear, let him say the offer, and burn the line even when the room is nearly silent. The first three seconds show him at the counter while he says they close at four, over that room tone. An uncleared seasonal song under the voice is rejected before posting. One speaker, fifteen to forty-five seconds, and the caption says the face and voice are AI.",
    points: [
      {
        h: "Default to room tone",
        p: "Record or keep the quiet of the counter under Jun's line. Room tone does not pretend to be a concert, and it does not borrow a carol. Hearth Bakery's reel can be speech plus that room. If the bed of sound is a song you cannot name a license for, take it out before you export. Silence under the voice is safer than the wrong song. Speech plus the quiet of the shop is the default. A track stays only when you can name the license, and a song you cannot clear comes out before export. The first three seconds show Jun speaking over room tone while he says they close at four. A carol bed with no license you can name is the mix you reject. Silence under the voice is the safer bed.",
      },
      {
        h: "The voice stays primary",
        p: "One person speaks the offer: they close at four, or the tins stay on the counter until then. Music, if it is allowed, stays quieter than that sentence. A track that covers the words forces the viewer onto captions alone. Burn the line upper-middle anyway, because TikTok and Shorts are often silent. The track is optional. The sentence is not. The offer stays louder than any allowed track, and the hour is burned upper-middle because the feed may be silent. The opening three seconds show the caption and Jun's mouth while he says they close at four. A track that covers the words is refused before posting.",
      },
      {
        h: "Label the realistic voice",
        p: "A realistic voice is labeled as AI whether the bed is room tone or a cleared track. The label is about the voice and the face, not about the music. Leave any platform disclosure where the app puts it. This choice of audio does not include a method for removing a label. Approve the dry, clear face before the mouth moves. Label the realistic voice for room tone and for a cleared track alike. Approve the dry face, then export, and leave the platform label where the app puts it. The first three seconds show a clear mouth while Jun says they close at four. A file whose caption never says the voice is AI is the post you reject.",
      },
    ],
    example:
      "Jun at Hearth Bakery says they close at four over the room tone of the shop. No carol is under the line. The caption sits upper-middle so a silent feed still gets the hour. The post is labeled as AI. A version that added a seasonal song the bakery could not clear was scrapped before upload. Room tone, a license check, the spoken hour, then the label. The first three seconds show Jun over the quiet shop while he says they close at four. The version with an uncleared seasonal song is rejected before posting. The caption says the voice is AI.",
    bridge:
      "Scro keeps one person speaking and can set that spoken line in one of 13 caption styles. Export the reel at 9:16. Label a realistic face or voice as AI, and leave the platform label on the post. Approve room tone under one speaker, set the line in a caption style, and export after the uncleared song is gone. The first three seconds show Jun while he says they close at four. An uncleared carol is rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "No uncleared carol is in the file.",
      "Room tone or a cleared track is the bed.",
      "The realistic voice is labeled as AI.",
    ],
  },
  {
    id: 85,
    slug: "burn-captions-for-a-silent-feed",
    title: "Burn Captions for a Silent Feed",
    excerpt:
      "Burn the captions into the picture. The same file can go to other apps and still read with the sound off.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult at a bakery counter, face in the upper half, empty upper-middle space above the counter, no letters and no text",
    cta: "Burn the captions in",
    answer:
      "Burn the captions into the file so the same reel can play in a silent feed on other apps. Jun speaks one line for Hearth Bakery, and that line is already in the picture, upper-middle, before you upload. TikTok and Shorts are often watched without sound. Burned-in captions still show the words when the file moves. One person speaks. A realistic face or voice is labeled as AI. Leave the platform label in place. The bottom and the right stay clear so the app buttons do not cover the burned-in line. If the words can fall off the file, they were never in the picture. Leave the upper-middle empty in the still, burn the line that they close at four into that band, export one vertical file, and label every upload. The first three seconds show those burned-in words and Jun's face while he says they close at four. A caption that exists only in the upload form, or words on the bottom and the right, is rejected before posting. One person speaks for fifteen to forty-five seconds, and the post says the face and voice are AI.",
    points: [
      {
        h: "Put the words in the pixels",
        p: "A caption that exists only in the upload form disappears when you download the file or send it to another app. Burn the line into the upper-middle of Jun's frame. The words match what he says: they close at four. Pick a caption look you can read on a phone. The safe zone is upper-middle, away from the bottom bar and the right-hand buttons. Burn the closing line into the upper-middle, match it to the spoken hour, and read it on a phone before upload. The first three seconds show the hour in the pixels while Jun says they close at four. A caption that disappears when the file moves to another app is the version you reject.",
      },
      {
        h: "Same file, more than one app",
        p: "Export once, vertical, and that file is the one you post. Burned-in captions help on TikTok and Shorts because the sound may be off and the app will not reuse another app's subtitle track. You still label a realistic face or voice as AI on each upload. The disclosure is not a substitute for the burned-in offer, and the offer is not a substitute for the disclosure. Export once, then post that same vertical file where silent autoplay is normal, and label each upload after the words are in the pixels. The opening three seconds show the burned-in offer while he says they close at four. A download that lost the words, or an upload that skips the AI line, is rejected before posting.",
      },
      {
        h: "One speaker, one line",
        p: "Only Jun is in the frame, so the caption has one voice to follow. A second line of chatter makes the burned-in text late. The first three seconds carry the point, and the burned-in words are visible in those seconds. Approve the still with empty upper-middle space before you add the type, so the face is not fighting the letters. One voice, so the burned-in text has one line to follow. Approve empty upper-middle space before the type goes in. The first three seconds show the words clear of the face while Jun says they close at four. A second line of chatter, or letters fighting the eyes, is the frame you refuse.",
      },
    ],
    example:
      "Jun at Hearth Bakery says they close at four. That sentence is burned into the upper-middle of the vertical file. The same file is what he can post where a silent autoplay is normal, including TikTok and Shorts. The bottom and right stay clear. The realistic face and voice are labeled as AI. The platform label stays on each upload. Empty upper-middle, burned-in hour, one vertical file, then the label. The first three seconds show the sentence in the picture while Jun says they close at four. A caption that lived only in the upload box is rejected before posting. The post says the face and voice are AI.",
    bridge:
      "Scro keeps one person speaking and offers 13 caption styles that can be burned into the frame. Export at 9:16. Label a realistic face or voice as AI, and leave the platform disclosure on the post. Burn one of 13 caption styles into the upper-middle, keep one speaker, and export after the words survive a download. The first three seconds show the burned-in line while Jun says they close at four. Words under the reel buttons are rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "Captions are burned into the picture.",
      "The words sit upper-middle.",
      "The realistic host is labeled as AI.",
    ],
  },
  {
    id: 86,
    slug: "fifteen-to-forty-five-seconds",
    title: "15 to 45 Seconds for the Reel",
    excerpt:
      "Cut the shop reel to 15 to 45 seconds. A reel can run from 3 seconds to 3 minutes. This is the practical length.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult speaking at a wooden bakery counter, mouth clear, quiet shop behind, warm light, no text and no timer",
    cta: "Cut a 15 to 45 second reel",
    answer:
      "Cut the reel to 15 to 45 seconds. That is the practical length for Jun at Hearth Bakery. A reel can run from 3 seconds to 3 minutes, so a longer file is possible, and this counter post does not need it. The first 3 seconds carry the point: they close at four. One person speaks. Captions sit upper-middle. A realistic face or voice is labeled as AI. The length here is the cut you export. It is not a claim about how quickly any tool renders the picture. Approve the still, then keep the speech inside that practical range. Decide the cut from the message, then stop. Put they close at four inside the opening, keep one supporting fact, hold the last line, and trim the middle until the export sits between fifteen and forty-five seconds. The first three seconds show Jun at the counter while he says they close at four. A greeting that pushes the hour later, or a bad still stretched only to fill time, is rejected before posting. One speaker, and the caption says the face and voice are AI. The length is the cut you export.",
    points: [
      {
        h: "Practical means the counter post",
        p: "Fifteen to forty-five seconds holds the closing time, one supporting fact, and a short hold on the last line. Jun does not need a tour. If the draft runs long, cut the middle, not the first three seconds and not the offer at the end. A three-second version is possible when the single sentence is the whole post. Three minutes is the long end, and the bakery does not have to use it. The practical counter post holds the closing time, one supporting fact, and the last line. Cut the middle when the draft runs long, and leave the open and the offer in place. The first three seconds show the hour while Jun says they close at four. A cut that removes the open, or the offer at the end, is the edit you reject.",
      },
      {
        h: "The open carries the point",
        p: "Whatever the final length, the first three seconds say they close at four. A greeting before that fact wastes the open. The caption in the upper-middle is readable for that whole opening. Bottom and right stay clear of the reel interface. One person remains in the corner so the cut does not spend time on entrances. The final length can move inside the practical range, and the hour still leads. Keep the upper-middle readable and the bottom and the right clear. The first three seconds show Jun in the corner while he says they close at four. A greeting before that fact, or an entrance that spends the open, is refused.",
      },
      {
        h: "Length is not a render promise",
        p: "Choose 15 to 45 seconds because that is the right cut for the message, then export the vertical file. Do not treat the length as a schedule for the software. A realistic face or voice is labeled as AI when the file goes up. Leave the platform label in place. Approve the still before the mouth moves, so you are not extending a bad frame just to fill time. Pick fifteen to forty-five seconds because the message fits there. Approve the still, then speak, and label the realistic voice. The first three seconds show a clear mouth while he says they close at four. A long file made by extending a bad frame, or a note that treats the runtime as a software schedule, is the export you reject.",
      },
    ],
    example:
      "Jun at Hearth Bakery exports a vertical reel that lands between 15 and 45 seconds. The first three seconds say they close at four. He holds that line at the end. Captions sit upper-middle. The post is labeled as AI. He does not stretch the file toward three minutes, and he does not treat the runtime as a promise about rendering. Hour in the open, a short middle, a hold at the end, then an export between fifteen and forty-five seconds. The first three seconds show Jun while he says they close at four. A file padded past that practical range is the cut you reject for this counter post. The caption says the host is AI.",
    bridge:
      "Scro keeps one person speaking and can set the line in one of 13 caption styles. Export the practical cut at 9:16. Label a realistic face or voice as AI, and leave any platform label on the post. Approve the still, keep the speech inside the practical cut, and export at 9:16 after the hour is still first. The first three seconds show Jun while he says they close at four. A greeting that delays the hour is rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "The export is 15 to 45 seconds.",
      "The first 3 seconds carry the point.",
      "The realistic voice is labeled as AI.",
    ],
  },
  {
    id: 87,
    slug: "cover-is-the-gift",
    title: "The Cover Is the Gift",
    excerpt:
      "The cover frame is the product. A title card in front of the tin throws away the picture people actually see first.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label centered on a wooden table, one shadow, sharp and quiet, no title card and no text",
    cta: "Use the product as the cover",
    answer:
      "The cover is the product, not a title card. Hearth Bakery's cover frame is the biscuit tin on the wooden table: blank label, one shadow, no words across the picture. People decide from that frame. A title card delays the tin and asks the generator to paint letters you then have to police. The offer is spoken inside the reel. The shop name goes in the caption, which is the right place for Hearth Bakery. One product. No invented logo. The first three seconds of the file can be this same cover, so the still and the open agree. People decide from the cover, so the cover is the tin. Choose the sharpest still of the single biscuit tin, confirm grain, contact shadow, and a blank label, use that frame as the cover and as the first frame, and speak over it. The first three seconds show that same tin while the voice says the tins stay on the counter until four. A title card, a festive banner, or lettering baked into the cover is rejected before posting. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Pick the tin frame",
        p: "Choose the sharpest still of the single tin and use it as the cover. Grain, contact shadow, and a blank label should all be visible. Hearth Bakery does not composite a festive banner over that still. A banner is a title card. If the tin is small in the frame, it is a weak cover even when the table looks pleasant. The sharp tin still is the cover. Grain, shadow, and blank label should all be visible, with no banner composited on top. The first three seconds show the tin large enough to be that cover while the voice says the tins stay out until four. A festive banner, or a tin that is small in the frame, is the cover you throw out.",
      },
      {
        h: "Keep type out of the picture",
        p: "The cover image has no shop name, no hour, and no slogan baked in. Those words belong in the caption and in the spoken offer: the tins stay on the counter until four. Burned-in captions, if you add them later in the video, are for the playing reel's upper-middle, not a reason to typeset the cover like a poster. Take the shop name, the hour, and any slogan off the cover first. They belong in the caption and in the spoken line. The opening three seconds show a wordless tin while the voice says the tins stay on the counter until four. A poster typeset on the cover is refused. Later burned-in captions, if you add them, belong in the playing reel's upper-middle.",
      },
      {
        h: "Match the cover to the open",
        p: "The first frame of the reel should be recognizably the cover tin, same table, same window side. A cover that shows a forest, a crowd, or a second product is a different promo. One product only. The practical cut of fifteen to forty-five seconds begins on that tin before any hello. The first frame has to be recognizably the cover tin, same table and same window side, before any hello. The first three seconds show the cover tin while the voice says the tins stay out until four. A cover of a forest, a crowd, or a second product is rejected before posting.",
      },
    ],
    example:
      "Hearth Bakery sets the cover to the biscuit tin with a blank label and one shadow on the wooden table. No title card sits on top. The reel opens on that same tin. The spoken line says the tins stay out until four, and the caption names Hearth Bakery. A cover made of lettering over a blurred table was not used. Sharp tin still, no title card, the reel opening on that frame, then the line. The first three seconds show the biscuit tin with a blank label and one shadow while the voice says the tins stay out until four. Lettering over a blurred table is the cover you reject.",
    bridge:
      "Scro keeps the promo to one product, and that product still is the cover, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export at 9:16. Set the product still as the cover, keep the label blank, and export after the open matches it. The first three seconds show that tin while the offer says the tins stay out until four. A title card is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The cover shows the tin.",
      "The cover has no title card.",
      "The label is blank.",
    ],
  },
  {
    id: 88,
    slug: "first-line-is-the-keyword",
    title: "The First Line Is the Offer",
    excerpt:
      "Say the offer in sentence one. A hello, the shop name, or a warm-up wastes the first three seconds Jun has.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult at a bakery counter looking into the lens, mouth open as if mid-sentence, warm light, no text",
    cta: "Say the offer first",
    answer:
      "Say the offer in the first spoken sentence. Jun at Hearth Bakery opens with the tins staying on the counter until they close at four. That sentence is the point. Hello, welcome, and the shop name are not the offer, and they can wait in the caption or disappear. One person speaks. The first three seconds carry those words, with the caption burned in the upper-middle so a silent feed on TikTok or Shorts still gets them. A realistic face or voice is labeled as AI. The practical cut is fifteen to forty-five seconds. Write the offer before you generate the talk, or the mouth will invent a hello. The sentence is that the tins stay on the counter until four. Approve a clear still, speak that sentence first, and burn the same words upper-middle. The first three seconds show Jun looking into the lens while he says the tins stay on the counter until four. Hello, welcome, or the shop name as sentence one is rejected before posting. One speaker, fifteen to forty-five seconds, and the caption says the face and voice are AI.",
    points: [
      {
        h: "Write sentence one first",
        p: "Before you generate the talk, write the offer as a single spoken sentence. For this bakery it is that the tins stay on the counter until four. If the sentence needs a greeting to make sense, it is not ready. The shop name Hearth Bakery can sit in the caption. The mouth starts on the offer, not on a wind-up. The offer is one spoken sentence, written first. Hearth Bakery can sit in the caption. The mouth starts on the offer. The first three seconds show his mouth already on that sentence while he says the tins stay on the counter until four. A wind-up before the point is the open you discard.",
      },
      {
        h: "Match the burned-in line",
        p: "The upper-middle caption shows the same offer in the first three seconds. A caption that says hello while the voice says the hour splits the open. Bottom and right stay clear for the reel interface. One of the caption looks should stay readable at phone size. The hold at the end can repeat the same sentence so the last line matches the first. The upper-middle caption shows the same offer during the open, and the ending holds that sentence again. The first three seconds show the burned-in words while Jun says the tins stay out until four. A caption that says hello while the voice says the hour is refused. Keep the bottom and the right clear.",
      },
      {
        h: "Label the realistic open",
        p: "A realistic face or voice that speaks the offer is labeled as AI. The label does not move the offer out of sentence one. Leave the platform disclosure where the app puts it. Approve the still, mouth clear, before the line is spoken. Label the realistic open without moving the offer out of sentence one. Approve the mouth, then the line, and leave the platform label where the app puts it. The first three seconds show Jun while he says the tins stay on the counter until four. A caption that never says the voice is AI is the post you reject.",
      },
    ],
    example:
      "Jun at Hearth Bakery looks up and says, first, that the tins stay on the counter until four. He does not say hello before it. The same words are burned upper-middle. The post is labeled as AI. The caption also carries the shop name. The reel stays inside fifteen to forty-five seconds and ends by holding that same offer. Written offer, clear still, sentence one, then the hold. The first three seconds show Jun while he says the tins stay on the counter until four. An open that says hello first is the cut you reject. The caption says the host is AI and also carries the shop name.",
    bridge:
      "Scro keeps one person speaking and can burn the first line in one of 13 caption styles. Export at 9:16. Label a realistic face or voice as AI, and leave the platform label on the post. Burn the first line in a caption style, keep one speaker, and export after sentence one is the offer. The first three seconds show Jun while he says the tins stay out until four. A hello ahead of the offer is rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "Sentence one is the offer.",
      "No hello comes before it.",
      "The realistic voice is labeled as AI.",
    ],
  },
  {
    id: 89,
    slug: "cartoon-cat-is-yours",
    title: "A Christmas Cat That Is Yours",
    excerpt:
      "Draw an original cat and use that same cat next time. A famous cat is someone else's character. A cartoon is not a real person.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "An original paper-cutout cat with a round head, one torn ear, and a short tail on one dark wooden board, no letters and no famous markings",
    cta: "Draw your own cat",
    answer:
      "Draw an original cat, and draw that same cat the next time. Hearth Bakery's paper cat has a round head, one torn ear, and a short tail. Those three marks are the model sheet. A famous cat, a studio animal, or a character from a film does not belong on the board. The cat is a cartoon or a paper-cutout, not a real person and not a photo of anyone's pet. One idea per reel, on one wooden board. The first three seconds carry one big hook title in the spoken language, unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before motion. Three marks are the whole model sheet: round head, one torn ear, short tail. Redraw the cat from that sentence, give the reel one idea such as the closing time, and approve the ear before the paper moves. The first three seconds show that cat and one English hook while the narrator says the bakery closes at four. A famous cat, a film animal, or a different ear is rejected before posting. The figure stays a drawing, the cut is fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Write the marks down",
        p: "Round head, one torn ear, short tail. Use those words every time Hearth Bakery brings the cat back. If a still returns a different ear, a longer body, or a costume you did not describe, reject it. The next reel should be recognizable as the same drawing before the hook is read. Original means you can redraw it from the sentence. Use those three marks every time, and compare the ear and the tail with the last reel before you approve. The first three seconds show the round head and torn ear while the narrator says they close at four. A longer body, a different ear, or a costume you did not describe is the still you reject.",
      },
      {
        h: "Keep it off the poster",
        p: "Do not name a famous cat, a film animal, or a mascot in the prompt. Those names pull in someone else's design. The cat can wear a plain red knit scrap if you describe the scrap as cloth, and that scrap should look the same next time too. The figure stays a drawing. Do not present it as a real baker or a real customer. Leave famous names out of the prompt. If the cat wears a red scrap, describe it as plain cloth and keep that scrap the same next time. The opening three seconds show the original cat on the board while the narrator says the closing time. A studio animal, or a drawing presented as a real baker, is refused.",
      },
      {
        h: "One board, one idea",
        p: "The cat lives on one wooden board. No blank grey strip and no second background. The day's reel has one idea, such as the closing time, and at most one arrow. If the voice is English, the hook title is English, unless on-screen text is off. Approve the cat's ear in the still before the paper moves. One wooden board, one idea, at most one arrow, and the ear approved in the still. The first three seconds show the hook and the torn ear while the narrator says they close at four. A grey strip or a second background is the frame you throw out. If on-screen text is off, the voice still opens on that hour.",
      },
    ],
    example:
      "Hearth Bakery draws the same paper cat for the closing-time reel and for the next day's reel: round head, one torn ear, short tail, on one wooden board. The English hook matches the English voice. There is no famous cat and no grey strip. The cat is a cartoon, not a person. Both stills are approved before motion. The three marks, the same cat on the next reel, one hook, then approval. The first three seconds show the torn ear and the English hook while the narrator says the bakery closes at four. A famous cat is rejected before posting. The figure is a cartoon.",
    bridge:
      "Scro draws the cat as a cartoon or a paper-cutout on one wooden board and keeps one idea. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Approve the ear, keep one idea on the board, and move the paper after the marks match. The first three seconds show the same cat and the hook while the narrator says they close at four. A famous character or a grey strip is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The cat's three marks match the last reel.",
      "No famous character is named.",
      "The figure is a drawing, not a real person.",
    ],
  },
  {
    id: 90,
    slug: "paper-board-stays-wooden",
    title: "The Board Stays Wooden",
    excerpt:
      "Keep every beat on one wooden board. A grey strip or a second background means the explainer changed tables.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "Paper-cutout shapes with white edges lying on one dark wooden board that fills the frame, visible wood grain, no grey strip and no letters",
    cta: "Stay on the wooden board",
    answer:
      "Keep the board wooden. Hearth Bakery's explainer stays on one dark wooden board from the first still to the last, with wood grain at the edges and no blank grey strip. A second background, a white void, or a cutaway room means the reel changed tables. The pieces are a cartoon or a paper-cutout. They are not real people. One idea only. The first three seconds carry one big hook title in the spoken language, unless on-screen text is off. At most one arrow. Approve the stills before motion so a later beat cannot swap the table. The board is the set, so every beat has to name it. Use the same dark wooden board, look for grain in the corners, and approve only when no grey bar, plaster, or sky has appeared. The first three seconds show that board and one hook while the narrator says the bakery closes at four. A white void, a cutaway room, or a cut to the real street is rejected before posting. One idea, fifteen to forty-five seconds, and the pieces stay drawings.",
    points: [
      {
        h: "Wood at every edge",
        p: "The prompt for every beat names the same dark wooden board. Hearth Bakery's closing-time reel, or any single bakery fact, should show grain in the corners, not a grey bar where a caption might have been planned. If a corner turns into plaster, sky, or a flat grey band, reject that still. The board is the set. Every beat's prompt names that dark board. Look at the corners and keep grain there. The first three seconds show wood at the edges and the hook while the narrator says they close at four. A grey band where a caption might have been planned is the still you reject.",
      },
      {
        h: "No second place",
        p: "Do not cut from the board to the real bakery and back. That cut is a second background. Paper pieces can move on the wood. The wood does not become a street. At most one arrow sits on the board. The hook title, when text is on, is in the spoken language and lives in the upper-middle of that same board. Confirm the wood first, then let paper move on it. The wood stays wood. The opening three seconds show the board and at most one arrow while the narrator says the closing time. A cut from the board to the real bakery is refused. When text is on, the hook stays in the spoken language.",
      },
      {
        h: "Approve the surface first",
        p: "Before motion, check that each still is the same board and that no grey strip appeared under the pieces. A cartoon figure on the board is a drawing, not a customer. One idea fills the reel. A practical length of fifteen to forty-five seconds should not need a new location to stay interesting. Before motion, confirm each still is the same board and that no grey strip appeared under the pieces. The first three seconds show the wooden surface and the one idea while the narrator says they close at four. A cartoon presented as a customer, or a new location added to keep the reel busy, is the frame you throw out.",
      },
    ],
    example:
      "Hearth Bakery explains the closing time with paper pieces on one dark wooden board. Every beat shows the same grain. There is no grey strip and no cut to the street. One arrow at most points at a paper door. The English hook matches the English voice. The stills are approved before the paper moves. The pieces are drawings, not people. One board, grain in every beat, one arrow at most, then approval. The first three seconds show the dark wood and the English hook while the narrator says the bakery closes at four. A grey strip, or a cut to the street, is rejected before posting.",
    bridge:
      "Scro keeps the explainer as a cartoon or a paper-cutout on one wooden board, with one idea. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Approve the wooden surface, keep one idea, and move the paper after the corners still show grain. The first three seconds show the same board and the hook while the narrator says they close at four. A second background is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "Every beat uses the same wooden board.",
      "No grey strip appears.",
      "There is no second background.",
    ],
  },
  {
    id: 91,
    slug: "one-arrow-on-the-board",
    title: "One Arrow on the Board",
    excerpt:
      "Use at most one arrow. A second arrow splits the idea. The board stays wooden, and the drawing is not a real person.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "One paper arrow pointing at a plain paper box on one dark wooden board, white cut edges, no other arrows and no letters",
    cta: "Use one arrow",
    answer:
      "Use at most one arrow on the board. Hearth Bakery's reel about where the tins sit can point once, at the paper tin. A second arrow, a circle of arrows, or a pointer on every beat turns one idea into a diagram with no hero. The pieces are a cartoon or a paper-cutout on one wooden board, with no blank grey strip. They are drawings, not real people. The first three seconds carry one big hook title in the spoken language, unless on-screen text is off. Approve the stills before motion. Zero arrows is allowed. Two is not. Count arrows before you fall in love with the diagram. The idea is that the tins are on the counter. Add zero arrows or one arrow at the paper tin, count again on every later beat, and approve before motion. The first three seconds show the English hook while the narrator says the tins are on the counter. A second arrow, a circle of arrows, or a pointer on every beat is rejected before posting. The pieces are drawings on one board, the cut is fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Count before you approve",
        p: "Look at each still and count arrows. The number is zero or one for the whole reel, not one per beat that adds up. Hearth Bakery's single arrow can point at the paper tin and then stay or leave. If a later beat adds another pointer, reject that still. The hook title is not an arrow. It is the one big line in the spoken language, unless text is off. Count across the whole reel, and keep the total at zero or one. The single arrow, if you use it, points at the paper tin. The first three seconds show the hook, and the arrow may arrive with the tin, while the narrator says the tins are on the counter. A later beat that adds another pointer is the still you reject. The hook is the line, in the spoken language unless text is off.",
      },
      {
        h: "The arrow serves one idea",
        p: "The idea might be that the tins are on the counter. The arrow points there and does not also point at the door, the hours, and a queue. Those are other reels. One wooden board holds the tin and the arrow. No grey strip. No second background. A paper figure beside the tin is a drawing, not a photograph of staff. Point at the counter, then stop. The door, the hours, and a queue are other reels. The opening three seconds show the paper tin and the one arrow while the narrator says the tins are on the counter. A second background, a grey strip, or a photograph of staff is refused.",
      },
      {
        h: "Motion keeps the count",
        p: "Approve the stills so the moving paper cannot sprout extra arrows. If on-screen text is off, the voice carries the idea and the single arrow still has to be enough. A practical cut of fifteen to forty-five seconds does not need a second pointer to stay clear. The first three seconds show the hook, then the arrow can appear with the tin. Approve the stills so the moving paper cannot sprout extra arrows. The practical cut does not need a second pointer. The first three seconds show the hook while the narrator says the tins are on the counter. A second arrow added because the reel felt thin is the beat you throw out. If text is off, the voice still carries the idea.",
      },
    ],
    example:
      "Hearth Bakery's paper reel points one arrow at a blank paper tin on a wooden board. The English hook says the tins are on the counter. No second arrow appears in later beats. There is no grey strip. The shapes are drawings, not people. The stills are approved before motion. A version with three pointers was rejected. One idea, one arrow at the blank paper tin, a count on later beats, then approval. The first three seconds show the English hook while the narrator says the tins are on the counter. The version with three pointers is rejected before posting.",
    bridge:
      "Scro draws this as a cartoon or a paper-cutout on one wooden board and keeps one idea. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Approve a reel with one arrow or none, keep one idea, and move the paper after the count is stable. The first three seconds show the hook in the spoken language while the narrator says the tins are on the counter. A second arrow or a grey strip is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The reel has one arrow or none.",
      "The arrow serves one idea.",
      "The board has no grey strip.",
    ],
  },
  {
    id: 92,
    slug: "voiceover-on-a-cartoon-christmas",
    title: "Voiceover on a Cartoon Christmas",
    excerpt:
      "One narrator, short lines, and one idea. The cartoon on the wooden board does not get a second voice or a second topic.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "A simple original paper-cutout bakery counter on one dark wooden board, white paper edges, quiet and uncluttered, no letters and no grey strip",
    cta: "Keep one narrator",
    answer:
      "Use one narrator, short lines, and one idea. Hearth Bakery's cartoon Christmas reel has a single voice explaining one fact, such as the closing time, over a paper-cutout or a cartoon on one wooden board. Short lines fit the first three seconds and the beats that follow. A second narrator, a conversation, or a stack of policies breaks the reel. The drawing is not a real person. The first three seconds carry one big hook title in the spoken language, unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before motion. One voice, short lines, one fact. Write the closing time in lines you can say in a breath, draw that fact on one wooden board, approve the stills, and lock the narration only after the picture is right. The first three seconds show the paper counter and one English hook while the narrator says they close at four. A second narrator, a conversation, or a stack of policies is rejected before posting. The shapes stay drawings. Fifteen to forty-five seconds. If the voice sounds real, the caption says it is AI.",
    points: [
      {
        h: "One voice, short sentences",
        p: "Write lines you can say in one breath. The narrator might say they close at four, then that the tins are on the counter, then stop. Hearth Bakery does not add a second voice to play a customer. A dialogue wants faces you do not have, and a cartoon customer is still a drawing, not a real person who visited the shop. One-breath lines, closing time first, and no second voice. The first three seconds show the paper counter while the narrator says they close at four. A dialogue that wants a customer's face is the script you reject. A cartoon customer would still be a drawing, so this reel simply does not add one.",
      },
      {
        h: "The picture holds one idea",
        p: "The board shows the pieces for that one fact. A paper door, a paper tin, at most one arrow. No blank grey strip and no cut to another background. If the voiceover is English, the big hook title is English and matches the first line, unless on-screen text is off. Four beats are plenty inside fifteen to forty-five seconds. After the hook is set, draw a paper door, a paper tin, and at most one arrow, all in service of the closing time. The opening three seconds show the English hook while the narrator says they close at four. A grey strip, a second background, or a second policy in the picture is refused.",
      },
      {
        h: "Approve, then let it speak",
        p: "The stills of the board are approved before the paper moves and before you lock the narration to the picture. If a beat redraws the board into a room, fix the still. The narrator does not paper over a bad frame by talking faster. One idea remains the entire spoken script. Approve the board, then lock the voice. Fix a bad still before anyone talks faster. The first three seconds show the approved board while the narrator says they close at four. A beat that redraws the board into a room, or a script that grew a second idea, is the version you throw out.",
      },
    ],
    example:
      "One narrator explains Hearth Bakery's closing time over a paper counter on a wooden board. The lines are short. The English hook in the first three seconds matches the voice. There is no second speaker, no grey strip, and at most one arrow. The shapes are cartoons, not customers. Stills are approved before motion. Short lines, one board, an approved still, then the voice. The first three seconds show the paper counter and the English hook while the narrator says they close at four. A second speaker is rejected before posting. The shapes are cartoons.",
    bridge:
      "Scro plays one idea as a cartoon or a paper-cutout on one wooden board. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Approve the stills, keep one narrator on one idea, and export the moving paper after that. The first three seconds show the hook while the narrator says they close at four. A second voice or a grey strip is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "Only one narrator speaks.",
      "The lines stay short.",
      "The reel contains one idea.",
    ],
  },
  {
    id: 93,
    slug: "shop-name-in-the-caption",
    title: "Shop Name in the Caption",
    excerpt:
      "Put Hearth Bakery in the caption. The biscuit tin keeps a blank label. A name painted on the box is an invented logo.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a completely blank label on a wooden table, one shadow, no letters and no logo",
    cta: "Put the shop name in the caption",
    answer:
      "Put the shop name in the caption, not on the box. Hearth Bakery's biscuit tin wears a blank label. You type the name Hearth Bakery into the caption yourself after the picture is done. A word on the lid, even the true name, is lettering the generator will distort, and an extra crest beside it is an invented logo. One product. The offer is spoken: the tins stay on the counter until four. The first three seconds show the blank tin. The caption is where the name lives. The picture ends before the name begins. Export the biscuit tin with a fully blank label, read the lid for letters, type Hearth Bakery in the caption yourself, and speak the offer over the clean tin. The first three seconds show that blank tin while the voice says the tins stay on the counter until four. A word on the lid, even the true shop name, or a crest beside it, is rejected before posting. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Type the name yourself",
        p: "The caption is the place for Hearth Bakery. Write it there, spelled the way the shop spells it, and keep it out of the prompt if the prompt would paint it onto the tin. A spoken offer can say the tins stay out until four without saying the name is printed on the metal. Viewers read the name in the caption while they see a clean product. The caption is where the name is spelled, the way the shop spells it. Keep the prompt from painting it onto the tin. The first three seconds show the clean product while the voice says the tins stay out until four. Metal that carries the name in type is the still you reject.",
      },
      {
        h: "A true name can still be a bad print",
        p: "Even the real shop name, once painted by the picture, tends to warp, duplicate, or grow a mark you do not use. Treat any lettering on the label as a fail. Blank means blank. One shadow under the tin should still be visible so you are judging a product on a table, not a logo presentation. Reject lettering on the label first, even when a few letters look close, and only then judge the shadow. Confirm the contact shadow is still there so you are judging a tin on a table. The opening three seconds show the unmarked lid and the shadow while the line says the tins stay on the counter until four. Warped spelling, or an extra mark the picture grew, is refused.",
      },
      {
        h: "One tin, spoken offer",
        p: "Do not add a second pack that carries the name in type. One product holds the frame. The practical reel of fifteen to forty-five seconds opens on that tin. If a person speaks, they speak the offer. They do not need to be in the cover frame. The caption continues to carry Hearth Bakery when the file is posted. One tin holds the practical reel. The offer is spoken. The name stays in the caption when the cover has no person in it. The first three seconds show the blank tin while the voice says the tins stay out until four. A second pack that carries the name in type is the frame you throw out.",
      },
    ],
    example:
      "Hearth Bakery exports a reel of one biscuit tin with a fully blank label on the wooden table. The spoken line says the tins stay on the counter until four. The caption reads Hearth Bakery. No version with the name etched on the lid is kept, even when the spelling looked almost right. One shadow touches the base. Blank lid, a lettering check, the spoken offer, then the typed name. The first three seconds show the tin on the wooden table while the voice says the tins stay on the counter until four. The lid with the name etched on it is rejected before posting, even when the spelling looked close.",
    bridge:
      "Scro keeps the promo to one product, the tin, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption, not on the tin. Export the reel at 9:16. Keep the label blank, put the shop name in the caption, and export after the lid check. The first three seconds show the unmarked tin while the offer says the tins stay out until four. Letters on the lid are rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The label on the tin is blank.",
      "The shop name is in the caption.",
      "No logo was added to the lid.",
    ],
  },
  {
    id: 94,
    slug: "repeat-the-set-on-boxing-day",
    title: "Repeat the Set on Boxing Day",
    excerpt:
      "Use the same light on Boxing Day. Lena's window side and lamp stay put. A new mood is a new set, and it drifts the face.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "An ordinary adult in a small shop beside the same window, soft daylight from one side, face visible, plain interior, no text",
    cta: "Repeat the Boxing Day light",
    answer:
      "Repeat the same light on Boxing Day. Lena's wool shop keeps the window on the same side and the same lamp, if the lamp was on, so the shadow on her face matches the earlier still. The set is part of the lock. A new color grade, a new time of day, or a new room makes a comparison of the hairline and jaw harder, and it often arrives as a new person. Clothes stay the approved knit unless you deliberately change clothes only. Approve the Boxing Day still before motion. Life photos reuse that host. A realistic face is labeled as AI. Light is part of the lock on Boxing Day. Note the window side and whether the lamp is on, put that note in the prompt, check the bright cheek is on the same side, and only then compare hairline and jaw. The first three seconds show Lena in that same light and the approved knit while she says the room is the wool shop from earlier in the week. A flipped shadow, a new grade, or a new person is rejected before posting. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "Write the light down",
        p: "Note the window side and whether the lamp is on when you approve the first still of the week. Boxing Day uses that note in the prompt. Lena should have the bright cheek on the same side. If the shadow flipped, the set changed. Reject the still even if the sweater color looks close. Light is how you know the room is the room. The window side goes into the Boxing Day prompt before you trust the sweater color. Generate, then read the shadow direction. The first three seconds show the same window light on her face while Lena says the lamp and the window stayed. A flipped shadow is the still you reject.",
      },
      {
        h: "Then check the face",
        p: "With the light matched, compare hairline and jaw to the lock. A wardrobe change changes clothes only, so the red knit can stay and must not bring a new head. If you swap a prop, the prop stays out of the jawline. Life photos on Boxing Day reuse this same host in this same light logic, not a dusk version that is really a different adult. Match the light first, then compare hairline and jaw. The red knit is clothes only, and props stay off the jawline. The opening three seconds show the matched cheek and the knit while she says the face is the lock. A dusk grade that is really a different adult is refused.",
      },
      {
        h: "Label the repeated set",
        p: "A realistic face is labeled as AI on the Boxing Day post the same as on the eve post. Matching the light does not make the face a photograph of a guest. Leave the platform disclosure where the app puts it. Export the vertical file only after the still has passed both the light check and the face check. The Boxing Day caption says the face is AI, the platform disclosure stays where the app puts it, and the export waits for both the light check and the face check. The first three seconds show the repeated set while Lena says she is the same host. A realistic face with the AI line missing is the post you reject.",
      },
    ],
    example:
      "On Boxing Day, Lena stands in the wool shop with the window on the same side as the earlier reel and the same lamp. The red knit matches. The hairline and jaw match the lock, so the still is approved before motion. The post is labeled as AI. A dusk grade that flipped the shadow was rejected. A life photo that week uses the same host. Light note, same window, face check, then motion. The first three seconds show the familiar window side and the red knit while Lena says the set matches the earlier reel. The dusk grade that flipped the shadow is thrown out. The caption says the face is AI.",
    bridge:
      "Scro locks one host face, and a wardrobe change changes clothes only, so the Boxing Day light can stay while clothes stay approved. Approve the stills before motion. Life photos reuse that host. Export at 9:16. Match the approved light, lock the face, approve the still, and export after both checks. The first three seconds show the same window side while Lena says the face is the lock. A flipped shadow is rejected before posting. The caption says the face is AI.",
    checks: [
      "The window side matches the earlier still.",
      "Hairline and jaw match the lock.",
      "The realistic face is labeled as AI.",
    ],
  },
  {
    id: 95,
    slug: "realistic-voice-say-it-is-ai",
    title: "A Realistic Voice, Say It Is AI",
    excerpt:
      "If the voice sounds real, say it is AI. Leave the platform's own label where the app puts it, beside the offer.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult at a bakery counter, face and mouth clearly visible, quiet background, warm light, no text",
    cta: "Label the realistic voice",
    answer:
      "If the voice is realistic, say that it is AI. Jun speaks for Hearth Bakery in a voice that sounds like a person, so the caption and the post say the voice is AI. One person speaks. You also say it when the face is realistic. Leave the platform's own disclosure where the app places it. The spoken offer can still be sentence one: they close at four. The disclosure sits with the post. It does not replace the offer, and the offer does not replace the disclosure. The disclosure is a true sentence beside the offer, and it has an order. Approve the still, let Jun say they close at four as sentence one, write in the caption that the voice and the face are AI, and leave the platform label where the app puts it. The first three seconds show him at the counter while he says they close at four. A realistic file whose caption never says the voice is AI, or a disclosure that replaced the offer, is rejected before posting. One speaker, fifteen to forty-five seconds.",
    points: [
      {
        h: "Say it in the caption",
        p: "Write a plain disclosure that the voice is AI, and that the face is AI if the face is realistic too. Put it where viewers see it, with the shop line. Hearth Bakery's offer stays intact: they close at four. The disclosure is an extra true sentence, not a substitute for the hour. Burned-in captions can carry the offer in the upper-middle while the post copy carries the AI label. Write the disclosure next to the shop line, and keep the hour intact. The offer can be burned upper-middle while the post copy says the voice is AI. The first three seconds show the closing time while Jun says they close at four. A caption where the AI line replaced the hour is the version you reject.",
      },
      {
        h: "Leave the platform label",
        p: "Apps often add their own mark when a face or voice is realistic. Leave that mark where the app placed it. The job in this reel is to say the voice is AI and to keep speaking as one person, Jun. A cartoon voiceover on a drawing is a different kind of file. This one is realistic, so it is labeled. After the offer is sentence one, write the disclosure. The app's own mark stays where it was placed. One person speaks, and this realistic file is labeled in the caption as well. The opening three seconds show Jun while he says they close at four. A post missing the line that the voice is AI is rejected. The caption still says the voice is AI.",
      },
      {
        h: "The label does not fix the still",
        p: "Saying the voice is AI does not excuse a drifted face, indoor snow, or a buried offer. Approve the still first. Then speak. Then label. Export at a practical fifteen to forty-five seconds if this is the counter post. The first three seconds still carry the closing time. The AI line is honesty beside that point, not instead of it. Still, then speech, then label. The AI line does not excuse a bad picture. The first three seconds show a clear mouth while Jun says they close at four. Indoor snow, a drifted face, or a buried offer is rejected before posting, even when the disclosure is ready.",
      },
    ],
    example:
      "Jun at Hearth Bakery says they close at four in a realistic voice. The caption states that the voice and the face are AI. A platform label, if the app adds one, stays on the upload. One person speaks. The offer remains sentence one, with the disclosure written beside it in the post. Still, offer, AI line in the caption, upload. The first three seconds show Jun while he says they close at four. A realistic voice with no AI disclosure is rejected before posting. Any platform label stays on the upload.",
    bridge:
      "Scro keeps one person speaking and can set the spoken line in one of 13 caption styles. Export at 9:16. Label a realistic face or voice as AI, and leave the platform's own label on the post. Speak the offer, set the line in a caption style, label the realistic voice, and export after the hour is still sentence one. The first three seconds show Jun while he says they close at four. A post whose caption never says the voice is AI is rejected. Leave the platform label where the app puts it.",
    checks: [
      "The caption says the voice is AI.",
      "Any platform label is left in place.",
      "One person speaks the offer.",
    ],
  },
  {
    id: 96,
    slug: "four-beats-for-one-policy",
    title: "Four Beats for One Policy",
    excerpt:
      "Use four beats for one policy. Shipping or returns, not both. A second rule is a second reel on the same wooden board.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "A short row of simple paper shapes on one dark wooden board, a plain box shape among them, white paper edges, no letters and no grey strip",
    cta: "Explain one policy",
    answer:
      "Use four beats for one policy, and make that policy shipping or returns, not both. This Hearth Bakery reel is shipping only: an order placed today leaves in the morning. Beat one is the hook. Beat two is the order. Beat three is the morning departure. Beat four is the single confirmation. Returns belong in another reel. The picture is a cartoon or a paper-cutout on one wooden board, not a real customer. One idea. The first three seconds carry one big hook title in the spoken language, unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before motion. Pick shipping and stop. The sentence is that an order placed today leaves in the morning. Map the hook, the order, the departure, and the confirmation, draw those four beats on one wooden board, and approve each still before motion. The first three seconds show the English hook while the narrator says an order placed today leaves in the morning. A returns rule, the closing time, or the menu in this file is rejected before posting. One idea, fifteen to forty-five seconds, and the shapes stay drawings.",
    points: [
      {
        h: "Pick shipping and stop",
        p: "Write the one rule in a sentence before you draw: an order placed today leaves in the morning. Hearth Bakery does not append the returns rule, the closing time, and the menu. If a beat starts explaining a second policy, cut the beat. Four beats are the structure for the one rule, not four policies. Short spoken lines match the beats. Write the shipping rule before you draw, and give each beat a piece of that rule. Cut a beat the moment it starts a second policy. The first three seconds show the hook while the narrator says an order placed today leaves in the morning. The returns rule sharing this reel is the material you reject.",
      },
      {
        h: "Draw it on one board",
        p: "Paper shapes for the order and the departure stay on one wooden board. No blank grey strip, no second background, and at most one arrow pointing at the parcel. The shapes are drawings. They are not photos of customers and not a real person. If the narrator speaks English, the hook title is English, unless on-screen text is off. Paper shapes for the order and the departure stay on one board, with at most one arrow on the parcel. The opening three seconds show those shapes and the English hook while the narrator says the order leaves in the morning. A grey strip, a second background, or a photo of a customer is refused.",
      },
      {
        h: "Approve the four stills",
        p: "Each beat is a still you approve before motion, so the board and the blank faces of the paper stay consistent. The first three seconds hold the hook. A practical cut of fifteen to forty-five seconds fits four short beats. The returns queue can be tomorrow's file. It does not share this one. Four stills, each approved, with the board unchanged, and the returns queue saved for another file. The first three seconds show the hook while the narrator says an order placed today leaves in the morning. A fifth beat that adds a second rule is the one you throw out.",
      },
    ],
    example:
      "Hearth Bakery's paper reel has four beats on one wooden board, all about shipping: the hook, the order, the morning departure, and a simple confirmation. No returns rule appears. The English hook matches the voice. One arrow at most. No grey strip. The pieces are cartoons, not customers. Stills are approved before motion. The shipping sentence, four beats, one arrow at most, then approval. The first three seconds show the English hook on the wooden board while the narrator says an order placed today leaves in the morning. A returns rule in this file is rejected before posting.",
    bridge:
      "Scro draws the four beats as a cartoon or a paper-cutout on one wooden board and keeps one idea. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Approve the four stills, keep one idea, and move the paper after the policy stays singular. The first three seconds show the hook in the spoken language while the narrator says an order placed today leaves in the morning. A second policy or a grey strip is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "The reel explains only shipping.",
      "Four beats stay on one board.",
      "No real customer's face appears.",
    ],
  },
  {
    id: 97,
    slug: "counter-height-camera",
    title: "Camera at Counter Height",
    excerpt:
      "Set the camera at counter height, on Jun's eye line. A ceiling view shows the top of his head and hides the offer in his mouth.",
    locale: "en",
    landingPath: "/talking-head",
    tags: host,
    scene:
      "An ordinary adult behind a wooden bakery counter, camera at eye level, face and eyes clear, counter in the lower frame, no text",
    cta: "Shoot from the counter",
    answer:
      "Set the camera at counter height, on the eye line, not up at the ceiling. Jun speaks for Hearth Bakery with his eyes level with the lens and the counter in the lower part of the frame. A high angle shows the top of the head, shrinks the mouth, and makes the first three seconds harder to read. One person speaks. Captions sit upper-middle, so the face should already be high enough that the words do not cover the eyes. A realistic face or voice is labeled as AI. Approve this height in the still before motion. The lens belongs at the counter, on the eye line. Place it there, check both eyes and the mouth, leave upper-middle room for the caption, and approve the height before motion. The first three seconds show his eyes level with the lens while he says they close at four. A ceiling view, the crown of the head, or a mouth shrunk by a high angle is rejected before posting. Hold one speaker for fifteen to forty-five seconds, and the caption says the face and voice are AI.",
    points: [
      {
        h: "Eyes level with the lens",
        p: "The prompt should say eye-level, counter height, one adult behind the wood. You should see both eyes and the mouth, not the crown of the head and a wide stretch of floor. Hearth Bakery's lamp stays in its usual place so this angle matches the other posts from the same corner. If the lens is above the eyebrows, lower it and regenerate. The prompt says eye-level and counter height, the usual lamp stays, and the lens comes down if it sits above the eyebrows. The first three seconds show both eyes and the mouth while Jun says they close at four. A wide stretch of floor and the top of the head is the still you reject.",
      },
      {
        h: "Leave room for the caption",
        p: "With the eyes on the eye line, the upper-middle can still hold the burned-in line about closing at four. The bottom and the right stay clear for the reel interface. A ceiling camera pushes the face into the bottom, which is exactly where the app buttons live. One person only, so nobody else blocks the eye line. Frame the eyes on the eye line first, then burn the closing line upper-middle, and leave the bottom and the right clear. The opening three seconds show the face at counter height while he says they close at four. A ceiling camera that pushes the face into the buttons, or a second person blocking the eye line, is refused.",
      },
      {
        h: "Then label the take",
        p: "A realistic face or voice from this honest angle is labeled as AI. The flattering high angle is not a reason to skip the disclosure, and the eye-level frame is not a photograph of a guest. Leave the platform label where the app puts it. The practical cut of fifteen to forty-five seconds uses this height for the whole file. This eye-level take is labeled as AI, the platform label stays where the app puts it, and the height holds for the whole file. The first three seconds show that angle while Jun says they close at four. A high angle kept so the file can skip the line that the face is AI is the export you reject.",
      },
    ],
    example:
      "Jun at Hearth Bakery is framed at counter height, eyes level with the lens, counter along the lower frame. He says they close at four, captioned upper-middle. The post is labeled as AI. A ceiling still that showed the top of his head was rejected before he spoke. One person holds the corner for the whole reel. Eye level, a mouth check, the upper-middle line, then speech. The first three seconds show Jun's eyes level with the lens while he says they close at four. The ceiling still is thrown out before he speaks. The caption says the host is AI.",
    bridge:
      "Scro keeps one person speaking from that eye-level still and can set the line in one of 13 caption styles. Export at 9:16. Label a realistic face or voice as AI, and leave the platform label on the post. Approve the eye-level still, set the line in a caption style, and export after the lens is on the eyes. The first three seconds show Jun at counter height while he says they close at four. A ceiling angle is rejected before posting. The caption says the face and voice are AI.",
    checks: [
      "The camera is at eye level.",
      "The ceiling is not the angle.",
      "The realistic host is labeled as AI.",
    ],
  },
  {
    id: 98,
    slug: "reject-a-still-that-changed-face",
    title: "Reject a Still That Changed the Face",
    excerpt:
      "Hairline and jaw have to match the lock. If either moved, reject the still. A nicer face is still the wrong host.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: face,
    scene:
      "Close view of an ordinary adult's face in soft window light, hairline and jaw clearly visible, natural skin, no text",
    cta: "Reject a drifted face",
    answer:
      "Reject a still that changed the hairline or the jaw. Lena's lock is those two lines plus the way the eyes sit. A wool-shop frame that looks pleasant and fails either line is the wrong host. Do not approve it because the red knit is right. Clothes can change only as clothes. The face cannot come along for the ride. Compare the still with the reference before any motion. Life photos must pass the same test, because they reuse that host. A realistic face is labeled as AI. The platform label stays on the post. Hairline first, jaw second, prop out of the way, motion last. Follow the hairline from temple to temple, check jaw width and chin in the same light, move anything covering the jaw, and allow motion only on a match. The first three seconds show the matched hairline and jaw while Lena says she is the locked host. A smoother hairline or a narrower jaw is rejected before posting, even when the red knit is right. One host, fifteen to forty-five seconds, and the caption says the face is AI.",
    points: [
      {
        h: "Check the hairline first",
        p: "Put the still beside the lock and follow the hairline from temple to temple. Lena's wool-shop frame should match that path, including the little unevenness you already accepted. A smoother, higher, or broken hairline is a new person. Reject it. Do not average it with the good frames and hope the moving clip settles. Set the still beside the lock and trace the hairline, including the unevenness you already accepted. The first three seconds show that hairline in the wool shop while Lena says the face matches. A smoother, higher, or broken hairline is the frame you reject. Waiting for the moving clip to settle it is how a wrong host gets posted.",
      },
      {
        h: "Then check the jaw",
        p: "The jaw width and the chin should match the lock in the same light. A narrower jaw that arrived with a new sweater is a failed wardrobe change. Scro's rule on this host is that clothes change only, which you enforce by throwing out the still. Props must not cover the jaw during the check. If they do, move the prop and look again. Measure the jaw after the hairline. Props stay off the chin during the check. A wardrobe change that brought a new head is thrown out. The opening three seconds show the jaw clear of the sweater collar while she says the clothes were the only swap you allowed. A narrower jaw that arrived with a new sweater is refused.",
      },
      {
        h: "The same test for life photos",
        p: "A later life photo reuses the host only if hairline and jaw still match. A festive street is not a new identity. Approve that still before motion too. Label the realistic face as AI. Leave any platform disclosure where the app puts it. Export the vertical file only from stills that survived both checks. The life photo takes the same two tests, and it is approved before motion. The first three seconds show the errand or the shop with the matched jaw while Lena says the host is unchanged. A festive street that became a new identity is the still you reject. The caption says the face is AI.",
      },
    ],
    example:
      "Lena's new wool-shop still is compared with the lock. The hairline matches and the jaw matches, so it can move. Another still in the same red knit has a narrower jaw. That one is rejected, even though the sweater looked correct. The life photo the next day is held to the same hairline and jaw. The posts are labeled as AI. Hairline, jaw, prop moved, then motion. The first three seconds show the matched face while Lena says this is the lock. The red-knit still with a narrower jaw is rejected before posting. The caption says the face is AI.",
    bridge:
      "Scro locks one host face, and a wardrobe change changes clothes only, which is why a new jaw is rejected in the still. Approve the stills before motion. Life photos reuse that host. Export at 9:16. Compare the still with the lock, approve only the match, and export after both lines agree. The first three seconds show the hairline and jaw while Lena says she is the same host. A new jaw is rejected before it moves. The caption says the face is AI.",
    checks: [
      "The hairline matches the lock.",
      "The jaw matches the lock.",
      "A mismatched still is rejected before motion.",
    ],
  },
  {
    id: 99,
    slug: "one-palette-for-the-week",
    title: "One Palette for the Week",
    excerpt:
      "Stay with red, green, wood, and paper. The wall stays neutral. A new accent midweek makes the bakery look like a different shop.",
    locale: "en",
    landingPath: "/product-promo",
    tags: product,
    scene:
      "Still life of one plain biscuit tin with a blank label, a narrow red ribbon, kraft paper, and a small green sprig on a wooden table, neutral wall, no text",
    cta: "Keep one weekly palette",
    answer:
      "Keep one palette for the week: red, green, wood, and paper. The wall stays neutral. Hearth Bakery's biscuit tin can wear a red ribbon, sit on wood, rest on kraft, and share the table with a small green sprig. The wall behind stays warm grey or off-white. Purple light, gold dust, and a new accent each morning make every reel look like a different shop. One product, blank label, no invented logo. The offer is spoken. The shop name goes in the caption. The same palette is the Boxing Day frame too. Four materials and a quiet wall, repeated until Boxing Day. Red is the ribbon, green is a small sprig, wood is the table, paper is kraft or the blank label, and the wall is named warm grey before you generate. The first three seconds show the tin inside this palette while the voice says the tins stay on the counter until four. Purple light, gold dust, or a wall that picked up the ribbon's red is rejected before posting. One product, fifteen to forty-five seconds, and a realistic voice is labeled as AI.",
    points: [
      {
        h: "Four materials, one wall",
        p: "Red is the ribbon. Green is a small sprig or the soft tree in the back, not a green wall. Wood is the table. Paper is kraft or the blank label. Hearth Bakery names the wall as warm grey so it does not join the palette as a fifth loud color. If the wall picks up the ribbon's red, the grade escaped and the still fails. Assign each material, then check the wall. Red ribbon, small green sprig, wooden table, kraft paper, warm grey plaster. The first three seconds show those four materials and the neutral wall while the voice says the tins stay out until four. A green wall, or a fifth loud color, is the still you reject.",
      },
      {
        h: "Do not add a midweek color",
        p: "A blue gel, a glitter pass, or a new metallic wrap is a different promo. Keep the tin matte, the label blank, and the highlight limited to the ribbon if you need one. One product stays the hero. The spoken offer remains that the tins stay on the counter until four, said over this familiar set. Keep the tin matte first. If you need a highlight after that, it stays on the ribbon. The offer is spoken over this familiar set. The opening three seconds show the ribbon, the sprig, and the blank label while the line says the tins stay on the counter until four. A blue gel, a glitter pass, or a new metallic wrap is refused.",
      },
      {
        h: "Repeat it on the next reel",
        p: "Boxing Day uses the same palette and the same neutral wall, even if the shelf behind is quieter. The caption still says Hearth Bakery. No logo migrates onto the label because the frame feels plain. The first three seconds show the tin inside this palette so the week reads as one shop. The practical cut stays within fifteen to forty-five seconds. Boxing Day repeats the palette and the neutral wall, even when the shelf behind is quieter. The name stays in the caption. The first three seconds show the same ribbon and grey wall while the voice says the tins stay out until four. A logo that migrated onto the label because the frame felt plain is the frame you throw out.",
      },
    ],
    example:
      "All week, Hearth Bakery shows one biscuit tin with a blank label, a red ribbon, kraft paper, and a small green sprig on the wooden table. The wall stays warm grey. The spoken line says the tins stay out until four. The caption names the bakery. A midweek still with purple light and glitter was rejected. Boxing Day repeats the same palette. Ribbon, sprig, wood, kraft, then the same palette on Boxing Day. The first three seconds show the tin with the red ribbon and the small green sprig while the voice says the tins stay out until four. The midweek still with purple light and glitter is rejected before posting.",
    bridge:
      "Scro keeps each of these promos to one product, the tin, with a blank label and no invented logo. The offer is spoken. The shop name goes in the caption. Export every reel in the week at 9:16. Approve the palette, keep one blank-label tin, and export every reel in the week after the wall is still neutral. The first three seconds show the tin in red, green, wood, and paper while the offer says the tins stay out until four. A new accent or a logo is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "Only red, green, wood, and paper accent the tin.",
      "The wall stays neutral.",
      "The label is blank.",
    ],
  },
  {
    id: 100,
    slug: "christmas-reel-from-a-blog-line",
    title: "A Christmas Reel from One Blog Line",
    excerpt:
      "Turn one blog sentence into four beats. Hearth Bakery's line about closing at four is the whole cartoon, not a new topic per beat.",
    locale: "en",
    landingPath: "/explainer",
    tags: explain,
    scene:
      "A simple paper-cutout shop door and a plain paper tin on one dark wooden board, white edges, no letters and no grey strip",
    cta: "Turn one line into four beats",
    answer:
      "Turn one blog sentence into four beats. Hearth Bakery's sentence is that they close at four on Christmas Eve. Beat one is the hook with that fact. Beat two is the paper door. Beat three is the tin still on the counter. Beat four repeats the close. The sentence does not grow a second policy. The picture is a cartoon or a paper-cutout on one wooden board, and the pieces are drawings, not real people. The first three seconds carry one big hook title in the spoken language, unless on-screen text is off. At most one arrow. No blank grey strip. Approve the stills before motion. Start from the sentence you already wrote, and refuse every beat that is not inside it. Copy the line that they close at four on Christmas Eve, map the hook, the paper door, the paper tin, and the close, draw them on one wooden board, and approve before motion. The first three seconds show the English hook while the narrator says they close at four on Christmas Eve. A second policy, a forest, or a new character in any beat is rejected before posting. One idea, fifteen to forty-five seconds, and the pieces stay drawings.",
    points: [
      {
        h: "Start with the sentence",
        p: "Copy one line from the bakery's note: they close at four on Christmas Eve. Do not start from a mood board. Every beat has to be a piece of that sentence. If a beat introduces returns, a new character, or a forest, it is a different reel. One narrator speaks short lines taken from the same sentence. Four beats fit a practical cut of fifteen to forty-five seconds. The blog line is the script. Every beat has to be a piece of it, spoken by one narrator in short lines from that same sentence. The first three seconds show the hook while the narrator says they close at four on Christmas Eve. A beat about returns, or a forest, is the still you reject.",
      },
      {
        h: "Map the four beats",
        p: "The hook title, in English if the voice is English, states the close, unless on-screen text is off. Then a paper door, then the paper tin, then a hold on the same fact. At most one arrow points at the door or the tin, not both as a pair of arrows. One wooden board, no grey strip, no second background. The first three seconds are the hook, so the blog line is visible or spoken immediately. Map the beats in order: hook, then paper door, then paper tin, then a hold on the same fact. At most one arrow, on the door or the tin. The opening three seconds show the blog line as the hook while the narrator says they close at four on Christmas Eve. A pair of arrows, a grey strip, or a second background is refused.",
      },
      {
        h: "Keep the drawing a drawing",
        p: "Paper shapes are not photographs of staff or customers, and a cartoon is not a real person. Approve each beat's still before motion so the board and the single idea survive. If on-screen text is off, the narrator still opens with the blog sentence. The reel does not become a title card with no picture. The door and the tin stay on the wood. Paper shapes stay drawings. Approve each beat, and open with the blog sentence even when on-screen text is off. The first three seconds show the door and the tin on the wood while the narrator says they close at four on Christmas Eve. A title card with no picture, or a photograph of staff, is the frame you throw out.",
      },
    ],
    example:
      "Hearth Bakery takes the blog line that they close at four on Christmas Eve and splits it into four paper beats on one wooden board: the English hook, the door, the tin on the counter, and the close again. One narrator, one arrow at most, no grey strip. The shapes are drawings, not people. The stills are approved before motion. Blog sentence, four beats, one arrow at most, then approval. The first three seconds show the English hook on the wooden board while the narrator says they close at four on Christmas Eve. A beat that adds a new policy is rejected before posting.",
    bridge:
      "Scro turns the line into a cartoon or a paper-cutout on one wooden board and keeps one idea. The first 3 seconds show one big hook title in the spoken language, unless on-screen text is off. Use at most one arrow, leave no blank grey strip, and approve the stills before motion. Approve the four stills, keep one idea on the board, and move the paper after every beat still comes from that one line. The first three seconds show the hook in the spoken language while the narrator says they close at four on Christmas Eve. A grey strip or a second sentence is rejected before posting. If the voice sounds real, the caption says it is AI.",
    checks: [
      "All four beats come from one sentence.",
      "The board stays wooden.",
      "The hook matches the spoken language.",
    ],
  },
];
