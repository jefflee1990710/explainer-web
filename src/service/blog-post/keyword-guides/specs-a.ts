import type { KeywordGuideSpec } from "@/service/blog-post/keyword-guides/types";

const tag = ["Instagram Reels", "AI Video"] as string[];

// Long-tail guides 1–25. Trend formats from late October 2026, then production basics.
export const SPECS_A: KeywordGuideSpec[] = [
  {
    id: 1,
    slug: "grwm-loading-reel-from-one-photo",
    title: "GRWM Loading Reel from One Photo",
    excerpt:
      "A GRWM loading reel moves from 0% to 100%. One photo can start it if every later frame is still the same person.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: ["Instagram Reels", "AI Influencer"],
    scene:
      "Wide editorial photo of an adult at a sunlit bathroom mirror in a robe, a jacket waiting on a chair, no text",
    cta: "Build the host in Scro",
    answer:
      "A GRWM loading reel is a get-ready-with-me cut that behaves like a progress bar. Frame one is 0%: robe, unstyled hair, coffee. The last frame is 100%: the outfit you actually leave in. You can start from a single photo when you are not going to film the routine, but only if the face in the 100% frame is still the person from 0%.",
    points: [
      {
        h: "Five beats, not a slideshow",
        p: "Use 0, 25, 50, 75, and 100. Hold each beat about a second so the number, if you add one, is readable. Rushing the middle makes the ending feel like a glitch. The 0% frame has to look unfinished. If the before is already styled, the after has nothing to pay off.",
      },
      {
        h: "Lock the person",
        p: "Viewers notice a new face faster than a new jacket. Hairline, jaw, and the way the eyes sit have to survive every cut. Change clothes, not identity. If a generated frame drifts, redo that frame before you export.",
      },
      {
        h: "End on a held pose",
        p: "The 100% frame stays up a beat longer than the others. That is the frame people screenshot and the frame you use as the cover. Do not cut away to a logo.",
      },
    ],
    example:
      "0% is the same adult in a grey robe by a window. 50% is that person with hair tied and a shirt half buttoned. 100% is the same face in a black jacket, held for a second. The caption is one line: the plan for the day. No brand name is spoken.",
    bridge:
      "In Scro the host's face stays locked when the outfit changes, so a loading reel does not invent a stranger at 100%. You approve the stills before any motion. Life photos can reuse that same person later in the week.",
    checks: [
      "The 0% frame is visibly unfinished.",
      "Jaw and hairline match on the 100% frame.",
      "The cover is the 100% frame, not a title card.",
    ],
  },
  {
    id: 2,
    slug: "grwm-loading-bar-reel",
    title: "How to Do a GRWM Loading Bar Reel",
    excerpt:
      "A GRWM loading bar reel shows the percentage climbing from 0 to 100. Each step is one cut, and the last look is the payoff.",
    locale: "en",
    landingPath: "/talking-head",
    tags: tag,
    scene:
      "Adult getting ready at a wooden vanity, four outfit stages side by side in one wide frame, no numbers and no text",
    cta: "Make the talking reel",
    answer:
      "To do a GRWM loading bar reel, film or generate five states of one routine and cut on the climb from 0% to 100%. The bar is the reason people stay: they want to see the finished look. The routine itself can be makeup, a work outfit, or a shop opening. The structure is the same.",
    points: [
      {
        h: "Put the change on the cut",
        p: "Do not morph slowly between looks. A hard cut sells the loading joke. Keep the camera height and the chair in the same place so the only thing that moves is the person and the percentage.",
      },
      {
        h: "Say almost nothing",
        p: "This format is visual. A voiceover that explains each percentage fights the joke. One spoken line at 100% is enough: where you are going, or what the look is for. Captions can carry that line for people with the sound off.",
      },
      {
        h: "Skip trending audio you cannot use",
        p: "October 2026 versions of this trend rode a sped-up track. If that track is not cleared for a business account, use your own room tone or a track you have rights to. The bar still works without the meme audio.",
      },
    ],
    example:
      "A florist opens the shop. 0% is the lights off and an apron. 50% is buckets on the bench. 100% is the same person, same apron knot, lights on, one bouquet in frame. Caption: \"Open at 9.\"",
    bridge:
      "Scro can host this as a talking-head if you want one line at the end, with the face locked and captions in one of 13 styles. Approve the five stills before you render motion, then export 9:16.",
    checks: [
      "Camera height does not jump between beats.",
      "Only one spoken line, at the end.",
      "The audio is one you can post on a business account.",
    ],
  },
  {
    id: 3,
    slug: "same-face-across-grwm-loading-frames",
    title: "Same Face Across GRWM Loading Frames",
    excerpt:
      "A GRWM loading reel fails when the 100% frame is a different person. Lock the face first, then change clothes.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: ["Instagram Reels", "AI Influencer"],
    scene:
      "Same adult photographed in three outfits in one apartment, face unchanged, soft window light, no text",
    cta: "Lock the host in Scro",
    answer:
      "Keeping the same face across GRWM loading frames means the person at 0% and the person at 100% share one identity. Outfit, hair styling, and light can change. Bone structure cannot. If you generate the frames, identity drift is the bug people comment on, and it kills the payoff.",
    points: [
      {
        h: "Decide the face before the clothes",
        p: "Pick one reference still and reuse it for every beat. Do not ask for \"a similar woman\" on the last frame. Similar is how you get a cousin, not a continuation.",
      },
      {
        h: "Change one thing per beat",
        p: "Beat two can add a shirt. Beat three can add hair. Beat four can add the jacket. Changing shirt, hair, room, and face together reads as a new cast member.",
      },
      {
        h: "Check with the sound off",
        p: "Lay the five frames in a row and look only at the eyes and jaw. If you would not swear it is one person, do not post. A caption cannot repair a swapped face.",
      },
    ],
    example:
      "Reference: one seated host, shoulder-length hair, left ear visible. 25% adds earrings from that same still. 100% adds a coat. The ear, the mole, and the part in the hair are still there. Anything that loses the mole gets regenerated.",
    bridge:
      "Scro locks the host's face while you change wardrobe, which is the whole point of a loading reel made of stills. You approve each still before motion, and later Life photos can use that same locked person.",
    checks: [
      "One reference still is used for every beat.",
      "Only clothes or hair styling change, not the face.",
      "You can recognise the host with the images in a row.",
    ],
  },
  {
    id: 4,
    slug: "pov-reel-without-showing-your-face",
    title: "POV Reel Without Showing Your Face",
    excerpt:
      "A POV reel can hide your face by showing what you see, or by letting a locked host stand in. Pick one and stay with it.",
    locale: "en",
    landingPath: "/talking-head",
    tags: ["Instagram Reels", "Talking Head"],
    scene:
      "First-person view of adult hands wrapping a small shop package on a counter, no face, no text",
    cta: "Make a host reel",
    answer:
      "A POV reel without showing your face puts the camera where your eyes are, or puts another host on camera while you stay off it. Both are valid. Mixing them in one 15-second cut feels like two videos. Choose the hands-and-room version when the action is the story, and the host version when someone has to say a sentence.",
    points: [
      {
        h: "Point the lens at the work",
        p: "If you are packing an order, the frame is the hands and the tissue paper. Your chin should never dip into the top of the shot. Mount the phone and do the action twice so the second take is clean.",
      },
      {
        h: "Write the POV as a line, not a label",
        p: "\"POV: you open the shop alone\" is a caption. The picture still has to prove it in the first three seconds. A locked door, a key, then the light switch. The words alone are not the reel.",
      },
      {
        h: "Use a host when the line needs a person",
        p: "Some POV jokes need a reaction. That can be a locked talking-head instead of you. Your voice can still be the one people hear. The face on screen stays consistent next week.",
      },
    ],
    example:
      "A baker's POV: hands flip the sign to open, then slide one bun onto a plate. On-screen text, three words: \"First bun's yours.\" No face. The next reel that needs a spoken explanation uses the same shop's host, not the owner's face.",
    bridge:
      "Scro's talking-head path is for the version where a host speaks and you do not appear. You record the voice, approve the still, and add captions. For a pure hands reel, storyboard the beats as an explainer and keep the face out.",
    checks: [
      "Your face never enters the frame.",
      "The first three seconds show the action, not a caption-only card.",
      "You did not mix a host and a hands POV in the same cut.",
    ],
  },
  {
    id: 5,
    slug: "vlog-timestamp-reel-in-one-day",
    title: "Vlog Timestamp Reel in One Day",
    excerpt:
      "A vlog timestamp reel is one day cut into a few clock times. Film the beats as they happen and drop the greetings.",
    locale: "en",
    landingPath: "/talking-head",
    tags: tag,
    scene:
      "Wide photo of a small studio desk at morning light and the same desk at evening light, no clocks and no text",
    cta: "Cut the day in Scro",
    answer:
      "A vlog timestamp reel tells one day as a swipe of clock times: 7:12, 9:40, 13:05, 18:20. You film it in one day by grabbing the real beat when it happens, not by recreating a fake morning at night. No voiceover is required. The time label and the picture do the work.",
    points: [
      {
        h: "Four times, not twelve",
        p: "A reel that stamps every hour becomes a contact sheet. Pick the moments that change the story: start, the hard part, the turn, the close. If a beat does not change anything, leave it in the camera roll.",
      },
      {
        h: "Keep the frame cousin",
        p: "Same lens height, same room. The clock changes; the geography should not. A jump from the kitchen to a drone shot breaks the \"this is one day\" feeling.",
      },
      {
        h: "Put the time where the UI is not",
        p: "Instagram covers the bottom and the right edge with buttons. Put the time in the upper third, short, high contrast. People watching muted still need to read it.",
      },
    ],
    example:
      "A one-person studio. 8:02 kettle. 11:16 the difficult client email, shown as a closed laptop and a sigh you can see, not the email text. 16:40 one finished box on the table. 19:05 lights off. Caption repeats the last time only.",
    bridge:
      "If you want a host to say one line per timestamp, Scro keeps that host locked and trims the silence between lines. Approve the four stills, then export 9:16. The day stays one person.",
    checks: [
      "Only four timestamps.",
      "The room is recognisable in every beat.",
      "The time sits clear of the like and caption buttons.",
    ],
  },
  {
    id: 6,
    slug: "my-reaction-reel-for-a-product",
    title: "My Reaction Reel for a Product",
    excerpt:
      "A my-reaction reel lets a face rank one product detail. Use one detail, escalate once, and stop.",
    locale: "en",
    landingPath: "/product-promo",
    tags: ["Instagram Reels", "Product Promo"],
    scene:
      "Adult looking at a plain unbranded bottle on a table, expression changing from flat to surprised, no logos and no text",
    cta: "Make the product reel",
    answer:
      "A my-reaction reel for a product uses a face as the rating system. You show one fact about the product, then react. The October 2026 version often escalates a number. For a product, the number should be a real price, size, or result you can stand behind, not a joke that invents a claim.",
    points: [
      {
        h: "One fact",
        p: "\"This lid clicks shut\" is a fact you can show. \"This changed my life\" is not a reaction format, it is an ad with no picture. Show the click, then the face.",
      },
      {
        h: "Escalate once",
        p: "Flat, then pleased, then done. A face that performs five emotions in twelve seconds looks like a sketch, and the product disappears. The product stays in frame beside the face.",
      },
      {
        h: "Keep the package honest",
        p: "The bottle in the reaction is the bottle you sell. Do not swap in a prettier render for the close-up. People who own it will see the difference before they see the joke.",
      },
    ],
    example:
      "A 30 ml dropper, real label. Beat one: the size in a palm, face neutral. Beat two: two pumps on the back of a hand, face nods. Caption: \"Two pumps. That is the whole routine.\" No second product.",
    bridge:
      "Scro's product demo starts from your photos so the label survives. You approve the still of the bottle and the host before motion. One use, one reaction, 9:16.",
    checks: [
      "The package matches the product you sell.",
      "Only one fact is reacted to.",
      "The product is still visible in the last frame.",
    ],
  },
  {
    id: 7,
    slug: "before-and-after-reel-that-holds",
    title: "Before and After Reel That Holds",
    excerpt:
      "A before-and-after reel holds attention when the after is withheld until the last second and the change is real.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene:
      "Split feeling of a messy craft table and the same table cleared, same camera, no text",
    cta: "Storyboard the before and after",
    answer:
      "A before-and-after reel that holds does not reveal the after in the cover or the first second. You show the problem long enough to recognise it, then pay it off once. If the after is already in the thumbnail, people scroll. If the after is fake, they comment and leave.",
    points: [
      {
        h: "Same angle both times",
        p: "Move the object, not the camera. A new angle plus a new result makes people suspect a different item. Mark the tripod spot with tape if you are filming for real.",
      },
      {
        h: "Spend most of the time on the before",
        p: "Two-thirds of a 15-second reel can be the mess, the stain, the blank page. The after needs one clear second, then a hold. Equal time on both halves feels like a slideshow.",
      },
      {
        h: "Do not invent the result",
        p: "A cleaned wheel, a plated dish, a rewritten sentence: show what you actually did. A generated after that the product cannot perform is a claim, and it will be screenshotted.",
      },
    ],
    example:
      "A stained cotton tote. Ten seconds of the stain in the same daylight. One second of the same tote, same hook on the wall, stain gone, with the method named in the caption: soak, not a miracle. Cover frame is the stain, not the clean bag.",
    bridge:
      "Scro can storyboard the two beats and show you the stills before motion, so the angle stays locked. Put a short title in the first three seconds if on-screen text is on. Export 9:16.",
    checks: [
      "Cover shows the before.",
      "Camera position matches on the after.",
      "The result is something you can repeat.",
    ],
  },
  {
    id: 8,
    slug: "fan-transition-outfit-reel",
    title: "Fan Transition Outfit Reel",
    excerpt:
      "A fan transition reel swaps an outfit each time a fan blade passes. Keep the body in one place and change only the clothes.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: ["Instagram Reels", "AI Influencer"],
    scene:
      "Adult lying on a wooden floor under a ceiling fan, three folded outfits beside them, no text",
    cta: "Change outfits on one host",
    answer:
      "A fan transition outfit reel hides a cut behind a spinning fan, or a fan graphic, so each blade reveals a new outfit. The person stays on the floor in the same pose. The joke is the wardrobe, not a new face every blade.",
    points: [
      {
        h: "Lock the pose",
        p: "Shoulders, hands, and the point of the chin stay put. If you generate the frames, describe the same pose and only change garments. A shifted elbow breaks the fan illusion.",
      },
      {
        h: "Three outfits is enough",
        p: "Five outfits in six seconds is a catalogue. Three reads as a choice: home, work, evening. Name them in the caption if the pictures are too fast to parse.",
      },
      {
        h: "Use a fan you filmed or a simple graphic",
        p: "Do not paste a copyrighted character into the blades. A real ceiling fan, or a plain graphic you made, is the transition. The outfit is the content.",
      },
    ],
    example:
      "Same person, same floorboard knot visible in every frame. Outfit one is a knit. Outfit two is a shirt. Outfit three is a coat. The fan is the room's own fan. Caption: \"Three ways to leave the house.\"",
    bridge:
      "Scro keeps one locked face while the wardrobe changes, which is what this transition needs. Approve the three stills in the same pose before you add motion or a cut. Export 9:16.",
    checks: [
      "The pose matches across outfits.",
      "The face is one person.",
      "You are not using a character you do not own.",
    ],
  },
  {
    id: 9,
    slug: "fall-outfit-week-same-angle",
    title: "Fall Outfit Week from One Angle",
    excerpt:
      "A fall outfit reel works when every day is filmed from the same spot and the only change is the clothes.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: ["Instagram Reels", "AI Influencer"],
    scene:
      "Adult standing in the same doorway in a coat, camera locked, autumn light, no text",
    cta: "Keep one host all week",
    answer:
      "To film a week of fall outfits from the same angle, pick one doorway, one camera height, and one repeated action, then change only the clothes. The October 2026 version of this trend used a repeated gesture so the cuts feel seamless. The coat can change. The door frame should not.",
    points: [
      {
        h: "Mark the spot",
        p: "Tape on the floor for your feet and a book under the phone. \"About the same angle\" is how the jump cuts start to wobble. Five days will drift if you eyeball it.",
      },
      {
        h: "Repeat one small action",
        p: "Buttoning a cuff, picking up keys, turning a collar. The action is the cut point. A different action each day makes it a montage, not this trend.",
      },
      {
        h: "One person, five outfits",
        p: "If an AI frame swaps the face on Thursday, reshoot Thursday. A week of outfits only proves a wardrobe if the wearer is stable.",
      },
    ],
    example:
      "Doorway of a flat, phone on a stack of two books. Each morning: step in, turn the collar, step out. Monday wool, Wednesday shirt, Friday coat. Caption lists the five pieces, not a poem.",
    bridge:
      "Scro's locked host and wardrobe are built for a week that has to look like one person. Approve each day's still against Monday's face before you render. Export a single 9:16 reel.",
    checks: [
      "Camera height is marked, not guessed.",
      "The gesture is identical each day.",
      "Thursday's face still matches Monday.",
    ],
  },
  {
    id: 10,
    slug: "message-from-a-reel-for-a-business",
    title: "Message from A Reel for a Business",
    excerpt:
      "A message-from-A reel calls out one specific habit, then shows it. For a business, the habit has to be yours, not a copied joke.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene:
      "A phone face-down on a shop counter beside a handwritten blank card, no logos and no readable writing",
    cta: "Write the call-out as a reel",
    answer:
      "A message-from-A reel shows you doing one precise bad habit, then a note that names it. The October 2026 wave borrowed the anonymous-texter joke. For a business, skip the show and keep the structure: one habit your customer recognises, filmed, then one line that calls it.",
    points: [
      {
        h: "Specific beats vague",
        p: "\"You rewrite the caption for an hour\" is a habit. \"You are messy\" is not. The picture should be the habit in progress: the notes app, the same sentence deleted, the clock.",
      },
      {
        h: "Do not copy the show's assets",
        p: "Use your own wording and your own handwriting or type. Do not lift the series logo, the font lockup, or a character. The format is the idea. The assets are not yours.",
      },
      {
        h: "Land on a fix, not a sneer",
        p: "A shop can call out the habit and then offer the one step. A reel that only mocks the customer does not give them a reason to follow.",
      },
    ],
    example:
      "A café owner films the staff group chat at 7:59 asking who opens. On-screen note, in the shop's own words: \"You again.\" Next beat: a written Monday rota on the fridge. Caption: \"Write it Sunday.\"",
    bridge:
      "Scro can turn that two-beat note into a short explainer: the habit, then the fix, with a title in the first three seconds if text is on. Approve the stills before motion.",
    checks: [
      "The habit is specific enough to film.",
      "No show logo or copied character.",
      "The last beat is a fix.",
    ],
  },
  {
    id: 11,
    slug: "things-you-should-ghost-reel",
    title: "Things You Should Ghost Reel",
    excerpt:
      "A things-you-should-ghost reel holds up one bad habit per cut. Use your niche's real red flags, one per card.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene:
      "A plain white sheet ghost costume holding a blank card in a hallway, Halloween but original, no text",
    cta: "List the red flags",
    answer:
      "A things-you-should-ghost reel is a list of habits, myths, or red flags, one per cut, often with a sheet-ghost costume because of the Halloween timing in October 2026. The costume is optional. The list is the reel. Each card names one thing the viewer should stop doing in your niche.",
    points: [
      {
        h: "One flag per cut",
        p: "\"Ghost the vague brief\" is one card. Do not add three sub-points on the same card. The cut is the punctuation. Four cards, four seconds each, is a complete reel.",
      },
      {
        h: "Write flags your customer has",
        p: "A med spa and a plumber do not ghost the same things. If the line could sit on any account, it is too broad to save.",
      },
      {
        h: "Keep it brand-safe",
        p: "Name the behaviour, not a person. A costume can be silly. A caption that targets a customer by name is not this format.",
      },
    ],
    example:
      "A bookkeeper in a plain sheet, four cards: \"Ghost the shoebox of receipts.\" \"Ghost the mixed personal card.\" \"Ghost the March invoice in June.\" \"Ghost the 'I'll remember.'\" Last card: \"Send the folder Friday.\"",
    bridge:
      "Scro's explainer path can show one flag per beat on a whiteboard or paper-cutout, with a title up front. You approve the stills, then export 9:16. The ghost costume is optional if the cards are clear.",
    checks: [
      "Each card is one flag.",
      "The flags belong to your niche.",
      "Nobody is named.",
    ],
  },
  {
    id: 12,
    slug: "wtf-is-reel-for-a-brand",
    title: "WTF Is Reel for a Brand",
    excerpt:
      "A WTF-is reel names one thing you refuse, then shows what you do instead. Keep it to a single contrast.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene:
      "A cafe counter with one plain cup and one empty space beside it, deadpan, no logos and no text",
    cta: "Make the contrast reel",
    answer:
      "A WTF-is reel puts \"wtf is [thing]\" on screen over footage that proves you are the opposite. The October 2026 version was deadpan and specific. For a brand, the thing you do not relate to should be a real stance: decaf, rush fees, bulk discounts, vague briefs. One contrast. Then stop.",
    points: [
      {
        h: "Name a real refusal",
        p: "\"Wtf is a rush fee\" only works if you actually do not charge one, and the picture shows the normal queue. A fake stance gets corrected in the comments.",
      },
      {
        h: "Show the opposite, do not explain it",
        p: "B-roll of the thing you do believe beats a paragraph. The text is the question. The picture is the answer. A voiceover that repeats the text wastes the mute viewers and the ones with sound.",
      },
      {
        h: "Stay light",
        p: "This format is a shrug, not a rant. If the refusal needs a policy page, link it in the caption. Do not turn the reel into the policy.",
      },
    ],
    example:
      "A tailor. On-screen: \"wtf is a synthetic lining.\" Picture: hands holding the cotton lining you actually use, label readable, no speech. Caption: \"Cotton. That is the list.\"",
    bridge:
      "Scro can build that one-contrast explainer from a still of the real material. Title in the first three seconds, then the proof. Approve the still so the fabric stays the fabric.",
    checks: [
      "The refusal is true.",
      "The picture is the opposite, not a slogan.",
      "The caption does not add a second argument.",
    ],
  },
  {
    id: 13,
    slug: "money-cant-buy-happiness-product-reel",
    title: "Money Can't Buy Happiness Product Reel",
    excerpt:
      "This reel finishes the sentence with one thing your product actually does for someone's afternoon. One clip, one ending.",
    locale: "en",
    landingPath: "/product-promo",
    tags: ["Instagram Reels", "Product Promo"],
    scene:
      "A small unbranded tin on a kitchen table in afternoon light, hands nearby, no text",
    cta: "Finish the sentence with the product",
    answer:
      "A \"money can't buy happiness, but...\" product reel is one sentence and one picture. You finish the line with a concrete outcome your product creates: ten quiet minutes, a packed lunch that is not sad, a door that shuts. It is not a list of features. October 2026 used it because it is short and does not need a plot.",
    points: [
      {
        h: "Finish with a feeling you can film",
        p: "\"A lunch you do not apologize for\" can be a box, open, looking decent. \"Happiness\" cannot be filmed. The second half of the sentence has to be a shot.",
      },
      {
        h: "Seven seconds is the whole reel",
        p: "Say the stem, show the product doing the one thing, stop. A second benefit belongs in the next reel. This format dies when it becomes an ad break.",
      },
      {
        h: "Use the real product",
        p: "The object in the shot is the one in the shop. A generated prettier tin with a new label is a different product answering the sentence.",
      },
    ],
    example:
      "Stem on screen: \"Money can't buy happiness, but it can buy...\" Cut to the real thermos, open, steam, on a desk at 1 p.m. End card is the same thermos, lid on. Caption: \"Soup stays soup.\"",
    bridge:
      "Scro's product path keeps the tin you photographed. You approve that still, show one use, and export a short 9:16 reel. The sentence is the title.",
    checks: [
      "The ending is a shot, not an abstract noun.",
      "The reel is one sentence.",
      "The product is the real one.",
    ],
  },
  {
    id: 14,
    slug: "taking-one-for-the-team-salon-reel",
    title: "Taking One for the Team Salon Reel",
    excerpt:
      "A taking-one-for-the-team reel names the role you always get stuck with. For a salon, that role should be a real Tuesday.",
    locale: "en",
    landingPath: "/talking-head",
    tags: ["Instagram Reels", "Talking Head"],
    scene:
      "A hair salon chair and a cape on a hook, adult stylist seen from behind, no logos and no text",
    cta: "Tell it as a host reel",
    answer:
      "A taking-one-for-the-team reel points at the person who always drives, always takes the photo, or always knows a guy. For a salon, the version that works is the job you actually absorb: the 8 p.m. fringe, the bride's cousin added at noon, the one who answers the \"quick question\" DM. Own that role in one story.",
    points: [
      {
        h: "Pick a role the client has seen",
        p: "If your clients have watched you stay late, they will recognise the reel. A generic \"I'm the mom of the group\" line does not use the salon.",
      },
      {
        h: "Show the evidence",
        p: "The cape still on the chair, the last basin, the booking screen with one name squeezed in. Faces of clients stay out unless you have consent. The role can be told without showing them.",
      },
      {
        h: "Land on the offer, lightly",
        p: "The trend is a confession, not a price list. One line at the end can say how to book the late slot. A full menu breaks the joke.",
      },
    ],
    example:
      "Host, apron on, shop dark behind them: \"I'm the one who takes the 8 p.m. fringe.\" Cut to the cape and the clock. \"Book it as the last wash, not a DM.\" Same host next week.",
    bridge:
      "Scro's talking-head keeps that stylist host locked, with your voice or a cloned voice in any of 21 languages. Approve the still, trim the silence, add captions, export 9:16.",
    checks: [
      "The role is a real job in the shop.",
      "Clients are not identifiable.",
      "The ask is one line.",
    ],
  },
  {
    id: 15,
    slug: "wheel-cleaning-asmr-reel",
    title: "Wheel Cleaning ASMR Reel",
    excerpt:
      "A wheel-cleaning ASMR reel is a close, quiet before-and-after. The satisfaction is the dirt leaving, filmed tight and slow.",
    locale: "en",
    landingPath: "/product-promo",
    tags: ["Instagram Reels", "Product Promo"],
    scene:
      "Close-up of a dirty alloy wheel being wiped by a gloved hand, water and foam, no brand badges and no text",
    cta: "Show the product on the job",
    answer:
      "A wheel-cleaning ASMR reel films one wheel, close, while dirt comes off. In the week of 21 October 2026 this kind of restoration outperformed talking. The sound of the brush and the before-and-after do the work. If you sell the cleaner, the bottle can enter once. It should not host the reel.",
    points: [
      {
        h: "One wheel, one angle",
        p: "Do not tour the car. A badge and a skyline make it an ad for the car. The frame is the barrel of the wheel and the mitt. Hold the angle so the clean patch grows.",
      },
      {
        h: "Let the sound be the sound",
        p: "Mic near the work, music under it or absent. ASMR dies when a trending track covers the brush. If you are a business account, do not grab an uncleared song to \"help.\"",
      },
      {
        h: "Show the product doing the job",
        p: "If the reel is for a cleaner, the label is readable for one second, then you return to the wheel. The result is the clean metal, not a sparkle effect you added later.",
      },
    ],
    example:
      "Glove, mitt, one front wheel, daylight. Eight seconds of foam. The bottle label, one second, then back to the rinsed spoke. No face. Caption: \"Two minutes on the barrel.\"",
    bridge:
      "Scro can cut this as a product demo from a real photo of the bottle plus the filmed wheel, so the label is not redrawn. Approve the stills, keep one use, export 9:16.",
    checks: [
      "One wheel fills the frame.",
      "The brush is audible.",
      "Any product label matches the real bottle.",
    ],
  },
  {
    id: 16,
    slug: "mom-hack-reel-under-30-seconds",
    title: "Mom Hack Reel Under 30 Seconds",
    excerpt:
      "A mom-hack reel under 30 seconds shows one shortcut a tired adult can copy today. One step, one result, no lecture.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene:
      "Adult hands packing a lunch box on a kitchen counter, morning light, no children and no text",
    cta: "Explain the one hack",
    answer:
      "A mom-hack reel under 30 seconds demonstrates one shortcut and stops. The October 2026 versions that travelled were specific: a packing trick, a stain trick, a morning order. They were not parenting advice. You show the hands, the object, and the result before the half-minute mark.",
    points: [
      {
        h: "One hack",
        p: "If you have three, you have three reels. The second hack is why people rewind and still miss it. Open on the problem: the crushed sandwich, the missing hair tie, the wet jacket.",
      },
      {
        h: "Film the hands",
        p: "You do not need a face, and you do not need a child in frame. Hands and the object are enough, and you avoid posting someone who cannot consent.",
      },
      {
        h: "Stop when it works",
        p: "The result frame is the end. A moral, a follow, and a product pitch after the result push you past 30 seconds and past the point.",
      },
    ],
    example:
      "Problem: berries staining a lunch lid. Hack: a paper muffin cup as a liner, pressed in, berries in, lid on. Result: the lid is clean. Twelve seconds. Caption repeats the object: \"Muffin cup.\"",
    bridge:
      "Scro can draw that one hack as a four-beat explainer if you would rather not film the kitchen: problem, object, step, result. Title in the first three seconds, then export 9:16.",
    checks: [
      "Only one hack.",
      "No child is identifiable.",
      "The reel ends on the result, under 30 seconds.",
    ],
  },
  {
    id: 17,
    slug: "chatgpt-one-word-result-reel",
    title: "One-Word Result Reel",
    excerpt:
      "A one-word result reel shows a single word you were given, then a montage that proves it. The word has to be fair.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: ["Instagram Reels", "AI Influencer"],
    scene:
      "A generic unbranded phone face-down, smooth back with no logo, beside a stack of personal photos on a desk, calm morning light, no letters",
    cta: "Cut the montage on one host",
    answer:
      "A one-word result reel takes a single word from a chat tool and cuts a montage that either owns the word or argues with it. The October 2026 version asked a chatbot to describe the person in one word from the chat history. You do not need to show the app. You need the word and the proof.",
    points: [
      {
        h: "Do not film the chat product",
        p: "Logos and other people's chat UI are a bad still. Put the word in your own caption and on-screen text. The montage is your photos, your desk, your week.",
      },
      {
        h: "The word has to survive the comments",
        p: "If the word is an insult you do not mean, do not post it for reach. If it is \"late\" and your grid is full of deadlines, the montage can agree in four clips.",
      },
      {
        h: "Four clips, one word",
        p: "Each clip is evidence. A fifth clip that explains the prompt is a different video. People came for the word.",
      },
    ],
    example:
      "Word: \"early.\" Four shots of the same host: kettle in the dark, shop shutter half up, first email, empty street. No app UI. Caption is the word and nothing else.",
    bridge:
      "Scro can keep that host locked across the four stills so the montage is one person, not four generations. Approve the stills, add the word as the opening title, export 9:16.",
    checks: [
      "The app logo is not on screen.",
      "Four clips all support one word.",
      "The host matches in every clip.",
    ],
  },
  {
    id: 18,
    slug: "tutorial-reel-with-a-cartoon-cat",
    title: "Tutorial Reel with a Cartoon Cat",
    excerpt:
      "A cartoon cat can sit on a tutorial reel as the mascot for one frustrating task. Keep the cat original and the lesson to one step.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Cartoon"],
    scene:
      "Original plump ginger cartoon cat in a simple pointed hat sitting beside a keyboard, flat illustration, no text",
    cta: "Make the cartoon tutorial",
    answer:
      "A tutorial reel with a cartoon cat uses the cat as a stand-in for the annoying task, not as the lesson. In mid-October 2026 a wizard-hat cat at a keyboard was the costume. Make your own cat. Do not trace a creator's drawing. Then teach one step beside it.",
    points: [
      {
        h: "Original cat",
        p: "A plump cat and a plain hat are an idea. A copied pose from a viral account is their artwork. Draw or generate a cat you can reuse next week so it becomes yours.",
      },
      {
        h: "The cat marks the pain, the frames teach",
        p: "Cat on the keyboard means \"this step is fiddly.\" The next frames show the actual click, the actual knot, the actual setting. Cute without the step is a sticker.",
      },
      {
        h: "One step",
        p: "The trend is short. A cat plus a full course will not finish. Title the step in the first three seconds.",
      },
    ],
    example:
      "Cat in a hat asleep on a laptop. Title: \"Export the reel once.\" Next frames: the 9:16 export button, the file on the phone, the cat awake. Four beats. The cat is the same drawing in every frame.",
    bridge:
      "Scro's whiteboard or paper-cutout explainer can hold one original character across beats. Approve the stills so the cat does not redesign itself mid-reel, then add your voice and export 9:16.",
    checks: [
      "The cat is not a copy of a viral drawing.",
      "One step is actually shown.",
      "The character matches in every beat.",
    ],
  },
  {
    id: 19,
    slug: "halloween-costume-walk-reel",
    title: "Halloween Costume Walk Reel",
    excerpt:
      "A costume walk reel starts on the shoes and reveals the outfit at the end. No talking. The walk is the edit.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: ["Instagram Reels", "AI Influencer"],
    scene:
      "Adult legs in original homemade costume boots walking a dim hallway, camera low, no famous characters and no text",
    cta: "Walk it on one host",
    answer:
      "A Halloween costume walk reel keeps the camera low on the legs while the person walks forward, then pulls back to show the full costume. The October 2026 version was quiet on purpose. No caption essay. The reveal is the last frame. Use an original costume, not a character you do not have rights to.",
    points: [
      {
        h: "Shoes first",
        p: "If the first frame is the full costume, there is no walk. Start tight on the boots or the hem. Hold it long enough that people lean in.",
      },
      {
        h: "One continuous direction",
        p: "Walk toward the lens or along it, not both. A generated clip that changes hallway halfway reads as two costumes. Same floor, same light.",
      },
      {
        h: "Original costume",
        p: "A bedsheet, a paper crown, a painted jacket: fine. A frame-for-frame copy of a film monster or a branded character is not your reveal.",
      },
    ],
    example:
      "Low frame: black boots and a hem of brown paper leaves. Three steps. Pull back: the same adult in a homemade tree costume in their own hallway. No words. Cover is the boots.",
    bridge:
      "Scro can lock one host and change only the costume, so the face under the reveal matches the legs you started with. Approve the stills before motion. Export 9:16 with no title if you want the walk silent.",
    checks: [
      "The first frame hides the full costume.",
      "The hallway does not change.",
      "The costume is original.",
    ],
  },
  {
    id: 20,
    slug: "niche-dump-reel-more-than-one-skill",
    title: "Niche Dump Reel for More Than One Skill",
    excerpt:
      "A niche-dump reel lists the other things you do, one interest per cut. Open with the refusal to be one niche, then prove it.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: ["Instagram Reels", "AI Influencer"],
    scene:
      "A desk with a camera, a whisk, and a notebook arranged in a row, same person implied, no text",
    cta: "Show the range on one host",
    answer:
      "A niche-dump reel says you are not only one thing, then proves it with a fast photo or clip per interest. The 23 October 2026 version opened on that refusal and cut through hobbies. It works for a personal brand. It fails when the interests are a random list and the person changes every cut.",
    points: [
      {
        h: "Open with the line, then evidence",
        p: "\"Not one niche\" is the title. The next four cuts are the niches: the kitchen, the client work, the sport, the night class. A title with no evidence is a bio line.",
      },
      {
        h: "Four, named",
        p: "Each cut gets a two-word label. More than four and the reel becomes a résumé. Fewer than three and you still look like one niche.",
      },
      {
        h: "Same person",
        p: "The point is range, not a group. One host, four rooms. If the face changes, it looks like a compilation account.",
      },
    ],
    example:
      "Title: \"Not one niche.\" Cuts: \"Loaves.\" \"Brand films.\" \"Tuesday run.\" \"Night class.\" Same host in each, different room. Caption does not add a fifth.",
    bridge:
      "Scro locks that host across the four stills and can title the opening if on-screen text is on. Approve each room before motion so the face survives the dump. Export 9:16.",
    checks: [
      "The opening line is followed by proof.",
      "Four labels, no more.",
      "One face across the cuts.",
    ],
  },
  {
    id: 21,
    slug: "instagram-reel-in-15-seconds",
    title: "How to Make a 15-Second Reel",
    excerpt:
      "A 15-second reel is one sentence: a title, a proof, and an ask. If it needs a second sentence, it is a longer reel.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A phone on a tripod facing a small table with one object, timed and quiet, no text",
    cta: "Cut a 15-second explainer",
    answer:
      "To make an Instagram reel in 15 seconds, write one sentence and give it three beats: the point, the picture of the point, and what to do. Fifteen seconds is enough for a trick, a product use, or a single opinion. It is not enough for a tutorial with five steps. Instagram allows up to three minutes, but this length is the short slot.",
    points: [
      {
        h: "Time the sentence out loud",
        p: "Read it. If it takes more than eight seconds, cut a clause. The picture needs the rest. A script that fills all fifteen seconds leaves no air, and the last word gets clipped by the end card you did not plan.",
      },
      {
        h: "Three beats",
        p: "Second 0 to 3: title. Second 3 to 12: one picture. Second 12 to 15: the ask, or a hold on the result. A fourth beat means you are making a 30-second reel. Let it be one.",
      },
      {
        h: "Cover is the title",
        p: "The grid still is the first frame or a frame you choose. Put the same three or four words on it. A pretty frame that does not say the point will not earn the tap.",
      },
    ],
    example:
      "Title: \"Salt the water.\" Picture: pasta water and a pinch you can see. Ask, on screen: \"Like the sea.\" Twelve seconds. The caption repeats the title for mute viewers who never press play.",
    bridge:
      "Scro storyboards those three beats and lets you approve the stills before motion. Turn on-screen text on for the title, or off if you want no writing. Export 9:16.",
    checks: [
      "The spoken line is under eight seconds.",
      "There are three beats, not five.",
      "The cover uses the title.",
    ],
  },
  {
    id: 22,
    slug: "how-long-should-a-reel-be",
    title: "How Long Should a Reel Be",
    excerpt:
      "Most reels that teach one idea land between 15 and 45 seconds. Match the length to the number of beats, not to a trend.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A simple kitchen timer beside a phone filming a tabletop, no readable brand, no text",
    cta: "Pick a length and storyboard it",
    answer:
      "A reel should be as long as the beats, and no longer. Instagram's own range runs from a few seconds to three minutes. In practice, a single idea fits in 15 to 45 seconds. Trend jokes are often under 15. A walkthrough can go past a minute if every ten seconds changes the picture. Length is not a strategy. Completion is.",
    points: [
      {
        h: "Count beats, then multiply",
        p: "Four beats at about six seconds is a 24-second reel. If you cannot name the beats, you cannot pick a length. Writing the length first is how you pad.",
      },
      {
        h: "Cut the greeting",
        p: "\"Hey guys\" is two seconds you will not get back, and it teaches the viewer that the point is later. Later is where they leave. Start on the title.",
      },
      {
        h: "Split instead of stretching",
        p: "If the sentence needs 90 seconds, publish three reels with three titles. A long reel that sags in the middle loses the people who would have watched three short ones.",
      },
    ],
    example:
      "A shop policy. Beat one: \"We do not do rush.\" Beat two: the normal queue. Beat three: how to book. Eighteen seconds. The exceptions live in a second reel titled \"What counts as rush.\"",
    bridge:
      "Scro plans the beats before it renders, so you see the length in the storyboard. Approve the stills, trim silence in the editor, and export 9:16 at the length the beats earned.",
    checks: [
      "You can name every beat.",
      "Nothing in the first three seconds is a greeting.",
      "A second idea became a second reel.",
    ],
  },
  {
    id: 23,
    slug: "first-3-seconds-of-a-reel",
    title: "The First 3 Seconds of a Reel",
    excerpt:
      "The first three seconds of a reel should be a title someone can read on a phone. The logo and the hello can wait.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A phone held at arm's length showing a bold blank title area over a simple scene, no letters",
    cta: "Open on a title",
    answer:
      "The first three seconds of a reel are the only seconds you can count on. Use them for a short title, large enough to read without pausing. Two to six English words, or a short Cantonese phrase. A logo sting, a wave, or a \"welcome back\" spends the window on you instead of on the point.",
    points: [
      {
        h: "The title is the point",
        p: "\"Salt the water\" is a title. \"Today I talk about pasta\" is a delay. If you cannot say the point in a few words, you do not have the reel yet.",
      },
      {
        h: "Put it where the buttons are not",
        p: "The bottom of a reel is for likes, captions, and audio. A title sitting there is half a title. Upper-middle, high contrast, held for the full three seconds.",
      },
      {
        h: "Then prove it",
        p: "Second four should be the picture of the title, not another sentence. People who stayed did so for that picture. Do not reset with a new intro.",
      },
    ],
    example:
      "Second 0 to 3: \"Stop rewriting the caption,\" full width. Second 4 to 10: a notes app with one line, not six drafts. Second 11: \"Post this one.\" The logo is in the caption, not the opening.",
    bridge:
      "When on-screen text is on, Scro puts a large title on the opening of an explainer in the language you set. Turn text off and the opening stays free of writing. Approve the still before you render.",
    checks: [
      "A stranger can read the point in three seconds.",
      "The title is clear of the bottom buttons.",
      "Second four proves the title.",
    ],
  },
  {
    id: 24,
    slug: "reel-cover-with-a-few-words",
    title: "Reel Cover with a Few Words",
    excerpt:
      "A reel cover needs a few words and a clear subject. It is the frame people see on your grid after the reel leaves the feed.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A grid of phone screens showing simple poster-like frames with blank space for a title, no letters",
    cta: "Set the cover from the title",
    answer:
      "A reel cover with a few words tells the grid what the video is. Three to eight words, high contrast, and a face or a product that is recognisable at thumbnail size. The cover is not a mood photo. It is the title, again, for people who find you after the reel has left the feed.",
    points: [
      {
        h: "Use the same words as the opening",
        p: "If the reel starts with \"Salt the water,\" the cover says that. A poetic cover and a literal reel teach two different videos. People tap the one they can name.",
      },
      {
        h: "Big type, one subject",
        p: "At grid size, a sentence becomes a smudge. Short words, one object. Leave the corners free of clutter. Faces should still have eyes; products should still have a shape.",
      },
      {
        h: "Do not swap the cover after it works",
        p: "The cover is how someone finds the reel again. Changing the words the next day splits the memory. Fix a typo. Do not rebrand a reel that is already travelling.",
      },
    ],
    example:
      "Opening title and cover both read \"Wednesday bun, half price.\" The picture is the bun, not the shopfront. The logo sits under the price in the caption.",
    bridge:
      "Scro's opening title can be the cover frame. Approve that still, export 9:16, and use the same words on the cover you pick in Instagram.",
    checks: [
      "Cover words match the first three seconds.",
      "The subject is recognisable when small.",
      "You are not changing a cover that already matches.",
    ],
  },
  {
    id: 25,
    slug: "captions-for-silent-viewers",
    title: "Captions for Silent Reel Viewers",
    excerpt:
      "Most people meet a reel with the sound off. Captions should carry the same sentence as the voice, in short lines.",
    locale: "en",
    landingPath: "/talking-head",
    tags: ["Instagram Reels", "Talking Head"],
    scene: "A person speaking to a phone on a table, quiet room, no readable subtitles and no logos",
    cta: "Add captions in Scro",
    answer:
      "Captions for silent viewers are the script, written on the frame, not a second script. Assume the first watch is muted. If the only version of the point is in the audio, half the audience never gets it. Burn the words in, or style them so they sit clear of the buttons.",
    points: [
      {
        h: "Same sentence",
        p: "If you say \"book the last wash,\" the caption says that. A caption that sells a different offer makes the unmute a contradiction. Mute is a test, not a separate ad.",
      },
      {
        h: "Short lines",
        p: "One line, a few words, then the next. A paragraph on a vertical frame covers the face and still is not read. Match the line to the breath.",
      },
      {
        h: "Check the safe zone",
        p: "Play the reel inside the app, not only in your editor. The caption that looked centred on a laptop often sits under the audio name and the like button.",
      },
    ],
    example:
      "Voice: \"Two pumps, morning, dry cheeks.\" Caption, three lines, same words, appearing as they are said. The bottle stays visible above the lines. No extra claim in the text.",
    bridge:
      "Scro turns the voiceover into captions and gives you 13 styles, including fonts that can hold Chinese and English on one line. It also trims dead air so the first word is not late. Export 9:16.",
    checks: [
      "Caption and voice say the same thing.",
      "Lines are short enough to read muted.",
      "You watched it once inside Instagram.",
    ],
  },
];
