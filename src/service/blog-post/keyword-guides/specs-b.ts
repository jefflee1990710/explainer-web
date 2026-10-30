import type { KeywordGuideSpec } from "@/service/blog-post/keyword-guides/types";

const tag = ["Instagram Reels", "AI Video"] as string[];

// Long-tail guides 26–50. Publishing mechanics, then cartoon and explainer clips.
export const SPECS_B: KeywordGuideSpec[] = [
  {
    id: 26,
    slug: "instagram-reel-text-safe-zone",
    title: "Instagram Reel Text Safe Zone",
    excerpt:
      "The reel safe zone is the middle of the frame. Keep titles out of the bottom buttons and the right-hand rail.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A vertical phone frame drawn as empty space with the middle clear and the edges darkened, no letters",
    cta: "Place the title in the safe area",
    answer:
      "The Instagram reel text safe zone is the part of the 9:16 frame that stays readable after the app adds the like button, the caption, the audio name, and the profile chip. Put the title in the upper-middle. Leave the bottom band and the right edge empty of words. First, design the frame as a phone, not as a centred poster. Second, put one block of type in that upper-middle and the picture under it. Third, preview on a phone and reject the still if any word touches the button band. A line that looks centred in a design file is often low in the feed.",
    points: [
      {
        h: "Preview inside the app",
        p: "An editor preview is not the feed. Watch a reel you already posted, or a private draft, and notice where your thumb and the buttons sit. The first three seconds are where this matters most: the hook title has to be fully readable before anyone taps. For a noodle shop, those seconds show the pot and say Salt the water, and every letter of water clears the caption bar. Do this check before you approve the still. If you only check after motion, you will redraw a moving clip. Hold the title for the full three seconds so a slow reader finishes it.",
      },
      {
        h: "One block of type",
        p: "A title plus a subtitle plus a web address is three chances to hit a button. Use one block. The address belongs in the caption, where it can be tapped on purpose. One idea on the board. At most one arrow, and that arrow stays in the middle with the diagram, not in the right-hand rail. A practical reel is about 20 seconds, so the title does not have to share the opening with a second sentence. Reject a still that stacks a shop name under the hook. The shop name can live in the caption.",
      },
      {
        h: "Faces and labels stay clear too",
        p: "The safe zone is not only for your title. A face's eyes, a bun, or a diagram label that sits in the bottom fifth is unreadable at the moment you need it. Lift the subject. On a doodle, fill the frame edge to edge and do not park the words on a blank grey strip along the bottom. That strip is not a safe margin. It is empty picture, and the buttons will cover it anyway. Reject the frame if the last word of the title is cut, or if the only important label sits where the caption will land.",
      },
    ],
    example:
      "A noodle-shop explainer, doodle, 20 seconds. From 0 to 3 seconds Salt the water sits one-third down from the top, high contrast, and the voice says it. The pot occupies the middle. The bottom band is only the board, with no words and no grey strip. One arrow points at the water, clear of the right edge. From 3 to 20 seconds the pinch and the line Like the sea stay in that same upper-middle band. The caption holds the shop name. You reject the still if water collides with the caption area, or if a second line of type appears under the title.",
    bridge:
      "Scro puts that hook title on the opening of the doodle, in the spoken language, unless you turn on-screen text off. Keep it in the upper-middle. At most one arrow, no blank grey strip, one idea, and you approve the still before motion. Export 9:16 only after the words clear the button band on a phone.",
    checks: ["Title is in the upper-middle.", "No URL is burned into the bottom.", "The product label is not under the caption bar."],
  },
  {
    id: 27,
    slug: "export-a-reel-without-black-bars",
    title: "Export a Reel Without Black Bars",
    excerpt:
      "Black bars on a reel mean the file is not 9:16. Export a vertical frame, and do not drop a horizontal video into it.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A vertical video frame filled edge to edge with a workshop scene, no letterboxing and no text",
    cta: "Export 9:16",
    answer:
      "To export a reel without black bars, the file itself has to be vertical, 9:16, filled edge to edge. Bars appear when a wide picture is dropped into a vertical post, or when a blank band is left above or below the drawing. First, set 9:16 before the first still. Second, redraw the beat for a phone so the subject fills the frame. Third, open the exported file, not the editor preview, and reject it if you can see a black or grey band. Do not add bars to make a wide slide fit.",
    points: [
      {
        h: "Set the frame before the first still",
        p: "Decide 9:16 at the storyboard, not at export. A diagram drawn for a wide slide will letterbox or lose its edges. For a workshop lesson, sketch the bench as a tall frame: the tool in the middle, the title in the upper-middle. The first three seconds show that tall frame already full, and they say the hook, such as Crop, don't pad. If the first still is a wide rectangle floating on black, you started in the wrong shape. One idea. Redesign the beat, then approve it.",
      },
      {
        h: "Fill the frame",
        p: "If the only photo you have is horizontal, crop to the subject and accept the loss of the sides. A floating widescreen in the middle of a black reel looks unfinished and shrinks the title. On a doodle or a paper-cutout, the board goes edge to edge. A blank grey strip is the same failure as a black bar: empty picture pretending to be margin. Use at most one arrow, inside the full frame, not in a side pillar. A practical cut is about 18 seconds, all of it full.",
      },
      {
        h: "Check the file, not the preview",
        p: "Some apps preview-crop and then upload the original wide file. Open the exported file and look at its shape before you post. If you can see bars in the file, the feed will show bars. Play the first three seconds on a phone. Reject the export if a grey or black band appears when the title comes up, or if the title was designed for the wide version and now collides with the crop. Fix the still and export again. Do not cover the bars with a sticker.",
      },
    ],
    example:
      "A frame shop teaching a vertical crop, doodle, 18 seconds. From 0 to 3 seconds the title Crop, don't pad sits in the upper-middle of a frame that is already full, and the voice says it. From 3 to 12 seconds a wide picture is shown only long enough to see the mistake, then the same subject is cropped to the tool and the hand, edge to edge, one arrow on the crop. From 12 to 18 seconds the full vertical frame holds. No black band, no grey strip. You reject the file if the exported shape still has bars, or if the preview looked cropped while the file did not.",
    bridge:
      "Scro builds the storyboard in a vertical frame, doodle or paper-cutout on one wooden board, one idea. The first three seconds are the hook title in the spoken language, unless on-screen text is off. At most one arrow, no blank grey strip, and you approve the stills in that full frame before motion. Export 9:16 and check the file.",
    checks: ["The file is vertical.", "No black band is part of the picture.", "Titles were designed for the crop, not added after."],
  },
  {
    id: 28,
    slug: "reel-hook-that-is-not-a-greeting",
    title: "A Reel Hook That Is Not a Greeting",
    excerpt:
      "A reel hook is the point, said first. A greeting introduces you to people who have not decided to stay.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A person mid-sentence at a table, frame tight, no wave and no text",
    cta: "Open on the point",
    answer:
      "A reel hook that is not a greeting starts with the result, the refusal, or the mistake. A hello tells a stranger nothing they can use. They did not come from your last video. They came from a swipe. First, write the reel through to the last line. Second, move the sharpest sentence to the front and draw it as the title. Third, continue into the proof without restarting. The first line has to be worth the second. A practical cut is about 18 seconds.",
    points: [
      {
        h: "Steal from the last line",
        p: "Most drafts bury the point under a polite opening. Write the beats, circle the sentence you would still care about if the rest were deleted, and put that sentence in the first three seconds. For a cafe, the buried line is often Name one dish. The greeting was only there because it felt like walking into a room. The feed is not a room. Delete the hello before you approve the still. If the sharp line is vague, you do not have a hook yet. Rewrite it until a stranger can repeat it.",
      },
      {
        h: "Make it a claim, a question, or a picture",
        p: "Name one dish is a claim. Which dish is on the door? is a question. A single card on a door is a picture. All three can open. Hi, I'm the owner cannot. The first three seconds show the card and say Name one dish, in the spoken language, large, upper-middle. They do not say the shop name. One idea, at most one arrow toward the card, no blank grey strip behind the words. Reject an opening that needs your name before the claim makes sense.",
      },
      {
        h: "Then continue, do not restart",
        p: "After the hook, prove it. The next beat is one card on the door, not a new intro that says so today we will talk about the menu. The hook is sentence one of the same paragraph. The ask is the last few seconds: Put that on the door. If you restart, you spent the only guaranteed seconds twice and taught nothing. Reject a cut that returns to a wave after the title. About 18 seconds is enough for the claim, the card, and the ask.",
      },
    ],
    example:
      "A cafe, doodle, 18 seconds. The draft ended with Put one dish on the door. That line moves to the front. From 0 to 3 seconds the card is already visible and the title is Name one dish, spoken with no hello. From 3 to 12 seconds one dish card is on the door, one arrow, the other specials are gone. From 12 to 18 seconds the voice says Put that on the door. The shop name is in the caption. You reject the file if the first words are a greeting, or if a second sentence restarts the topic after the title.",
    bridge:
      "Scro puts Name one dish on screen as the hook title of the doodle, in the spoken language, unless you turn on-screen text off. One idea, at most one arrow, no blank grey strip. Approve that opening still before the rest of the reel moves, then export 9:16.",
    checks: ["The first words are not a hello.", "The second beat proves the first.", "Your name is not required to understand the reel."],
  },
  {
    id: 29,
    slug: "one-idea-into-a-three-part-reel-series",
    title: "One Idea, Three Reel Parts",
    excerpt:
      "Turn one idea into three reels by giving each part its own title. People will not start at part one.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "Three vertical storyboard cards on a desk, each with a different object, no readable words",
    cta: "Storyboard the three parts",
    answer:
      "To turn one idea into a three-part reel series, split it into three sentences that each stand alone. Most viewers will see only one of the three. First, write the three titles in a row and fix any title that needs the others. Second, storyboard each part on the same board, about 20 seconds each. Third, open every part on its own hook and pay that hook off inside the same file. Part two cannot start with as I said yesterday. If two titles sound like the same sentence, you have one reel and a leftover.",
    points: [
      {
        h: "Three titles before three edits",
        p: "Write the titles before you draw. For a bakery: Cost the flour first. Then the hour. Then the tray you waste. If one of them needs the others to make sense, rewrite it until a stranger can use it alone. Do not open an editor until all three titles are lines you would say at the counter. Each title is one idea. A fourth title is a fourth reel, or a sign that you have not split cleanly. Reject a pair of titles that you cannot tell apart when you cover the part numbers.",
      },
      {
        h: "Repeat the setup in one line",
        p: "You may remind people of the topic in a few words. You may not spend the first five seconds recapping. The first three seconds of part two show the clock and say Then the hour. They do not replay the flour. Part 2 is enough context if you even need the number. The proof follows immediately: one hour of hands on the bench, then the ask to count that hour before you add another tray. About 20 seconds. A recap that restates part one is the failure you can see, because the opening looks like an old reel.",
      },
      {
        h: "Same look, so the series is visible",
        p: "Same board, same shopkeeper cut-out, same wooden table. The titles change. A series that switches from doodle to paper-cutout, or from one board to a photograph, looks like three accounts. Use at most one arrow in each part, and no blank grey strip as a divider between parts. The divider is a new file. Approve each part's stills against the first part's board before motion. Reject a part whose wood grain, character, or type style drifted.",
      },
    ],
    example:
      "A bakery, three paper-cutout reels on one wooden board, about 20 seconds each. Part 1 opens Cost the flour first, flour bag in frame, spoken in the first three seconds, then one tray. Part 2 opens Then the hour, a clock, no recap of the flour, then the hands. Part 3 opens Then the tray you waste, one burnt tray, then the line Count that tray. None of them says continuing. The shopkeeper cut-out matches. You reject part 2 if its first three seconds replay part 1, or if the board changed colour.",
    bridge:
      "Scro storyboards each part as its own paper-cutout on the same wooden board, one idea per file. The first three seconds of each are that part's hook title, in the spoken language, unless on-screen text is off. At most one arrow, no blank grey strip, and you approve each still set before motion. Export three 9:16 reels.",
    checks: ["Each title works if the others vanish.", "The recap is one line or absent.", "The look matches across parts."],
  },
  {
    id: 30,
    slug: "rank-an-instagram-reel-in-search",
    title: "Rank a Reel in Instagram Search",
    excerpt:
      "To rank a reel in search, say one phrase in the first line of the caption, on screen, and out loud. One phrase, not five.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A person speaking while a phone search bar is out of focus in the foreground, no readable words",
    cta: "Put one phrase on the reel",
    answer:
      "To rank an Instagram reel in search, pick one phrase a person would type and put it where the words can be read: the first line of the caption, the opening on-screen text, and the first spoken sentence. First, copy a completion from the search field, not a clever synonym. Second, make that phrase the hook title and the first sentence. Third, prove it in the rest of a short reel and do not add a second phrase. A reel that answers one query is easier to understand than a reel that mentions eight topics. Watch time still has to earn the distribution after someone finds it.",
    points: [
      {
        h: "Steal the phrase from search",
        p: "Type the topic into Instagram's search field and write down the completions. Those are phrases people already use. Choose one. Do not invent a synonym and hope the box agrees. If the completion is reel without showing your face, that is the phrase, even if you would rather say faceless. Write it the way it is typed, then make it speakable. One idea. If two completions both fit, they are two reels. Reject a title you made up in a notebook if it never appears when you type the topic.",
      },
      {
        h: "Say it early",
        p: "The first three seconds show the proof starting and say the phrase. For this one, the board shows hands on a counter, no face, and the title is Reel without showing your face, spoken as the first sentence, upper-middle, in the spoken language. A phrase in the last second is a phrase most viewers never hear. The caption's first line is the same phrase, before any shop name. Burn the title in if the file will also go to TikTok or Shorts, so the phrase does not depend on one app's auto-captions.",
      },
      {
        h: "Do not stuff",
        p: "Five phrases in the caption read as a list and do not help someone finish the reel. One clear reel beats a keyword pile. After the first sentence, show the hands packing, then the result, about 22 seconds total. Do not repeat the phrase four times. Once in the title, once in the first spoken sentence, once as caption line one, all the same words. Reject a caption that adds three extra queries at the bottom. The rest of the caption can name the shop and nothing else.",
      },
    ],
    example:
      "A candle shop that posts without the owner's face, doodle of hands, 22 seconds. The search phrase is reel without showing your face. From 0 to 3 seconds the hands turn a key, the title is that phrase, and the voice says it first. From 3 to 16 seconds the hands light one candle. From 16 to 22 seconds the tray holds. Caption line one is the phrase. Line two is the shop name. No second query. You reject the reel if the phrase arrives after the tray, or if a face enters and the phrase becomes untrue.",
    bridge:
      "Scro puts that hook title on the doodle in the first three seconds, in the spoken language, unless on-screen text is off, and the voice says the same phrase. One idea, at most one arrow, no blank grey strip. Approve the opening still before motion, then export 9:16 with the words in the upper-middle.",
    checks: ["The phrase is one someone would type.", "It is in the caption, the title, and the first sentence.", "You did not add a second phrase to chase."],
  },
  {
    id: 31,
    slug: "keywords-in-a-reel-caption",
    title: "Keywords in a Reel Caption",
    excerpt:
      "Put the keyword in the first sentence of the caption, written as a sentence a person would say. The rest of the caption can explain.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A phone caption field beside a vertical video on a desk, screens blank, no readable text",
    cta: "Write the caption from the title",
    answer:
      "Keywords in a reel caption belong in the first sentence, because that is the line people see before they tap more. Write it as a sentence, not a list. The phrase is the one already on screen and in the first spoken line. First, copy that opening line into sentence one. Second, add one sentence of context. Third, stop, and reject a caption that retells every beat or chases a second phrase. Hashtags are not a substitute for the sentence.",
    points: [
      {
        h: "First sentence, then context",
        p: "Sentence one is the phrase, written the way a person would say it. Sentence two says who it is for or what the reel shows. A save or a shop name can be sentence three. For a chemist counter the phrase is Two pumps, morning. The first three seconds of the reel already show the bottle and say those words, so the caption is repeating a promise the picture made, not inventing a new one. If sentence one is a row of tags, rewrite it until it has a verb or a clear noun phrase you can speak.",
      },
      {
        h: "Match the audio",
        p: "If the spoken line and the caption disagree, you have two topics. Pick the spoken line and make the caption follow it. Play the reel once with sound and read sentence one at the same time. They should match. Do not let a caption draft from yesterday survive if the doodle title changed this morning. One idea. Reject the post if the caption says evening and the voice says morning. The upper-middle title, the mouth, and sentence one are the same words.",
      },
      {
        h: "Skip the essay",
        p: "A caption that retells every beat is for people who will not watch, and it pushes the phrase down. Add the one detail that did not fit on screen: the counter it sits on, or the limit of the routine. Do not invent a price. Do not paste five related phrases. About 20 seconds of picture does not need 20 seconds of caption. Reject a caption longer than the three sentences, or one that hides the phrase under a greeting. The shop name, if you need it, is sentence two or three, not a logo on the bottle.",
      },
    ],
    example:
      "A chemist, doodle of one plain bottle, 20 seconds. From 0 to 3 seconds the title is Two pumps, morning, spoken first, label on the bottle left blank. The rest shows two pumps on the back of a hand and stops. Caption sentence one: Two pumps, morning, is the whole routine. Sentence two: It is the bottle on the chemist counter. Sentence three: Save it for the morning. You reject the caption if it starts with the shop story, lists three extra routines, or names a size the reel never showed.",
    bridge:
      "Scro puts Two pumps, morning on the doodle as the hook title, in the spoken language, unless on-screen text is off. Copy that line into sentence one of the caption when you post. One idea, at most one arrow, no blank grey strip, and you approve the still before motion. Export 9:16.",
    checks: ["Sentence one contains the phrase.", "The caption matches the voice.", "You added one detail, not a transcript."],
  },
  {
    id: 32,
    slug: "say-the-keyword-in-the-first-sentence",
    title: "Say the Keyword in Sentence One",
    excerpt:
      "Say the search phrase in the first spoken sentence so captions and transcripts pick it up while people are still watching.",
    locale: "en",
    landingPath: "/talking-head",
    tags: ["Instagram Reels", "Talking Head"],
    scene: "A host at a microphone, mouth open mid first sentence, quiet studio, no text",
    cta: "Record the first sentence",
    answer:
      "Say the keyword in the first sentence so a muted viewer, the burned-in captions, and anyone skimming the words all meet the same phrase while they are still watching. If you wait until the end, you are labelling a video most people did not finish. First, rewrite the phrase until you can say it across a counter. Second, record that sentence first, with no breath in front. Third, prove the phrase and do not repeat it as a slogan. The phrase should sound like speech, not like a tag bolted on.",
    points: [
      {
        h: "Write it speakable",
        p: "How to make a reel without showing your face can be said. A stack of nouns cannot. Read it out loud. If you stumble, rewrite until it is a sentence you would say at the counter. The first three seconds show one person, not you if the phrase says your face stays off, and the mouth is already on that sentence. On-screen words in the upper-middle match. They do not open with a hello. One person speaks. If the phrase only works as a label, it is not ready to record.",
      },
      {
        h: "Then stop repeating it",
        p: "Once in the first sentence is enough. Saying it four times sounds like an ad read and pushes the proof later. The proof is why they stay: the host on camera, the owner off it, the hands doing the work beside the line. A practical reel is about 22 seconds. After the first sentence, talk about the script and the captions, and let the phrase go. Reject a take that returns to the phrase as a sign-off. The ending can be the next step, such as Write the line, then film the hands.",
      },
      {
        h: "Let the caption follow",
        p: "Burned-in captions carry the phrase if you said it cleanly, which matters when the same file goes to TikTok or Shorts. A noisy room and a fast read are how the words come out wrong. Record the first sentence twice and keep the clearer take. Trim any silence before the first word so the caption and the mouth start together. Keep the lines in the upper-middle. Reject a caption that guessed a different phrase, or that added words you did not say.",
      },
    ],
    example:
      "A stationery shop, one host, the owner never in frame, 22 seconds. From 0 to 3 seconds the host says This is a reel without showing your face, and those words are in the upper-middle. From 3 to 16 seconds the host explains the script and points beside the frame, where a hand packs an order, the owner's face still absent. From 16 to 22 seconds the line is Write the line, then film the hands. The phrase does not return. You reject the take if the first words are a greeting, if the caption disagrees, or if the owner walks through the background.",
    bridge:
      "Scro puts one person on camera to say that first sentence, then captions it in one of 13 styles and trims the silence at the head. Export 9:16. If the face or the voice is a realistic generation, label it as AI on the upload, and leave any platform label where the platform put it.",
    checks: ["The first sentence contains the phrase.", "You can say it without stumbling.", "You do not repeat it as a slogan."],
  },
  {
    id: 33,
    slug: "reel-that-works-with-sound-off",
    title: "A Reel That Works with Sound Off",
    excerpt:
      "A reel that works with the sound off has the point on screen in the first three seconds and proof that does not need the voice.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A phone playing a vertical video in a noisy cafe, speaker icon irrelevant, no readable text on the phone",
    cta: "Build the mute version first",
    answer:
      "A reel that works with the sound off can be understood on a train. The title is visible immediately. The middle is a picture of the point. The ask is on screen, or so obvious that the picture is the ask. First, design the mute version. Second, watch it at volume zero and fix any missing fact. Third, add the voice as a warmer copy of the same words, not as the only place a fact exists. Burn the words in if the file will also go to TikTok or Shorts.",
    points: [
      {
        h: "Watch it muted before you export",
        p: "Play the cut once with the volume at zero before you approve motion, and again on the exported file. If you are lost, the viewer is lost. Do not tell yourself they will unmute. Many will not. The first three seconds, muted, show the bun and the words Wednesday bun, ready at three, in the upper-middle. You should know the offer with no sound. Reject the still if those words are missing, tiny, or sitting where a caption bar will cover them. This check is the edit, not a courtesy pass.",
      },
      {
        h: "Pictures that are the sentence",
        p: "A bun on a tray is the sentence. A face nodding is not, unless the words are on screen. One idea on one board: this bun, this time. At most one arrow, from the clock to the bun. No blank grey strip for the type to sit on. Inside jokes do not survive mute. A practical reel is about 18 seconds: title, bun, clock, hold. If a beat only makes sense with the voice, redraw it as an object. The picture has to finish the thought.",
      },
      {
        h: "Voice can add tone, not the only fact",
        p: "The time, the object, and the instruction have to be visible. The voice can be warmer than the text. It cannot be the only place ready at three exists. Speak the same line the title already shows, then stop. Do not invent a price in the voice that the mute viewer never sees. The shop name can be spoken and also written in the caption. Reject a cut where a whispered aside carries the only instruction. Caption and voice stay the same sentence.",
      },
    ],
    example:
      "A bakery, paper-cutout on one wooden board, 18 seconds. Muted, from 0 to 3 seconds the bun fills the frame and the title reads Wednesday bun, ready at three. From 3 to 12 seconds the same bun is on the tray, one arrow toward a clock at three. From 12 to 18 seconds the bun holds. With sound, the voice says the same title and adds nothing new. The caption has the shop name. You reject the file if the time is only spoken, if a price appears in the voice, or if the words sit on the bottom.",
    bridge:
      "Scro builds this paper-cutout on one wooden board and puts the hook title on the opening, in the spoken language, unless you turn on-screen text off. If text is off, the bun and the clock have to carry the fact alone. At most one arrow, no blank grey strip, words in the upper-middle, and you approve the stills before motion. Export 9:16.",
    checks: ["You watched it muted.", "The offer is visible.", "The voice is not the only copy of a date or price."],
  },
  {
    id: 34,
    slug: "trim-silence-at-the-start-of-a-reel",
    title: "Trim Silence at the Start of a Reel",
    excerpt:
      "Silence at the start of a reel is a false opening. Cut it so the first frame is already the title or the first word.",
    locale: "en",
    landingPath: "/talking-head",
    tags: ["Instagram Reels", "Talking Head"],
    scene: "A microphone and a waveform-like shadow on a desk, the sound about to start, no text",
    cta: "Trim the head of the clip",
    answer:
      "Trim silence at the start of a reel so the first frame is already the point. A breath, a filler sound, or a second of room tone feels short in the edit and long in the feed. People decide in those seconds. First, find the first real word on the waveform. Second, cut everything before it, including the sit-down. Third, listen to the head on a phone and reject the file if the title is waiting for the voice. Dead air is a decision to leave. The end may breathe. The start may not.",
    points: [
      {
        h: "Cut to the first real word",
        p: "The waveform's first peak is the start. If the title is on screen, it can lead by a fraction, but the voice should not arrive late. Late voice and early title feel like a mistake. The first three seconds show one person already speaking, and they say the point, such as Vague, with the same word in the upper-middle. They do not show a chair scrape. Record the line twice and keep the take that starts clean. One person. If you generated the clip, trim after you hear it, not by guessing from the still.",
      },
      {
        h: "Keep a little air at the end",
        p: "The end can breathe so the last word is not chopped. The start cannot. Viewers forgive a short hold after the ask. They do not forgive a hold before the point. Leave a beat after rewrite so the caption finishes. Do not leave a beat before Vague. A practical reel is about 16 seconds once the head is gone. Reject a cut that clips the last consonant, or that keeps a polite inhale because it felt natural in the room. Natural in the room is late in the feed.",
      },
      {
        h: "Do not cover the gap with music",
        p: "A music swell over silence is still a late point. Trim first. Music, if you have rights to it, can sit under the words after the cut. Do not use an uncleared track to hide the gap. Captions should appear with the first word, in the upper-middle, not during the silence. Burn them in if the file also goes to TikTok or Shorts. Reject an export where the title sits alone for a full second before the mouth moves. That second is the failure you can see and hear.",
      },
    ],
    example:
      "A copy shop's host, 16 seconds after the trim. The raw take had the host settling into the chair. That is gone. From 0 to 3 seconds the host says Vague, the word is already in the upper-middle, and there is no breath in front. The middle shows one messy note. The last word, rewrite, gets a short hold so it is not chopped. Captions match. You reject the file if the chair scrape remains, if music covers a pause you did not cut, or if rewrite loses its ending.",
    bridge:
      "Scro puts one person on camera, trims the silence at the head so the first word lands with the title, and captions the line in one of 13 styles. Export 9:16 after you hear the head once. If the face or the voice is a realistic generation, label it as AI on the upload, and do not remove a platform label.",
    checks: ["The first frame is not a breath.", "The last word is intact.", "Music is not hiding an uncut pause."],
  },
  {
    id: 35,
    slug: "reel-length-for-a-tutorial-or-a-trend",
    title: "Reel Length for a Tutorial or a Trend",
    excerpt:
      "A trend reel is usually under 15 seconds. A tutorial reel can run longer if every few seconds shows the next step.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "Two phones on a table, one showing a quick gesture and one a step-by-step tabletop, no text",
    cta: "Match the length to the job",
    answer:
      "Choose reel length by the job. A reel can run from 3 seconds to 3 minutes. A trend is a gesture, often under 15 seconds, because the viewer already knows the format and is waiting for your version. A tutorial is a sequence. It can sit in the 15 to 45 second range, or run longer, when every step changes the picture and none of them repeat a greeting. First, name the job. Second, count the pictures that job needs. Third, refuse the other job's length. Padding a trend, or crushing a tutorial, both fail in a way you can see.",
    points: [
      {
        h: "Trends do not explain themselves",
        p: "If you have to teach the format, you are late, and the reel is too long. Do your version and get out. The first three seconds of a loading-bar outfit reel show the unfinished look and a 0, and they say nothing else. The explanation of why loading bars work is a different file, posted another day. One idea. Reject a trend cut that opens with a definition. People who wanted the gesture have already left, and people who wanted the lesson did not get the steps.",
      },
      {
        h: "Tutorials change the picture",
        p: "Every few seconds, the drawing should be somewhere new. A spoken explanation over one locked shot is a paragraph you could have written. For a collar press, the pictures are the iron down, the cloth folded, the edge, the finished collar. About 40 seconds, four pictures, one idea. The first three seconds say Press the collar, in the spoken language, upper-middle, over the iron. At most one arrow in the whole tutorial. No blank grey strip between steps. If a step does not change the picture, cut the step.",
      },
      {
        h: "Do not borrow the other length",
        p: "Padding a trend to add value loses the people who came for the gesture. Compressing a four-step press into nine seconds loses the step. Pick one job before you time it. A 12-second loading reel and a 40-second tutorial can live on the same account on different days. They should not be one file. Reject a tutorial whose middle is a repeated shot, and reject a trend that stops to narrate. The length you can defend is the length of the pictures you kept.",
      },
    ],
    example:
      "A tailor, two files. The trend is 12 seconds: 0, then the shirt, then the coat, hard cuts, no narration, first three seconds only the unfinished shirt and a 0. The tutorial posts the next day, doodle, 40 seconds. From 0 to 3 seconds the title is Press the collar. Then the iron, the fold, the edge, the finished collar, each a new picture. You reject the trend if it starts explaining steam, and you reject the tutorial if two of the steps are the same drawing. Neither file borrows the other's length.",
    bridge:
      "Scro storyboards the job you named: a short doodle for the gesture, or a stepped doodle for the press. One idea each. The tutorial's first three seconds are the hook title in the spoken language, unless on-screen text is off. At most one arrow, no blank grey strip, and you approve each still before motion. Export 9:16 at the length the pictures earned.",
    checks: ["You named the job before you timed it.", "A trend is not explaining itself.", "A tutorial changes the picture at every step."],
  },
  {
    id: 36,
    slug: "repurpose-one-reel-to-tiktok-and-shorts",
    title: "One Reel for TikTok and Shorts",
    excerpt:
      "Repurpose one reel by exporting a clean 9:16 file with burned-in captions. Do not depend on a sticker that only exists inside Instagram.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "One vertical video file copied toward three blank phones, no logos and no text",
    cta: "Export a file you can reuse",
    answer:
      "To repurpose one reel to TikTok and Shorts, export a 9:16 file that already contains the title and the captions. Stickers added inside one app do not travel. First, burn the words into the picture. Second, keep them in the upper-middle. Third, post that same file natively and change only the caption if a line has to match the place. A blurry re-record of your screen is not a repurpose. The picture, the words, and the audio have to be in the file.",
    points: [
      {
        h: "Burn in the words",
        p: "If the title matters, it is pixels. Auto-captions on the next app will guess again, and they will guess differently. Your burned-in line stays stable. The first three seconds show the hook title already in the frame, spoken in the same language, such as Name one dish. They do not depend on a sticker you add after upload. One idea. Approve the still with the words visible before motion, so you are not burning a title onto the wrong picture. Reject a file whose words exist only as an app layer.",
      },
      {
        h: "Leave the safe zone anyway",
        p: "Each app covers a slightly different edge. The caption safe zone that survives the trip is the upper-middle. Keep the title there so a new button does not eat it. Do not place a handle in the corner as the only credit. The shop name belongs in each app's caption. At most one arrow, inside the middle, and no blank grey strip along the bottom that you hoped was padding. A practical file is about 22 seconds, full frame, 9:16, edge to edge.",
      },
      {
        h: "Change the caption, not the cut",
        p: "The file can be identical on Reels, TikTok, and Shorts. The first caption sentence can match a local way of saying the same point, if the spoken line still agrees. Do not re-edit the picture unless a claim is wrong for that place. Do not rebuild the title as a new sticker per app. Reject a version that screen-records the preview, adds a second arrow, or changes the dish between uploads. Same cut. Same words in the picture. Caption text is the only thing you may retouch.",
      },
    ],
    example:
      "A cafe, one 22-second doodle. From 0 to 3 seconds Name one dish is burned into the upper-middle and spoken. The middle is one card on the door. The end says Put that on the door, also burned in. No app sticker, no grey strip. That file goes to Reels, TikTok, and Shorts. Only the caption's first sentence changes if the local phrase differs, and it still means the same card. You reject the batch if one upload is a screen recording, or if the title sits low enough for a button to cover dish.",
    bridge:
      "Scro burns the hook title and the captions into the doodle and exports 9:16, so the file is the reel. The first three seconds are that title in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, words in the upper-middle, and you approve the stills before motion. You are not rebuilding stickers per app.",
    checks: ["Captions are in the file.", "Words sit in the upper-middle.", "You did not screen-record the preview."],
  },
  {
    id: 37,
    slug: "make-a-reel-from-a-blog-post",
    title: "Make a Reel from a Blog Post",
    excerpt:
      "Make a reel from a blog post by taking one heading, not the article. The post can live in the caption link.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A printed page with one paragraph circled and a phone beside it, no readable text",
    cta: "Turn one heading into a reel",
    answer:
      "To make a reel from a blog post, choose one heading that can be a title and leave the rest in the post. A post is an argument with sections. A reel is one of those sections, shown. First, rewrite the heading until it is a hook. Second, pick the single most concrete example under it. Third, storyboard that example and point the caption at the post for everything you left out. People who only watch still leave with the heading. People who want the rest can open the link.",
    points: [
      {
        h: "The heading becomes the first three seconds",
        p: "If the heading is vague, rewrite it until it is a reel title, then use that sharper line in both places. Trim the start can become Cut the breath. The first three seconds show a waveform-like mark on the board and say Cut the breath, in the spoken language, upper-middle. They do not read the introduction aloud. One idea. If you cannot say the heading in one breath, it is still a chapter, not a reel. Reject an opening that starts with In this article.",
      },
      {
        h: "One example from the post",
        p: "The post may have five examples. The reel uses the most concrete one: the breath before the first word, cut, so the title and the voice start together. A list of all five is a second reel, not this cut. Draw that one example in two or three pictures, about 20 seconds. At most one arrow, pointing at the gap you remove. No blank grey strip standing in for the silence. If the example has no object, it is not ready to draw. Find the breath, the chair, the first word.",
      },
      {
        h: "Send them back on purpose",
        p: "The caption can say the post exists and what extra is in it: the export check, the other examples. Do not promise the reel contains the article. It does not, and it should not. Sentence one of the caption repeats Cut the breath. Sentence two names the post. Reject a caption that pastes the whole section, and reject a reel that tries to summarise every heading. The honest limit is the point of the format. About 20 seconds, then the link.",
      },
    ],
    example:
      "A frame shop's blog has a section called Trim the start. The reel is a doodle, 20 seconds, titled Cut the breath. From 0 to 3 seconds that title is spoken over a simple waveform mark. From 3 to 14 seconds the gap before the first word is marked with one arrow, then the word starts at the head. From 14 to 20 seconds the line holds: First word, first frame. The caption points to the post for the export steps and does not paste them. You reject the reel if it reads the intro, lists every heading, or claims to be the whole article.",
    bridge:
      "Scro storyboards that single heading as a doodle, one idea. The first three seconds are the hook title Cut the breath, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, and you approve the stills before motion. Export 9:16 and let the caption point at the post.",
    checks: ["You used one heading.", "You did not narrate the intro.", "The caption is honest about what the reel leaves out."],
  },
  {
    id: 38,
    slug: "storyboard-a-30-second-reel",
    title: "Storyboard a 30-Second Reel",
    excerpt:
      "Storyboard a 30-second reel as four beats before you generate or film anything. Each beat is one picture and one line.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "Four hand-drawn frames on paper in a row, rough sketches of a simple how-to, no readable words",
    cta: "Approve the four stills",
    answer:
      "To storyboard a 30-second reel, write four beats and stop. Beat one is the title, about three seconds. Beats two and three are the problem and the fix. Beat four is the ask. Thirty seconds is four pictures, not a script of twelve. First, sketch one picture per beat. Second, write the spoken line under each picture and make them match. Third, approve the four stills in a row before anything moves. If you cannot sketch it, you are not ready to render it.",
    points: [
      {
        h: "One picture per beat",
        p: "If a beat needs two pictures, it is two beats, and the reel is no longer 30 seconds of four. Split it or cut a picture. Crowded beats become messy frames on a phone. For a cafe, beat two is one crowded specials card, not the card plus the kitchen plus the queue. One idea. At most one arrow on the whole storyboard, usually on the fix. No blank grey strip used as a frame around a beat. Each picture fills 9:16. Reject a beat you cannot describe in one sentence without the word and.",
      },
      {
        h: "Write the line under the picture",
        p: "The line is what the voice says and what the title or caption shows, and they match. A picture with no line is a spare shot you will not know where to put. Under the first picture write Name one dish. Under the crowded card write Six specials. Under the single card write Leave one. Under the door write Put that on the door. Read them in order. The first three seconds are picture one and its line, spoken, upper-middle. If a line has no picture, delete the line before you add a drawing.",
      },
      {
        h: "Approve stills before motion",
        p: "A wrong label or a stray object is cheap to fix as a still and expensive as a finished clip. Look at the four frames in a row, on a phone, with the sound off. You should get the story. Then move. Reject the row if the door appears before the single card, if a second idea about hours snuck into beat four, or if a grey band showed up under the title. About seven seconds each is the 30. Do not generate motion to discover the story.",
      },
    ],
    example:
      "A cafe, doodle, 30 seconds, four pictures. From 0 to 3 seconds, and holding into the first seven: Name one dish, spoken, one card already hinted. Then a crowded specials card for about seven seconds. Then one card, one dish, one arrow. Then the card on the door and the line Put that on the door. Same board throughout. You reject the storyboard if beat two needs a second picture, if any line disagrees with its frame, or if you started motion before the row worked muted.",
    bridge:
      "Scro turns those four beats into a doodle storyboard and waits for you to approve the stills before motion. The first three seconds are the hook title Name one dish, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, one idea. Export 9:16 when the four frames are the reel you meant.",
    checks: ["Four beats, four pictures.", "Each picture has one line.", "You approved the stills before motion."],
  },
  {
    id: 39,
    slug: "test-two-hooks-for-the-same-reel",
    title: "Test Two Hooks for the Same Reel",
    excerpt:
      "Test two hooks by changing only the first three seconds. Keep the proof the same, and judge the hold, not the likes.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "Two opening frames on a desk leading into the same middle scene, no text",
    cta: "Cut two openings",
    answer:
      "Test two hooks for the same reel by swapping only the opening title. The middle and the ask stay identical, or you are testing two videos. First, write both hooks from the same proof before you publish either. Second, change nothing else: no new music, no new middle, no new cover slogan hiding in the caption. Third, compare who is still watching after three seconds, then put the winner's words on the cover. A compliment in the comments is not the result. The hold is.",
    points: [
      {
        h: "One variable",
        p: "Hook A is a claim: Name one dish. Hook B is the mistake: Six specials is no special. The proof is the same single card. If you also change the board, the arrow, or the last line, you learned nothing. The first three seconds are the only seconds that differ. They show the same card starting to appear, and they say one hook or the other, upper-middle, spoken. Everything from second four is a copy. Reject a pair where the middles do not match when you cover the opening.",
      },
      {
        h: "Write both before you publish either",
        p: "A second hook invented after the first one struggles is usually a different idea. Draft both from the same proof so the test is real. Approve both opening stills before motion. One idea in the shared middle. At most one arrow, the same arrow in both files. No blank grey strip added to one version for contrast. Post them far enough apart that you are not only measuring the same morning's audience. About 20 seconds each, identical after the title.",
      },
      {
        h: "Read retention, then keep the winner's words",
        p: "Look at who stayed past the first three seconds. The cover and the caption should switch to the hook that held people. Leaving the old title on the cover wastes the test, because the grid still promises the weaker line. Do not average the two and write a third slogan. The winner is one of the two you drafted. Reject a follow-up edit that also changes the card. You would be starting a new test and calling it the result.",
      },
    ],
    example:
      "A cafe, two doodle files, 20 seconds each. Shared proof: one dish card on the door, then Put that on the door. Hook A, first three seconds: Name one dish. Hook B, first three seconds: Six specials is no special. Same board, same arrow, same ending. No price, no extra offer. The hook that keeps people past three seconds becomes the cover and caption line one. You reject the test if the music changed, if the card changed, or if you published B only after rewriting the middle.",
    bridge:
      "Scro can build the same doodle beats with a different opening title. The first three seconds are that hook, in the spoken language, unless on-screen text is off. At most one arrow, no blank grey strip, and you approve both stills before motion. Export two 9:16 files and do not change anything else between them.",
    checks: ["Only the opening changed.", "You drafted both hooks first.", "The winning words are now the cover."],
  },
  {
    id: 40,
    slug: "check-a-reel-hook-in-the-first-3-seconds",
    title: "Check a Hook in the First 3 Seconds",
    excerpt:
      "Check a reel hook by watching the first three seconds as a stranger. If you cannot say the point, the hook is not done.",
    locale: "en",
    landingPath: "/explainer",
    tags: tag,
    scene: "A thumb paused over a phone at the very start of a vertical video, no readable text",
    cta: "Review the opening still",
    answer:
      "Check a reel hook in the first three seconds by covering the rest of the timeline and watching only that. Say the point out loud. If what you say is it is about the shop, the hook failed. A passing hook can be repeated by someone who has never met you. First, watch muted. Second, watch with sound. Third, if either pass fails, fix the still and only then match the caption. Do this before motion. Rendering will not make a vague frame specific.",
    points: [
      {
        h: "Mute and sound, both",
        p: "Watch once muted and once with sound, only the opening. The muted pass checks the title: large, upper-middle, one idea, readable without pausing. The sound pass checks that the first word is the same point, not a warm-up. For a bike shop, both passes should give you Book the brake check. If mute gives you a logo and sound gives you a hello, you have no hook. Reject the opening if the two passes disagree. At most one arrow, and not one that covers the words. No blank grey strip behind a tiny title.",
      },
      {
        h: "Use a stranger's pause",
        p: "If you have no stranger, wait an hour and play only the opening. Familiarity cheats. You remember what you meant. The frame has to say it. Ask what the first three seconds show and what they say. The answer should be the brake, and Book the brake check, not the brand. A practical reel after a passing hook is about 18 seconds of proof: the wheel, the check, the booking line. Do not judge the hook by the ending. Cover the ending. The opening has to stand.",
      },
      {
        h: "Fix the still, not the caption",
        p: "A caption cannot rescue an opening people have already swiped past. Change the title on the frame. Make it the words a stranger repeated. Then make the caption match. Reject a fix that only edits the caption, adds a comment reply, or sticks a clearer line on after upload. The still is the work. If the opening is a small logo and a smile, replace it before you generate motion. The replacement holds for the full three seconds, then the wheel appears.",
      },
    ],
    example:
      "A bike shop, doodle, 18 seconds. The failed opening, muted, is a small mark and a smile. Nobody can say the point. The replacement: from 0 to 3 seconds Book the brake check, large, upper-middle, spoken as the first words, wheel already in frame. From 3 to 18 seconds the same wheel and the line Bring the bike, not a photo. A stranger can repeat brake check. You reject the file if you only fixed the caption, if the first sound is a hello, or if the title is too small to read on a phone.",
    bridge:
      "Scro shows you that opening as a still of the doodle before motion. The first three seconds are the hook title in the spoken language, unless you turn on-screen text off. If the still fails the mute test, change the title there. At most one arrow, no blank grey strip, one idea. Export 9:16 after the still passes.",
    checks: ["You can say the point after three seconds.", "You tried it muted.", "The fix is on the frame, not only in the caption."],
  },
  {
    id: 41,
    slug: "generate-cartoon-clips-one-beat-at-a-time",
    title: "Cartoon Clips, One Beat at a Time",
    excerpt:
      "Generate cartoon clips one beat at a time. Each beat is one picture. Approve the stills before you turn them into motion.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Cartoon"],
    scene: "Four simple whiteboard doodle frames in a row on a desk, original sketches, no text",
    cta: "Generate the beats",
    answer:
      "Generate cartoon clips for a reel one beat at a time so each picture does one job. A title. A problem. A fix. An ask. If you ask for the whole story in one frame, you get a poster, not a clip. First, write the beats as pictures you could sketch. Second, approve each still, muted, before the next one. Third, generate motion only when the row tells the story. Fixing a wrong object after it moves means redoing the clip. A useful row is four beats and about 24 seconds.",
    points: [
      {
        h: "Write the beats as pictures",
        p: "Show the crowded bucket, then one bunch is a beat list. Make it catchy is not. The picture is what you will approve, so you have to be able to see it. For a flower shop: a bucket of six mixed bunches, then one bunch with one card. The first three seconds are beat one, the hook title Name the bunch, in the spoken language, upper-middle, already a picture of one card. They do not say a slogan about content. One idea. If you cannot point at an object, you are not ready to generate.",
      },
      {
        h: "One move per beat",
        p: "An arrow plus a label plus a second diagram is three beats pretending to be one. On a phone that frame is noise. Split it. At most one arrow in the whole reel, on the fix, pointing at the single card. No blank grey strip wiping the extra bunches away. Slide them off the board. Each beat is about six seconds. Reject a still that tries to show the problem and the fix together. The delay between those two pictures is why someone watches.",
      },
      {
        h: "Then move",
        p: "When the four stills tell the story with the sound off, generate motion. Read them in a row: title, crowded bucket, one bunch, Put that card on the bucket. Same doodle hand, same board. If a bunch changed flower between stills, fix the still. Do not hope motion will settle it. Reject the row if the hand redesigned itself, if a grey band appeared, or if the title is missing from the first frame. Motion is the last step, not the way you discover the story.",
      },
    ],
    example:
      "A flower shop, doodle, 24 seconds, generated one beat at a time. Beat 1, the first three seconds and a short hold: Name the bunch, spoken, one card visible. Beat 2: six mixed bunches in a bucket. Beat 3: one bunch, one card, one arrow. Beat 4: Put that card on the bucket. Same hand, same board, no grey strip. You approve each still muted before the next. You reject the set if beat 3 still shows all six bunches, or if you started motion while the card's words were wrong.",
    bridge:
      "Scro storyboards these cartoon beats as a doodle, one idea, and waits for still approval before motion. The first three seconds are the hook title Name the bunch, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip. Export 9:16 after the beats are right.",
    checks: ["Each beat is one picture.", "The stills work muted.", "Motion started after approval."],
  },
  {
    id: 42,
    slug: "whiteboard-explainer-for-instagram",
    title: "Whiteboard Explainer for Instagram",
    excerpt:
      "A whiteboard explainer for Instagram is a vertical doodle with one idea and a narrator. Keep the marks simple and the board consistent.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Explainer"],
    scene: "A vertical whiteboard doodle scene with simple marker drawings of a problem and a fix, no readable words",
    cta: "Make a whiteboard reel",
    answer:
      "A whiteboard explainer for Instagram teaches one idea with doodles on one board, voiced over, in a 9:16 frame. It is the right tool when the subject is a concept: a rule, a step, a mistake. Simple marks read on a phone. A dense diagram does not. First, write four beats and no legend. Second, keep the same board for every beat. Third, narrate only what the drawing cannot say, then approve the stills before motion. About 26 seconds is enough.",
    points: [
      {
        h: "One idea",
        p: "The board is not your blog. If the doodle needs a legend, it is too much. Four beats are the whole reel: title, problem, picture of the fix, ask. For a dry cleaner that is One ticket, then six unlabelled bags, then one ticket on one bag, then the rail. The first three seconds show the single ticket and say One ticket, in the spoken language, upper-middle. They do not tour the shop. Reject a fifth beat about stain types. That is another reel. One arrow at most, on the ticketed bag.",
      },
      {
        h: "Same board",
        p: "Do not switch to a photograph, a paper-cutout, or a stock clip in the middle. The viewer should feel one lesson. The whiteboard stays edge to edge, with no blank grey strip and no letterbox. Same line weight, same hand, same empty margin around the marks. If a beat looks like a different film, redraw it on this board before you continue. A sudden photo of the real rail is a different video interrupting. The doodle of the rail is the fix.",
      },
      {
        h: "Narrate the picture, do not read a memo",
        p: "The voice says what the drawing cannot: Pick one bag. Put the ticket where they can see it. If the voice repeats a paragraph from the website, cut the paragraph. Short lines match short drawings. The words on screen and the voice match. Captions, if you burn them in for TikTok or Shorts, use the same lines and sit in the upper-middle. Reject a narration that names three services. The ticket is the lesson. The caption can carry the shop name.",
      },
    ],
    example:
      "A dry cleaner, whiteboard doodle, 26 seconds. From 0 to 3 seconds the title is One ticket, spoken over a single ticket. Then six plain bags with no labels. Then one ticket on one bag, one arrow. Then the bag on a rail and the line Put the ticket where they can see it. Same board, no photo, no grey strip. You reject the reel if a legend appears, if the voice reads a care policy, or if the middle cuts to the real shop floor. Before motion, look at the four stills on a phone: the ticket must stay readable in the upper-middle, and the six bags must not return after the single ticket has won.",
    bridge:
      "Scro's cartoon doodle plans those beats and shows stills first. The first three seconds are the hook title One ticket, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, one idea, and you approve the stills before motion. Export 9:16.",
    checks: ["One idea only.", "The board does not change style.", "The voice is shorter than a paragraph."],
  },
  {
    id: 43,
    slug: "turn-a-script-into-a-cartoon-reel",
    title: "Turn a Script into a Cartoon Reel",
    excerpt:
      "Turn a script into a cartoon reel by cutting it into picture beats. A paragraph that has no picture does not belong in the reel.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Cartoon"],
    scene: "A short script page with sketches in the margin, original doodles, no readable writing",
    cta: "Break the script into beats",
    answer:
      "Turn a script into a cartoon reel by walking the lines and asking what the viewer sees. A line with no picture is narration you should cut or attach to the previous picture. Cartoon reels fail when they illustrate adjectives. They work when they illustrate objects and actions. First, highlight nouns you can draw. Second, give each remaining line one drawing. Third, read the voice against the sketches and approve the stills before motion. A script of a page becomes about 22 seconds, not a page read aloud.",
    points: [
      {
        h: "Highlight nouns you can draw",
        p: "A phone, a tiny mark, a bold title, a door. If the sentence is only quality and trust, you do not have a cartoon yet. Rewrite until an object appears. People leave when the first frame is a logo becomes a phone with a tiny mark, then the same phone with a title. The first three seconds are that second picture's promise, spoken as Cut the logo, over the phone. They do not say engagement. One idea. Reject any line you cannot point at. Those lines stay in the post.",
      },
      {
        h: "One line, one drawing",
        p: "Stacking three lines on one drawing makes the voice late or the picture crowded. Split the lines or delete two. At most one arrow, from the tiny mark to the title that replaces it. No blank grey strip crossing the logo out. The tiny mark leaves, and the title is drawn in its place. Each pair is a few seconds. If you have six drawable lines, you have two reels. Keep the phone, the mark, and the title. That is the cartoon. The rest of the script waits.",
      },
      {
        h: "Read it against the sketches",
        p: "If the voice finishes and the drawing still has unused parts, the drawing is too busy. If the drawing finishes first, the line is too long. Read Cut the logo while you look at the phone. Then read the next line while the title appears. They should end together. Do this before motion. Reject a sketch that still contains a word you deleted from the script, or a voice line that mentions a second problem the drawing never shows. About 22 seconds when the pairs match.",
      },
    ],
    example:
      "A print shop's script said people leave when the first frame is a logo, and then used the word engagement. The reel is a doodle, 22 seconds. From 0 to 3 seconds the title is Cut the logo, spoken, phone in frame. From 3 to 12 seconds the phone shows a tiny mark where a logo was. From 12 to 22 seconds the same phone shows a bold title, one arrow, and the line Write the title first. Engagement never appears. You reject the storyboard if a line has no object, or if one drawing is carrying three sentences.",
    bridge:
      "Scro takes those cut-down lines as a doodle, one idea. The first three seconds are the hook title Cut the logo, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, and you approve the still for each line before motion. Export 9:16.",
    checks: ["Every line has an object.", "No drawing carries three lines.", "You deleted the adjectives you could not draw."],
  },
  {
    id: 44,
    slug: "same-cartoon-character-in-every-clip",
    title: "Same Cartoon Character in Every Clip",
    excerpt:
      "Use the same cartoon character in every clip by locking one design before the second beat. A new face each cut is a new show.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Cartoon"],
    scene: "One simple original doodle person repeated in three poses on a whiteboard, consistent, no text",
    cta: "Lock the character",
    answer:
      "To keep the same cartoon character in every clip, design them once and reuse that still as the reference. Hair, apron, and the shape of the head are the identity. A series that regenerates a friendly person each time is a crowd, and the lesson becomes harder to follow. First, draw the shopkeeper and approve that still. Second, ask every later beat for that person doing a new action. Third, line the stills up and reject any frame you would describe as someone else. Original character only. Not a film figure, not a celebrity.",
    points: [
      {
        h: "Reference before variety",
        p: "Draw the hero first: apron, short hair, one plain face you invented. Every later beat asks for that person holding a new object, not for a new person in a similar style. The first three seconds of each reel show this same shopkeeper and that reel's hook title, such as Cost the flour first, in the spoken language. They do not introduce a fresh face per episode. If you skip the reference, the second clip will drift. Lock the still before you write the variety. One wooden board, if you are in paper-cutout, stays with them.",
      },
      {
        h: "Change the action, not the design",
        p: "Pointing, holding flour, standing by a clock, lifting a tray. Those are actions. A new hairstyle in beat three is a design change. Do not sneak it in. Clothes can stay the apron. You are not running an outfit reel. At most one arrow per clip, in the hand or toward the object, never a new arrow style that covers the face. No blank grey strip as a background change. The board stays. Reject a beat where the apron colour, the hair length, or the head shape moved.",
      },
      {
        h: "Check the row",
        p: "Line the stills up. If you would describe them as people, redo the odd one. If you would describe them as the shopkeeper, in three moments, you are done. Do this muted, before motion. A practical series is three reels of about 20 seconds, and the character check is the same on all three. Reject a frame that became more detailed, more realistic, or closer to a known character. The simple cut-out is the identity. Motion will not pull a drifted face back.",
      },
    ],
    example:
      "A bakery's original paper-cutout shopkeeper, apron, short hair, on one wooden board. Reel one, 20 seconds, opens with that face and Cost the flour first, flour in the hand. Reel two, same face, a clock, title Then the hour. Reel three, same face, a tray. Only the object changes. You reject reel two if the hair grew, the apron gained a logo, or the head shape narrowed. The row should read as one shopkeeper having one week, not a crowd of cousins.",
    bridge:
      "Scro keeps this paper-cutout character on one wooden board when you approve each still against the first frame. The first three seconds are that reel's hook title, in the spoken language, unless on-screen text is off. At most one arrow, no blank grey strip. Reject a beat that redraws the face before you generate motion. Export 9:16.",
    checks: ["A reference still exists.", "Later beats cite that person.", "The row reads as one character."],
  },
  {
    id: 45,
    slug: "paper-cutout-explainer-video",
    title: "Paper-Cutout Explainer Video",
    excerpt:
      "A paper-cutout explainer sticks cut-out pieces on one board. Keep the same board in every clip so it feels like one film.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Explainer"],
    scene: "Paper cutout shapes with white edges arranged on a dark wooden craft board, original, no text",
    cta: "Make a paper-cutout reel",
    answer:
      "A paper-cutout explainer teaches with cut-out people and objects on a single wooden craft board. The edges look snipped. The board stays put. It is a different choice from a whiteboard doodle. Do not mix the two in one reel. First, lock the board. Second, plan one action per beat. Third, keep colour on the hero piece only, approve the stills, and then move. The pieces move. The table does not. A clear lesson fits in about 26 seconds.",
    points: [
      {
        h: "One board",
        p: "Every clip shares the same dark wooden board, same grain, edge to edge. A jump to a kitchen, a white void, or a doodle background breaks the toy-theatre feeling. The first three seconds already show that board, with the hook title on a cut-out card, such as One dish, in the spoken language, upper-middle. They do not open on a photograph of the real door. If the wood changes between beats, stop and remake the later still against the first. No blank grey strip, and no second surface pretending to be a table.",
      },
      {
        h: "One action per beat",
        p: "Add a piece, flip a piece, or point. A beat that adds three objects and a caption is a pile. The phone cannot sort a pile. Beat two can bring in six tiny dish cards. Beat three removes them and leaves one large card. That is two actions, so it is two beats. At most one arrow, on the large card. About six seconds each. Reject a beat where cards, a door, and a shopkeeper all arrive together. Sequence is the lesson. A pile is a poster.",
      },
      {
        h: "Colour on the hero only",
        p: "Keep the subject in colour and the surrounding pieces quieter, so the eye knows what the sentence is about. The one dish card is in colour. The spare cards stay kraft or black and white. The shopkeeper, if you use one, stays the same cut-out. Do not invent a logo on the card. The shop name goes in the caption. Reject a frame where every piece is equally bright, or where a new character replaced the shopkeeper. White scissor edges stay on every piece so they still read as paper.",
      },
    ],
    example:
      "A cafe, paper-cutout, 26 seconds, one dark wooden board. From 0 to 3 seconds a title card says One dish and the voice says it. Then six tiny dish cards land, quiet colours. Then one large card remains, in colour, one arrow. Then that card is pasted on a door piece, same shopkeeper at the side, same grain. You reject the reel if the board changes, if a beat dumps every piece at once, or if a doodle frame interrupts the paper. The caption carries the shop name.",
    bridge:
      "Scro's paper-cutout explainer locks that one wooden board and shows you stills before motion. The first three seconds are the hook title One dish, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, colour on the hero piece. Approve the stills, then export 9:16.",
    checks: ["The board matches in every clip.", "Each beat adds one move.", "You did not switch to whiteboard mid-reel."],
  },
  {
    id: 46,
    slug: "explain-one-idea-in-four-cartoon-beats",
    title: "One Idea in Four Cartoon Beats",
    excerpt:
      "Explain one idea in four cartoon beats: title, problem, fix, ask. If you need a fifth, you have a second idea.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Cartoon"],
    scene: "Four doodle panels telling a simple problem and fix, original, no letters",
    cta: "Draw the four beats",
    answer:
      "Explain one idea in four cartoon beats so the reel has a shape people can finish. Beat one names the problem or the rule. Beat two shows the pain. Beat three shows the fix as a picture. Beat four says what to do, with one verb. A fifth beat is either a new idea or a repeat. Cut it. First, rewrite the idea until beat three is drawable. Second, check that beat one does not already show the fix. Third, approve four stills and cut about 24 seconds. If you need a fifth, you have a second idea.",
    points: [
      {
        h: "Beat three must be a picture",
        p: "The fix has to be drawable. Be consistent is not a picture. The spare key cut from the lock, lying next to the lock, is a picture. Rewrite the idea until that frame exists before you draw the others. For a key-cutting counter, beat three is the lock on the bench and one key that fits. If you cannot sketch it, the idea is still a slogan. One idea. At most one arrow, from the bad key to the lock. No blank grey strip crossing out the photo-cut key. Remove that key from the board.",
      },
      {
        h: "Do not solve it in beat one",
        p: "If the title already shows the fitted key, beats two and three have no job. Title the problem. The first three seconds show a key that will not turn and say The spare never fits, in the spoken language, upper-middle. They do not show the happy ending. The pain beat is a key cut from a photo of a key. Then the fix. People stay because the first frame withheld the result. Reject an opening that is the finished lock. You would be starting at beat three and calling it a hook.",
      },
      {
        h: "The ask is one verb",
        p: "Bring the lock. One verb. Bring the lock and book a slot and tell a friend splits the ending into a menu. The last beat holds the lock in a hand and says that one line. About six seconds per beat, 24 seconds altogether. The caption repeats Bring the lock and can add the shop name. Reject a fifth panel about how keys are made, or a last beat with two instructions. The shape is the lesson. A menu is a different format.",
      },
    ],
    example:
      "A key-cutting counter, doodle, 24 seconds. Beat 1, including the first three seconds: The spare never fits, a key that will not turn. Beat 2: a key cut from a photo. Beat 3: the lock on the bench and one key that fits, one arrow. Beat 4: Bring the lock. No fifth panel, no second verb. Same board. You reject the reel if beat one already shows the fitted key, if beat three is only the words be precise, or if the ending adds a second instruction.",
    bridge:
      "Scro maps those four beats onto a doodle storyboard. The first three seconds are the hook title The spare never fits, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, one idea. Approve each still, including the title, before motion. Export 9:16.",
    checks: ["Beat three is drawable.", "The title does not spoil the fix.", "The last beat has one verb."],
  },
  {
    id: 47,
    slug: "animated-explainer-without-a-camera",
    title: "Animated Explainer Without a Camera",
    excerpt:
      "An animated explainer without a camera still needs a script, four pictures, and a voice. The camera was never the hard part.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Explainer"],
    scene: "A desk with sketches and a microphone, no camera, soft daylight, no text",
    cta: "Start from the script",
    answer:
      "You can make an animated explainer without a camera by writing the beats, approving drawn stills, and recording the voice. Nothing has to be filmed. Something still has to be decided: the one idea, the pictures, and the line. First, write four beats as objects. Second, pick doodle or paper-cutout and stay there. Third, record one clean line per beat and approve the stills on a phone before motion. Skipping those steps and asking for an explainer about the shop produces a montage. A useful file is about 30 seconds.",
    points: [
      {
        h: "The mic is the camera",
        p: "Record the voice cleanly, one line per beat, in a quiet corner of the shop. A noisy room hurts a cartoon as much as it hurts a person on camera, because the captions and the tone come from that take. The first three seconds are the hook title, spoken with no breath in front: The invoice is late. Start on those words. Trim the silence at the head. If the same file will go to TikTok or Shorts, burn the captions in, upper-middle, matching the voice. Reject a take with a saw or a door chime under the line.",
      },
      {
        h: "Pick one drawing style",
        p: "Whiteboard doodle or paper-cutout on one wooden board, then stay. A mix looks like a folder of clips. The style is how someone recognises the next reel. For a frame shop, a doodle of an invoice, a calendar, and a stamp is enough. One idea. At most one arrow, on the date. No blank grey strip. Do not cut to a photo of the real invoice in the middle. The drawing is the film. Reject a storyboard that changes surface halfway through.",
      },
      {
        h: "Review stills on a phone",
        p: "A drawing that looks clever on a laptop can be mud at arm's length. Approve it at phone size, muted, before you animate. You should read The invoice is late and see the date without pinching to zoom. Four stills, about 30 seconds once the voice is on them. The brand-story paragraph stays in the blog post. Reject a still you cannot understand on the phone, or a fifth drawing about the shop's history. The camera was never the hard part. The four pictures are.",
      },
    ],
    example:
      "A frame shop, no camera, doodle, 30 seconds. From 0 to 3 seconds the title is The invoice is late, spoken cleanly, invoice drawing in frame. Then a calendar with one date, one arrow. Then a stamp. Then the line Send it Friday. Captions burned in, upper-middle, same words. The history of the shop stayed in the post. You reject the file if a photo interrupts, if the voice has shop noise under it, or if the stills only make sense on a large screen.",
    bridge:
      "Scro is this path: a doodle storyboard, still approval, your voice, captions, 9:16. You do not set up a shot. The first three seconds are the hook title in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, one idea, and you approve the frames on a phone before motion.",
    checks: ["The voice is one clean take per line.", "One drawing style.", "You approved the stills on a phone."],
  },
  {
    id: 48,
    slug: "voiceover-on-a-cartoon-reel",
    title: "Voiceover on a Cartoon Reel",
    excerpt:
      "A voiceover on a cartoon reel should say what the drawing does not. Record short lines, one per beat, and caption them.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Cartoon"],
    scene: "A microphone next to simple paper cutouts on a wooden board, no text",
    cta: "Record the lines per beat",
    answer:
      "Put a voiceover on a cartoon reel so the drawing and the voice split the work. The drawing shows the object. The voice says the reason or the instruction. If both say every sentence, the reel feels slow. If only the voice has the instruction, mute viewers miss it, so mirror that line in a short caption. First, write one breath per beat. Second, leave the on-screen title unspoken. Third, record a clean take and approve the stills before you lock the voice to them. About 22 seconds is enough for three spoken lines and one silent title.",
    points: [
      {
        h: "One breath per beat",
        p: "Write lines you can say in one breath. A beat that needs two sentences needs two drawings, or a shorter line. Six tags and they guess is one breath. A history of the menu is not. Time each line. If you gasp, cut words before you record the keeper. The pictures change with the breath: crowded cards, then one card. One idea. Reject a beat where the voice is still going and the drawing has already finished, or the reverse. They should land together.",
      },
      {
        h: "Do not narrate the title twice",
        p: "If the title is already on screen, start speaking at the problem. The first three seconds show One dish and say nothing, or the title is the only sound and you do not say it again when the picture starts. Reading the title aloud and then showing it wastes the opening. Pick one. For this reel, the title is visible and unspoken, and the voice enters on beat two. Upper-middle, so the silent title still reads. Reject a cut that speaks the title and then displays it as a second event.",
      },
      {
        h: "Your voice is allowed to be yours",
        p: "A clean phone recording in the shop's back room is enough. You do not need an announcer. Record two takes and keep the one that starts on the first word of beat two, with no hello. Captions match the spoken lines only, not a paraphrase, and sit in the upper-middle. Burn them in if the file also goes to TikTok or Shorts. Reject a take with the espresso machine under it, or a caption that adds a claim you did not say. The account should sound like the same person next week.",
      },
    ],
    example:
      "A cafe, paper-cutout on one wooden board, 22 seconds. From 0 to 3 seconds the card says One dish and nobody speaks. From 3 to 12 seconds six dish cards are up and the voice says Six cards and they guess. From 12 to 22 seconds one card remains and the voice says Leave one. Captions match those two lines only. The shop name is in the caption, not in a third sentence. You reject the reel if the title is spoken and then shown again, if a line needs two breaths, or if the caption adds a special the voice never mentioned.",
    bridge:
      "Scro uses the take you record on this paper-cutout, then captions it. Approve the stills first so the voice is not stuck to the wrong card. The first three seconds are the hook title One dish, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, one idea. Export 9:16.",
    checks: ["Each line fits one beat.", "You are not reading the title aloud.", "Captions match the voice."],
  },
  {
    id: 49,
    slug: "faceless-cartoon-tutorial-reel",
    title: "Faceless Cartoon Tutorial Reel",
    excerpt:
      "A faceless cartoon tutorial keeps you off camera and teaches one process. Four beats, one character, captions on.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Cartoon"],
    scene: "A doodle character teaching a simple step on a whiteboard, no real person, no text",
    cta: "Teach it without a camera",
    answer:
      "A faceless cartoon tutorial teaches a process without anyone's face. You are not in it. A drawn character is optional. The promise is the same as a filmed tutorial: a person can copy the step after one watch, with the sound off. First, number the steps in pictures. Second, skip a mascot if the subject is a diagram. Third, end on the finished step and approve the stills before motion. About 24 seconds, four beats. A pretty sequence that hides the order is a brand film.",
    points: [
      {
        h: "Steps, not vibes",
        p: "Number them in the pictures if the order matters. Step one, step two, written as words on the diagram, not as a mood. The first three seconds show the hook title Crop, don't pad, in the spoken language, upper-middle, and the voice says it. They do not show a logo. One idea: the frame shape. A tutorial names the first action. Reject an opening that is only colour and music. Someone should be able to say the order with the sound off: wide with bars, then the crop, then a full vertical frame.",
      },
      {
        h: "The character is optional",
        p: "A character helps if the same hands would have been in the filmed version. If the subject is a diagram of a frame, skip the mascot. Do not add a person to fill space, and do not add a film character because the frame feels empty. The wide frame, the crop marks, and the full 9:16 are the cast. At most one arrow, on the crop. No blank grey strip left in as if it were a style. The bars are the mistake, shown once, then removed. Reject a mascot that becomes the subject.",
      },
      {
        h: "End on the finished step",
        p: "The last frame is the result of the process, held: a vertical frame filled edge to edge. An end card with your logo is not the result. Hold it for the last few seconds of a 24-second reel so someone can compare it with the barred frame they just saw. The caption repeats Crop, don't pad. Burn that line in if the file will also go to TikTok or Shorts, upper-middle. Reject an ending that fades to a shop sign before the full frame has held.",
      },
    ],
    example:
      "A frame shop, doodle, no face, 24 seconds. From 0 to 3 seconds the title is Crop, don't pad, spoken. Then a wide frame with bars, labelled as the mistake. Then the crop, one arrow, bars going away. Then the filled vertical frame, held, no logo card. The caption repeats the title. You reject the reel if a character crowds the diagram, if the order is unclear muted, or if the last frame is a sign instead of the full frame. Someone should be able to copy the crop after one watch.",
    bridge:
      "Scro's doodle path is this reel: no camera, stills first, your voice, captions, 9:16. The first three seconds are the hook title Crop, don't pad, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, one idea. Approve the crop diagram before it moves.",
    checks: ["The order is visible muted.", "You are not on camera.", "The last frame is the result."],
  },
  {
    id: 50,
    slug: "30-second-explainer-for-one-feature",
    title: "30-Second Explainer for One Feature",
    excerpt:
      "A 30-second explainer covers one feature. Name the pain, show the feature once, and leave the rest of the product for later.",
    locale: "en",
    landingPath: "/explainer",
    tags: ["Instagram Reels", "Explainer"],
    scene: "A single product feature shown as a simple doodle sequence, one object only, no text",
    cta: "Explain one feature",
    answer:
      "A 30-second explainer for one feature resists the tour. Viewers can remember one thing: the pain, the feature that answers it, and how to try it. A second feature is a second reel. Thirty seconds is four beats, not a product page. First, name the feature in the title the way you would name it at the counter. Second, show one before and one after. Third, put the audience in the caption, not in an extra beat. If the title is a category, you do not have the reel yet.",
    points: [
      {
        h: "Name the feature in the title",
        p: "Trim the breath is a feature. Our editor is a category. The title should be something you would recognise on a support note. The first three seconds show a long pause as a gap on a simple waveform, and they say Trim the breath, in the spoken language, upper-middle. They do not say the product name. One idea. If you cannot name the feature without a sentence of context, the context is the post and the feature name is still the title. Reject an opening that lists a menu of tools.",
      },
      {
        h: "Show it once, clearly",
        p: "One before, one after. A tour of menus spends the thirty seconds on navigation. The feature is the change on screen: the gap is there, then the first word sits at frame one. At most one arrow, on the gap, then the arrow is gone in the after. No blank grey strip standing in for the silence. The doodle stays on one board. About seven seconds for the before, seven for the after, inside the 30. Reject a middle that opens a second panel about captions or music. Those are other features.",
      },
      {
        h: "Say who it is for in the caption",
        p: "The reel stays short. The caption can say it is for people posting reels, so you do not spend a beat on audience. Sentence one repeats Trim the breath. Sentence two names who it helps. The ask, Export again, is the last on-screen line and the last spoken line. Do not add a price or a tour. Burn the title in if this file also goes to TikTok or Shorts, and keep it in the upper-middle. Reject a caption that introduces a second feature the pictures never showed.",
      },
    ],
    example:
      "A frame shop explaining one edit, doodle, 30 seconds. From 0 to 3 seconds, held a little longer as the before: Trim the breath, a visible gap before the first word. Then the after: the first word at frame one, gap gone, one arrow only on the before. Then Export again, and stop. No caption style, no music control, no second button. The caption says it is for people posting reels. You reject the file if a second feature appears, if the title says editor, or if the before and after are not both on screen.",
    bridge:
      "Scro storyboards that single feature as a doodle and will not invent a second one if your beats do not include it. The first three seconds are the hook title Trim the breath, in the spoken language, unless you turn on-screen text off. At most one arrow, no blank grey strip, one idea. Approve the before and after stills, then export 9:16.",
    checks: ["The title names the feature.", "A second feature is absent.", "Before and after are both visible."],
  },
];
