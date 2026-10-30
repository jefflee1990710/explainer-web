"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { ScroVideoUiStage } from "@/opencut/embed/scro-video-types";

export type OpencutLocaleGroup = "en" | "zh-Hant" | "zh-Hans" | "ja" | "ko";

export function resolveOpencutLocaleGroup(locale?: string | null): OpencutLocaleGroup {
	if (!locale) return "en";
	if (locale === "zh-Hant") return "zh-Hant";
	if (locale === "zh-Hans") return "zh-Hans";
	if (locale === "ja") return "ja";
	if (locale === "ko") return "ko";
	return "en";
}

// Extract the localized half of a "中文 · English" or "English · 中文" label.
export function localizeBilingualLabel(label: string, locale?: string | null): string {
	if (!label.includes("·")) return label;
	const parts = label.split("·").map((part) => part.trim()).filter(Boolean);
	if (parts.length < 2) return label;
	const isZh = locale === "zh-Hant" || locale === "zh-Hans";
	const cjkRegex = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/;
	const cjkPart = parts.find((part) => cjkRegex.test(part));
	const latinPart = parts.find((part) => !cjkRegex.test(part));
	if (isZh) return cjkPart ?? parts[0]!;
	return latinPart ?? parts[parts.length - 1]!;
}

export function getOpencutMessages(locale?: string | null) {
	const group = resolveOpencutLocaleGroup(locale);
	const isZhHant = group === "zh-Hant";
	const isZhHans = group === "zh-Hans";
	const isJa = group === "ja";
	const isKo = group === "ko";

	const pick = <T,>(variants: {
		en: T;
		zhHant: T;
		zhHans?: T;
		ja?: T;
		ko?: T;
	}): T => {
		if (isZhHant) return variants.zhHant;
		if (isZhHans) return variants.zhHans ?? variants.zhHant;
		if (isJa) return variants.ja ?? variants.en;
		if (isKo) return variants.ko ?? variants.en;
		return variants.en;
	};

	return {
		localeGroup: group,
		rail: {
			media: pick({ en: "Media", zhHant: "媒體素材", zhHans: "媒体素材", ja: "メディア", ko: "미디어" }),
			stock: pick({ en: "Stock B-Roll", zhHant: "免費素材 B-Roll", zhHans: "免费素材 B-Roll", ja: "ストック素材", ko: "스톡 B-Roll" }),
			subtitles: pick({ en: "Subtitles", zhHant: "字幕", zhHans: "字幕", ja: "字幕", ko: "자막" }),
			onScreenText: pick({ en: "On-Screen Text", zhHant: "畫面文字", zhHans: "画面文字", ja: "画面テキスト", ko: "화면 텍스트" }),
			sounds: pick({ en: "SFX", zhHant: "聲效 SFX", zhHans: "音效 SFX", ja: "効果音 SFX", ko: "효과음 SFX" }),
			bgm: pick({ en: "BGM", zhHant: "背景音樂 BGM", zhHans: "背景音乐 BGM", ja: "BGM", ko: "배경음악 BGM" }),
			stickers: pick({ en: "Stickers", zhHant: "貼紙", zhHans: "贴纸", ja: "ステッカー", ko: "스티커" }),
			effects: pick({ en: "Effects", zhHant: "特效", zhHans: "特效", ja: "エフェクト", ko: "이펙트" }),
			transitions: pick({ en: "Transitions", zhHant: "轉場", zhHans: "转场", ja: "トランジション", ko: "트랜지션" }),
			adjustment: pick({ en: "Adjustment", zhHant: "調色", zhHans: "调色", ja: "カラー調整", ko: "색상 조정" }),
			settings: pick({ en: "Settings", zhHant: "設定", zhHans: "设置", ja: "設定", ko: "설정" }),
		},
		subtitlesPanel: {
			hint: pick({
				en: "Pick or search a font below, then click Next to choose a subtitle design (such as Torn Paper Duo) and generate.",
				zhHant: "先揀選或搜尋喜歡嘅中英字體，再撳下方按鈕選擇字幕設計（如撕紙雙色字卡）並生成。",
				zhHans: "先挑选或搜索喜欢的中英字体，再点击下方按钮选择字幕设计（如撕纸双色字卡）并生成。",
				ja: "フォントを選択または検索し、下のボタンから字幕デザインを選んで生成します。",
				ko: "글꼴을 선택하거나 검색한 뒤 아래 버튼을 눌러 자막 디자인을 선택하고 생성하세요.",
			}),
			searchFontPlaceholder: pick({
				en: "Search font (e.g. Oswald, Noto, Marker)...",
				zhHant: "搜尋字體 (例如 Oswald, 思源, 手寫)...",
				zhHans: "搜索字体 (例如 Oswald, 思源, 手写)...",
				ja: "フォントを検索 (例: Oswald, Noto)...",
				ko: "글꼴 검색 (예: Oswald, Noto)...",
			}),
			styleDefaultTitle: pick({
				en: "Follow Style Default Font",
				zhHant: "跟隨設計預設字體",
				zhHans: "跟随设计默认字体",
				ja: "スタイル標準フォント",
				ko: "스타일 기본 글꼴",
			}),
			styleDefaultDesc: pick({
				en: "Automatically matches the best font for the selected subtitle style",
				zhHant: "自動匹配所選字幕設計嘅最佳中英字體",
				zhHans: "自动匹配所选字幕设计的最佳中英字体",
				ja: "選択した字幕デザインに最適なフォントを自動適用",
				ko: "선택한 자막 디자인에 가장 잘 어울리는 글꼴 자동 적용",
			}),
			recommended: pick({ en: "Recommended", zhHant: "推薦", zhHans: "推荐", ja: "おすすめ", ko: "추천" }),
			selected: pick({ en: "Selected", zhHant: "已選", zhHans: "已选", ja: "選択中", ko: "선택됨" }),
			noFontMatch: (q: string) =>
				pick({
					en: `No fonts matching "${q}"`,
					zhHant: `找不到符合「${q}」嘅字體`,
					zhHans: `找不到符合“${q}”的字体`,
					ja: `「${q}」に一致するフォントが見つかりません`,
					ko: `"${q}"와 일치하는 글꼴이 없습니다`,
				}),
			currentStyleLabel: pick({ en: "Current style:", zhHant: "目前設計：", zhHans: "当前设计：", ja: "現在のスタイル：", ko: "현재 스타일:" }),
			clickToChange: pick({ en: "Change", zhHant: "點擊更換", zhHans: "点击更换", ja: "変更", ko: "변경" }),
			nextButton: pick({ en: "Next", zhHant: "下一步", zhHans: "下一步", ja: "次へ", ko: "다음" }),
		},
		subtitleDialog: {
			title: (count: number) =>
				pick({
					en: `Choose Subtitle Style (${count})`,
					zhHant: `選擇字幕視覺設計 (${count})`,
					zhHans: `选择字幕视觉设计 (${count})`,
					ja: `字幕スタイルを選択 (${count})`,
					ko: `자막 스타일 선택 (${count})`,
				}),
			selectedFontPrefix: pick({
				en: "Selected font: ",
				zhHant: "已選字體：",
				zhHans: "已选字体：",
				ja: "選択フォント：",
				ko: "선택된 글꼴: ",
			}),
			descriptionSuffix: pick({
				en: ". Switch between Single-Line and Dual-Line styles, then confirm to generate on the Subtitle track.",
				zhHant: "。可切換「單行設計」或「雙行撞色設計」，確認後自動生成到專屬「字幕圖層」。",
				zhHans: "。可切换“单行设计”或“双行撞色设计”，确认后自动生成到专属“字幕图层”。",
				ja: "。1行・2行スタイルを切り替えて確認すると、字幕トラックに自動生成されます。",
				ko: ". 1줄 또는 2줄 스타일을 선택한 뒤 확인을 누르면 자막 트랙에 자동 생성됩니다.",
			}),
			tabAll: pick({ en: "All", zhHant: "全部設計", zhHans: "全部设计", ja: "すべて", ko: "전체" }),
			tabSingle: pick({ en: "Single-Line", zhHant: "單行字幕", zhHans: "单行字幕", ja: "1行字幕", ko: "1줄 자막" }),
			tabDuo: pick({ en: "Dual-Line", zhHant: "雙行撞色", zhHans: "双行撞色", ja: "2行カラー", ko: "2줄 컬러" }),
			searchPlaceholder: pick({
				en: "Search style (e.g. Torn, Single, Neon)...",
				zhHant: "搜尋設計 (例如：撕紙, 單行, Neon)...",
				zhHans: "搜索设计 (例如：撕纸, 单行, Neon)...",
				ja: "スタイルを検索 (例: Neon, Torn)...",
				ko: "스타일 검색 (예: Neon, Torn)...",
			}),
			noMatch: (q: string) =>
				pick({
					en: `No subtitle styles matching "${q}"`,
					zhHant: `找不到符合「${q}」嘅字幕設計`,
					zhHans: `找不到符合“${q}”的字幕设计`,
					ja: `「${q}」に一致するスタイルが見つかりません`,
					ko: `"${q}"와 일치하는 스타일이 없습니다`,
				}),
			cancel: pick({ en: "Cancel", zhHant: "取消", zhHans: "取消", ja: "キャンセル", ko: "취소" }),
			applyAndGenerate: pick({
				en: "Apply & Generate",
				zhHant: "套用設計並生成",
				zhHans: "套用设计并生成",
				ja: "適用して生成",
				ko: "적용 및 생성",
			}),
			singleLineBadge: pick({ en: "1-Line", zhHant: "單行", zhHans: "单行", ja: "1行", ko: "1줄" }),
			dualLineBadge: pick({ en: "2-Line", zhHant: "雙行", zhHans: "双行", ja: "2行", ko: "2줄" }),
		},
		onScreenText: {
			title: pick({ en: "On-Screen Text", zhHant: "畫面文字", zhHans: "画面文字", ja: "画面テキスト", ko: "화면 텍스트" }),
			hint: pick({
				en: "Select an AI-generated subtitle style below to open the text dialog, type your words, and generate a custom AI text graphic onto the timeline.",
				zhHant: "點選下方 AI 生成嘅字幕樣式圖片，喺彈出對話框輸入文字，即可根據所選樣式用 AI 生成畫面文字圖片並加入時間軸。",
				zhHans: "点选下方 AI 生成的字幕样式图片，在弹出对话框输入文字，即可根据所选样式用 AI 生成画面文字图片并加入时间轴。",
				ja: "下のAI字幕スタイル画像をクリックし、テキストを入力して選択したスタイルでAI文字画像を生成します。",
				ko: "아래 AI 자막 스타일 이미지를 클릭하여 텍스트를 입력하면 선택한 스타일로 AI 자막 이미지를 생성합니다.",
			}),
			stylesHeading: pick({
				en: "AI Subtitle Styles",
				zhHant: "AI 字幕圖片樣式",
				zhHans: "AI 字幕图片样式",
				ja: "AI 字幕スタイル一覧",
				ko: "AI 자막 스타일 목록",
			}),
			clickToType: pick({
				en: "Click to type text",
				zhHant: "點擊輸入文字",
				zhHans: "点击输入文字",
				ja: "クリックして文字入力",
				ko: "클릭하여 텍스트 입력",
			}),
			generatedHeading: pick({
				en: "Generated Text Images",
				zhHant: "已生成嘅畫面文字圖片",
				zhHans: "已生成的画面文字图片",
				ja: "生成済みテキスト画像",
				ko: "생성된 텍스트 이미지",
			}),
			insertAgain: pick({
				en: "Add to timeline",
				zhHant: "加入時間軸",
				zhHans: "加入时间轴",
				ja: "タイムラインに追加",
				ko: "타임라인에 추가",
			}),
			dialogTitle: pick({
				en: "Generate AI On-Screen Text",
				zhHant: "AI 生成畫面文字圖片",
				zhHans: "AI 生成画面文字图片",
				ja: "AI 画面テキスト画像を生成",
				ko: "AI 화면 텍스트 이미지 생성",
			}),
			dialogDescription: pick({
				en: "Type your text below. AI will generate a subtitle graphic matching the selected style and place it on the timeline.",
				zhHant: "輸入你想顯示嘅文字，AI 會按照所選樣式生成透明底字幕圖片並自動放入時間軸。",
				zhHans: "输入你想显示的文字，AI 会按照所选样式生成透明底字幕图片并自动放入时间轴。",
				ja: "表示したいテキストを入力してください。選択したスタイルでAIが字幕画像を生成し、タイムラインに配置します。",
				ko: "표시할 텍스트를 입력하세요. 선택한 스타일로 AI가 자막 이미지를 생성하여 타임라인에 배치합니다.",
			}),
			selectedStyleLabel: pick({
				en: "Selected Style",
				zhHant: "所選樣式",
				zhHans: "所选样式",
				ja: "選択スタイル",
				ko: "선택된 스타일",
			}),
			textLabel: pick({
				en: "Subtitle / On-Screen Text",
				zhHant: "畫面文字內容",
				zhHans: "画面文字内容",
				ja: "テキスト内容",
				ko: "텍스트 내용",
			}),
			textPlaceholder: pick({
				en: "Type the text you want AI to generate (e.g. Try it now!)...",
				zhHant: "輸入想由 AI 生成嘅字幕文字（例如：即刻試用／重點筆記）…",
				zhHans: "输入想由 AI 生成的字幕文字（例如：立即试用／重点笔记）…",
				ja: "生成したいテキストを入力してください…",
				ko: "생성할 텍스트를 입력하세요…",
			}),
			cancel: pick({ en: "Cancel", zhHant: "取消", zhHans: "取消", ja: "キャンセル", ko: "취소" }),
			generate: pick({
				en: "Generate Subtitle Image",
				zhHant: "生成字幕圖片",
				zhHans: "生成字幕图片",
				ja: "字幕画像を生成",
				ko: "자막 이미지 생성",
			}),
			generating: pick({
				en: "Generating…",
				zhHant: "AI 生成中…",
				zhHans: "AI 生成中…",
				ja: "生成中…",
				ko: "생성 중…",
			}),
			addedToast: pick({
				en: "Generated AI on-screen text and added to timeline",
				zhHant: "已生成 AI 畫面文字圖片並加入時間軸",
				zhHans: "已生成 AI 画面文字图片并加入时间轴",
				ja: "AIテキスト画像を生成しタイムラインに追加しました",
				ko: "AI 텍스트 이미지를 생성하여 타임라인에 추가했습니다",
			}),
			emptyTextError: pick({
				en: "Please enter text to generate.",
				zhHant: "請輸入要生成嘅文字。",
				zhHans: "请输入要生成的文字。",
				ja: "テキストを入力してください。",
				ko: "텍스트를 입력해 주세요.",
			}),
			failedError: pick({
				en: "Failed to generate on-screen text image",
				zhHant: "生成畫面文字圖片失敗",
				zhHans: "生成画面文字图片失败",
				ja: "テキスト画像の生成に失敗しました",
				ko: "텍스트 이미지 생성에 실패했습니다",
			}),
		},
		subtitleTrack: {
			headerTitle: (count: number) =>
				pick({
					en: `Subtitle Track (${count})`,
					zhHant: `字幕圖層全軌 (${count})`,
					zhHans: `字幕图层全轨 (${count})`,
					ja: `字幕トラック (${count})`,
					ko: `자막 트랙 (${count})`,
				}),
			headerSubtitle: pick({
				en: "Applies changes across all clips on this subtitle track",
				zhHant: "同步套用至成條字幕軌嘅所有片段",
				zhHans: "同步套用至整条字幕轨的所有片段",
				ja: "この字幕トラックのすべてのクリップに一括適用します",
				ko: "이 자막 트랙의 모든 클립에 일괄 적용됩니다",
			}),
			selectAll: pick({ en: "Select Track", zhHant: "全選圖層", zhHans: "全选图层", ja: "全選択", ko: "전체 선택" }),
			visualDesign: pick({ en: "Visual Design", zhHant: "選擇字幕視覺設計", zhHans: "选择字幕视觉设计", ja: "ビジュアルデザイン", ko: "비주얼 디자인" }),
			chooseStyle: pick({ en: "Choose Subtitle Style", zhHant: "選擇字幕視覺設計", zhHans: "选择字幕视觉设计", ja: "字幕スタイルを選択", ko: "자막 스타일 선택" }),
			stylesCount: (count: number) =>
				pick({
					en: `${count} styles ▸`,
					zhHant: `${count} 款 ▸`,
					zhHans: `${count} 款 ▸`,
					ja: `${count} 種類 ▸`,
					ko: `${count}종 ▸`,
				}),
			fontFamily: pick({ en: "Font Family", zhHant: "字體類型", zhHans: "字体类型", ja: "フォント", ko: "글꼴" }),
			fontSize: pick({ en: "Font Size", zhHant: "字體大小", zhHans: "字体大小", ja: "フォントサイズ", ko: "글꼴 크기" }),
			position: pick({ en: "Position", zhHant: "上下位置", zhHans: "上下位置", ja: "位置", ko: "위치" }),
			verticalY: pick({ en: "Vertical Y", zhHant: "垂直座標", zhHans: "垂直坐标", ja: "垂直位置 Y", ko: "수직 위치 Y" }),
			posTop: pick({ en: "Top", zhHant: "置頂", zhHans: "置顶", ja: "上", ko: "상단" }),
			posCenter: pick({ en: "Lower-Mid", zhHant: "中下", zhHans: "中下", ja: "中央下", ko: "중앙 하단" }),
			posBottom: pick({ en: "Bottom", zhHant: "置底", zhHans: "置底", ja: "下", ko: "하단" }),
			stripShape: pick({ en: "Strip Shape", zhHant: "字卡底條形狀", zhHans: "字卡底条形状", ja: "背景シェイプ", ko: "배경 모양" }),
			duoColors: pick({ en: "Duo Colors", zhHant: "雙色主題與配色", zhHans: "双色主题与配色", ja: "デュオカラー", ko: "듀오 컬러" }),
			strip1Bg: pick({ en: "Line 1 Strip", zhHant: "上行底色", zhHans: "上行底色", ja: "1行目の背景", ko: "1행 배경색" }),
			strip2Bg: pick({ en: "Line 2 Strip", zhHant: "下行底色", zhHans: "下行底色", ja: "2行目の背景", ko: "2행 배경색" }),
			text1Color: pick({ en: "Line 1 Text", zhHant: "上行字色", zhHans: "上行字色", ja: "1行目の文字", ko: "1행 글자색" }),
			text2Color: pick({ en: "Line 2 Text", zhHant: "下行字色", zhHans: "下行字色", ja: "2行目の文字", ko: "2행 글자색" }),
			applyToTrack: pick({ en: "Apply to Track", zhHant: "套用至全軌字幕", zhHans: "套用至全轨字幕", ja: "トラック全体に適用", ko: "트랙 전체에 적용" }),
			applyingToTrack: pick({ en: "Applying…", zhHant: "套用中…", zhHans: "套用中…", ja: "適用中…", ko: "적용 중…" }),
			trackBadge: pick({ en: "Subtitles", zhHant: "字幕圖層", zhHans: "字幕图层", ja: "字幕トラック", ko: "자막 트랙" }),
			trackBadgeTooltip: pick({
				en: "Click to select all subtitles on this track (move or restyle together)",
				zhHant: "點擊選擇成條字幕圖層 (一次過上下移動或改顏色)",
				zhHans: "点击选择整条字幕图层 (一次过上下移动或改颜色)",
				ja: "クリックして字幕トラック全体を選択（一括移動・スタイル変更）",
				ko: "클릭하여 자막 트랙 전체 선택 (일괄 이동 및 스타일 변경)",
			}),
			tabLabel: pick({ en: "Subtitle Track", zhHant: "字幕全軌", zhHans: "字幕全轨", ja: "字幕トラック", ko: "자막 트랙" }),
		},
		stock: {
			title: pick({ en: "Stock B-Roll Media", zhHant: "免費插圖與影片素材 · B-Roll", zhHans: "免费插图与视频素材 · B-Roll", ja: "無料B-Roll素材", ko: "무료 B-Roll 미디어" }),
			subtitle: pick({
				en: "Search free photos and videos to overlay above the main track",
				zhHant: "輸入關鍵字搜尋免費圖片／影片，加插到主軌上方",
				zhHans: "输入关键字搜索免费图片／视频，加插到主轨上方",
				ja: "キーワードで無料画像・動画を検索してメイントラック上に配置",
				ko: "키워드로 무료 이미지/영상을 검색하여 메인 트랙 위에 오버레이",
			}),
			searchPlaceholder: pick({
				en: "Search stock media (e.g. office, chart, AI, coffee)…",
				zhHant: "搜尋素材（如 office, chart, AI, coffee）…",
				zhHans: "搜索素材（如 office, chart, AI, coffee）…",
				ja: "素材を検索 (例: office, chart, AI)…",
				ko: "미디어 검색 (예: office, chart, AI)…",
			}),
			searchBtn: pick({ en: "Search", zhHant: "搜尋", zhHans: "搜索", ja: "検索", ko: "검색" }),
			filterAll: pick({ en: "All", zhHant: "全部", zhHans: "全部", ja: "すべて", ko: "전체" }),
			filterImage: pick({ en: "Images", zhHant: "圖片", zhHans: "图片", ja: "画像", ko: "이미지" }),
			filterVideo: pick({ en: "Videos", zhHant: "影片", zhHans: "视频", ja: "動画", ko: "동영상" }),
			layoutPip: pick({ en: "Card PiP", zhHant: "避臉插圖卡 PiP", zhHans: "避脸插图卡 PiP", ja: "カード PiP", ko: "카드 PiP" }),
			layoutCover: pick({ en: "Full Cover", zhHant: "滿版覆蓋 Full", zhHans: "满版覆盖 Full", ja: "フル画面", ko: "전체 화면" }),
			searching: pick({ en: "Searching free stock media…", zhHant: "正在搜尋免費素材…", zhHans: "正在搜索免费素材…", ja: "無料素材を検索中…", ko: "무료 미디어 검색 중…" }),
			noResults: pick({
				en: "No matching media found. Try English keywords (e.g. chart, startup, phone).",
				zhHant: "找不到符合的素材，請試試英文關鍵字（例如 chart, startup, phone）",
				zhHans: "找不到符合的素材，请试试英文关键字（例如 chart, startup, phone）",
				ja: "一致する素材が見つかりません。英語キーワードをお試しください。",
				ko: "일치하는 미디어가 없습니다. 영어 키워드로 검색해 보세요.",
			}),
			addOverlay: pick({ en: "+ Overlay", zhHant: "+ 加插 Overlay", zhHans: "+ 加插 Overlay", ja: "+ オーバーレイ", ko: "+ 오버레이" }),
			addingOverlay: pick({ en: "Adding…", zhHant: "加入中…", zhHans: "加入中…", ja: "追加中…", ko: "추가 중…" }),
		},
		sfx: {
			tabSfx: pick({ en: "Sound Effects", zhHant: "SFX 聲效", zhHans: "SFX 音效", ja: "効果音 SFX", ko: "효과음 SFX" }),
			tabSaved: pick({ en: "Saved", zhHant: "Saved 收藏", zhHans: "Saved 收藏", ja: "保存済み", ko: "저장됨" }),
			searchPlaceholder: pick({ en: "Search sound effects...", zhHant: "搜尋聲效...", zhHans: "搜索音效...", ja: "効果音を検索...", ko: "효과음 검색..." }),
			searchBtn: pick({ en: "Search", zhHant: "搜尋", zhHans: "搜索", ja: "検索", ko: "검색" }),
			loading: pick({ en: "Loading sound effects…", zhHant: "載入聲效中…", zhHans: "载入音效中…", ja: "効果音を読み込み中…", ko: "효과음 불러오는 중…" }),
			searching: pick({ en: "Searching sound effects…", zhHant: "搜尋聲效中…", zhHans: "搜索音效中…", ja: "効果音を検索中…", ko: "효과음 검색 중…" }),
			noSaved: pick({ en: "No saved sounds", zhHant: "尚未收藏任何聲效", zhHans: "尚未收藏任何音效", ja: "保存された効果音はありません", ko: "저장된 효과음이 없습니다" }),
			noSavedHint: pick({ en: "Click the heart icon on any sound to save it here", zhHant: "撳聲效旁邊嘅愛心即可收藏到呢度", zhHans: "点击音效旁边的爱心即可收藏到这里", ja: "ハートアイコンをクリックして保存できます", ko: "하트 아이콘을 눌러 효과음을 저장하세요" }),
		},
		bgm: {
			title: pick({ en: "Background Music · BGM", zhHant: "背景音樂 · BGM Library", zhHans: "背景音乐 · BGM Library", ja: "BGM ライブラリ", ko: "배경음악 · BGM" }),
			subtitle: pick({
				en: "Royalty-free instrumental tracks · Click to preview or lay under your video",
				zhHant: "免版權商用純音樂 · 點擊試聽或一鍵鋪底",
				zhHans: "免版权商用纯音乐 · 点击试听或一键铺底",
				ja: "ロイヤリティフリーBGM · 試聴してワンクリックで配置",
				ko: "로열티 프리 배경음악 · 미리듣기 및 원클릭 배치",
			}),
			explore: (count: string | number) =>
				pick({
					en: `Explore (${count})`,
					zhHant: `探索 (${count})`,
					zhHans: `探索 (${count})`,
					ja: `探す (${count})`,
					ko: `탐색 (${count})`,
				}),
			saved: (count: number) =>
				pick({
					en: `Saved (${count})`,
					zhHant: `收藏 (${count})`,
					zhHans: `收藏 (${count})`,
					ja: `保存済み (${count})`,
					ko: `저장됨 (${count})`,
				}),
			searchPlaceholder: pick({
				en: "Search mood or instrument (e.g. synth, chill, piano, guitar)…",
				zhHant: "搜尋曲風或樂器（如 synth, chill, piano, guitar）…",
				zhHans: "搜索曲风或乐器（如 synth, chill, piano, guitar）…",
				ja: "ジャンルや楽器を検索 (例: synth, chill, piano)…",
				ko: "분위기 또는 악기 검색 (예: synth, chill, piano)…",
			}),
			searchBtn: pick({ en: "Search", zhHant: "搜尋", zhHans: "搜索", ja: "検索", ko: "검색" }),
			loading: pick({ en: "Loading tracks…", zhHant: "載入曲目中…", zhHans: "载入曲目中…", ja: "トラックを読み込み中…", ko: "트랙 불러오는 중…" }),
			noSaved: pick({ en: "No saved BGM tracks yet", zhHant: "尚未收藏任何背景音樂", zhHans: "尚未收藏任何背景音乐", ja: "保存されたBGMはありません", ko: "저장된 배경음악이 없습니다" }),
			noResults: pick({ en: "No matching BGM tracks found", zhHant: "找不到符合的背景音樂", zhHans: "找不到符合的背景音乐", ja: "一致するBGMが見つかりません", ko: "일치하는 배경음악이 없습니다" }),
			noSavedHint: pick({ en: "Click the heart icon in Explore to save favorite tracks", zhHant: "喺「探索」列表撳愛心即可儲存常用配樂", zhHans: "在“探索”列表点击爱心即可保存常用配乐", ja: "ハートアイコンをクリックして保存できます", ko: "탐색 목록에서 하트를 눌러 자주 쓰는 음악을 저장하세요" }),
			noResultsHint: pick({ en: "Try English keywords like ambient, synth, or piano", zhHant: "請試試其他英文關鍵字（如 ambient, synth, piano）", zhHans: "请试试其他英文关键字（如 ambient, synth, piano）", ja: "ambient、synth、piano などの英語キーワードをお試しください", ko: "ambient, synth, piano 등 영어 키워드를 입력해 보세요" }),
			applyBgm: pick({ en: "Use", zhHant: "鋪底", zhHans: "铺底", ja: "適用", ko: "적용" }),
			addingBgm: pick({ en: "Adding…", zhHant: "加入中…", zhHans: "加入中…", ja: "追加中…", ko: "추가 중…" }),
			loadMore: pick({ en: "Load More Tracks", zhHant: "載入更多背景音樂", zhHans: "载入更多背景音乐", ja: "さらに読み込む", ko: "더 불러오기" }),
			loadingMore: pick({ en: "Loading more…", zhHant: "載入更多中…", zhHans: "载入更多中…", ja: "読み込み中…", ko: "불러오는 중…" }),
		},
		inspector: {
			title: pick({ en: "Inspector", zhHant: "屬性檢查器", zhHans: "属性检查器", ja: "インスペクター", ko: "인스펙터" }),
			emptyTitle: pick({ en: "Nothing selected", zhHant: "尚未選取元素", zhHans: "尚未选取元素", ja: "未選択", ko: "선택된 항목 없음" }),
			emptyDesc: pick({
				en: "Click an element on the timeline to edit its properties",
				zhHant: "點選時間軸上嘅片段或字幕即可編輯屬性",
				zhHans: "点选时间轴上的片段或字幕即可编辑属性",
				ja: "タイムライン上の要素をクリックしてプロパティを編集します",
				ko: "타임라인에서 요소를 클릭하여 속성을 편집하세요",
			}),
			elementsSelected: (count: number) =>
				pick({
					en: `${count} elements selected`,
					zhHant: `已選取 ${count} 個元素`,
					zhHans: `已选取 ${count} 个元素`,
					ja: `${count} 個の要素を選択中`,
					ko: `${count}개 요소 선택됨`,
				}),
			selected: pick({ en: "Selected", zhHant: "已選片段", zhHans: "已选片段", ja: "選択中", ko: "선택됨" }),
			stage: pick({ en: "Stage", zhHant: "進度狀態", zhHans: "进度状态", ja: "ステータス", ko: "상태" }),
			edit: pick({ en: "Edit", zhHant: "重繪畫格", zhHans: "重绘画格", ja: "フレーム編集", ko: "프레임 편집" }),
			start: pick({ en: "Start", zhHant: "開頭", zhHans: "开头", ja: "開始", ko: "시작" }),
			end: pick({ en: "End", zhHant: "結尾", zhHans: "结尾", ja: "終了", ko: "끝" }),
			redrawStart: pick({ en: "Redraw start", zhHant: "重畫開頭", zhHans: "重画开头", ja: "開始フレーム再生成", ko: "시작 프레임 다시 그리기" }),
			redrawEnd: pick({ en: "Redraw end", zhHant: "重畫結尾", zhHans: "重画结尾", ja: "終了フレーム再生成", ko: "끝 프레임 다시 그리기" }),
			redrawEndClipStart: (n: number) =>
				pick({
					en: `Redraw end · Clip ${n} start`,
					zhHant: `重畫結尾 · Clip ${n} 開頭`,
					zhHans: `重画结尾 · Clip ${n} 开头`,
					ja: `終了再生成 · Clip ${n} 開始`,
					ko: `끝 다시 그리기 · Clip ${n} 시작`,
				}),
			editWithAi: pick({ en: "Edit with AI", zhHant: "用 AI 修改呢段分鏡", zhHans: "用 AI 修改这段分镜", ja: "AIで編集", ko: "AI로 편집" }),
			describeChange: pick({ en: "Describe the change", zhHant: "輸入你想修改嘅畫面或動作…", zhHans: "输入你想修改的画面或动作…", ja: "変更内容を入力…", ko: "변경할 내용을 입력하세요…" }),
			send: pick({ en: "Send", zhHant: "送出", zhHans: "发送", ja: "送信", ko: "보내기" }),
			updated: pick({ en: "Updated", zhHant: "已更新", zhHans: "已更新", ja: "更新しました", ko: "업데이트됨" }),
			updateFailed: pick({ en: "Could not update this clip", zhHant: "無法更新呢段分鏡", zhHans: "无法更新这段分镜", ja: "更新できませんでした", ko: "클립을 업데이트할 수 없습니다" }),
			generateFrames: (cost?: number) =>
				pick({
					en: `Generate frames${cost ? ` · ${cost}` : ""}`,
					zhHant: `產生場景圖${cost ? ` · ${cost}` : ""}`,
					zhHans: `生成场景图${cost ? ` · ${cost}` : ""}`,
					ja: `フレーム生成${cost ? ` · ${cost}` : ""}`,
					ko: `프레임 생성${cost ? ` · ${cost}` : ""}`,
				}),
			redrawFrames: (cost?: number) =>
				pick({
					en: `Redraw frames${cost ? ` · ${cost}` : ""}`,
					zhHant: `重畫場景圖${cost ? ` · ${cost}` : ""}`,
					zhHans: `重画场景图${cost ? ` · ${cost}` : ""}`,
					ja: `フレーム再生成${cost ? ` · ${cost}` : ""}`,
					ko: `프레임 다시 그리기${cost ? ` · ${cost}` : ""}`,
				}),
			drawing: pick({ en: "Drawing…", zhHant: "繪製中…", zhHans: "绘制中…", ja: "描画中…", ko: "그리는 중…" }),
			drawingFrames: pick({ en: "Drawing frames…", zhHant: "正在繪製場景圖…", zhHans: "正在绘制场景图…", ja: "フレームを描画中…", ko: "프레임 그리는 중…" }),
			generateVideo: (cost?: number) =>
				pick({
					en: `Generate video${cost ? ` · ${cost}` : ""}`,
					zhHant: `產生影片${cost ? ` · ${cost}` : ""}`,
					zhHans: `生成视频${cost ? ` · ${cost}` : ""}`,
					ja: `動画を生成${cost ? ` · ${cost}` : ""}`,
					ko: `동영상 생성${cost ? ` · ${cost}` : ""}`,
				}),
			regenerateVideo: (cost?: number) =>
				pick({
					en: `Regenerate video${cost ? ` · ${cost}` : ""}`,
					zhHant: `重新產生影片${cost ? ` · ${cost}` : ""}`,
					zhHans: `重新生成视频${cost ? ` · ${cost}` : ""}`,
					ja: `動画を再生成${cost ? ` · ${cost}` : ""}`,
					ko: `동영상 다시 생성${cost ? ` · ${cost}` : ""}`,
				}),
			rendering: pick({ en: "Rendering…", zhHant: "產生影片中…", zhHans: "生成视频中…", ja: "レンダリング中…", ko: "렌더링 중…" }),
			renderingVideo: pick({ en: "Generating video…", zhHant: "正在產生影片…", zhHans: "正在生成视频…", ja: "動画を生成中…", ko: "동영상 생성 중…" }),
			queuedVideo: pick({ en: "Queued video…", zhHant: "影片排隊中…", zhHans: "视频排队中…", ja: "動画キュー待機中…", ko: "동영상 대기열…" }),
			cancelQueuedVideo: pick({ en: "Cancel queued video", zhHant: "取消排隊中嘅影片", zhHans: "取消排队中的视频", ja: "待機中の動画をキャンセル", ko: "대기 중인 동영상 취소" }),
			stageLabels: {
				awaiting_frames: pick({ en: "Waiting for stills", zhHant: "等待場景圖", zhHans: "等待场景图", ja: "静止画待ち", ko: "스틸 대기 중" }),
				frames_generating: pick({ en: "Drawing stills", zhHant: "繪製場景圖中", zhHans: "绘制场景图中", ja: "静止画を描画中", ko: "스틸 그리는 중" }),
				frames_ready: pick({ en: "Stills ready", zhHant: "場景圖已就緒", zhHans: "场景图已就绪", ja: "静止画完了", ko: "스틸 준비됨" }),
				video_generating: pick({ en: "Rendering video", zhHant: "產生影片中", zhHans: "生成视频中", ja: "動画生成中", ko: "동영상 생성 중" }),
				video_ready: pick({ en: "Video ready", zhHant: "影片已完成", zhHans: "视频已完成", ja: "動画完了", ko: "동영상 준비됨" }),
				failed: pick({ en: "Failed", zhHant: "失敗", zhHans: "失败", ja: "失敗", ko: "실패" }),
			} satisfies Record<ScroVideoUiStage, string>,
		},
		settings: {
			projectInfo: pick({ en: "Project info", zhHant: "專案資訊", zhHans: "项目信息", ja: "プロジェクト情報", ko: "프로젝트 정보" }),
			background: pick({ en: "Background", zhHant: "背景設定", zhHans: "背景设置", ja: "背景", ko: "배경" }),
			name: pick({ en: "Name", zhHant: "名稱", zhHans: "名称", ja: "名前", ko: "이름" }),
			frameRate: pick({ en: "Frame rate", zhHant: "影格率 (FPS)", zhHans: "帧率 (FPS)", ja: "フレームレート", ko: "프레임 속도" }),
			aspectRatio: pick({ en: "Aspect ratio", zhHant: "畫面比例", zhHans: "画面比例", ja: "アスペクト比", ko: "화면 비율" }),
			custom: pick({ en: "Custom", zhHant: "自訂", zhHans: "自定义", ja: "カスタム", ko: "사용자 지정" }),
			blur: pick({ en: "Blur", zhHant: "模糊底圖", zhHans: "模糊底图", ja: "ぼかし", ko: "블러" }),
			colors: pick({ en: "Colors", zhHant: "純色背景", zhHans: "纯色背景", ja: "カラー", ko: "색상" }),
		},
	};
}

export function useOpencutI18n() {
	let locale = "en";
	try {
		const ctx = useI18n();
		locale = ctx.locale;
	} catch {
		locale = "en";
	}
	return {
		locale,
		oc: getOpencutMessages(locale),
	};
}
