export type KenneyFamily = {
  label: string;
  // When to use the sound. English, then Traditional Chinese, so later search can match either.
  when: string;
  tags: string[];
};

function family(label: string, when: string, tags: string[]): KenneyFamily {
  return { label, when, tags };
}

// Keyed by `${pack}/${filename family}`. Every audio file in the seeded packs must hit one entry.
export const KENNEY_FAMILIES: Record<string, KenneyFamily> = {
  "interface-sounds/back": family(
    "UI back",
    "Short back or undo. Use when returning to the previous step, dismissing a choice, or rewinding one beat. 返回或復原的短音。用於回到上一步、取消一個選擇，或倒回一拍。",
    ["ui", "back", "undo"],
  ),
  "interface-sounds/bong": family(
    "Soft chime",
    "Soft attention chime, not an alarm. Use for a gentle notice or a quiet highlight. 柔和的提示音，不是警報。用於輕輕提醒或安靜地標一個重點。",
    ["ui", "chime", "notification"],
  ),
  "interface-sounds/click": family(
    "UI click",
    "Short crisp button click. Use on a tap, a caption pop-in, or a cut to the next point. 短促清脆的按鈕點擊。用於點按、字幕彈出，或短片切到下一個重點。",
    ["ui", "click", "button"],
  ),
  "interface-sounds/close": family(
    "UI close",
    "Something closing. Use when a panel, card, or popup goes away. 關閉的聲音。用於面板、卡片或彈窗消失。",
    ["ui", "close"],
  ),
  "interface-sounds/confirmation": family(
    "Confirmation",
    "Positive confirm. Use when a step succeeds, a choice locks in, or a small win lands. 正向確認。用於步驟完成、選擇定案，或一個小成功。",
    ["ui", "success", "confirm"],
  ),
  "interface-sounds/drop": family(
    "UI drop",
    "An item landing in place. Use when something is dropped into a slot or set down on a beat. 東西落到定位。用於放進格子，或在一個節拍上放下。",
    ["ui", "drop"],
  ),
  "interface-sounds/error": family(
    "Error",
    "Negative buzz. Use for a wrong answer, a blocked action, or a failed try. 錯誤提示。用於答錯、動作被擋住，或嘗試失敗。",
    ["ui", "error", "fail"],
  ),
  "interface-sounds/glass": family(
    "Glassy UI tone",
    "Clean glassy interface tone, not glass breaking. Use for a bright highlight or a light notification ping. 玻璃質感的介面音，不是玻璃碎裂。用於明亮的重點或輕通知。",
    ["ui", "glass", "notification"],
  ),
  "interface-sounds/glitch": family(
    "Digital glitch",
    "Short digital glitch. Use for a tech error, a corrupted frame, or a stylized hit on a cut. 短數位故障聲。用於科技出錯、畫面干擾，或切鏡時的風格化一擊。",
    ["ui", "glitch", "tech"],
  ),
  "interface-sounds/maximize": family(
    "Maximize",
    "Expand or reveal. Use when a panel opens, the shot pushes into a point, or a graphic grows on screen. 展開或揭曉。用於打開面板、推進一個重點，或圖形在畫面上變大。",
    ["ui", "open", "reveal"],
  ),
  "interface-sounds/minimize": family(
    "Minimize",
    "Collapse or send away. Use when a graphic shrinks off screen or a panel closes down. 收合或送走。用於圖形縮出畫面，或面板往下關上。",
    ["ui", "close"],
  ),
  "interface-sounds/open": family(
    "UI open",
    "Something opening. Use when a new section, menu, or card appears. 打開的聲音。用於新的一段、選單或卡片出現。",
    ["ui", "open"],
  ),
  "interface-sounds/pluck": family(
    "Pluck accent",
    "Light plucked note. Use as a small accent on a word, icon, or list item. 輕撥弦。用來點一個字、圖示或清單項目。",
    ["ui", "accent"],
  ),
  "interface-sounds/question": family(
    "Question tone",
    "Rising question. Use for curiosity, a quiz prompt, or a 'wait, what?' beat. 上揚的疑問音。用於好奇、問答提示，或「等等，什麼？」的一拍。",
    ["ui", "question"],
  ),
  "interface-sounds/scratch": family(
    "Record scratch",
    "Record scratch stop. Use for a hard interrupt, a comedic freeze, or a rewind into another take. 唱片刮擦的急停。用於硬切斷、搞笑定格，或倒回另一個版本。",
    ["transition", "scratch", "comedy"],
  ),
  "interface-sounds/scroll": family(
    "Scroll",
    "Short scroll or swipe. Use while moving through a list, feed, or carousel. 短促捲動或滑動。用於瀏覽清單、動態或輪播。",
    ["ui", "scroll", "swipe"],
  ),
  "interface-sounds/select": family(
    "Select",
    "Selecting an item. Use when a menu row or option is chosen. 選取項目。用於選下一列選單或一個選項。",
    ["ui", "select"],
  ),
  "interface-sounds/switch": family(
    "UI switch",
    "Mechanical switch. Use when a setting flips on or off. 機械開關。用於設定打開或關閉。",
    ["ui", "switch", "toggle"],
  ),
  "interface-sounds/tick": family(
    "Clock tick",
    "Single clock tick. Use for a countdown, a timer, or one beat of waiting. 一下時鐘滴答。用於倒數、計時，或等待的一拍。",
    ["tick", "countdown", "timer"],
  ),
  "interface-sounds/toggle": family(
    "Toggle",
    "Toggle flip. Use for on versus off, or a before-and-after switch. 撥動開關。用於開與關，或前後對比的切換。",
    ["ui", "toggle"],
  ),

  "ui-audio/click": family(
    "Organic click",
    "Softer organic button click. Use on a tap, a menu choice, or a cut, when a digital click would feel too sharp. 較柔和的有機按鈕點擊。用於點按、選單或切鏡，當電子點擊太尖的時候。",
    ["ui", "click", "button"],
  ),
  "ui-audio/mouseclick": family(
    "Mouse click",
    "Computer mouse button down. Use in a screen recording, a cursor tap, or a desktop demo. 滑鼠按下。用於螢幕錄影、游標點擊或桌面示範。",
    ["ui", "mouse", "click"],
  ),
  "ui-audio/mouserelease": family(
    "Mouse release",
    "Mouse button up. Use when a drag ends or a click is released. 滑鼠放開。用於拖曳結束或點擊後鬆手。",
    ["ui", "mouse"],
  ),
  "ui-audio/rollover": family(
    "Hover",
    "Soft hover. Use when a cursor moves onto a button or a tooltip appears. 輕柔的懸停。用於游標移到按鈕上，或提示出現。",
    ["ui", "hover"],
  ),
  "ui-audio/switch": family(
    "Organic switch",
    "Organic switch click. Use for repeated toggles where each flip should sound a little different. 有機開關聲。用於連續切換，每一下略有不同。",
    ["ui", "switch", "toggle"],
  ),

  "impact-sounds/footstep_carpet": family(
    "Carpet footstep",
    "One soft step on carpet. Use for a quiet indoor walk. 地毯上的一步。用於安靜的室內走路。",
    ["foley", "footstep"],
  ),
  "impact-sounds/footstep_concrete": family(
    "Concrete footstep",
    "One hard step on concrete. Use for a street, sidewalk, or urban walk. 水泥地上的一步。用於街道、人行道或都市走路。",
    ["foley", "footstep"],
  ),
  "impact-sounds/footstep_grass": family(
    "Grass footstep",
    "One step on grass. Use for a park, field, or outdoor path. 草地上的一步。用於公園、草地或戶外小路。",
    ["foley", "footstep"],
  ),
  "impact-sounds/footstep_snow": family(
    "Snow footstep",
    "One crunchy step in snow. Use for winter or a cold outdoor walk. 雪地上碎裂的一步。用於冬天或寒冷的戶外走路。",
    ["foley", "footstep"],
  ),
  "impact-sounds/footstep_wood": family(
    "Wood footstep",
    "One step on a wooden floor. Use for a hallway, room, or stage. 木地板上的一步。用於走廊、房間或舞台。",
    ["foley", "footstep"],
  ),
  "impact-sounds/impactBell_heavy": family(
    "Heavy bell hit",
    "Heavy bell strike. Use as an emphasis sting or a 'pay attention' reveal. 沉重的鐘擊。用於強調，或叫人注意的揭曉。",
    ["impact", "bell", "sting"],
  ),
  "impact-sounds/impactGeneric_light": family(
    "Light hit",
    "Light generic hit. Use for a small object tap or a soft punctuation on a cut. 輕微的一般撞擊。用於小物件輕敲，或切鏡時的輕重音。",
    ["impact", "hit"],
  ),
  "impact-sounds/impactGlass_light": family(
    "Light glass tap",
    "Light glass tap, not a full break. Use for a clink or a glass lightly touched. 輕敲玻璃，不是整片碎掉。用於輕碰杯子或玻璃。",
    ["impact", "glass"],
  ),
  "impact-sounds/impactGlass_medium": family(
    "Glass hit",
    "Medium glass hit. Use when a glass is knocked or a break is starting. 中等玻璃撞擊。用於杯子被敲到，或開始碎裂。",
    ["impact", "glass", "break"],
  ),
  "impact-sounds/impactGlass_heavy": family(
    "Glass smash",
    "Heavy glass impact. Use for glass breaking, a smash, or a hard shatter on a cut. 沉重的玻璃撞擊。用於玻璃碎裂、砸下，或切鏡時的碎裂聲。",
    ["impact", "glass", "break", "smash"],
  ),
  "impact-sounds/impactMetal_light": family(
    "Light metal tap",
    "Light metal tick. Use for a small metal tap or a tool tip. 輕金屬敲擊。用於小金屬輕點或工具尖端。",
    ["impact", "metal"],
  ),
  "impact-sounds/impactMetal_medium": family(
    "Metal clang",
    "Medium metal clang. Use for a tool, pan, or metal prop being hit. 中等金屬碰撞。用於工具、鍋子或金屬道具被打到。",
    ["impact", "metal"],
  ),
  "impact-sounds/impactMetal_heavy": family(
    "Heavy metal impact",
    "Heavy metal slam. Use for a big clang, armor, or a hard metal hit. 沉重金屬撞擊。用於大聲的鏗鏘、盔甲或金屬重擊。",
    ["impact", "metal", "hit"],
  ),
  "impact-sounds/impactMining": family(
    "Rock hit",
    "Pickaxe or rock hit. Use for digging, mining, or breaking stone. 鎬或石頭的敲擊。用於挖掘或敲碎石頭。",
    ["impact", "rock"],
  ),
  "impact-sounds/impactPlank_medium": family(
    "Wood plank hit",
    "Wood plank strike. Use for a board, crate, or construction hit. 木板敲擊。用於木板、木箱或施工的一擊。",
    ["impact", "wood"],
  ),
  "impact-sounds/impactPlate_light": family(
    "Light metal plate",
    "Light tap on a metal plate. Use for a thin metallic tick. 輕敲金屬板。用於薄金屬的輕點。",
    ["impact", "metal"],
  ),
  "impact-sounds/impactPlate_medium": family(
    "Metal plate hit",
    "Medium metal plate hit. Use for a solid metallic knock. 中等金屬板撞擊。用於扎實的金屬敲擊。",
    ["impact", "metal"],
  ),
  "impact-sounds/impactPlate_heavy": family(
    "Heavy metal plate",
    "Heavy metal plate slam. Use for a large metal impact. 沉重金屬板重擊。用於大型金屬撞擊。",
    ["impact", "metal", "hit"],
  ),
  "impact-sounds/impactPunch_medium": family(
    "Punch",
    "Medium punch. Use for a body hit, a fight beat, or a comedic punch. 中等拳擊。用於打中身體、打架的一拍，或搞笑的一拳。",
    ["impact", "punch", "hit"],
  ),
  "impact-sounds/impactPunch_heavy": family(
    "Heavy punch",
    "Heavy punch. Use for a hard hit, a knockout beat, or an impact cut. 沉重的一拳。用於用力打中、擊倒，或撞擊切鏡。",
    ["impact", "punch", "hit"],
  ),
  "impact-sounds/impactSoft_medium": family(
    "Soft thud",
    "Muffled thud. Use for a soft object hit or a dull landing. 悶住的撞擊。用於軟物被打到或鈍的落地。",
    ["impact", "thud"],
  ),
  "impact-sounds/impactSoft_heavy": family(
    "Heavy thud",
    "Heavy muffled thud. Use for a body fall or a dull slam without a sharp attack. 沉重的悶響。用於人倒下或鈍的重擊，沒有尖銳起音。",
    ["impact", "thud", "fall"],
  ),
  "impact-sounds/impactTin_medium": family(
    "Tin hit",
    "Thin tin hit. Use for a can, a cheap tray, or a hollow clang. 薄鐵皮敲擊。用於罐子、鐵盤或空洞的鏗聲。",
    ["impact", "metal"],
  ),
  "impact-sounds/impactWood_light": family(
    "Light wood knock",
    "Light wood tap. Use for a small knock on a door or a wooden object. 輕敲木頭。用於輕輕敲門或敲木製品。",
    ["impact", "wood", "knock"],
  ),
  "impact-sounds/impactWood_medium": family(
    "Wood knock",
    "Medium wood hit. Use for a knock, a block, or a mallet. 中等木頭敲擊。用於敲門、木塊或木槌。",
    ["impact", "wood", "knock"],
  ),
  "impact-sounds/impactWood_heavy": family(
    "Heavy wood hit",
    "Heavy wood impact. Use for a hard wooden hit or the weight of a door slam. 沉重木頭撞擊。用於用力的木擊，或關門的重量感。",
    ["impact", "wood", "hit"],
  ),

  "sci-fi-sounds/computerNoise": family(
    "Computer noise",
    "Computer chatter or data noise. Use under a tech screen, a hack, or a loading moment, and keep it quiet. 電腦雜訊或資料聲。襯在科技畫面、駭入或載入底下，音量要低。",
    ["sci-fi", "computer", "ambience"],
  ),
  "sci-fi-sounds/doorClose": family(
    "Sci-fi door close",
    "Sci-fi door closing. Use for an airlock, spaceship, or lab door shutting. 科幻門關上。用於氣閘、太空船或實驗室的門合上。",
    ["sci-fi", "door"],
  ),
  "sci-fi-sounds/doorOpen": family(
    "Sci-fi door open",
    "Sci-fi door opening. Use for an airlock, spaceship, or lab door opening. 科幻門打開。用於氣閘、太空船或實驗室的門開啟。",
    ["sci-fi", "door"],
  ),
  "sci-fi-sounds/engineCircular": family(
    "Engine whir",
    "Circular engine whir. Use for a machine running, a drone, or a motor spinning. 循環的引擎呼聲。用於機器運轉、無人機或馬達旋轉。",
    ["sci-fi", "engine"],
  ),
  "sci-fi-sounds/explosionCrunch": family(
    "Explosion",
    "Crunchy explosion. Use for a blast, a destruction beat, or a hard impact cut. 帶碎裂感的爆炸。用於爆破、摧毀的一拍，或用力的撞擊切鏡。",
    ["sci-fi", "explosion", "impact"],
  ),
  "sci-fi-sounds/forceField": family(
    "Force field",
    "Energy shield. Use when a barrier appears, a hit is blocked, or energy deflects. 能量護盾。用於屏障出現、擋住一擊，或能量偏轉。",
    ["sci-fi", "shield", "energy"],
  ),
  "sci-fi-sounds/impactMetal": family(
    "Sci-fi metal hit",
    "Sci-fi metal impact. Use for a hull hit, a robot struck, or a metallic hit in a tech scene. 科幻金屬撞擊。用於船體被打中、機器人被擊，或科技場景的金屬一擊。",
    ["sci-fi", "metal", "impact"],
  ),
  "sci-fi-sounds/laserLarge": family(
    "Large laser",
    "Large laser blast. Use for a big energy shot or a powerful zap. 大型雷射。用於大能量射擊或有力的電光。",
    ["sci-fi", "laser", "zap"],
  ),
  "sci-fi-sounds/laserRetro": family(
    "Retro laser",
    "Retro laser pew. Use for a playful, game-like, or 8-bit shot. 復古雷射。用於輕鬆、遊戲感或八位元的射擊。",
    ["sci-fi", "laser", "retro"],
  ),
  "sci-fi-sounds/laserSmall": family(
    "Small laser",
    "Small laser. Use for a light blaster or a quick energy tick. 小型雷射。用於輕型射擊或短能量聲。",
    ["sci-fi", "laser"],
  ),
  "sci-fi-sounds/lowFrequency_explosion": family(
    "Low boom",
    "Low-frequency boom. Use as a sub hit, a distant explosion, or a bass impact under a cut. 低頻爆炸。用於超低音一擊、遠處爆破，或切鏡時的低音撞擊。",
    ["sci-fi", "explosion", "boom", "bass"],
  ),
  "sci-fi-sounds/slime": family(
    "Slime",
    "Wet slime squelch. Use for goo, something sticky, or a messy organic hit. 濕黏的軟泥。用於黏液、黏稠的東西，或濕軟的一擊。",
    ["foley", "slime"],
  ),
  "sci-fi-sounds/spaceEngine": family(
    "Space engine",
    "Space engine rumble. Use as a ship motor or a quiet tech bed under a scene. 太空引擎隆隆聲。用於太空船馬達，或場景底下的科技底噪。",
    ["sci-fi", "engine"],
  ),
  "sci-fi-sounds/spaceEngineLarge": family(
    "Large ship engine",
    "Large ship engine. Use for a hero vehicle or a heavy machine. 大型船艦引擎。用於主角載具或重型機器。",
    ["sci-fi", "engine"],
  ),
  "sci-fi-sounds/spaceEngineLow": family(
    "Low space engine",
    "Deep space-engine rumble. Use for a heavy craft idling. 低沉的太空引擎。用於重型載具怠速。",
    ["sci-fi", "engine", "bass"],
  ),
  "sci-fi-sounds/spaceEngineSmall": family(
    "Small engine",
    "Small thruster or drone engine. Use for a light vehicle or a hovering gadget. 小型推進器或無人機引擎。用於輕型載具或懸停的小裝置。",
    ["sci-fi", "engine", "drone"],
  ),
  "sci-fi-sounds/thrusterFire": family(
    "Thruster whoosh",
    "Thruster burst with a whoosh of motion. Use for a quick boost, a fly-by, or a movement accent. 推進器噴射，帶一股移動的呼嘯。用於短加速、飛過，或動作的氣流感。",
    ["sci-fi", "whoosh", "transition"],
  ),

  "digital-audio/highDown": family(
    "Descending high tone",
    "High tone falling. Use for powering down or a sweep that closes. 高音下行。用於關機，或往下收起的掃過。",
    ["digital", "down", "transition"],
  ),
  "digital-audio/highUp": family(
    "Rising high tone",
    "High tone rising. Use as a short riser into a reveal. 高音上行。用於進入揭曉前的短上升音。",
    ["digital", "riser", "reveal"],
  ),
  "digital-audio/laser": family(
    "Synth laser",
    "Synth laser zap. Use for a playful digital shot or a game-like hit. 合成器雷射。用於輕鬆的數位射擊或遊戲感的一擊。",
    ["digital", "laser", "zap"],
  ),
  "digital-audio/lowDown": family(
    "Descending low tone",
    "Low tone falling. Use for a drop, a power-down, or the end of a point. 低音下行。用於下墜、關機，或一個重點結束。",
    ["digital", "drop", "down"],
  ),
  "digital-audio/lowRandom": family(
    "Low digital blip",
    "Random low blip. Use as a quirky computer accent. 隨機低音嗶聲。用於古怪的電腦點綴。",
    ["digital", "blip"],
  ),
  "digital-audio/lowThreeTone": family(
    "Low three-note alert",
    "Three low notes. Use for a serious notification or a descending alert. 三個低音。用於嚴肅的通知或下行提示。",
    ["digital", "notification"],
  ),
  "digital-audio/pepSound": family(
    "Cheerful pep",
    "Cheerful little pep. Use for a small win, a like, or a positive pop. 輕快的短音。用於小成功、按讚，或正向的一下。",
    ["digital", "success", "pop"],
  ),
  "digital-audio/phaseJump": family(
    "Phase jump",
    "Short phase-jump whoosh. Use as a teleport hop or a transition between two shots. 短相位跳躍的呼嘯。用於傳送，或兩個鏡頭之間的轉場。",
    ["digital", "whoosh", "transition"],
  ),
  "digital-audio/phaserDown": family(
    "Phaser down",
    "Phaser sweeping down. Use for a downward transition or energy closing. 相位器向下掃。用於向下的轉場或能量收起。",
    ["digital", "whoosh", "transition", "down"],
  ),
  "digital-audio/phaserUp": family(
    "Phaser riser",
    "Phaser sweeping up. Use as a riser into a reveal or a cut. 相位器向上掃。用於進入揭曉或切鏡前的上升音。",
    ["digital", "riser", "whoosh", "transition"],
  ),
  "digital-audio/powerUp": family(
    "Power up",
    "Power-up that builds. Use for charging, leveling up, or a success that rises. 越升越高的能量提升。用於充能、升級，或上升的成功。",
    ["digital", "success", "riser"],
  ),
  "digital-audio/spaceTrash": family(
    "Debris clatter",
    "Space-debris clatter. Use for junk, scrap, or a messy little impact. 碎片碰撞。用於垃圾、廢料，或凌亂的小撞擊。",
    ["digital", "impact", "debris"],
  ),
  "digital-audio/threeTone": family(
    "Three-note chime",
    "Three-note chime. Use for a notification, a message, or a done state. 三音提示。用於通知、訊息或完成。",
    ["digital", "notification", "success"],
  ),
  "digital-audio/tone": family(
    "Notification tone",
    "Single notification tone. Use when something arrives or a status pings. 單音通知。用於有東西到達或狀態響了一下。",
    ["digital", "notification"],
  ),
  "digital-audio/twoTone": family(
    "Two-note alert",
    "Two-note alert. Use for a message or a status change. 雙音提示。用於訊息或狀態改變。",
    ["digital", "notification"],
  ),
  "digital-audio/zap": family(
    "Zap",
    "Short electric zap. Use for a small electric hit or a digital tap with bite. 短電光。用於小電擊，或帶一點力道的數位點擊。",
    ["digital", "zap", "hit"],
  ),
  "digital-audio/zapThreeToneDown": family(
    "Zap power down",
    "Zap falling through three tones. Use for powering down or a failed charge. 電光配三音下行。用於關機或充能失敗。",
    ["digital", "zap", "fail", "down"],
  ),
  "digital-audio/zapThreeToneUp": family(
    "Zap power up",
    "Zap rising through three tones. Use for a charge completing or a win. 電光配三音上行。用於充能完成或成功。",
    ["digital", "zap", "success"],
  ),
  "digital-audio/zapTwoTone": family(
    "Zap confirm",
    "Zap with two tones. Use for a digital confirm that also hits. 電光配雙音。用於帶撞擊感的數位確認。",
    ["digital", "zap", "confirm"],
  ),

  "rpg-audio/beltHandle": family(
    "Belt handling",
    "Leather belt being handled. Use for gear, a buckle, or getting ready. 擺弄皮帶。用於裝備、扣環或準備動作。",
    ["foley", "cloth"],
  ),
  "rpg-audio/bookClose": family(
    "Book close",
    "Book closing. Use when a chapter, lesson, or explanation ends. 書本合上。用於一章、一課或說明結束。",
    ["foley", "book", "paper"],
  ),
  "rpg-audio/bookFlip": family(
    "Page turn",
    "Page turn. Use for reading, moving to the next point, or flipping through a list. 翻頁。用於閱讀、進入下一個重點，或翻過清單。",
    ["foley", "paper", "book"],
  ),
  "rpg-audio/bookOpen": family(
    "Book open",
    "Book opening. Use when a lesson starts or information is revealed. 書本打開。用於開始一課或揭開資訊。",
    ["foley", "book", "reveal"],
  ),
  "rpg-audio/bookPlace": family(
    "Book set down",
    "Book set down. Use when a book or stack of paper is placed. 把書放下。用於放下書本或一疊紙。",
    ["foley", "book"],
  ),
  "rpg-audio/chop": family(
    "Chop",
    "Axe or blade chop. Use for a cut into wood or a hard slice. 斧頭或刀刃砍下。用於砍進木頭或用力的一刀。",
    ["foley", "impact", "cut"],
  ),
  "rpg-audio/cloth": family(
    "Cloth rustle",
    "Cloth rustle. Use for clothing movement or a soft foley layer. 布料摩擦。用於衣服移動或輕柔的擬音。",
    ["foley", "cloth"],
  ),
  "rpg-audio/clothBelt": family(
    "Cloth and belt",
    "Cloth and belt moving. Use for gear shifting or someone getting ready. 布料和皮帶的動作。用於換裝備或準備。",
    ["foley", "cloth"],
  ),
  "rpg-audio/creak": family(
    "Wood creak",
    "Wood creak. Use for a door, a floorboard, or suspense before a reveal. 木頭嘎吱。用於門、地板，或揭曉前的緊張。",
    ["foley", "creak", "suspense"],
  ),
  "rpg-audio/doorClose": family(
    "Door close",
    "Real door closing. Use for leaving, ending a scene, or a firm shut. 真實的門關上。用於離開、結束場景，或用力關上門。",
    ["foley", "door"],
  ),
  "rpg-audio/doorOpen": family(
    "Door open",
    "Real door opening. Use for entering or starting a scene. 真實的門打開。用於進入或一個場景開始。",
    ["foley", "door"],
  ),
  "rpg-audio/drawKnife": family(
    "Draw knife",
    "Knife drawn. Use for tension, a tool revealed, or a sharp beat. 抽出刀子。用於緊張、亮出工具，或尖銳的一拍。",
    ["foley", "knife", "suspense"],
  ),
  "rpg-audio/dropLeather": family(
    "Leather drop",
    "Leather item dropped. Use for a bag, glove, or pouch set down. 皮革物品落下。用於放下袋子、手套或小袋。",
    ["foley", "drop"],
  ),
  "rpg-audio/footstep": family(
    "Footstep",
    "One footstep. Use when a character takes a step. 一步腳步聲。用於角色走一步。",
    ["foley", "footstep"],
  ),
  "rpg-audio/handleCoins": family(
    "Coins",
    "Coins handled. Use for money, a price, payment, or a small payout. 撥弄硬幣。用於金錢、價格、付款或小筆進帳。",
    ["foley", "money", "coin"],
  ),
  "rpg-audio/handleSmallLeather": family(
    "Small leather item",
    "Small leather item handled. Use for a pouch, wallet, or strap. 擺弄小皮件。用於小袋、錢包或帶子。",
    ["foley", "cloth"],
  ),
  "rpg-audio/knifeSlice": family(
    "Knife slice",
    "Knife slice. Use for cutting food, material, or a sharp swipe. 刀切開。用於切開食物、材料，或銳利的一劃。",
    ["foley", "knife", "cut"],
  ),
  "rpg-audio/metalClick": family(
    "Metal click",
    "Small metal click. Use for a latch tick or a tiny metal detail. 小金屬咔嗒。用於門閂輕響或細小的金屬聲。",
    ["foley", "metal", "click"],
  ),
  "rpg-audio/metalLatch": family(
    "Metal latch",
    "Metal latch. Use for locking or unlocking a door or a box. 金屬門閂。用於鎖上或打開門或盒子。",
    ["foley", "metal", "lock"],
  ),
  "rpg-audio/metalPot": family(
    "Metal pot",
    "Metal pot or pan. Use for cooking or kitchen foley. 金屬鍋。用於煮飯或廚房擬音。",
    ["foley", "metal", "kitchen"],
  ),

  "casino-audio/card-fan": family(
    "Cards fanned",
    "Cards fanned out. Use when spreading options or dealing a row. 把牌扇開。用於攤開選項或發一排。",
    ["foley", "cards"],
  ),
  "casino-audio/card-place": family(
    "Card placed",
    "One card placed. Use when a choice is laid down or a result is shown. 放下一張牌。用於攤出一個選擇或揭曉結果。",
    ["foley", "cards", "reveal"],
  ),
  "casino-audio/card-shove": family(
    "Cards shoved",
    "Cards shoved forward. Use when a pile is pushed or a decision is dumped ahead. 把牌推出去。用於推一疊牌，或把決定推到前面。",
    ["foley", "cards"],
  ),
  "casino-audio/card-shuffle": family(
    "Card shuffle",
    "Cards shuffled. Use for mixing, randomizing, or a 'let's see' beat. 洗牌。用於打亂、隨機，或「看看結果」的一拍。",
    ["foley", "cards"],
  ),
  "casino-audio/card-slide": family(
    "Card slide",
    "Card sliding on a table. Use for a smooth item move or a soft transition. 紙牌在桌面上滑過。用於順暢地移動物件，或輕柔的轉場。",
    ["foley", "cards", "transition"],
  ),
  "casino-audio/cards-pack-open": family(
    "Pack open",
    "Opening a pack. Use for unboxing, a reveal, or a new set appearing. 拆開一包。用於開箱、揭曉，或一組新東西出現。",
    ["foley", "reveal", "open"],
  ),
  "casino-audio/cards-pack-take-out": family(
    "Take out of pack",
    "Taking cards out of a pack. Use when an item is pulled from packaging. 從包裝抽出。用於把東西從盒子裡拿出來。",
    ["foley", "reveal"],
  ),
  "casino-audio/chip-lay": family(
    "Chip laid down",
    "One chip laid down. Use for a bet, a price, or money spent. 放下一枚籌碼。用於下注、標價或花錢。",
    ["foley", "money"],
  ),
  "casino-audio/chips-collide": family(
    "Chips colliding",
    "Chips clacking together. Use when money moves or a stack is disturbed. 籌碼互相碰撞。用於錢在動，或一疊被碰到。",
    ["foley", "money"],
  ),
  "casino-audio/chips-handle": family(
    "Handling chips",
    "A handful of chips. Use for counting money or a payout. 抓一把籌碼。用於數錢或付款。",
    ["foley", "money"],
  ),
  "casino-audio/chips-stack": family(
    "Stacking chips",
    "Stacking chips. Use when a pile of money or points builds up. 把籌碼疊起來。用於疊錢或疊分數。",
    ["foley", "money"],
  ),
  "casino-audio/dice-grab": family(
    "Grab dice",
    "Dice grabbed. Use just before a chance or a random decision. 抓起骰子。用於機會或隨機決定之前。",
    ["foley", "dice"],
  ),
  "casino-audio/dice-shake": family(
    "Shake dice",
    "Dice shaking. Use for anticipation before a result. 搖骰子。用於結果出來前的期待。",
    ["foley", "dice", "suspense"],
  ),
  "casino-audio/dice-throw": family(
    "Throw dice",
    "Dice thrown. Use for a random result or a decision by chance. 擲出骰子。用於隨機結果或靠運氣的決定。",
    ["foley", "dice"],
  ),
  "casino-audio/die-throw": family(
    "Throw one die",
    "One die thrown. Use for a single roll or a yes-or-no chance. 擲出一顆骰子。用於單次投擲或是與否的運氣。",
    ["foley", "dice"],
  ),
};

export const KENNEY_PACK_TITLES: Record<string, string> = {
  "interface-sounds": "Interface Sounds",
  "ui-audio": "UI Audio",
  "impact-sounds": "Impact Sounds",
  "sci-fi-sounds": "Sci-Fi Sounds",
  "digital-audio": "Digital Audio",
  "rpg-audio": "RPG Audio",
  "casino-audio": "Casino Audio",
};
