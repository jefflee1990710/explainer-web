import type { VoiceSampleLanguage } from "@/model/character-voice-sample";

// Target sample rate for microphone WAV encoding (24 kHz mono 16-bit PCM = ~48 KB/s, so 120s is ~5.7 MB < 10 MB limit).
export const RECORDER_TARGET_SAMPLE_RATE = 24000;

// Sample reading scripts per language (~15-25s of natural speech covering diverse vowels and tones).
export const VOICE_READING_SCRIPTS: Record<VoiceSampleLanguage, readonly string[]> = {
  yue: [
    "大家好！好開心今日可以喺度同大家分享我最近嘅生活點滴。其實無論拍短片定係講故事，最緊要都係把聲夠自然、夠親切，聽落去好似同朋友傾偈一樣，咁先至最能夠打動觀眾。",
    "你有冇試過明明有好多好橋，但係每次要對住鏡頭講嘢就覺得好緊張？其實只要搵到適合自己嘅節奏，慢慢講清楚每一個重點，大家都會好鍾意聽你分享嘅內容。",
  ],
  zh: [
    "大家好！很高興今天能在這裡跟大家分享我最近的生活與創作心得。其實不管是拍短片還是講故事，最重要的就是聲音聽起來自然、有溫度，就像跟老朋友面對面聊天一樣輕鬆自在。",
    "你有沒有遇過這種情況：腦袋裡有很多精彩的點子，但每次面對鏡頭卻不知道從何說起？只要找到屬於自己的說話節奏，把每個重點清楚地表達出來，就能深深吸引觀眾的注意力。",
  ],
  en: [
    "Hey everyone! Welcome back to my channel. Today I want to share a quick behind-the-scenes look at how we turn simple everyday ideas into engaging short videos. The secret is keeping your voice natural, warm, and conversational, just like talking to a close friend.",
    "Have you ever had a great story in mind, but froze the moment the camera started rolling? Once you find your natural speaking rhythm and focus on one clear takeaway at a time, your audience will stay hooked from the first second to the very end.",
  ],
  ja: [
    "皆さんこんにちは！今日は私が普段どのようにショート動画のアイデアを形にしているのか、その裏側を少しだけお話ししたいと思います。一番大切なのは、友達とカフェで話しているような自然で温かみのある声で伝えることです。",
    "伝えたいアイデアはたくさんあるのに、カメラの前に立つと緊張して言葉が出てこないことはありませんか？自分のペースを見つけて、一つずつ丁寧にポイントを伝えていけば、視聴者の心にしっかり届く動画になります。",
  ],
  ko: [
    "안녕하세요 여러분! 오늘은 제가 일상 속 작은 아이디어를 어떻게 재미있는 숏폼 영상으로 만드는지 이야기해 보려고 합니다. 가장 중요한 건 친한 친구와 대화하듯 자연스럽고 편안한 목소리로 전달하는 것입니다.",
    "머릿속에 좋은 아이디어가 가득한데 막상 카메라 앞에 서면 긴장해서 말이 잘 안 나왔던 적 있으신가요? 나만의 호흡과 리듬을 찾고 핵심 포인트를 하나씩 차근차근 설명하면 시청자들도 끝까지 집중해서 보게 됩니다.",
  ],
  id: [
    "Halo semuanya! Senang sekali hari ini saya bisa berbagi cerita di balik layar tentang bagaimana kami mengubah ide sederhana menjadi video pendek yang menarik. Rahasianya adalah berbicara dengan nada yang santai, hangat, dan alami seperti sedang mengobrol dengan teman dekat.",
    "Pernahkah kamu punya banyak ide bagus di kepala, tapi langsung gugup saat kamera mulai merekam? Begitu kamu menemukan ritme bicaramu sendiri dan menyampaikan setiap poin dengan jelas, penonton pasti akan betah menonton sampai akhir.",
  ],
  es: [
    "¡Hola a todos! Qué alegría compartir hoy con ustedes cómo transformamos ideas cotidianas en videos cortos que conectan con la audiencia. El secreto está en hablar con un tono natural, cálido y cercano, exactamente como si charlaras con un buen amigo.",
    "¿Alguna vez has tenido una gran historia en mente, pero te quedaste en blanco frente a la cámara? Cuando encuentras tu propio ritmo y explicas cada punto con claridad, las personas se quedan viendo desde el primer segundo hasta el final.",
  ],
  pt: [
    "Olá pessoal! Que bom ter vocês por aqui hoje. Quero mostrar rapidamente como transformamos ideias simples do dia a dia em vídeos curtos envolventes. O segredo é manter a voz natural, calorosa e espontânea, como numa conversa entre amigos.",
    "Você já teve uma ótima ideia na cabeça, mas travou na hora em que a câmera começou a gravar? Quando você encontra o seu ritmo natural de fala e foca em uma mensagem clara por vez, o público acompanha cada segundo.",
  ],
  fr: [
    "Bonjour à tous ! Je suis ravi de vous retrouver aujourd'hui pour partager quelques astuces sur la création de vidéos courtes captivantes. Le secret, c'est de garder une voix naturelle, chaleureuse et spontanée, comme si vous discutiez avec un ami proche.",
    "Vous est-il déjà arrivé d'avoir une excellente idée en tête, mais de perdre vos mots dès que la caméra s'allume ? En trouvant votre propre rythme et en expliquant chaque point simplement, vous capterez l'attention du début à la fin.",
  ],
  de: [
    "Hallo zusammen! Schön, dass ihr heute wieder dabei seid. Ich möchte euch kurz zeigen, wie wir aus einfachen Alltagsideen spannende Kurzvideos machen. Das Geheimnis ist eine natürliche, warme und entspannte Stimme – genau wie im Gespräch mit guten Freunden.",
    "Hattet ihr auch schon mal eine tolle Idee im Kopf, wusstet aber vor der Kamera plötzlich nicht mehr, wie ihr anfangen sollt? Wenn ihr euren eigenen Sprechrhythmus findet und jeden Punkt klar erklärt, bleibt euer Publikum bis zur letzten Sekunde dran.",
  ],
  ru: [
    "Всем привет! Очень рад сегодня поделиться с вами тем, как мы превращаем простые повседневные идеи в увлекательные короткие видео. Главный секрет — говорить естественно, тепло и непринуждённо, словно вы общаетесь с близким другом.",
    "Бывало ли у вас так, что в голове много отличных мыслей, но перед камерой сразу появляется волнение? Когда вы находите свой естественный ритм речи и спокойно объясняете главную мысль, зрители смотрят видео на одном дыхании.",
  ],
  vi: [
    "Xin chào mọi người! Rất vui được gặp lại các bạn hôm nay để chia sẻ cách chúng mình biến những ý tưởng đời thường thành các video ngắn cuốn hút. Bí quyết quan trọng nhất là giữ giọng nói tự nhiên, ấm áp và gần gũi như đang trò chuyện cùng bạn bè.",
    "Bạn đã bao giờ có rất nhiều ý tưởng hay trong đầu nhưng lại bối rối ngay khi bật máy quay chưa? Chỉ cần tìm được nhịp nói tự nhiên của riêng mình và truyền tải từng ý thật rõ ràng, khán giả sẽ luôn theo dõi đến giây cuối cùng.",
  ],
  th: [
    "สวัสดีครับทุกคน! ดีใจมากที่ได้มาแชร์เบื้องหลังการเปลี่ยนไอเดียใกล้ตัวให้กลายเป็นคลิปสั้นที่น่าติดตาม เคล็ดลับสำคัญคือการพูดด้วยน้ำเสียงที่เป็นธรรมชาติ อบอุ่น และเป็นกันเอง เหมือนเรากำลังเล่าเรื่องให้เพื่อนสนิทฟัง",
    "เคยไหมครับที่มีไอเดียดีๆ อยู่เต็มหัว แต่พออยู่หน้ากล้องกลับตื่นเต้นจนพูดไม่ออก เพียงแค่เราจับจังหวะการพูดของตัวเองให้เจอ แล้วค่อยๆ เล่าทีละประเด็นอย่างชัดเจน ผู้ชมก็จะติดตามฟังจนจบคลิปแน่นอนครับ",
  ],
  ms: [
    "Hai semua! Gembira dapat berkongsi dengan anda hari ini tentang cara kami mengubah idea harian yang mudah menjadi video pendek yang menarik. Rahsianya adalah mengekalkan suara yang semula jadi, mesra dan santai seperti berbual dengan kawan rapat.",
    "Pernahkah anda mempunyai banyak idea menarik di fikiran, tetapi terus gemuruh sebaik sahaja kamera mula merakam? Apabila anda menemui rentak percakapan sendiri dan menyampaikan isi penting dengan jelas, penonton pasti akan terus menonton sehingga tamat.",
  ],
  fil: [
    "Kumusta kayong lahat! Masaya akong ibahagi sa inyo ngayon kung paano namin ginagawang engaging na short videos ang mga simpleng ideya sa araw-araw. Ang sikreto ay panatilihing natural, mainit, at parang nakikipagkwentuhan lang sa isang malapit na kaibigan.",
    "Naranasan mo na bang magkaroon ng magandang kwento sa isip mo, pero biglang kinabahan pagharap sa camera? Kapag nahanap mo na ang sarili mong ritmo sa pagsasalita at malinaw mong naipaliwanag ang bawat punto, siguradong manonood sila hanggang dulo.",
  ],
  hi: [
    "नमस्ते दोस्तों! आज मैं आपके साथ यह साझा करने के लिए बहुत उत्साहित हूँ कि हम रोज़मर्रा के साधारण विचारों को दिलचस्प शॉर्ट वीडियो में कैसे बदलते हैं। इसका सबसे बड़ा राज़ है अपनी आवाज़ को बिल्कुल सहज, गर्मजोशी भरा और दोस्ताना रखना।",
    "क्या आपके साथ कभी ऐसा हुआ है कि दिमाग में बहुत अच्छे विचार हों, लेकिन कैमरे के सामने आते ही झिझक होने लगे? जब आप अपनी स्वाभाविक बोलने की लय पकड़ लेते हैं और हर बात स्पष्ट रूप से रखते हैं, तो दर्शक अंत तक जुड़े रहते हैं।",
  ],
  ar: [
    "أهلاً بكم جميعاً! يسعدني اليوم أن أشارككم كواليس تحويل الأفكار اليومية البسيطة إلى مقاطع فيديو قصيرة وجذابة. السر يكمن في الحفاظ على نبرة صوت طبيعية ودافئة وعفوية، تماماً كما لو كنت تتحدث مع صديق مقرب.",
    "هل سبق أن خطرت ببالك فكرة رائعة، لكنك شعرت بالتوتر فور تشغيل الكاميرا؟ عندما تجد إيقاعك الطبيعي في الحديث وتركز على إيصال كل نقطة بوضوح وبساطة، سيبقى الجمهور متابعاً لك من الثانية الأولى حتى النهاية.",
  ],
  it: [
    "Ciao a tutti! Sono felicissimo di condividere con voi oggi il dietro le quinte di come trasformiamo idee semplici in brevi video coinvolgenti. Il segreto è mantenere una voce naturale, calda e spontanea, proprio come durante una chiacchierata con un caro amico.",
    "Vi è mai capitato di avere una grande storia in mente, ma di bloccarvi appena si accende la telecamera? Quando trovate il vostro ritmo naturale e spiegate ogni concetto con chiarezza, il pubblico rimane incollato allo schermo fino alla fine.",
  ],
  nl: [
    "Hallo allemaal! Wat leuk dat jullie er vandaag weer zijn. Ik wil jullie graag laten zien hoe we simpele dagelijkse ideeën omzetten in boeiende korte video's. Het geheim is een natuurlijke, warme en ontspannen stem, precies zoals je met een goede vriend praat.",
    "Heb je ooit een geweldig verhaal in je hoofd gehad, maar sloeg je dicht zodra de camera begon te draaien? Zodra je je eigen spreekritme vindt en elk punt helder uitlegt, blijft je publiek van de eerste tot de laatste seconde geboeid kijken.",
  ],
  pl: [
    "Cześć wszystkim! Bardzo się cieszę, że mogę dziś pokazać wam kulisy tego, jak zamieniamy proste, codzienne pomysły w angażujące krótkie filmy. Sekretem jest naturalny, ciepły i swobodny głos — zupełnie jak podczas rozmowy z dobrym znajomym.",
    "Czy zdarzyło wam się kiedyś mieć świetny pomysł w głowie, ale przed kamerą nagle zabrakło wam słów? Kiedy znajdziecie swój własny rytm mówienia i jasno przekażecie najważniejsze myśli, widzowie zostaną z wami do samego końca.",
  ],
  tr: [
    "Herkese merhaba! Bugün sizlerle günlük basit fikirleri nasıl ilgi çekici kısa videolara dönüştürdüğümüzün perde arkasını paylaşmak istiyorum. İşin sırrı, yakın bir arkadaşınızla sohbet ediyormuş gibi doğal, sıcak ve samimi bir ses tonuyla konuşmaktır.",
    "Aklınızda harika bir hikâye varken kamera kayda girdiği anda heyecanlanıp takıldığınız oldu mu? Kendi doğal konuşma ritminizi bulup her noktayı net bir şekilde anlattığınızda, izleyiciler ilk saniyeden sonuna kadar videodan kopamaz.",
  ],
};

// Downsamples a mono Float32Array to a lower target sample rate using linear interpolation.
export function downsampleMonoFloat32(
  samples: Float32Array,
  sourceRate: number,
  targetRate: number = RECORDER_TARGET_SAMPLE_RATE,
): { samples: Float32Array; sampleRate: number } {
  if (sourceRate <= targetRate || samples.length === 0) {
    return { samples, sampleRate: sourceRate };
  }
  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = samples[idx] ?? 0;
    const s1 = samples[Math.min(samples.length - 1, idx + 1)] ?? s0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return { samples: out, sampleRate: targetRate };
}

// Encodes mono Float32 PCM samples [-1, 1] into a standard 16-bit PCM RIFF WAV ArrayBuffer.
export function encodeMonoPcmWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // 16 bits per sample
  writeAscii(view, 36, "data");
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return buffer;
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

// Formats elapsed recording seconds into MM:SS.
export function formatRecordingClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
