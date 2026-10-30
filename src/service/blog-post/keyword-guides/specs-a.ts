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
      "A GRWM loading reel is a get-ready-with-me cut that behaves like a progress bar. Frame one is 0 percent: robe, hair still down, a mug on the sink. The last frame is 100 percent: the clothes you actually wear out of the flat. You can build the whole reel from one photo when you are not going to film the routine, and only when the face at 100 percent is still that person.",
    points: [
      {
        h: "Five beats, not a slideshow",
        p: "Do the stills before the cut. First, pick the reference photo and write five stages on a card: 0, 25, 50, 75, and 100. Second, make one still per stage and change only clothes or hair styling. Third, assemble them only after every still shows the same face. Hold each beat for about three or four seconds so a number in the upper-middle is readable, which lands the reel around 20 seconds. The 0 percent frame has to look unfinished: robe, wet hair, shop keys still on the table. If that opening is already the jacket, the last frame has nothing to pay off. A slideshow of five different mornings fails because the room, the chair, and the light jump. Keep the window in the same place and let the outfit be the only change.",
      },
      {
        h: "Lock the person",
        p: "Viewers notice a new face faster than a new jacket. Before you design a single garment, lock the reference: hairline, jaw, the way the eyes sit, and any mark you can see in the photo. The first three seconds are this face in the robe, and the words on screen are the unfinished state, such as Still in the robe. Change the robe for a shirt, then add the apron, then the jacket. Do not ask the last frame for a similar person. Similar is how a cousin appears and the loading joke dies. If a still drifts, redo that still before you export. Lay the five frames in a row with the sound off. If you would not swear it is one person, the reel is not ready.",
      },
      {
        h: "End on a held pose",
        p: "The 100 percent frame stays up longer than the others, about four seconds, so the leaving outfit can be read. That held pose is the screenshot and the cover. Cut away to a shopfront, a logo, or a title card and you hide the only frame the bar was climbing toward. Reject the file before you post if the last jaw is narrower, the hairline has moved, or the hold is so short the jacket never lands. The caption can be one line about the day. It cannot repair a last frame that introduced a new person.",
      },
    ],
    example:
      "A plant-shop owner builds the reel from one photo taken in the flat above the shop. The file is 22 seconds. From 0 to 4 seconds the same adult is in a grey robe by the window, hair down, keys on the sill, and the line reads Still in the robe. From 4 to 8 seconds that face wears a dark shirt. From 8 to 12 seconds the hair is tied and the window has not moved. From 12 to 16 seconds the shop apron is on. From 16 to 22 seconds the same face wears the apron and a jacket, and that frame is the cover. The caption is Opening the till at nine. You reject the cut if the 100 percent jaw is a different shape, or if the window frame has jumped.",
    bridge:
      "In Scro you lock this host's face and change clothes only, so the jacket frame cannot invent a stranger. Approve each of the five stills before any motion. A Life photo later in the week can reuse that same person in the apron, which is how the grid stays one shop owner. Export the reel at 9:16 and use the held last frame as the cover.",
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
      "To do a GRWM loading bar reel, make five states of one routine and hard-cut as the count climbs from 0 to 100. The bar is why people stay: they want the finished look. The routine can be a work outfit or a shop opening. The structure does not change. First lock the chair and the camera height. Second shoot or generate the five states in that same seat. Third cut on the change, add one spoken line only at 100, and export a vertical file of about 20 seconds.",
    points: [
      {
        h: "Put the change on the cut",
        p: "A slow morph between looks spends the joke. Cut on the change so the percentage and the outfit land together. Keep the camera height, the chair, and the edge of the bench in the same place. The person and the number are the only things that should move. The first three seconds are the 0 frame: lights still off, apron on, and a short on-screen 0 in the upper-middle. They do not say a hello. If the first frame is already the finished bouquet, reject it and start again from the dark shop. Mark the tripod with tape before the second state, or the bench will creep and the cut will wobble.",
      },
      {
        h: "Say almost nothing",
        p: "This format is visual. A voice that explains every percentage fights the bar. One person speaks one line, and only at 100: where you are going, or what the look is for. Captions carry that single line for people with the sound off, in short words that match the mouth. Record the line twice and keep the take that starts on the word, with no breath before it. If you hear a greeting, a shop story, or a second offer, delete it. The caption is the same sentence, not a different pitch.",
      },
      {
        h: "Skip trending audio you cannot use",
        p: "Versions of this trend rode a sped-up track. If that track is not cleared for the business account, leave it out. Use the room tone of the shop, or a track you have rights to, under the cuts. The bar still works. Reject the export if a song you do not own is the thing carrying the edit, or if the music is so loud the one spoken line disappears. Burn the 100 line into the file if the same cut will also go to TikTok or Shorts, and keep those words in the upper-middle so a new button does not cover them.",
      },
    ],
    example:
      "A florist opens the corner shop. The reel is 20 seconds, five hard cuts, one speaker. From 0 to 4 seconds the lights are off, the apron is on, and the upper-middle reads 0. Nothing is spoken. At 8 seconds the same person, same apron knot, has buckets on the bench and the number is 50. At 16 seconds the lights are on, one bouquet is in frame, the number is 100, and the only spoken line is Open at nine. The caption repeats that line. You reject the file if the chair height jumps, if a second sentence appears, or if the face at 100 is a different person.",
    bridge:
      "Scro puts one person on camera for that single line at 100. You approve the still of the florist before the mouth moves, then pick one of 13 caption styles for the line Open at nine. Export 9:16. If the face or the voice is a realistic generation, label it as AI on the upload, and leave any platform label where the platform placed it.",
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
      "The same face across GRWM loading frames means the person at 0 and the person at 100 share one identity. Outfit, hair styling, and light may change. Bone structure may not. If you generate the frames, identity drift is the bug people comment on, and it kills the payoff of the bar. First, freeze one reference still and name the marks you will check. Second, add one wardrobe change per beat and approve that still against the reference. Third, line the frames up with the sound off and only then cut the reel.",
    points: [
      {
        h: "Decide the face before the clothes",
        p: "Pick one reference still and reuse it for every beat before you choose a shirt. Do not ask the last frame for a similar person. Similar is a cousin, not a continuation. Write down what you can see: the left ear, the part in the hair, a mole, the distance between the eyes. The first three seconds show that reference face, unfinished, and the words are the stage, such as Zero, same chair. If those seconds already show a new jaw, you started with the wrong job. Clothes are the second decision. A coat chosen before the face is locked is how the reel becomes a casting call.",
      },
      {
        h: "Change one thing per beat",
        p: "Beat two can add a shirt. Beat three can add tied hair. Beat four can add the coat. Changing shirt, hair, room, and face together reads as a new cast member, even when each change is small. Keep the chair, the window, and the camera height. A practical reel is five beats and about 20 seconds, so each change has time to register. Reject a beat that introduces a doorway you did not have at 0, or a beauty mark that switched cheeks. One new object in the hand is already the change. A new head is a different video.",
      },
      {
        h: "Check with the sound off",
        p: "Lay the five frames in a row and look only at the eyes, the jaw, and the ear. Mute is the test, because a caption and a beat of music hide a swap while you are editing. If you would not swear it is one person, do not post. A caption cannot repair a swapped face, and neither can cropping the chin. Check the 100 frame against the reference at the same size, on a phone, not zoomed in on a laptop. The failure you can see is a smoother jaw, a higher hairline, or an ear that disappeared into hair that was never there.",
      },
    ],
    example:
      "A bike-shop owner sits in the workshop chair, built as a 20-second loading reel from one reference. The left ear is visible and a small mole sits on the cheek. From 0 to 4 seconds that face is in a grey sweatshirt, and the line is Still off the floor. At 8 seconds only a shop shirt has been added. At 12 seconds the hair is tied and the mole is still on the same cheek. At 16 to 20 seconds a coat is on, the ear is still visible, and that frame holds as the cover. Anything that loses the mole or hides the ear gets remade before the cut. The caption is Opening the workshop.",
    bridge:
      "Scro locks that host's face while you change clothes only, which is the whole point of a loading reel made of stills. Approve each still against the workshop reference before any motion. A Life photo later in the week can use the same locked person, coat or no coat, without redrawing the head.",
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
      "A POV reel without showing your face puts the camera where your eyes are, or puts one other person on camera while you stay off it. Both are valid. Mixing them in one cut feels like two videos. Choose the hands-and-room version when the action is the story. Choose one speaking host when someone has to say a sentence. First, write the POV as a line a stranger can repeat. Second, film only the version you chose. Third, watch the first three seconds and reject the file if your own chin, or a second face, enters.",
    points: [
      {
        h: "Point the lens at the work",
        p: "If you are packing an order, the frame is the hands and the tissue paper. Mount the phone at chest height, start the recording, then do the action twice and keep the cleaner take. Your chin should never dip into the top of the shot, and a passing coworker should not cross the counter. The first three seconds show the work itself: a locked door, a key, then the light switch. They say the point in a few words on screen, such as You open alone, placed in the upper-middle. A caption-only card with no hands is not this reel. Reject any take where a face, even a partial one, solves the opening.",
      },
      {
        h: "Write the POV as a line, not a label",
        p: "POV: you open the shop alone is a caption, not a picture. The line has to be something the hands prove in those first three seconds. Write it the way you would say it across the counter, then film the proof before you decorate the words. A practical cut is about 18 seconds: the line, the action, a hold on the result. If the sentence needs a backstory, it is a different reel. Read the line out loud. If it only makes sense with your name in it, rewrite it until a stranger can use it.",
      },
      {
        h: "Use a host when the line needs a person",
        p: "Some POV lines need a reaction, and that can be one person speaking while you stay off camera. Do not cut from your hands to that host inside the same 18 seconds. Pick one. The host says the line in the first three seconds, face in the upper third, and your face never appears. Next week the same host says the next line. If the face on screen changes between reels, the account looks like a new shop. Reject a host frame that has drifted into a different jaw before you post it.",
      },
    ],
    example:
      "A candle shop, hands only, 18 seconds. The owner is never in frame. From 0 to 3 seconds a hand turns the key and the upper-middle reads You open alone. From 3 to 12 seconds the same hands click on the lamp and set one candle on the front tray. From 12 to 18 seconds the tray holds, and the on-screen line is First one is lit. No face enters, including a reflection in the glass. The caption repeats You open alone. You reject the take if the chin dips in at the top, or if a second pair of hands joins the tray.",
    bridge:
      "When the line needs a speaker, Scro puts one person on camera and you stay off it. Approve that host still before the mouth moves, caption the line in one of 13 styles, and export 9:16. If the face or the voice is a realistic generation, label it as AI on the upload. Do not try to remove a label the platform added.",
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
      "A vlog timestamp reel tells one day as four clock times, spoken and shown. You capture the real beat when it happens, in that room, instead of rebuilding a fake morning at night. First, list four times that change the story: start, the hard part, the turn, the close. Second, film each one from the same spot while one person says the time. Third, cut them in order, put each time in the upper-middle, and drop every greeting. A useful cut is about 28 seconds. Twelve stamps would be a contact sheet.",
    points: [
      {
        h: "Four times, not twelve",
        p: "Name the four times before you pick up the phone. If a beat does not change anything, leave it in the camera roll. The first three seconds are the earliest time: the kettle, the dark bench, and the person saying Eight oh two. They do not say good morning. Each later beat is one new fact, about six or seven seconds, so the day fits in under half a minute. A reel that stamps every hour teaches nothing and runs long for no reason. Reject a fifth clip that is only a coffee refill. The story already moved.",
      },
      {
        h: "Keep the frame cousin",
        p: "Same lens height, same corner of the room. The clock changes. The geography should not. A jump from the bench to a street or a wide shot of the building breaks the feeling that this is one day. Put a book under the phone in the morning and leave it there. One person stays in the frame so the day has a witness. If you generate a later beat, match the morning still before you accept it. A new jaw at the evening beat is a second worker, and the timestamp stops being a diary.",
      },
      {
        h: "Put the time where the UI is not",
        p: "The bottom and the right edge of a reel carry the like button, the caption, and the audio name. Put the time in the upper-middle, short, high contrast, and hold it for the whole beat. People watching muted still need to read it. Say the same time out loud so the caption, in one of the short styles, matches the mouth. Reject a cut where the numbers sit on the bottom band, or where the spoken time and the on-screen time disagree. Burn the times into the file if you will also post it to TikTok or Shorts.",
      },
    ],
    example:
      "A one-person ceramic studio, 28 seconds, four times, one speaker. From 0 to 7 seconds the kettle is on, the bench is dark, the upper-middle reads 8:02, and the host says Eight oh two. From 7 to 14 seconds the laptop is closed and the host says Eleven sixteen, with no email text on screen. From 14 to 21 seconds one finished box is on the table at 4:40. From 21 to 28 seconds the lights go off at 7:05 and the host says Lights off. The room corner never changes. The caption repeats only the last time. You reject the reel if a fifth errand appears, or if the evening face does not match the morning.",
    bridge:
      "Scro keeps that one host for every timestamp and trims the silence before each time is spoken. Approve the four stills against the morning frame before the mouth moves. Caption the times in one of 13 styles, export 9:16, and label a realistic face or voice as AI when you upload.",
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
      "A my-reaction reel for a product uses one face as the rating system for one fact. You show the fact, then the face moves once, then you stop. First, choose the single thing the product does that a camera can prove. Second, put that one product in frame with the face and approve the still. Third, cut a short climb from flat to pleased and speak the offer once. A useful file is about 18 seconds. A life-changing claim with no picture is an ad, and it is the wrong format.",
    points: [
      {
        h: "One fact",
        p: "The lid clicks shut is a fact you can show. A vague promise is not. The first three seconds show the product doing that one thing, and the face is still flat. The words, spoken, are the fact itself: The lid clicks. Put them in the upper-middle as a short caption so a muted viewer gets the same fact. Do not open on the shop name, a second bottle, or a before-story. If you have two facts, you have two reels. Reject an opening where the click is hidden behind the face.",
      },
      {
        h: "Escalate once",
        p: "Flat, then pleased, then done. A face that performs five emotions in a few seconds looks like a sketch, and the product disappears. Keep the bottle beside the cheek for the whole 18 seconds so the reaction has an object. The second beat is the use: two pumps on the back of a hand, then one nod. Stop there. A third emotion, a laugh, and a wink are extra performances. The offer is that one spoken line, not a list. If the product leaves the frame, reshoot the beat.",
      },
      {
        h: "Keep the package honest",
        p: "The bottle in the reaction is the bottle you sell: same cap, same shape, same size in the hand. Leave the label blank. Do not invent a logo, a crest, or a prettier rendered pack for the close-up. People who own it will see the swap before they see the joke. The shop name belongs in the caption, not on a generated sticker. Reject the still if letters appeared on the label, if a second product crept onto the table, or if the color of the liquid changed.",
      },
    ],
    example:
      "A chemist counter, one dropper bottle, 18 seconds. From 0 to 3 seconds the bottle is in a palm, the face is flat, the label is blank, and the spoken line is The lid clicks. From 3 to 12 seconds two pumps land on the back of the hand and the face nods once. From 12 to 18 seconds the bottle is still beside the cheek and the spoken offer is Two pumps, that is the routine. The caption is the shop name plus that offer. No second product, no invented mark on the glass. You reject the file if the label grew a logo, or if the face leaves and the bottle becomes a floating pack shot.",
    bridge:
      "Scro's product reel is this one bottle. The label stays blank, and the picture does not invent a logo. You speak the offer, and the shop name goes in the caption. Approve the still of the bottle and the face before any motion, then export 9:16.",
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
      "A before-and-after reel that holds does not reveal the after in the cover or the first second. You show the problem long enough to recognise it, then pay it off once. First, lock the angle and draw the before. Second, draw the after from that same spot and approve both stills. Third, time the cut so most of the seconds stay on the problem. If the after is already the thumbnail, people scroll. If the after is a result you cannot repeat, they will screenshot it.",
    points: [
      {
        h: "Same angle both times",
        p: "Move the object, not the camera. On a paper-cutout, that means the same wooden board, the same hook, the same shadow direction, and the tote is the piece that changes. A new angle plus a new result makes people suspect a different item. The first three seconds show the stain filling the frame, and the hook title in the spoken language is The stain stays, large, in the upper-middle. They do not show the clean bag. Mark the tripod, or the position of the hook on the board, before you make the second still. Reject a pair where the hook has moved.",
      },
      {
        h: "Spend most of the time on the before",
        p: "In a 24-second reel, about 16 seconds can be the mess. The after needs one clear moment, then a hold of a few seconds. Equal time on both halves feels like a slideshow, and the viewer never has to wait. One idea only: this stain, this soak. A second stain is a second reel. Use at most one arrow, pointing at the stain, and do not cover the bag with a blank grey strip to fake the clean. Flip the stained piece off and paste the clean piece in the same place.",
      },
      {
        h: "Do not invent the result",
        p: "Show the result you can actually repeat. A tote that comes back clean after a soak is fair. A tote that comes back a new colour, a new size, or magically embroidered is a claim. The caption names the method: soak, then rinse. The cover frame is the stain, not the clean bag, so the grid does not spoil the hold. Reject the after still if the fabric pattern changed, the hook disappeared, or a grey band appeared at the edge of the board.",
      },
    ],
    example:
      "A print shop's cotton tote, told as paper-cutout on one wooden board, 24 seconds, one idea. From 0 to 3 seconds the stain fills the frame and the title is The stain stays. From 3 to 16 seconds the same tote hangs on the same hook, one arrow on the mark, no second object. From 16 to 20 seconds the stained piece flips away and the clean tote, same hook, same grain of the board, lands. From 20 to 24 seconds it holds. The caption says Soak, then rinse. The cover is the stain. You reject the after if the tote's shape changed or a blank grey strip crosses the board.",
    bridge:
      "Scro can build this as a paper-cutout on one wooden board, one idea only. The first three seconds are the hook title The stain stays, in the spoken language, unless you turn on-screen text off. Use at most one arrow, leave no blank grey strip, and approve both stills before anything moves. Export 9:16.",
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
      "A fan transition outfit reel hides a cut behind a spinning fan, or a plain fan shape you made, so each pass reveals a new outfit. The person stays on the floor in one pose. The joke is the wardrobe. First, photograph or generate the pose and lock the face. Second, change clothes only and approve three stills against that pose. Third, cut on the fan and hold the last outfit. Three looks are enough for a reel of about 18 seconds. A new face on the third blade is the failure people see immediately.",
    points: [
      {
        h: "Lock the pose",
        p: "Shoulders, hands, and the point of the chin stay put. If you generate the frames, describe that same pose and change garments only. A shifted elbow, a flipped hand, or a head that rolled toward the window breaks the fan illusion even when the clothes are right. The first three seconds show the first outfit under the real fan, chin in the same spot, and the line on screen is Home, in the upper-middle. They do not show a title card of the fan alone. Mark a floorboard knot and keep it in every frame so you can see a drift.",
      },
      {
        h: "Three outfits is enough",
        p: "Five outfits in a few seconds is a catalogue. Three reads as a choice: home, work, evening. Give each about five seconds, with the fan passing at the cut, and hold the last look a little longer so it can be the cover. Name the three in the caption if the pictures move fast. Do not add a fourth look in the last second. Reject a frame that also changes the room, the haircut, or the body position. Clothes are the only variable.",
      },
      {
        h: "Use a fan you filmed or a simple graphic",
        p: "Use the ceiling fan in the room, or a plain blade shape you drew. Do not paste a character you do not own into the blades, and do not use a film still as the wipe. The outfit is the content. The fan is only the cut. Reject the reel if a branded mascot, a celebrity face, or a copied costume appears in the blur. A simple white blade on the wooden floor is enough, and it keeps the face readable between passes.",
      },
    ],
    example:
      "A clothing stall's owner, on the studio floor, 18 seconds. The same floorboard knot shows in every frame, and the face matches the reference. From 0 to 5 seconds a knit is on, the room's own fan crosses, and the word Home sits in the upper-middle. From 5 to 10 seconds the shirt has replaced the knit, pose unchanged. From 10 to 18 seconds the coat is on and the frame holds for the cover. The caption is Three ways to leave the stall. You reject the cut if the chin moved, the knot left the frame, or the fan graphic contains someone else's character.",
    bridge:
      "Scro locks this one face and lets you change clothes only, which is what the fan cut needs. Approve the three stills in the same pose before you add motion. A Life photo can reuse that host in any of the three outfits. Export 9:16 and use the coat frame as the cover.",
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
      "A fall outfit week from one angle uses one doorway, one camera height, and one repeated action. Only the clothes change. First, mark the feet and the phone so Monday and Friday match. Second, shoot the same gesture each day and approve the still against Monday's face. Third, cut five days into one vertical reel of about 25 seconds. The coat can change. The door frame cannot. A week of outfits only proves a wardrobe when the wearer is the same person.",
    points: [
      {
        h: "Mark the spot",
        p: "Tape on the floor for the feet and a stack of two books under the phone. About the same angle is how the jump cuts start to wobble, and five days will drift if you eyeball it. Write the book count on the tape. The first three seconds are Monday: the marked feet, the collar turn just starting, and the word Monday in the upper-middle. They do not show a street, a caption essay, or a different door. Check the tape before every later morning. If the books moved, reset them before you shoot.",
      },
      {
        h: "Repeat one small action",
        p: "Turn the collar, then step out. That gesture is the cut point, and it is the same on every day. A wave on Tuesday and a spin on Thursday makes a montage, which is a different trend. Keep the action inside the doorway so the frame cousin stays. Each day gets about five seconds. Five outfits then fit in 25 seconds without rushing the collar. Reject a day where the hand starts from a different height. The seam of the edit is that hand.",
      },
      {
        h: "One person, five outfits",
        p: "If a generated frame swaps the face on Thursday, remake Thursday before you cut it in. Compare jaw, hairline, and ears to Monday at phone size. Change the wool for a shirt, then a coat. Do not change the head, the height, or the doorway. A Life photo from the same week should be able to sit beside the reel and still be this person. Reject the week if Thursday's eyes sit differently, even when the coat is the best one.",
      },
    ],
    example:
      "The doorway of a bookshop flat, phone on two books, tape for the shoes, 25 seconds. From 0 to 5 seconds Monday's wool coat, collar turn, and the word Monday. Wednesday is the shirt, same turn, same hinge of the door. Friday is the heavier coat. Two more weekdays fill the middle with the same gesture. The caption lists the five pieces in plain words. You reject Thursday if the face is smoother than Monday, or if the phone height dropped and the door head is suddenly cropped. Before export, play the five collar turns in a row: the hand should start at the same height, and the hinge should stay in the same corner.",
    bridge:
      "Scro locks this host and lets you change clothes only, so a week of coats stays one person. Approve each day's still against Monday's face before any motion. A Life photo can reuse that same host in one of the outfits. Export a single 9:16 reel.",
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
      "A message-from-A reel shows one precise bad habit, then a note that names it, then one fix. For a shop, skip anyone else's series and keep the structure: a habit your customer recognises, then a line in your own words. First, write the habit as something you can draw. Second, write the note and the fix as two beats on the same board. Third, approve the stills and cut about 22 seconds. A vague insult is not a habit, and a copied logo is not your joke.",
    points: [
      {
        h: "Specific beats vague",
        p: "You ask who opens at 7:59 is a habit. You are messy is not. The picture is the habit in progress: a phone face-down, a blank card, a clock. The first three seconds show that phone and the hook title You again, in the spoken language, large, in the upper-middle. They do not show your logo or a hello. If you cannot point at the object, the habit is still too vague to draw. One idea only. The group chat, the rota, and the Sunday reminder are the same idea. A second habit about suppliers belongs in another reel.",
      },
      {
        h: "Do not copy the show's assets",
        p: "Use your own wording and a plain card you cut, not a series logo, a font lockup, or a character from the show. The format is the idea. The assets are not yours. On a paper-cutout, the note is a kraft card with your sentence, white scissor edge, on the same wooden board as the phone. Reject a still that recreates a title card you have seen on someone else's account, or that drops in a celebrity face to play the texter. Your handwriting, or your plain type, is the whole design.",
      },
      {
        h: "Land on a fix, not a sneer",
        p: "The last beat is the fix: a Monday rota on the fridge piece, and the spoken line Write it Sunday. A reel that only mocks the staff does not give anyone a next step. Keep the joke light enough that the person who does the habit can share it. Use at most one arrow, from the phone to the rota. Do not wipe the old note away with a blank grey strip. Slide the card off and paste the rota in its place. Reject an ending that is only the insult.",
      },
    ],
    example:
      "A cafe, paper-cutout on one wooden board, 22 seconds. From 0 to 3 seconds a phone lies face-down beside a blank card and the title is You again. From 3 to 12 seconds the card reads the shop's own line about the 7:59 who-opens message, and one arrow points at the phone. From 12 to 22 seconds the card slides off and a Monday rota lands on the fridge piece. The voice says Write it Sunday. The caption repeats that line. You reject the reel if it uses another show's logo, if a grey strip crosses the note, or if the ending never shows the rota.",
    bridge:
      "Scro draws this as a paper-cutout on one wooden board, one idea. The first three seconds are the hook title You again, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, and you approve the stills before motion. Export 9:16.",
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
      "A things-you-should-ghost reel is a list of habits your customer should drop, one flag per cut. A plain sheet costume is optional and has to be your own, not a character from a film. First, write four flags only a customer of this shop would recognise. Second, put one flag on one card and approve the stills. Third, cut them in order and end on the thing to do instead. Four cards at about five seconds each make a reel of about 24 seconds. A list that could sit on any account is too broad to save.",
    points: [
      {
        h: "One flag per cut",
        p: "Ghost the shoebox of receipts is one card. Do not add three sub-points on the same card. The cut is the punctuation. The first three seconds show the first card filling the upper-middle, and the spoken hook is Ghost the shoebox. They do not show a logo sting or a sheet with no words. Read each card out loud. If you run out of breath, the card has two flags. Split it or delete one. One idea holds the whole list: how this shop wants the paperwork. A fifth topic means a second reel.",
      },
      {
        h: "Write flags your customer has",
        p: "A bookkeeper and a baker do not ghost the same things. Use the sentence you hear at the counter. Mixed personal card, March invoice in June, I'll remember: those are this job. A generic be more organised could sit on any account, so nobody saves it. Draw the object, not the adjective: a shoebox, a bank card, a folder. On one wooden board the cards are paper pieces. Use at most one arrow on the whole reel, not one arrow per card. Reject a flag you copied from a bigger account in another trade.",
      },
      {
        h: "Keep it brand-safe",
        p: "Name the behaviour, not a person. A plain sheet with eye holes can be silly. A caption that targets a customer by name is not this format, and neither is a costume copied from a film monster. The last card is the fix: Send the folder Friday. Reject the reel if a real client's name is readable, if the sheet looks like a famous character, or if a blank grey strip is used to cross out a card. Slide the old card off the board instead.",
      },
    ],
    example:
      "A bookkeeper, paper-cutout on one wooden board, 24 seconds. An original plain sheet stands beside the cards. No film character. From 0 to 3 seconds the card says Ghost the shoebox and that line is spoken. Then, one card each: Ghost the mixed personal card. Ghost the March invoice in June. Ghost the I'll remember. The last seconds hold Send the folder Friday. One arrow appears only on the folder. The caption repeats the last card. You reject the cut if two flags share a card, if a client name appears, or if the sheet costume copies a movie ghost.",
    bridge:
      "Scro can show one flag per beat as a paper-cutout on one wooden board. The first three seconds are the hook title Ghost the shoebox, in the spoken language, unless on-screen text is off. At most one arrow, no blank grey strip, and you approve each card still before motion. Export 9:16.",
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
      "A WTF-is reel names one thing you refuse, then shows the thing you do instead. For a shop, the refusal has to be true. One contrast, then stop. First, write the refusal as a short question you can say out loud. Second, draw only the opposite, on one board. Third, approve that still and cut about 16 seconds. A fake stance gets corrected in the comments. A second argument turns the shrug into a policy lecture.",
    points: [
      {
        h: "Name a real refusal",
        p: "Wtf is a synthetic lining only works if the shop actually uses cotton, and the picture is that cotton. A rush you secretly still take, or a fabric you do not stock, will be caught by the next customer who walks in. The first three seconds show the question in large type, Wtf is a synthetic lining, in the spoken language, upper-middle, over the cloth. They say that question once. They do not say the shop name, and they do not show a logo. If you cannot stand behind the refusal on Monday, pick a different one.",
      },
      {
        h: "Show the opposite, do not explain it",
        p: "The picture is the answer. Hands, or a paper cut-out of hands, hold the cotton lining. The weave is visible. A voice that repeats the question and then explains fibre for twenty seconds wastes both the mute viewer and the one with sound. One idea. At most one arrow, pointing at the weave, and no blank grey strip crossing out a synthetic swatch. Remove the other swatch from the board entirely. If the still needs a paragraph, it is not this format.",
      },
      {
        h: "Stay light",
        p: "This format is a shrug, not a rant. If the refusal needs a longer note, put one sentence in the caption: Cotton. That is the list. Do not turn the reel into the care policy, a price list, or a dig at another shop by name. Reject a cut that adds a second refusal in the last second, or that puts a made-up brand mark on the cloth. The cloth stays the cloth. The shop name, if you need it, lives in the caption.",
      },
    ],
    example:
      "A tailor, paper-cutout on one wooden board, 16 seconds. From 0 to 3 seconds the title is Wtf is a synthetic lining, spoken once, cloth already in frame. From 3 to 12 seconds the cotton lining fills the board, one arrow on the weave, no other fabric. From 12 to 16 seconds the same cloth holds. No second sentence is spoken. The caption is Cotton. That is the list. You reject the reel if a synthetic swatch remains, if a grey strip crosses it, or if the question is a stance the shop does not keep.",
    bridge:
      "Scro builds that one contrast as a paper-cutout on one wooden board. The first three seconds are the hook title in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, and you approve the cloth still before motion so the fabric stays the fabric. Export 9:16.",
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
      "A money-can't-buy-happiness product reel is one sentence and one object. You finish the line with a result the camera can see: a shut lid, steam on a desk, a lunch that looks decent. First, write the ending as a shot, not a mood. Second, put the real product in frame with a blank label. Third, say the sentence once and stop. The spoken stem and the shot are the whole joke. A second benefit is the next reel.",
    points: [
      {
        h: "Finish with a feeling you can film",
        p: "A lunch you do not apologise for can be a tin, open, on the pass at the lunch counter. Happiness cannot be filmed. The second half of the sentence has to be that shot. The first three seconds show the closed tin and say the stem: Money can't buy happiness, but it can buy. The words sit in the upper-middle. They do not show a montage of the shop. If you cannot point at the object that finishes the sentence, rewrite the ending until you can.",
      },
      {
        h: "Seven seconds is the whole reel",
        p: "Say the stem, show the one use, stop. Seven seconds is the sentence. A short hold on the open tin can bring the file to about 15 seconds, which is still one sentence and one product. A second benefit, a tour of the counter, or a story about the morning turns it into an ad break. Speak the offer in that one line: the soup tin on the counter today. Do not add a price. The shop name goes in the caption, after the sentence, not as a new scene.",
      },
      {
        h: "Use the real product",
        p: "The tin in the shot is the tin you sell: same lid, same height, same handle. Leave the label blank. Do not invent a logo or swap in a prettier render to answer the sentence. People who have held it will see the difference. Reject the still if letters appeared on the metal, if a second dish entered, or if the steam belongs to a different bowl. One product. The caption carries the shop name and the line Soup stays soup.",
      },
    ],
    example:
      "A lunch counter, one soup tin, 15 seconds. From 0 to 3 seconds the tin is closed on the pass, label blank, and the spoken stem is Money can't buy happiness, but it can buy. From 3 to 10 seconds the same tin is open, steam visible, no second bowl. From 10 to 15 seconds the lid goes back on and the offer is spoken once: Soup stays soup. The caption is the shop name plus that line. You reject the file if a logo appears on the tin, if another dish slides in, or if a second benefit is spoken after the lid. Time the stem on a clock: if the spoken line runs past the open tin, cut words until the lid still gets the last seconds.",
    bridge:
      "Scro's product reel is this one tin. The label stays blank, and the frame does not invent a logo. You speak the offer, and the shop name goes in the caption. Approve the still of the tin before any motion, then export a 9:16 file that stays one sentence.",
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
      "A taking-one-for-the-team reel names the job you actually absorb, then shows the evidence, then makes one light ask. For a salon, that job is a real Tuesday: the 8 p.m. fringe, the basin still full, the booking squeezed in. First, pick a role clients have watched you do. Second, gather proof that does not show another person's face. Third, one person says it in about 22 seconds and stops before a menu. A generic group role that never mentions the chair wastes the shop.",
    points: [
      {
        h: "Pick a role the client has seen",
        p: "If clients have watched you stay for the last fringe, they will recognise the line. A role copied from a friend group, with no chair and no clock, does not use the salon. The first three seconds show one person in the apron, shop dark behind them, saying I'm the one who takes the 8 p.m. fringe. The same words sit in the upper-middle. They do not say hey or welcome back. Write the line the way you say it at the desk. If you stumble, the role is still too cute and not yet true.",
      },
      {
        h: "Show the evidence",
        p: "After the line, cut to the cape on the chair and the clock, still the same person if they remain in frame, or the empty chair if you step aside. Faces of clients stay out. A booking screen is fine only when no client name is readable. The evidence is about six to ten seconds. Reject a frame that catches a client in the mirror, a personal photo on the desk, or another stylist's face filling in. The confession is yours. The room can prove it without a second person.",
      },
      {
        h: "Land on the offer, lightly",
        p: "The trend is a confession, not a price list. One spoken line at the end is the offer: Book it as the last wash, not a DM. A full menu, a second service, or a speech about loyalty breaks the joke. Captions match those two sentences and nothing else. Reject the cut if a third service appears, or if the ask arrives before the cape. Say the offer once. The shop name can sit in the caption under the line.",
      },
    ],
    example:
      "One stylist, apron on, 22 seconds. From 0 to 3 seconds the shop is dark and the host says I'm the one who takes the 8 p.m. fringe, words in the upper-middle. From 3 to 14 seconds the cape is still on the chair and the clock is visible, no client in the mirror. From 14 to 22 seconds the same host says Book it as the last wash, not a DM. Captions are those two lines only. You reject the file if a client is identifiable, if a greeting opens the reel, or if a second face takes the last line.",
    bridge:
      "Scro puts that one stylist on camera to speak both lines. Approve the still before the mouth moves, trim the silence at the start, and caption the lines in one of 13 styles. Export 9:16. If the face or the voice is a realistic generation, label it as AI on the upload, and leave the platform's own label in place.",
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
      "A wheel-cleaning ASMR reel films one wheel, close, while dirt leaves. The brush is the reason to stay. If you sell the cleaner, the bottle may enter once. It should not host the reel. First, lock the camera on the barrel. Second, record the mitt with the mic near the work and no extra music. Third, show the bottle once with a blank label, speak one offer line, and return to the metal. A useful cut is about 30 seconds. A tour of the car is a different film.",
    points: [
      {
        h: "One wheel, one angle",
        p: "Do not tour the car. A badge and a skyline make it an ad for the vehicle. The frame is the barrel and the mitt. Hold the angle so the clean patch grows in place. The first three seconds show the dirty metal and the mitt already touching it. They say nothing yet. The brush is the opening. Mark the tripod so a later rinse does not jump to a new spoke. Reject a shot that pulls back to the whole car, or that includes a second wheel.",
      },
      {
        h: "Let the sound be the sound",
        p: "Put the mic near the mitt. Leave music out, or so low that the bristles stay in front. ASMR dies when a trending track covers the brush, and a business account should not grab a song it does not have rights to. The only spoken line comes after the clean patch is obvious, and it is the offer, said once, quietly: The mitt for the barrel. Reject the export if a song is louder than the foam, or if someone narrates every stroke. Room tone and the brush are the track.",
      },
      {
        h: "Show the product doing the job",
        p: "One product: the cleaner bottle. It enters for a short beat beside the wheel, label blank, no invented logo, no crest on the highlight. Then you return to the rinsed spoke. The result is the clean metal, not a sparkle you added later. The shop name goes in the caption, not on the bottle. Reject the still if letters appeared on the label, if a second bottle joined it, or if the metal was replaced by a shine effect. The offer you spoke is the only claim.",
      },
    ],
    example:
      "A detail bay, one front wheel, daylight, 30 seconds. From 0 to 3 seconds the dirty barrel fills the frame and the mitt is already on it. No speech. From 3 to 18 seconds foam moves and the clean patch grows, same angle, brush audible. From 18 to 22 seconds the bottle appears once, label blank, and the quiet line is The mitt for the barrel. From 22 to 30 seconds the rinsed spoke holds. The caption is the shop name plus that line. You reject the file if the camera finds the badge, if music covers the brush, or if a logo appears on the bottle.",
    bridge:
      "Scro's product reel is this one bottle. The label stays blank, and the picture does not invent a logo. You speak the offer once, and the shop name goes in the caption. Approve the still of the bottle beside the wheel before any motion, then export 9:16.",
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
      "A mom-hack reel under 30 seconds shows one shortcut an adult can copy today, then stops. The versions that travel are specific: one packing trick, one object, one result. They are not advice about how to run a household. First, name the single problem you can draw. Second, show the object and the one step. Third, end on the result and do not add a moral. A practical cut is about 18 seconds. A second hack is a second reel.",
    points: [
      {
        h: "One hack",
        p: "If you have three shortcuts, you have three reels. The second hack is why people rewind and still miss the first. Open on the problem you can see: berries staining a lunch lid. The first three seconds show that stained lid filling the frame, and the hook title is Muffin cup, in the spoken language, upper-middle. They say that object, not a greeting and not a lecture. One idea. The liner, the berries, and the clean lid are the same hack. A tip about the morning routine belongs elsewhere.",
      },
      {
        h: "Film the hands",
        p: "Draw adult hands and the box. You do not need a face. On a whiteboard doodle the hands are simple marks on one board, doing one press of a paper muffin cup into the box. Keep the counter the same colour so the step reads. Do not add a second person to fill the frame. Reject a still that puts anyone's face in the picture, or that turns the doodle into a different room halfway through. The object has to stay recognisable at phone size: cup, box, lid.",
      },
      {
        h: "Stop when it works",
        p: "The result frame is the end. The lid is clean, and the reel holds there. A moral, a follow request, and a product pitch after the result push you past 30 seconds and past the point. The caption repeats the object: Muffin cup. Use at most one arrow, on the cup as it goes in. Do not cross the lid out with a blank grey strip. The clean lid replaces the stained one in the same spot. Reject an ending that keeps talking after the lid is shut.",
      },
    ],
    example:
      "A bakery packing a staff lunch, drawn as a whiteboard doodle, 18 seconds, adult hands only. From 0 to 3 seconds the stained lid fills the frame and the title is Muffin cup. From 3 to 12 seconds the hands press a paper muffin cup into the box, berries go in, one arrow on the cup. From 12 to 18 seconds the lid is on and clean, and the voice says Muffin cup, then stops. The caption repeats those two words. You reject the reel if a second hack appears, if a face enters, or if the ending adds a speech after the lid. Count it: the file stays under 30 seconds, and the only object anyone could copy is the muffin cup.",
    bridge:
      "Scro draws this one hack as a cartoon doodle, one idea, on a single board. The first three seconds are the hook title Muffin cup, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, and you approve the stills before motion. Export 9:16.",
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
      "A one-word result reel takes one fair word and cuts four pieces of proof. You do not need to show a chat app. You need the word and the evidence that it is true. First, choose a word you are willing to see in the comments. Second, pick four moments of the same person that prove it. Third, approve those stills and cut about 20 seconds with the word up front. A fifth clip that explains where the word came from is a different video.",
    points: [
      {
        h: "Do not film the chat product",
        p: "Logos, chat windows, and another company's interface are a bad still, and they are not yours to put on screen. Put the word in your own type and in the caption. The montage is your bench, your shutter, your week. The first three seconds show the host already in the first proof, and the only word on screen is Early, upper-middle. They do not show a phone UI, a prompt, or a logo. If the word only makes sense beside the app, it is not ready.",
      },
      {
        h: "The word has to survive the comments",
        p: "If the word is an insult you do not mean, do not post it for reach. If the word is Early and the grid is full of dark-morning openings, the montage can agree. Read the comments you would write yourself. A word you would argue with is the wrong word. Change clothes between clips if the day needs it. Do not change the face. Reject a word that requires a disclaimer longer than the reel. The caption is the word. It is not an apology.",
      },
      {
        h: "Four clips, one word",
        p: "Each clip is evidence, about four or five seconds: the kettle in the dark, the shutter half up, the first tray, the empty street. A fifth clip that explains the prompt, shows a screenshot, or adds a second word breaks the format. People came for Early. Hold the last proof long enough to be the cover. Reject a clip where the host's jaw has drifted, or where a chat logo snuck into a phone on the bench. Four proofs, one person.",
      },
    ],
    example:
      "A bakery host, 20 seconds, the word Early. From 0 to 3 seconds the same face stands by a kettle in the dark and the upper-middle says Early. Then the shutter is half up, then the first tray, then the empty street, clothes changing from a sweatshirt to the shop apron, face unchanged. No app, no logo, no second word. The caption is Early. The cover is the shutter. You reject the reel if a phone screen shows a chat window, or if the street clip has a different jaw. Set the four stills side by side before the cut and cover the clothes: the face test is the only test that matters.",
    bridge:
      "Scro locks that host's face and lets you change clothes only, so four proofs stay one person. Approve each still before any motion. A Life photo can reuse the same host on a later morning. Export 9:16 with Early as the opening word and as the cover.",
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
      "A tutorial reel with a cartoon cat uses an original cat as the mark for one fiddly step. The cat is not the lesson. The frames beside it are. First, draw one cat you can reuse, not a copy of a viral drawing. Second, storyboard the single step the cat is sitting on. Third, approve the stills so the cat does not redesign itself, then cut about 20 seconds. Cute with no step is a sticker.",
    points: [
      {
        h: "Original cat",
        p: "A plump cat and a plain pointed hat are an idea you can own. A traced pose from a viral account is that creator's artwork. Draw the cat once, note the spots, the hat, and the tail, and use that still as the reference for every beat. Do not use a film cat, a game mascot, or a celebrity's pet. The first three seconds show your cat asleep on a laptop and the hook title Export once, in the spoken language, upper-middle. If the cat in second three already looks like a different animal, stop and lock the design before you continue.",
      },
      {
        h: "The cat marks the pain, the frames teach",
        p: "Cat on the keyboard means this step is fiddly. The next frames show the actual control: the vertical 9:16 frame filled edge to edge, then the file on the phone. The voice says what the drawing cannot: fill the frame, do not pad it. One idea. At most one arrow, pointing at the frame shape. No blank grey strip standing in for black bars you are telling people to remove. The bars, if you show them, are the mistake for one beat, then they are gone. The cat stays the same drawing, eyes and hat included.",
      },
      {
        h: "One step",
        p: "The format is short. A cat plus a full editing course will not finish, and the viewer will not copy any of it. Title the step in those first three seconds, teach it, and end when the phone shows a full vertical frame. About 20 seconds is enough. Reject a fifth beat that starts a second lesson, a cat whose spots moved, or a character you would not be allowed to sell on a shirt. The caption repeats Export once.",
      },
    ],
    example:
      "A stationery shop teaching its own posting step, whiteboard doodle, 20 seconds. From 0 to 3 seconds an original plump cat in a plain hat sleeps on a laptop and the title is Export once. From 3 to 12 seconds the same cat watches one arrow point at a 9:16 frame with no grey band. From 12 to 20 seconds the file is on a phone, the frame is full, and the cat is awake with the same spots. The voice says Fill the frame. The caption repeats Export once. You reject the reel if the cat changes breed mid-way, or if the drawing copies a character you have seen on another account.",
    bridge:
      "Scro holds this as a cartoon doodle, one idea, with your original cat on the same board. The first three seconds are the hook title Export once, in the spoken language, unless on-screen text is off. At most one arrow, no blank grey strip, and you approve the stills so the cat does not redesign itself before motion. Export 9:16.",
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
      "A Halloween costume walk reel starts tight on the shoes and reveals an original costume only at the end. The walk is the edit. First, frame the boots and the hem and lock the hallway. Second, keep one direction and one face, and change clothes only into the costume. Third, pull back on the last beat and hold. No caption essay. A practical cut is about 18 seconds. If the first frame is already the full costume, there is no walk.",
    points: [
      {
        h: "Shoes first",
        p: "The first three seconds show black boots and a hem of brown paper leaves, and they say nothing. No hello, no shop name, no title card. Hold the boots long enough that people lean in. The cover is this frame, so the grid does not spoil the reveal. If you add words, you have made a different reel. Reject an opening that shows the whole costume, a mask, or the face. The lean-in is the point of the first three seconds.",
      },
      {
        h: "One continuous direction",
        p: "Walk toward the lens or along it, not both. Same floor, same light, same hallway. A generated clip that changes corridor halfway reads as two costumes and two people. Three steps are enough, about ten seconds in the middle, before the pull-back. Keep the paper leaves in frame so the hem connects the boots to the reveal. Reject a cut that reverses direction, jumps to daylight, or swaps the floorboards. The illusion is one continuous walk.",
      },
      {
        h: "Original costume",
        p: "A bedsheet, a paper crown, or a jacket you painted is fine. A frame-for-frame copy of a film monster, a branded character, or a celebrity costume is not your reveal. The person under the leaves is the same host as the boots, face locked, clothes changed into the costume and nothing else. Reject the last frame if the face is a new person, if the costume is recognisable as someone else's character, or if a second outfit appears. The reveal is one homemade tree in that hallway.",
      },
    ],
    example:
      "A shop owner in the hallway behind the counter, 18 seconds, no words. From 0 to 3 seconds only black boots and a hem of brown paper leaves. From 3 to 13 seconds three steps toward the lens, same floor, leaves still in frame. From 13 to 18 seconds the camera pulls back: the same adult in a homemade tree costume made of those leaves, face matching the host you locked, held for the end. The cover is the boots. The caption can name the shop. You reject the file if the full costume shows early, the hallway changes, or the costume copies a film character.",
    bridge:
      "Scro locks one face and lets you change clothes only, so the face under the reveal matches the person who started in the boots. Approve the stills before any motion. A Life photo can reuse that host, costume or ordinary clothes. Export 9:16. Leave the opening free of titles so the walk stays quiet.",
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
      "A niche-dump reel says you do more than one job, then proves it with one named clip per skill. It works when the person stays put and the skills are real. It fails when the list is random or the face changes. First, write the opening line and exactly four labels. Second, make one still per label of the same host and approve each face. Third, cut about 24 seconds and do not add a fifth in the caption. A title with no evidence is a bio line.",
    points: [
      {
        h: "Open with the line, then evidence",
        p: "Not one niche is the title, and it has to be followed immediately by proof. The first three seconds show the host already in the first skill, loaves on the bench, and the words Not one niche in the upper-middle, spoken once. They do not show a logo or a wave. The next cuts are the other skills. If you cannot film or generate the proof this week, drop that skill. A claim you cannot show will be the comment. Start the cut only after the four stills exist.",
      },
      {
        h: "Four, named",
        p: "Each cut gets a two-word label: Loaves. Shop films. Tuesday run. Night class. More than four and the reel becomes a résumé. Fewer than three and you still look like one niche. About five seconds each, after the opening, fits the four inside 24 seconds. The caption does not add a fifth. Change clothes if the room changes. Do not change the activity into a collage of three hobbies in one frame. Reject a label that needs a sentence to make sense. Two words, then the picture.",
      },
      {
        h: "Same person",
        p: "The point is range, not a group. One host, four rooms. If the face changes, it looks like a compilation account and the dump fails. Check jaw and hairline against the loaf still before you accept the night-class still. A Life photo from the week should match too. Reject the run clip if a different body shape appeared, or if a friend joined the frame. Clothes can change with the room. The head cannot.",
      },
    ],
    example:
      "A baker who also shoots simple shop films, 24 seconds. From 0 to 3 seconds the host is at the bench with loaves and says Not one niche. Then Loaves holds on the crumb. Then Shop films, same face, a camera on the counter, apron off. Then Tuesday run, same face, different jacket. Then Night class, a notebook, same jaw. The caption lists those four labels and stops. You reject the reel if a fifth skill is spoken, or if the night-class face does not match the bench. Read the four labels back with the sound off. If one label needs a paragraph, that skill is not ready for this cut.",
    bridge:
      "Scro locks that host across the four stills and lets you change clothes only. Approve each room against the bench still before any motion. A Life photo can reuse the same person in one of those outfits. Export 9:16 with Not one niche as the opening line.",
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
      "To make a 15-second reel, write one sentence and give it three beats: the point, one picture of the point, and the ask. Fifteen seconds is enough for a trick or a single opinion. It is not enough for five steps. A reel can run from 3 seconds to 3 minutes. This slot is the short one, on purpose. First, time the sentence out loud. Second, draw three stills and approve them. Third, cut to 15 and stop. A fourth beat means you are making a longer reel.",
    points: [
      {
        h: "Time the sentence out loud",
        p: "Read the sentence with a clock. If it takes more than about eight seconds, cut a clause. The picture needs the rest of the 15. A script that fills every second leaves no air, and the last word gets clipped. Salt the water. Like the sea. is a sentence you can say. A history of the noodle shop is not. Record one take of that short line and reject a take that adds a greeting. The voice starts on Salt.",
      },
      {
        h: "Three beats",
        p: "From 0 to 3 seconds the hook title is Salt the water, in the spoken language, large, upper-middle, and the voice says it. From 3 to 12 seconds one picture: the pot and a pinch you can see. One idea, at most one arrow toward the water. From 12 to 15 seconds the ask, Like the sea, or a hold on the pinch. Do not add a fourth beat about the sauce. That is another reel. No blank grey strip under the pot. The board or the doodle fills the frame edge to edge.",
      },
      {
        h: "Cover is the title",
        p: "The grid still uses the same words as the opening: Salt the water. A pretty pot that does not say the point will not earn the tap. Pick the title frame after you approve the still, not a different slogan. The caption repeats the title for someone who never presses play. Reject a cover that says the shop name instead, or a 15-second file that actually runs long because a logo sting was left on the head.",
      },
    ],
    example:
      "A noodle shop, whiteboard doodle, exactly 15 seconds. From 0 to 3 seconds the title Salt the water is on screen and spoken. From 3 to 12 seconds a pot and a visible pinch, one arrow, same board. From 12 to 15 seconds the line Like the sea. holds. The cover repeats Salt the water. The caption repeats it too. You reject the cut if a fourth beat about oil appears, if the spoken line runs past eight seconds, or if a grey band sits under the pot. Say the whole sentence once more against the finished file. If you need a breath in the middle, the sentence is still too long for 15 seconds.",
    bridge:
      "Scro storyboards those three beats as a cartoon doodle, one idea. The first three seconds are the hook title Salt the water, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, and you approve the stills before motion. Export 9:16 at the 15 seconds the beats earned.",
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
      "A reel should be as long as its beats, and no longer. The file can run from 3 seconds to 3 minutes. A single idea usually fits in 15 to 45 seconds. First, name the beats. Second, multiply by how long each picture needs. Third, cut anything that is not a beat, especially a greeting. Length is not a strategy. Finishing the idea is. If you cannot name the beats, you cannot pick a number yet.",
    points: [
      {
        h: "Count beats, then multiply",
        p: "Write the beats on a card before you choose a duration. Four beats at about six seconds is a 24-second reel. Three beats for a shop rule can be 18. A trend gesture may be under 15, and a walkthrough can pass a minute only when every stretch of it changes the picture. Writing 60 seconds first is how you pad. The first three seconds are already beat one, the title, not a spare intro you add on top. If a beat has no picture, delete it before you multiply.",
      },
      {
        h: "Cut the greeting",
        p: "Hey, and welcome back, are seconds you do not get back. They teach the viewer that the point is later, and later is where they leave. Start on the title. For a cafe rule, the first three seconds show the ordinary queue and say We do not do rush. The words are the hook title, upper-middle, in the spoken language. Reject an opening that spends those seconds on the shop sign, a wave, or your name. The name can live in the caption.",
      },
      {
        h: "Split instead of stretching",
        p: "If the sentence needs a minute and a half, publish three reels with three titles. A long reel that sags in the middle loses the people who would have watched three short ones. The exceptions to a no-rush rule belong in a second reel titled What counts as rush, not in a slow middle. One idea per file. Use at most one arrow in each. Reject a cut that holds a static board just to reach a number you liked.",
      },
    ],
    example:
      "A cafe's no-rush rule, doodle on one board, 18 seconds, three beats. From 0 to 3 seconds the queue is on screen and the title is We do not do rush, spoken immediately. From 3 to 12 seconds the same queue, one arrow, no greeting. From 12 to 18 seconds a simple booking card: Book the ordinary slot. The exceptions are a second reel, also short, titled What counts as rush. You reject the first file if a hello was left on the head, or if the middle repeats the title with no new picture. A reel can be as short as a few seconds or as long as 3 minutes. This one earned 18.",
    bridge:
      "Scro plans these beats as a cartoon doodle, one idea, so you see the length in the storyboard before motion. The first three seconds are the hook title in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, and you approve the stills before motion. Export 9:16 at the length the beats earned.",
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
      "The first three seconds of a reel are the only seconds you can count on. Use them for one big hook title, large enough to read without pausing, in the language you will speak. First, write that title as the point itself. Second, place it in the upper-middle and hold it for the full three seconds. Third, make second four the picture of that title. A logo sting, a wave, or a welcome spends the window on you. Two to six words is the usual English length. If you cannot say the point that fast, you do not have the reel yet.",
    points: [
      {
        h: "The title is the point",
        p: "Stop rewriting the caption is a title. Today I talk about captions is a delay. Say the title out loud before you draw anything. The first three seconds show those words, huge, and the voice says the same words with no preamble. They do not show the shop logo. One idea. If the title needs a subtitle to make sense, the subtitle is the real title and the first line should go. Reject an opening you cannot repeat after one watch with the sound off.",
      },
      {
        h: "Put it where the buttons are not",
        p: "The bottom of a reel is for likes, the caption, and the audio name. The right edge gets the rail. A title sitting there is half a title. Put it in the upper-middle, high contrast, held for the full three seconds. On a doodle, the letters are part of the board, not a bar pasted over a blank grey strip. Check on a phone, inside the app if you can, not only in the editor. Reject a still where the last word falls under the caption band.",
      },
      {
        h: "Then prove it",
        p: "Second four is the picture of the title, not another sentence and not a new intro. People who stayed did so for that picture. For this title, the picture is one note with one line, not six drafts. At most one arrow, pointing at that single line. The ask comes after the proof: Post this one. A practical reel is about 15 to 20 seconds, which is inside the range a reel can be, from 3 seconds to 3 minutes. Do not restart with so today we will. The title was already sentence one.",
      },
    ],
    example:
      "A gift-shop owner who rewrites every caption, doodle, about 18 seconds. From 0 to 3 seconds the board says Stop rewriting the caption, full and high, and the voice says those words. From 3 to 12 seconds one note with one line, one arrow, no pile of drafts. From 12 to 18 seconds the line Post this one. The logo is only in the caption. You reject the opening if the words are small, if they sit on the bottom, if a grey strip carries them, or if second four is a wave instead of the note.",
    bridge:
      "When on-screen text is on, Scro puts that one big hook title on the opening of the doodle, in the spoken language. Turn on-screen text off and the opening stays free of writing, which means the picture itself has to be the point. At most one arrow, no blank grey strip, and you approve the opening still before motion. Export 9:16.",
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
      "A reel cover with a few words tells the grid what the video is. Three to eight words, high contrast, one subject that survives at thumbnail size. The cover is the title again, for people who find you after the reel has left the feed. First, copy the opening line and do not write a second slogan. Second, put that type on the one object. Third, approve the still and use it as the cover. A mood photo with no words is a different promise from the reel.",
    points: [
      {
        h: "Use the same words as the opening",
        p: "If the reel starts with Wednesday bun, the cover says Wednesday bun. A poetic cover and a literal reel teach two videos, and people tap the one they can name. The first three seconds of the reel show the bun and say Wednesday bun, the same words, in the spoken language, upper-middle. The cover is that frame, or a still you approve with those exact words. Do not invent a second line for the grid. The caption can add the shop name. The cover should not.",
      },
      {
        h: "Big type, one subject",
        p: "At grid size a sentence becomes a smudge. Short words, one bun, not the whole shopfront. Leave the corners free. The bun still has a shape when the tile is small. On a doodle, the bun is the hero on the board and the words sit clear of it. At most one arrow, and only if the reel itself uses it. No blank grey strip behind the type. Reject a cover where the letters collide with the bun, or where the subject is a wide street that shrinks to a dot.",
      },
      {
        h: "Do not swap the cover after it works",
        p: "The cover is how someone finds the reel again. Changing the words the next day splits the memory. Fix a typo. Do not rebrand a reel that people are already saving under Wednesday bun. If you test a new line, that is a new reel with a new opening, not a quiet swap on this file. Reject the urge to upload a prettier shopfront after the bun cover has started to match the first three seconds.",
      },
    ],
    example:
      "A bakery, doodle of one bun, reel about 20 seconds. From 0 to 3 seconds the bun fills the frame and the title is Wednesday bun, spoken the same way. The rest of the reel shows the bun coming off the tray, one idea, no price. The cover uses that opening frame: same words, same bun. The shop name sits in the caption. You reject a cover that says the street name, a half-told offer, or a shopfront so wide the bun disappears. You also reject a next-day swap that changes Wednesday bun to a new slogan.",
    bridge:
      "Scro's opening title can be the cover frame of this doodle. The first three seconds are Wednesday bun, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, and you approve that still before motion. Export 9:16 and pick the same words as the cover.",
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
      "Captions for silent viewers are the script, written on the frame, not a second script. Assume the first watch is muted. First, write the spoken sentence. Second, break it into short lines that appear as they are said. Third, place those lines in the upper-middle and watch the file with the sound off before you post. If the only copy of the point is in the audio, a muted viewer never gets it. Burn the words in when the same file will also go to TikTok or Shorts.",
    points: [
      {
        h: "Same sentence",
        p: "If you say Book the last drop-off, the caption says that. A caption that sells a different service makes the unmute a contradiction. Mute is a test, not a separate ad. The first three seconds show one person already saying those words, and the same words are already on screen. They do not open with a silent logo. One person speaks. Record the line cleanly so the caption does not have to guess. Reject a version where the caption adds a promise the mouth never made.",
      },
      {
        h: "Short lines",
        p: "One short line, then the next, matched to the breath. A paragraph on a vertical frame covers the face and still is not read. Book the last drop-off can be two lines. A shop history cannot. Choose one of 13 caption styles and stay with it for the whole reel, so the account does not look like a new editor every sentence. Keep the face visible above the lines. A practical reel is about 20 seconds, long enough for two sentences and no longer.",
      },
      {
        h: "Check the safe zone",
        p: "The caption safe zone is the upper-middle. The bottom and the right edge belong to buttons. Play the reel on a phone, not only in the editor. A line that looked centred on a laptop often sits under the audio name. Burn the captions into the file if you will upload the same cut to TikTok or Shorts, because a sticker made inside one app does not travel. Reject the export if the last word is cut off, or if the lines cover the mouth you need people to trust.",
      },
    ],
    example:
      "A watch-repair counter, one speaker, 20 seconds. From 0 to 3 seconds the host says Book the last drop-off and those words are already in the upper-middle. From 3 to 14 seconds the next line, Bring the watch, not a photo, appears as it is said, same style, face still clear. From 14 to 20 seconds the line holds and stops. No extra claim in the text. The caption under the post repeats the first sentence. You reject the file if the lines disagree with the voice, sit on the bottom, or hide the mouth. If this file also goes to Shorts, the words are already burned in.",
    bridge:
      "Scro puts one person on camera and turns the voice into captions in one of 13 styles. It trims the silence so the first word is not late. Export 9:16. If the face or the voice is a realistic generation, label it as AI when you upload, and do not try to remove a label the platform added.",
    checks: [
      "Caption and voice say the same thing.",
      "Lines are short enough to read muted.",
      "You watched it once inside Instagram.",
    ],
  },
];
