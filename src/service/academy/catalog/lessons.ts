export type AcademyLessonImage = {
  alt: string;
  prompt: string;
};

export type AcademyLessonDraft = {
  slug: string;
  title: string;
  excerpt: string;
  module: string;
  sortOrder: number;
  markdown: string;
  images: [AcademyLessonImage, AcademyLessonImage];
  videoPrompt: string;
};

const START = "Start here";
const REEL = "A reel people finish";
const FORMAT = "Pick one format and repeat it";
const FACE = "A face strangers recognize";
const REVENUE = "Turn views into revenue";
const SHIP = "Ship every week in Scro";
const NUMBERS = "Read the numbers and repeat what works";

function lesson(input: {
  slug: string;
  title: string;
  excerpt: string;
  module: string;
  sortOrder: number;
  idea: string;
  steps: string[];
  practice: string;
  images: [AcademyLessonImage, AcademyLessonImage];
  videoPrompt: string;
}): AcademyLessonDraft {
  const steps = input.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const markdown = [
    `# ${input.title}`,
    "",
    input.excerpt,
    "",
    "{{image1}}",
    "",
    "## The idea",
    "",
    input.idea.trim(),
    "",
    "## Do this",
    "",
    steps,
    "",
    "{{image2}}",
    "",
    "## Watch the idea",
    "",
    "{{video}}",
    "",
    "## Practice in Scro",
    "",
    input.practice.trim(),
    "",
  ].join("\n");
  return { ...input, markdown };
}

// English syllabus for Scro Academy. Media placeholders are filled after generation.
export const ACADEMY_LESSONS: AcademyLessonDraft[] = [
  lesson({
    slug: "how-scro-academy-works",
    sortOrder: 1,
    module: START,
    title: "How Scro Academy works",
    excerpt: "Register once. Every lesson is free. Each lesson ends as one reel you can publish.",
    idea: `Scro Academy is a shooting course, not a theory library. A lesson gives you one decision, shows it in a diagram, then asks you to make that decision inside Scro the same day.

The catalog is public so you can see the path. The lesson body, diagrams, and clips open after you create a free Scro account. You do not buy the course separately. Registration is the unlock.

Work in order the first time. Later, jump back to the format that matches what you sell.`,
    steps: [
      "Skim the contents and pick the module that matches this week: a reel formula, a format, a face, or a number.",
      "Read one lesson. Do not binge. One lesson is one published reel.",
      "Open Scro and do the practice at the bottom before you start the next lesson.",
    ],
    practice: "Create your Scro account if you do not have one, then open the next lesson and write the one thing this account will sell.",
    images: [
      {
        alt: "Three steps: register, study one lesson, publish one reel",
        prompt:
          "Three large cards in a row. The labels under them are exactly REGISTER, then ONE LESSON, then ONE REEL. A lime arrow connects the cards left to right. The only caption under the row is FREE AFTER SIGN UP.",
      },
      {
        alt: "Course path from public catalog to unlocked lesson",
        prompt:
          "Two columns and no other words. Left column title is CATALOG, with five plain black bars and no letters inside the bars. Right column title is LESSON. Inside it, a play icon labeled WATCH and a button labeled PRACTICE. A key icon sits between the columns.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Register once, then turn each lesson into one reel." Motion: the REGISTER card turns lime, then ONE LESSON and ONE REEL light up in order.',
  }),
  lesson({
    slug: "what-your-account-sells",
    sortOrder: 2,
    module: START,
    title: "Decide what the account sells",
    excerpt: "Pick one offer before you pick a hook. A reel cannot grow a business that has not chosen what it sells.",
    idea: `Follower growth and revenue come from the same choice: one account, one offer. If the viewer cannot name what you sell after one reel, the next eleven reels will not fix it.

Choose a product, a service, or your expertise. Not all three. A product account shows the object. A service account shows the result the buyer wants. An expertise account shows a useful opinion people return for.

Scro can lock a face, a wardrobe, and a voice. It cannot choose your offer. Write the offer in one sentence before you open a director.`,
    steps: [
      "Write the buyer in five words. Example: shop owners who hate filming.",
      "Write the offer in one sentence. Example: a weekly product reel without a camera crew.",
      "Delete every other topic from this month's plan. Those ideas wait until this offer has a format.",
    ],
    practice: "Put that one-sentence offer in the video brief the next time you start a project. If you cannot say it out loud in one breath, it is still two offers.",
    images: [
      {
        alt: "Choose one of product, service, or expertise",
        prompt:
          "Three doors labeled PRODUCT, SERVICE, EXPERTISE. Only the middle door SERVICE is open and filled with lime. The other two doors are closed and gray. Caption: PICK ONE.",
      },
      {
        alt: "One sentence offer on a card",
        prompt:
          "A single index card centered on the page. The card text reads exactly: I HELP SHOP OWNERS POST A REEL EVERY WEEK. A crossed-out second card sits faded behind it.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Pick one offer before you write the hook." Motion: two doors fade out and the open SERVICE door stays lime.',
  }),
  lesson({
    slug: "create-reels-that-grow-your-business",
    sortOrder: 3,
    module: REEL,
    title: "Create reels that grow your business",
    excerpt: "The four-beat reel: hook, proof, payoff, ask. Use it every time you need a stranger to watch and then act.",
    idea: `A business reel is not a tour of your brand. It is four beats in about thirty seconds.

Hook, from zero to three seconds: name the pain or the result. No hello. No logo card.
Proof: show the thing. One scene, one fact.
Payoff: deliver the tip, the contrast, or the product moment.
Ask: follow, save, comment, or visit. One ask only.

Write the hook first. If the first line is weak, the rest of the video never plays. Scro can lock the host and approve the frames, but the four beats are still your job.`,
    steps: [
      "Write the ask before the middle. You cannot aim the proof if you do not know the action.",
      "Fill a four-row table: Hook, Proof, Payoff, Ask. One line each.",
      "Read only the hook out loud. If it could open any other brand's video, rewrite it.",
    ],
    practice: "Draft a 20 to 40 second script in Scro using only these four lines. Keep the published cut vertical, 9:16.",
    images: [
      {
        alt: "Four-beat timeline: hook, proof, payoff, ask",
        prompt:
          "A horizontal timeline of four equal cards labeled exactly HOOK, PROOF, PAYOFF, ASK. Under them the times read 0-3S, 3-15S, 15-30S, LAST 5S. The HOOK card has a lime underline.",
      },
      {
        alt: "Weak opener compared with a specific hook",
        prompt:
          "Two speech bubbles. The left bubble is gray and reads WELCOME BACK. The right bubble is lime and reads 3 SHOTS THAT SELL. A red x sits on the left bubble. A check sits on the right.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Hook, proof, payoff, then one ask." Motion: the four cards appear in order and the HOOK card pulses lime.',
  }),
  lesson({
    slug: "the-hook-in-the-first-second",
    sortOrder: 4,
    module: REEL,
    title: "The hook in the first second",
    excerpt: "Say the outcome the viewer already wants. A greeting spends the only second the feed gives you.",
    idea: `The feed decides in the first second, not after your intro. The hook is a promise the viewer can test by watching.

Use one of three shapes. A result: "Three shots that make people tap the shop." A mistake: "This is why your talking-head dies at second four." A contrast: "I replaced the weekly photoshoot with one locked character."

Do not start with the brand name, a logo, or "hi, welcome back." Those lines are about you. The hook is about the viewer's problem.

Put the same words on screen. Many people watch without sound. If the caption does not match the spoken hook, you have two openings and both are weaker.`,
    steps: [
      "Write ten hooks for the same offer. Force each one to start with a result, a mistake, or a contrast.",
      "Circle the line a stranger would understand with no context.",
      "Make that line the first subtitle and the first spoken sentence. Nothing comes before it.",
    ],
    practice: "Film or generate only the first three seconds. If you would scroll past it, the rest of the script does not matter yet.",
    images: [
      {
        alt: "Three hook shapes: result, mistake, contrast",
        prompt:
          "Three stacked bars labeled RESULT, MISTAKE, CONTRAST. Each bar has a short example in quotes: 3 SHOTS THAT SELL, YOUR HOOK IS LATE, SAME FACE EVERY WEEK. Lime dots mark the start of each bar.",
      },
      {
        alt: "First second on screen matches the spoken line",
        prompt:
          "A phone frame labeled 0-1S. Inside it, large text reads 3 SHOTS THAT SELL. A small speaker icon next to the phone is labeled SAME WORDS. No logo on the phone.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Say the result in the first second." Motion: a gray WELCOME label slides away and the lime line 3 SHOTS THAT SELL snaps into the phone frame.',
  }),
  lesson({
    slug: "one-idea-per-video",
    sortOrder: 5,
    module: REEL,
    title: "One idea per video",
    excerpt: "A reel that teaches five things teaches none of them. Cut the script until one idea remains.",
    idea: `Watch time dies when the video changes jobs. A feature list, a company history, and a discount code are three videos. Put them in one cut and the viewer leaves at the seam.

One idea means one sentence you could text to a friend. "The label must be readable in the first product shot." That is a video. "Our story, our range, and our sale" is a brochure.

Scro's storyboard works best when each clip is one beat of that single idea. If you need a new heading, you need a new reel.`,
    steps: [
      "Write the idea as one sentence with a subject and a verb.",
      "List every other point in the draft. Move each one to a later episode.",
      "Check the storyboard. If a clip does not serve that sentence, cut the clip.",
    ],
    practice: "Take a script you already like and delete half of it. Generate the shorter version. Compare which one you would finish on mute.",
    images: [
      {
        alt: "One idea kept, extra topics moved to later episodes",
        prompt:
          "A lime card labeled THIS REEL with the sentence SHOW THE LABEL. Three gray cards labeled NEXT, NEXT, NEXT sit to the right, titled STORY, RANGE, SALE.",
      },
      {
        alt: "Each clip serves the same sentence",
        prompt:
          "Four small frames in a row, each captioned SHOW THE LABEL. A fifth frame is crossed out and captioned NEW TOPIC.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "One reel teaches one sentence." Motion: extra cards slide off screen until only SHOW THE LABEL remains.',
  }),
  lesson({
    slug: "one-ask-in-the-last-three-seconds",
    sortOrder: 6,
    module: REEL,
    title: "One ask in the last 3 seconds",
    excerpt: "Follow, save, comment, or click. Pick one. A second ask cancels the first.",
    idea: `The last seconds are the only place a stranger can do something for you. If you ask them to follow, comment, and visit the shop, they do none of it.

Match the ask to the idea. A useful tip wants a save. A series wants a follow. A product wants a click or a comment keyword. A question wants a comment.

Say it once, in speech and on screen. Do not add a logo sting after the ask. The ask is the ending.

Inside Scro, the last clip should already show the ask. Do not hide it in a caption you add later and forget to say.`,
    steps: [
      "Choose the one action that helps the business this week.",
      "Write a seven-word line. Example: Follow for the next product shot.",
      "Put that line in the last clip only. Remove every earlier plea.",
    ],
    practice: "End today's reel on the ask and nothing after it. Watch the last three seconds with the sound off and confirm the words are readable.",
    images: [
      {
        alt: "Four possible asks, only one selected",
        prompt:
          "Four pills labeled FOLLOW, SAVE, COMMENT, CLICK. Only FOLLOW is filled lime. The others are outlines. Caption: ONE ASK.",
      },
      {
        alt: "The last three seconds hold a single line",
        prompt:
          "A timeline bar. The final segment is labeled LAST 3S and contains the text FOLLOW FOR PART 2. The earlier segment is labeled NO ASK YET.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "End with one ask, then stop." Motion: three pills fade, FOLLOW stays lime, and the line FOLLOW FOR PART 2 lands in the last segment.',
  }),
  lesson({
    slug: "hot-take-reels",
    sortOrder: 7,
    module: FORMAT,
    title: "Hot-take reels",
    excerpt: "One opinion, one example, one ask. Use this format when the thing you sell is your judgment.",
    idea: `A hot take is the fastest format for an expertise account. You are not reporting the news. You are taking a side a buyer can remember.

Structure it in three lines. The opinion in the hook. One concrete example as proof. The ask, usually a follow, because the next opinion is the product.

Stay on the offer you chose. A finance account that also reviews restaurants looks unfocused. A shop consultant who only argues about shop content looks like a person worth following.

Scro's talking-head director fits this format. Keep the same face and the same framing so the opinion feels like a series, not a one-off rant.`,
    steps: [
      "Write the opinion so someone could disagree with it. Bland lines do not earn a follow.",
      "Add one example from this week. A number, a screen, or a sentence you heard.",
      "Ask them to follow for the next take. Do not pitch the whole service in the same breath.",
    ],
    practice: "Generate a short talking-head reel with three clips: opinion, example, follow ask. Approve the keyframe before you spend credits on motion.",
    images: [
      {
        alt: "Hot take structure: opinion, example, follow",
        prompt:
          "Three stacked rows labeled OPINION, EXAMPLE, FOLLOW. OPINION is a lime speech bubble that reads POST LESS, PROVE MORE. EXAMPLE is a small chart. FOLLOW is a button.",
      },
      {
        alt: "Same face, same frame, new opinion",
        prompt:
          "Three identical portrait frames labeled MON, WED, FRI. Each frame has a different two-word caption: PRICING, HOOKS, OFFERS. The face area is a simple blank oval, not a real person.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "One opinion, one example, then ask for the follow." Motion: the three rows OPINION, EXAMPLE, FOLLOW light up from top to bottom.',
  }),
  lesson({
    slug: "product-ugc-reels",
    sortOrder: 8,
    module: FORMAT,
    title: "Product UGC reels",
    excerpt: "Real packaging, one pain, one demo. The product is the hero. The host only points at it.",
    idea: `User-generated style works because it looks like a person found something, not like a brand premiered something. The product photo has to stay true. If the label warps, trust dies.

Use four beats on the product. Hook with the buyer's pain. Show the real package. Use it once. Ask for the shop click or a comment keyword.

Do not rotate through five features. One use is enough. The next feature is the next reel, which is how a product account starts to look like a library instead of an ad.

In Scro, upload the real product photos and tell the brief that packaging, logo, and colors must match those photos.`,
    steps: [
      "Photograph or upload the real pack, front and back if the label matters.",
      "Write the pain in the customer's words, not the slogan on the box.",
      "Show one use. End on the click or the comment word.",
    ],
    practice: "Start a product reel with the uploaded pack as the reference. In the brief, ban any extra claims that are not on the label.",
    images: [
      {
        alt: "Product reel beats: pain, pack, use, click",
        prompt:
          "Four frames labeled PAIN, PACK, USE, CLICK. PAIN is a thought bubble reading HARD WATER. PACK is a plain bottle with a readable blank label. USE is a hand pouring. CLICK is a lime button labeled SHOP.",
      },
      {
        alt: "Real pack versus a warped pack",
        prompt:
          "Two bottles. The left bottle is labeled TRUE and has a straight label. The right bottle is labeled WARPED, with a melted label and a red x. Caption: MATCH THE PHOTO.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Show the real pack, then one use." Motion: the TRUE bottle stays still while the WARPED bottle fades away.',
  }),
  lesson({
    slug: "tutorial-series",
    sortOrder: 9,
    module: FORMAT,
    title: "Tutorial series",
    excerpt: "Day one, day two, day three. People follow when the next episode is obvious.",
    idea: `A single tutorial can be saved. A numbered series gets followed, because the viewer wants episode two. That is the format to use when you are teaching a method.

Number the episodes in the hook and on screen. "Day 1: write the hook." "Day 2: film the proof." Do not make the viewer guess the order.

Each episode still obeys one idea and one ask. The ask is almost always "follow for day two." On the last episode, change the ask to the business action: book, buy, or start the trial.

Keep the same host, the same room, and the same subtitle style. The number is the only thing that should change.`,
    steps: [
      "Outline three episodes before you shoot the first. If you cannot name day three, you do not have a series.",
      "Put the episode number in the first second, spoken and on screen.",
      "End days one and two with a follow. End day three with the offer.",
    ],
    practice: "Create three short scripts in one folder, titled Day 1, Day 2, and Day 3. Shoot Day 1 only after the other two titles exist.",
    images: [
      {
        alt: "Three numbered episodes in a row",
        prompt:
          "Three cards labeled DAY 1, DAY 2, DAY 3. Subtitles read WRITE THE HOOK, SHOW THE PROOF, ASK FOR THE CLICK. DAY 2 and DAY 3 are slightly faded, DAY 1 is lime.",
      },
      {
        alt: "Same frame, only the episode number changes",
        prompt:
          "Three matching phone frames. Each has the same layout and a big number: 1, 2, 3. Caption under them: SAME HOST, NEW NUMBER.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Number the episode so people wait for the next one." Motion: DAY 1 turns lime, then DAY 2 and DAY 3 slide in beside it.',
  }),
  lesson({
    slug: "talking-head-and-b-roll",
    sortOrder: 10,
    module: FORMAT,
    title: "Talking-head and B-roll",
    excerpt: "The face carries trust. The cutaway carries proof. Alternate them so the reel is not a lecture.",
    idea: `A face talking for thirty seconds feels like a meeting. A face, then proof, then the face again feels like a reel.

Use a simple rhythm. Two short on-camera lines, one cutaway, repeat. The cutaway is the thing you just named: the product, the screen, the place, the before-and-after. No speaker in the cutaway.

The on-camera shot stays locked. Same crop, same background, same light. If the face changes rooms every clip, it feels like a different video.

Scro can plan this as talking-head plus B-roll. Say in the brief which clips are the face and which clips are the proof. Do not leave that choice to the model.`,
    steps: [
      "Mark each script line as FACE or PROOF.",
      "Never schedule more than two face lines in a row.",
      "Make the proof clip show the noun you just said. If you say label, show the label.",
    ],
    practice: "Build a six-clip board: face, face, proof, face, face, proof. The last face clip is the ask.",
    images: [
      {
        alt: "Rhythm of face, face, proof",
        prompt:
          "Six tiles labeled FACE, FACE, PROOF, FACE, FACE, PROOF. FACE tiles are simple ovals on a plain background. PROOF tiles are a bottle and a screen. The pattern is obvious.",
      },
      {
        alt: "Locked close-up versus a changing set",
        prompt:
          "Left side labeled LOCKED: three identical close-up frames. Right side labeled DRIFT: three frames with different backgrounds and a red x. Caption: SAME CROP.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Two lines on camera, then show the proof." Motion: the tiles FACE, FACE, PROOF highlight in sequence.',
  }),
  lesson({
    slug: "three-posts-a-week",
    sortOrder: 11,
    module: FORMAT,
    title: "Three posts a week",
    excerpt: "Same face, same format, three different hooks. Familiarity is what turns a viewer into a follower.",
    idea: `Accounts grow by repetition, not by a new concept every day. Pick the format from this module and run it three times a week for a month before you invent another one.

Change the hook. Do not change the host, the crop, the offer, or the ask type. A viewer should recognize the account before they read the name.

Batch the work. Write three hooks on Monday. Approve three keyframe sets. Generate the motion only after the stills are right. That is how you publish on schedule without redoing the same mistake three times.

If a week is busy, post one. Skipping a format change is better than posting a random style.`,
    steps: [
      "Choose the weekday slots. Three is the plan. One is the minimum.",
      "Write three hooks from the same offer. They must not be the same sentence.",
      "Produce them as one batch so the face, wardrobe, and captions match.",
    ],
    practice: "Put three video drafts in one folder for this week. Give them different hooks and the same format name in the title.",
    images: [
      {
        alt: "A week with three matching posts",
        prompt:
          "A weekly row labeled MON, WED, FRI. Each day has a phone with the same layout and a different hook title: PAIN, MISTAKE, RESULT. Other weekdays are empty.",
      },
      {
        alt: "What stays fixed and what changes",
        prompt:
          "Two columns. Left column labeled FIXED lists FACE, FORMAT, OFFER, ASK. Right column labeled CHANGES lists only HOOK. FIXED items have lime locks.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Same format three times. Only the hook changes." Motion: MON, WED, and FRI phones appear with different titles but the same frame.',
  }),
  lesson({
    slug: "lock-the-face-inject-the-soul",
    sortOrder: 12,
    module: FACE,
    title: "Lock the face, then inject the soul",
    excerpt: "The look is the shell. The personality comes from your knowledge, stories, and point of view.",
    idea: `People follow a person, even when that person is a virtual host. The face has to stay still or the memory never forms. The soul is what the face says.

Build the shell first in Scro: one character, one face, a wardrobe you can reuse. Then write like yourself. Use your examples, your city, your opinions. A generic script on a consistent face is still generic.

Do not change the face because you are bored in week two. Boredom is yours. Recognition belongs to the viewer, and they have not had time to get bored.

If you record a voice, use that voice on the videos that should sound like you. A new voice is a new person.`,
    steps: [
      "Create one character and finish the blueprint before you generate reels.",
      "Write five facts only you would say about the offer. Put one fact in the next script.",
      "Refuse new faces until this one has at least twelve published reels.",
    ],
    practice: "Open the character studio and confirm you are about to reuse an existing character, not generate a second host.",
    images: [
      {
        alt: "Shell and soul of one character",
        prompt:
          "A simple figure split into two labels. The outline is labeled SHELL: FACE, WARDROBE, VOICE. The center is labeled SOUL: STORIES, OPINIONS, PROOF. Lime fills only the center.",
      },
      {
        alt: "One face across many posts, not many faces",
        prompt:
          "Left group labeled ONE FACE: six matching ovals. Right group labeled CROWD: six different ovals with a red x. Caption: MEMORY NEEDS A REPEAT.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Lock the face. Put your point of view in the script." Motion: the SHELL outline stays still while the SOUL center fills with lime.',
  }),
  lesson({
    slug: "wardrobe-and-life-posts",
    sortOrder: 13,
    module: FACE,
    title: "Wardrobe and Life posts",
    excerpt: "Same face, new outfit, real-looking days. A grid that only contains ads does not get followed.",
    idea: `Followers stay for a life, then buy from the reels. Life posts are the stills between the pitches: a café, a street, a desk, a trip. The face does not change when the clothes do.

Use the wardrobe on purpose. Repeat a few outfits until they feel like a uniform, then add one new look. A new outfit every post looks like a costume rack.

In Scro, Life photos place the same character into a place photo. If your source photo has a stranger's face, the result should keep the place and the pose, and use your character's face.

Do not hide the product forever. A healthy week is mostly life and proof, with the hard ask in the reels you already planned.`,
    steps: [
      "Pick three outfits that fit the offer. Save them as looks.",
      "Make two Life stills this week in places your buyer already recognizes.",
      "Caption the still in the character's voice, not as a billboard.",
    ],
    practice: "Generate one Life photo with an existing character and a place you choose. Check that the face matches the blueprint before you post it.",
    images: [
      {
        alt: "A grid of life stills around one face",
        prompt:
          "A 3 by 3 grid. The center tile is labeled FACE. The other tiles are labeled CAFE, STREET, DESK, TRIP, and so on, with simple place icons. Caption: SAME FACE, NEW DAY.",
      },
      {
        alt: "Three saved outfits, not a new costume every post",
        prompt:
          "Three clothing cards labeled LOOK A, LOOK B, LOOK C. A fourth card labeled RANDOM is gray with a red x. Caption: REPEAT A UNIFORM.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Change the outfit, not the face." Motion: the grid tiles appear around the center FACE tile.',
  }),
  lesson({
    slug: "one-voice",
    sortOrder: 14,
    module: FACE,
    title: "One voice",
    excerpt: "Record once, then let new videos speak in that voice. A new voice is a new person.",
    idea: `Recognition is not only visual. If every reel has a different narrator, the account sounds like a compilation channel.

Record a clean sample in Scro with the built-in mic, or upload a clip. Use a quiet room. Read lines you would actually say. The voice should match the persona: warm, direct, or quick.

Use that voice on the videos where someone speaks. Silent product shots can stay silent. Do not add a random stock voice "just for this one."

If you sell in Hong Kong Cantonese, record Cantonese. Do not record English and hope the accent carries the market. The lesson is the same in any language: one voice, on purpose.`,
    steps: [
      "Record 20 to 40 seconds of clean speech in the language you publish in.",
      "Listen back once. If you would not let this voice answer a customer, record again.",
      "Generate the next talking reel with that voice attached. Do not pick a default you have not heard.",
    ],
    practice: "Open the character, add or confirm the voice, and generate a single short line: the hook from lesson four.",
    images: [
      {
        alt: "One waveform used on every speaking reel",
        prompt:
          "A single waveform labeled YOUR VOICE, colored lime. Three phone frames below it each show a small matching waveform. Caption: ONE VOICE.",
      },
      {
        alt: "Clean recording versus a noisy one",
        prompt:
          "Two panels. Left labeled CLEAN: a smooth waveform and a check. Right labeled NOISY: a jagged waveform with a fan icon and a red x.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Use one voice so the account sounds like one person." Motion: one lime waveform copies itself onto three phones.',
  }),
  lesson({
    slug: "one-sentence-persona",
    sortOrder: 15,
    module: FACE,
    title: "One-sentence persona",
    excerpt: "City, tone, pace, and humor in a sentence a viewer could repeat. Personality is a decision, not a vibe.",
    idea: `A persona is how the character talks when the script is short. Without it, every reel drifts toward generic enthusiasm.

Write one sentence. Where they live. How warm or sharp they are. How fast they talk. Whether they tease. Example: "A Hong Kong shop owner, direct, quick, and a little teasing, who hates wasted filming days."

Use that sentence as a filter. If a line would not come out of that person, cut the line. Scro can store the persona on the character. Fill it in. Do not leave the soul fields empty and then wonder why the scripts sound like ads.

Random is allowed when you are stuck. It is not a strategy. Save the sentence you can defend.`,
    steps: [
      "Fill city, tone, pace, and humor. Then write the one-sentence version yourself.",
      "Read your last script in that voice. Mark every line that sounds like a brochure.",
      "Replace those lines with something this person would actually say.",
    ],
    practice: "Save the persona on the character, then regenerate one hook so it sounds like that sentence and not like a slogan.",
    images: [
      {
        alt: "Persona ingredients: city, tone, pace, humor",
        prompt:
          "Four chips labeled CITY, TONE, PACE, HUMOR. Under them one lime sentence bar reads DIRECT, QUICK, A LITTLE TEASING. Caption: ONE SENTENCE.",
      },
      {
        alt: "Brochure line versus persona line",
        prompt:
          "Two lines of dialogue. Gray line labeled AD reads UNLOCK YOUR POTENTIAL. Lime line labeled PERSONA reads STOP FILMING. POST THE PROOF. A check is on the lime line.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Write the personality in one sentence, then talk like that." Motion: the four chips collapse into the single lime sentence bar.',
  }),
  lesson({
    slug: "product-photos-stay-true",
    sortOrder: 16,
    module: REVENUE,
    title: "Product photos stay true",
    excerpt: "If the pack in the reel does not match the pack in the shop, the click is a complaint waiting to happen.",
    idea: `Revenue reels have a harder rule than entertainment reels. The thing you sell must be the thing on screen. Color, shape, logo, and label copy come from the photos you upload. The scene can be interesting. The object cannot be invented.

Say this in the brief every time. Models like to "improve" a label. Improvement is a different product.

Check the keyframe before motion. A wrong label in a still is cheap to reject. A wrong label in a finished video is a reel you cannot post.

If you do not have a clear photo, do not generate the product yet. Shoot the photo. The reel can wait a day. A fake pack cannot be explained later.`,
    steps: [
      "Upload the real product photos before you write the scene.",
      "In the brief, name what must not change: logo, label words, cap color, bottle shape.",
      "Reject any keyframe where you would not ship that object to a customer.",
    ],
    practice: "Compare the approved still to the source photo, side by side, before you generate the clip.",
    images: [
      {
        alt: "Source photo locks the product in the scene",
        prompt:
          "Left card labeled SOURCE PHOTO shows a plain jar. An arrow points to a right card labeled SCENE where the same jar sits on a table. Caption: SCENE CAN CHANGE. JAR CANNOT.",
      },
      {
        alt: "Keyframe check before motion",
        prompt:
          "A checklist with three rows: LOGO, LABEL, COLOR. Each row has a lime check. A button below reads APPROVE STILL. A faded button labeled GENERATE VIDEO sits behind it.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Change the scene, not the product." Motion: the background behind the jar shifts while the jar stays identical.',
  }),
  lesson({
    slug: "from-pain-to-purchase",
    sortOrder: 17,
    module: REVENUE,
    title: "From pain to purchase",
    excerpt: "Pain, show the product, use it once, then one buying ask. That is the sales reel.",
    idea: `A sales reel is the four-beat formula aimed at a purchase. The hook is the pain in the buyer's language. The proof is the real product. The payoff is one use, not the whole catalog. The ask is the shop, the comment keyword, or the booking link.

Do not open with the discount. A discount before the pain attracts bargain hunters and teaches everyone else to wait. If you have an offer, put it in the ask, after the use.

One reel, one product. A carousel of six products is a website. The viewer cannot buy six things from a thirty-second film.

Speak the ask clearly. "Comment PACK and I will send the link" is an ask. "Link in bio" with no reason is not.`,
    steps: [
      "Write the pain as a complaint you have actually heard.",
      "Show the product solving that complaint once.",
      "End with one buying action and the exact word or button you want.",
    ],
    practice: "Script a sales reel with the words PAIN, SHOW, USE, BUY as the four clip titles. Generate stills only for SHOW and USE until the product looks true.",
    images: [
      {
        alt: "Sales path: pain, show, use, buy",
        prompt:
          "A vertical path of four nodes labeled PAIN, SHOW, USE, BUY. PAIN is a quote bubble reading THIS STAINS. BUY is a lime button labeled COMMENT PACK. Arrows connect the nodes downward.",
      },
      {
        alt: "Discount belongs at the end, not the hook",
        prompt:
          "A timeline. The start is labeled HOOK = PAIN with a check. A red x marks a fake start labeled 50 PERCENT OFF. The end of the timeline is labeled ASK = OFFER.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Start with the pain. Ask for the buy at the end." Motion: the path PAIN, SHOW, USE, BUY lights downward, and the BUY button turns lime last.',
  }),
  lesson({
    slug: "service-and-saas-spokesperson",
    sortOrder: 18,
    module: REVENUE,
    title: "Service and SaaS spokesperson",
    excerpt: "Show one feature, one result, and a single next step: book, start, or sign up.",
    idea: `Services and software are invisible until you show the result. The host's job is to point at one screen or one outcome, not to recite the feature list.

Hook with the painful workflow. "You are still rewriting the same caption." Show one screen or one before-and-after. Pay off with the result in a sentence. Ask them to start the trial, book the call, or follow for the next feature.

Keep your real logo and UI honest. Do not invent dashboard numbers you do not have. A fake chart is the software version of a warped label.

If you have no product UI yet, sell the service result: the time saved, the reel posted, the customer reply. Do not pretend a screen exists.`,
    steps: [
      "Pick one feature or one result. Write the painful workflow it replaces.",
      "Show that one thing. Crop the screen so the relevant control is readable.",
      "Ask for one next step a cold viewer can do in a minute.",
    ],
    practice: "Make a three-clip service reel: the painful line, the proof, the signup or booking ask. Leave the rest of the product for later episodes.",
    images: [
      {
        alt: "One feature replaces one painful workflow",
        prompt:
          "Left panel labeled BEFORE shows a messy stack of papers labeled REWRITE. Right panel labeled AFTER shows one clean screen labeled POSTED. A lime arrow points from left to right.",
      },
      {
        alt: "One next step button",
        prompt:
          "Three buttons. Only the middle button is lime and reads BOOK A CALL. The other buttons, FOLLOW and SEE PRICING, are gray. Caption: ONE NEXT STEP.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Show one result, then ask for one next step." Motion: the messy BEFORE stack turns into the clean AFTER screen.',
  }),
  lesson({
    slug: "a-series-beats-a-one-off",
    sortOrder: 19,
    module: REVENUE,
    title: "A series beats a one-off",
    excerpt: "Three reels on one product outperform one reel that tries to close the whole sale.",
    idea: `One reel can introduce you. A series can sell, because trust shows up on the third touch, not the first. Plan three films for the same offer before you publish the first.

A useful trio: the problem, the demo, the comparison or the objection. Each film still has one idea and one ask. Together they answer why, how, and why you.

Do not wait to batch perfectly. Publish the problem reel this week. The demo can be next week if the titles already exist. A series that stays in a folder does not compound.

Link them with the episode number and the same face. The viewer who liked the problem should recognize the demo without reading your name.`,
    steps: [
      "Name the three reels: Problem, Demo, Objection.",
      "Give each one a different hook and the same offer.",
      "Publish in that order. The ask gets more direct as the series goes on.",
    ],
    practice: "Create the three drafts now. Generate only the Problem reel today. Leave Demo and Objection as titled drafts so you do not forget the promise.",
    images: [
      {
        alt: "Three-film sales series",
        prompt:
          "Three posters in a row labeled PROBLEM, DEMO, OBJECTION. Small subtitles read WHY IT HURTS, HOW IT WORKS, WHY THIS ONE. A lime line connects them.",
      },
      {
        alt: "Asks get more direct across the series",
        prompt:
          "Three ask labels under the posters: FOLLOW, SAVE, BOOK. FOLLOW is pale, SAVE is stronger, BOOK is solid lime. Caption: SAME OFFER, CLEARER ASK.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Plan three reels before you publish the first." Motion: PROBLEM, DEMO, and OBJECTION posters land in a row.',
  }),
  lesson({
    slug: "from-script-to-storyboard",
    sortOrder: 20,
    module: SHIP,
    title: "From script to storyboard",
    excerpt: "Turn the four beats into clips before you generate anything. A storyboard is a cheaper place to be wrong.",
    idea: `The script is sentences. The storyboard is shots. Scro's director can draft the shots, but you still approve the plan. If you skip this, you pay to discover that the idea was muddy.

Each clip needs a job. Hook clip, proof clip, payoff clip, ask clip. A thirty-second reel is often four to eight clips, not twenty. Short clips keep the subtitle large and the idea moving.

Write what the camera sees, not the strategy. "Close shot of the label, host points, no new room" is a shot. "Build trust" is not a shot.

You can sketch the board or talk it through in the draft chat. Either way, lock the aspect ratio first. A 9:16 reel and a 16:9 lesson are different films.`,
    steps: [
      "Choose 9:16 for the published reel.",
      "Split the script so each clip is about one clause.",
      "Read the board without the voiceover. If the pictures do not tell the story, add a proof shot or cut a line.",
    ],
    practice: "Turn today's four-beat script into a storyboard and stop before keyframes. If a clip has two jobs, split it.",
    images: [
      {
        alt: "Script lines become separate clips",
        prompt:
          "A left page labeled SCRIPT with four short lines, and a right row labeled CLIPS numbered 1 2 3 4. Arrows map one line to one clip. Caption: ONE CLAUSE, ONE CLIP.",
      },
      {
        alt: "Aspect ratio chosen before the board",
        prompt:
          "Three frames only, side by side, and no table. Left is a tall rectangle labeled exactly 9:16, filled lime, with the word REEL under it. Middle is a square labeled exactly 1:1, gray. Right is a wide rectangle labeled exactly 16:9, gray. The only caption is CHOOSE THE FRAME FIRST. No other words.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Turn each line into one shot before you generate." Motion: script lines fly into four numbered clips.',
  }),
  lesson({
    slug: "approve-keyframes-before-video",
    sortOrder: 21,
    module: SHIP,
    title: "Approve keyframes before video",
    excerpt: "A wrong still is cheap. A wrong moving shot is the expensive way to learn the same thing.",
    idea: `Blind video is how credits disappear. Scro lets you approve the still before the motion. Use that pause every time.

Look for four failures. Wrong face. Wrong product. Wrong words on screen. A composition you would not post. If any of those are wrong, redo the still. Do not talk yourself into "the motion will fix it." Motion keeps what the still got wrong and adds camera on top.

Write a short remark when you redo a frame. "Lower the hand. Keep the label straight." Vague remarks waste the second still too.

Only generate the clip video after the stills for that clip are acceptable. Then move to the next clip. Do not render the whole film because the first frame looked fine.`,
    steps: [
      "Generate the stills for clip one.",
      "Check face, product, on-screen words, and crop.",
      "Approve, or redo with a specific remark. Start motion only after the check passes.",
    ],
    practice: "On your next reel, generate stills for every clip before you generate any clip video. Count how many stills you reject. That number is money you did not burn.",
    images: [
      {
        alt: "Approve the still, then generate motion",
        prompt:
          "A two-step flow. Step 1 labeled STILL has a lime check and the words FACE, PRODUCT, WORDS, CROP. Step 2 labeled MOTION is locked behind a gate until the check is present.",
      },
      {
        alt: "A specific redo remark",
        prompt:
          "A frame with a note pinned to it. The note reads exactly KEEP THE LABEL STRAIGHT. A vague note reading MAKE IT BETTER is crossed out.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Approve the still before you pay for motion." Motion: the STILL card gets a check, then the MOTION gate opens.',
  }),
  lesson({
    slug: "captions-silence-and-b-roll",
    sortOrder: 22,
    module: SHIP,
    title: "Captions, silence, and B-roll",
    excerpt: "Most people watch on mute. Make the words readable, cut the dead air, and cover the lecture with proof.",
    idea: `A finished Scro cut still needs a pass before you export. Three passes are enough.

Captions: the hook and the ask must be readable on a phone, in the language you speak. Do not caption every breath if it covers the product. Do caption the line that does the selling.

Silence: cut the gap before the first word and after the last word. A slow start is a failed hook even if the script was right.

B-roll: if two face lines repeat, cover one with the proof shot you planned. Do not add stock footage that changes the offer.

Then export the vertical file and watch it once on your phone, with sound off.`,
    steps: [
      "Turn captions on for the hook and the ask. Check that they match the spoken words.",
      "Trim the silence at both ends.",
      "Add one proof cutaway if the face is on screen for more than two lines.",
    ],
    practice: "Export one reel and watch the first three seconds on your phone with the sound off. If the promise is not readable, fix the caption before you post.",
    images: [
      {
        alt: "Three finish passes: captions, silence, proof",
        prompt:
          "Three check rows labeled CAPTIONS, TRIM SILENCE, ADD PROOF. Each row has a small icon: text, scissors, cutaway frame. All three checks are lime.",
      },
      {
        alt: "Mute test on a phone",
        prompt:
          "A phone with the sound icon crossed out. Large caption on the video reads 3 SHOTS THAT SELL. Caption under the phone: READS ON MUTE.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "If it fails on mute, it is not finished." Motion: a sound icon turns off and the caption 3 SHOTS THAT SELL stays readable.',
  }),
  lesson({
    slug: "the-publish-checklist",
    sortOrder: 23,
    module: SHIP,
    title: "The publish checklist",
    excerpt: "Cover, first line, one ask, and the next episode already named. Posting is a system, not a mood.",
    idea: `The publish moment is where good reels go to die in a camera roll. Use a four-point check so posting takes ten minutes.

The cover or first frame shows the hook words, not a logo. The first spoken line matches those words. The ending asks for one action. The next reel has a title, even if it is only a draft.

Write the caption in the same voice as the character. The first line of the caption repeats the hook, because some apps show that line before the video plays. Hashtags do not replace the hook.

Then post it where you said you would: Reels, Shorts, or TikTok. One excellent unposted file grows nothing.`,
    steps: [
      "Confirm the first frame reads the hook with the sound off.",
      "Confirm the last line is one ask.",
      "Name the next reel before you hit publish.",
      "Post it today. Do not wait for a better thumbnail you have not started.",
    ],
    practice: "Run this checklist on the reel from the last lesson and publish it. Create an empty draft titled with next week's hook.",
    images: [
      {
        alt: "Publish checklist with four gates",
        prompt:
          "Flat off-white paper only. No photos, no planets, no space, no people. A checklist titled POST TODAY. Five rows spelled exactly: HOOK ON FRAME, FIRST LINE MATCHES, ONE ASK, NEXT TITLE, DAY 2 HOOK. Each row has an empty square checkbox. DAY 2 HOOK is lime. Empty paper everywhere else.",
      },
      {
        alt: "Caption opens with the same hook",
        prompt:
          "One phone only. Inside the phone, the first line is lime and reads exactly 3 SHOTS THAT SELL. Two short gray bars sit under that line, with no letters on the bars. Under the phone the caption is exactly FIRST LINE IS THE HOOK. No lorem ipsum. No extra panels.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Post it today, and name the next one first." Motion: the four checklist rows tick on, then a NEXT TITLE card appears.',
  }),
  lesson({
    slug: "completion-beats-likes",
    sortOrder: 24,
    module: NUMBERS,
    title: "Completion beats likes",
    excerpt: "Likes flatter you. Holding attention and earning the ask are the numbers that grow the account.",
    idea: `After you post, wait until the reel has had a fair chance to be seen, then read four numbers in order.

Did people stay past the first three seconds? If not, the hook failed. Ignore the likes.
Did a decent share finish the video? If not, the middle has a second idea or a slow shot.
Did they follow? If they watch and do not follow, the series promise is missing.
Did they do the business ask? If they follow and never click, the ask is unclear or too early.

Do not average these into a vibe. Each number points at one beat from the first module. Fix that beat next time. Do not reshoot the whole format because one number was soft.`,
    steps: [
      "Write down three-second hold, completion, follows, and the ask result.",
      "Circle the first number that is weak. That is the only beat you rewrite.",
      "Leave a winning hook alone. Steal it for the next two posts.",
    ],
    practice: "Open the last reel you posted and fill the four numbers. Write one sentence: the next edit changes only this beat.",
    images: [
      {
        alt: "Four numbers mapped to four beats",
        prompt:
          "A table with columns NUMBER and FIX. Rows read HOLD 3S / HOOK, COMPLETION / MIDDLE, FOLLOWS / SERIES, ASK / LAST LINE. The first row is highlighted lime.",
      },
      {
        alt: "Likes are not the decision",
        prompt:
          "A big heart icon labeled LIKES is gray and small. Four larger lime tiles read HOLD, FINISH, FOLLOW, ASK. Caption: READ THESE FIRST.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "If they leave in three seconds, rewrite the hook." Motion: the HOLD 3S row lights lime and the heart icon shrinks.',
  }),
  lesson({
    slug: "keep-what-works",
    sortOrder: 25,
    module: NUMBERS,
    title: "Keep what works",
    excerpt: "Run the winning hook shape three times. Retire the shape people skip. Do not restart the brand.",
    idea: `Growth is a small experiment with a boring rule. When a hook shape wins, you owe it two more reps before you get creative. When a shape loses three times, stop using it.

A shape is not a topic. "Mistake in the first three words" is a shape. "Talk about packaging" is a topic. Keep the winning shape and change the example.

Do not change the face, the format, and the hook in the same week. You will not know which change helped. Change one lever. The hook is the usual lever. The face is almost never the lever.

Write the result where you will see it next Monday: keep, or drop. Memory is a bad analyst.`,
    steps: [
      "Name the hook shape in three words. Example: mistake, then fix.",
      "If it won, schedule two more reels with that shape and a new example.",
      "If it lost three times, ban it for a month. Do not ban the whole format.",
    ],
    practice: "Make a two-column note in your folder description or a draft title: KEEP and DROP. Put today's hook shape in one column.",
    images: [
      {
        alt: "Repeat a winning hook shape three times",
        prompt:
          "Three lime tickets labeled WIN 1, WIN 2, WIN 3, all subtitled MISTAKE THEN FIX. A gray ticket labeled NEW SHAPE is pushed aside. Caption: REP THE WINNER.",
      },
      {
        alt: "Change one lever at a time",
        prompt:
          "Three switches labeled FACE, FORMAT, HOOK. FACE and FORMAT are locked. HOOK is switched on and lime. Caption: ONE CHANGE.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Repeat the hook that held them. Drop the one they skip." Motion: three WIN tickets stack in lime and the NEW SHAPE ticket slides away.',
  }),
  lesson({
    slug: "the-30-day-follower-plan",
    sortOrder: 26,
    module: NUMBERS,
    title: "The 30-day follower plan",
    excerpt: "Twelve reels, one character, one format, one offer. That is the month. Not a rebrand.",
    idea: `This is the whole academy on a calendar. For thirty days you do not invent a new brand. You publish twelve reels: three a week, with one quiet week allowed if you still hit eight.

Constraints: one character, one voice, one format, one offer. Hooks change. The four beats stay. You approve stills before motion. You post the same day you export. You read the four numbers once a week and only rewrite the weak beat.

Week one is the offer, the persona sentence, and the first three hooks.
Week two repeats the best hook shape.
Week three is the sales trio: problem, demo, objection.
Week four keeps the winner and drops the loser.

At day thirty, count follows and the business ask, not how many styles you tried. If the face is recognizable and one hook shape wins, repeat the month. If nothing held past three seconds, rewrite hooks before you touch the character.`,
    steps: [
      "Block twelve slots on a calendar. Title each slot with a hook, not with the word content.",
      "Produce week one as a batch this week. Post the first reel before the batch is perfect.",
      "Every Sunday, fill in hold, completion, follows, and asks. Change one lever for the next week.",
    ],
    practice: "Create a folder for the month. Add twelve draft titles. Generate the character only if you do not already have one, then shoot draft one.",
    images: [
      {
        alt: "Thirty-day plan: twelve reels, one face, one offer",
        prompt:
          "Off-white paper. Title exactly THE MONTH. Thirty small boxes in one row, numbered 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30, in that order. Boxes 1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, and 26 have a lime dot. Under the row, four lines and nothing else: 1 FACE, 1 FORMAT, 1 OFFER, 12 REELS. Forbidden text: lorem, ipsum. No black panel. No photographs.",
      },
      {
        alt: "Four weeks with different jobs",
        prompt:
          "Four short columns and no blocks of black. Titles exactly WEEK 1, WEEK 2, WEEK 3, WEEK 4. Subtitles exactly FIRST HOOKS, REPEAT WINNER, SALES TRIO, KEEP OR DROP. WEEK 1 is lime. No other words.",
      },
    ],
    videoPrompt:
      'Spoken line, exactly: "Twelve reels. One face. One offer. Change the hook." Motion: twelve lime dots appear on the calendar, three at a time.',
  }),
];
