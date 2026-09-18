import type { Messages } from "./types";

export const ko: Partial<Messages> = {
  meta: { title: "Explainer — 설명 영상", description: "아이디어를 Reels, 마케팅 clips, 프레젠테이션 영상으로 만드세요. 스타일을 고르고 스토리보드를 승인한 뒤 clips 을 내보낼 수 있습니다." },
  nav: { projects: "프로젝트", characters: "캐릭터", billing: "결제", pricing: "요금제", signIn: "로그인", workspace: "작업 공간", language: "언어" },
  common: { credits: "credits", perMonth: "/월", cancel: "취소", save: "저장", close: "닫기", create: "만들기", loading: "불러오는 중…", popular: "가장 인기 있음", subscribe: "구독" },
  landing: {
    hero: { kicker: "Explainer", title: "아이디어를 Reels, 마케팅, 프레젠테이션 영상으로 명확하게 설명하세요.", subtitle: "스타일을 고르고 스토리보드를 승인한 뒤 clips 을 내보내세요. 숏폼 영상, 제품 마케팅, 프레젠테이션에 활용할 수 있습니다.", ctaStart: "시작하기", ctaWorkspace: "작업 공간 열기", ctaPricing: "요금제 보기", artLabel: "스토리보드 및 편집 콘셉트 일러스트" },
    steps: {
      step1Title: "스타일 선택", step1Body: "숏폼 영상, 마케팅, 프레젠테이션 등에 어울리는 연출 스타일을 선택하세요.",
      step2Title: "스토리보드 승인", step2Body: "AI가 제목, 도입부, 장면, 내레이션을 제안합니다. 만족할 때까지 편집하세요.",
      step3Title: "영상 내보내기", step3Body: "승인 후 Reels, 광고, 프레젠테이션용 캐릭터 스틸 이미지와 clips 을 생성합니다.",
    },
    pricing: { title: "구독하고 영상 렌더링하기", subtitle: "clip 하나당 3 credits가 사용됩니다(시작 프레임, 종료 프레임, 렌더링). 스토리보드는 승인 전까지 무료입니다.", clipsApprox: "clips", subscribePlan: "{plan} 구독" },
  },
  dashboard: { title: "프로젝트", subscribed: "현재 요금제로 영상을 렌더링할 수 있습니다. {credits} credits 남음.", notSubscribed: "활성 구독이 없습니다. 스토리보드는 작성할 수 있지만 렌더링하려면 요금제가 필요합니다.", noSubscriptionBanner: "활성 구독이 없습니다.", goBilling: "결제 페이지로 이동" },
  folder: {
    create: "새 프로젝트", createTitle: "새 프로젝트", createHint: "먼저 이름을 정한 다음 영상을 추가하세요.", createSubmit: "프로젝트 만들기", nameLabel: "프로젝트 이름", namePlaceholder: "예: 4분기 제품 출시",
    emptyTitle: "아직 프로젝트가 없습니다", emptyBody: "먼저 캠페인 이름을 정한 다음 영상을 추가하세요.",
    noMatch: "일치하는 프로젝트가 없습니다. 다른 필터나 키워드를 사용해 보세요.",
    searchPlaceholder: "프로젝트 이름 또는 주제 검색…", searchLabel: "프로젝트 이름 또는 주제 검색", filterLabel: "상태 필터",
  },
  project: {
    steps: { input: "입력", scene: "장면", frames: "프레임", video: "영상" },
    status: { draft: "초안", phase_a: "스토리보드 작성 중", awaiting_approval: "스토리보드 검토", frames_generating: "프레임 렌더링 중", frames_ready: "프레임 검토", approved: "렌더링 준비 중", generating: "렌더링 중", ready: "완료", failed: "실패" },
    filters: { all: "전체", action: "조치 필요", active: "진행 중", ready: "완료", failed: "실패" },
  },
  characters: { title: "캐릭터", create: "새 캐릭터", empty: "아직 캐릭터가 없습니다." },
  billing: { title: "결제" },
  styles: { doodle: "화이트보드 낙서", "flat-vector": "플랫 벡터", "paper-cutout": "종이 오리기", chalkboard: "칠판", watercolor: "수채화 동화책", clay: "클레이 애니메이션", pixel: "픽셀 아트", "ink-manga": "먹선 만화", realistic: "시네마틱 실사" },
  plans: {
    starter: { name: "스타터", blurb: "월 30 credits(약 10 clips / 숏폼 영상 2개). Reels 를 시험해 보기에 좋습니다." },
    pro: { name: "프로", blurb: "월 90 credits(약 30 clips). 마케팅과 프레젠테이션 콘텐츠를 꾸준히 제작하세요." },
    studio: { name: "스튜디오", blurb: "월 200 credits(약 66 clips). 매주 콘텐츠를 제작하는 소규모 팀에 적합합니다." },
    scale: { name: "스케일", blurb: "월 400 credits(약 133 clips). 대량 제작에 적합합니다." },
  },
} as unknown as Messages;
