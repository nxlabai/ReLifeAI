// 오프닝·문제 제기·기대효과·엔딩 타이틀 카드 (영상 전용 HTML, 서비스 코드와 무관)
const base = (body, extra = "") => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1920px;height:1080px;overflow:hidden;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;background:linear-gradient(135deg,#1f5e52 0%,#2a7a72 60%,#2f8a83 100%);color:#fff;display:flex;align-items:center;justify-content:center}
.wrap{width:1500px;opacity:0;transform:translateY(24px);animation:in .9s ease-out .2s forwards}
@keyframes in{to{opacity:1;transform:none}}
.logo{display:inline-flex;align-items:center;gap:18px;font-size:44px;font-weight:800}
.logo i{display:grid;place-items:center;width:76px;height:76px;border-radius:20px;background:#fff;color:#1f5e52;font-style:normal;font-size:40px}
.logo b{color:#ffc78f}
h1{font-size:82px;line-height:1.25;font-weight:800;margin-top:36px;letter-spacing:-1px}
h1 em{font-style:normal;color:#ffc78f}
.sub{font-size:34px;opacity:.92;margin-top:26px;line-height:1.5}
.tag{display:inline-block;margin-top:40px;padding:12px 26px;border-radius:999px;background:rgba(255,255,255,.16);font-size:28px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:46px}
.chip{background:rgba(255,255,255,.14);border-radius:22px;padding:26px 24px;font-size:28px;line-height:1.45;opacity:0;animation:in .6s ease-out forwards}
.chip b{display:block;font-size:31px;color:#ffc78f;margin-bottom:8px}
.pain{margin-top:44px;display:flex;flex-direction:column;gap:20px}
.pain div{font-size:36px;background:rgba(0,0,0,.18);border-left:8px solid #ffb27a;padding:18px 28px;border-radius:14px;opacity:0;animation:in .6s ease-out forwards}
${extra}
</style></head><body><div class="wrap">${body}</div></body></html>`;

const logo = `<div class="logo"><i>🌱</i><span>Re:Life <b>AI</b></span></div>`;

export const openingCard = () =>
  base(`${logo}<h1>당신의 경험을 새로운 가능성으로,<br><em>인생 2막</em>을 설계하다</h1>
  <p class="sub">40대 이후 중장년을 위한 생애전환 AI Agent<br>진단 → 조사 → 전략 → 실행 로드맵 → 코치</p>
  <span class="tag">Powered by Liner Deep Research Agent API</span>`);

export const problemCard = () =>
  base(`<p class="sub" style="margin:0;font-weight:700;color:#ffc78f">문제 제기</p>
  <h1 style="margin-top:14px">인생 2막을 준비하는 중장년,<br>정보는 많은데 <em>내게 맞는 길</em>이 보이지 않습니다</h1>
  <div class="pain">
    <div style="animation-delay:.9s">고용24 · 중장년내일센터 · K-MOOC · 큐넷 · 국민연금공단 · K-Startup … 10곳 이상을 직접 찾아 비교</div>
    <div style="animation-delay:1.6s">나이 · 지역 · 경력 · 생활비에 따라 신청 자격과 우선순위가 달라 판단이 어려움</div>
    <div style="animation-delay:2.3s">정보를 찾아도 모집 기간을 놓치거나 실행 계획으로 이어지지 않음</div>
  </div>`);

export const impactCard = () =>
  base(`<p class="sub" style="margin:0;font-weight:700;color:#ffc78f">기대효과 및 확장성</p>
  <h1 style="margin-top:14px;font-size:70px">흩어진 정보 탐색을 <em>한 번의 맞춤 리서치</em>와<br>실행 계획으로</h1>
  <div class="grid">
    <div class="chip" style="animation-delay:.8s"><b>공식 출처 근거</b>인용 번호와 출처 원문 연결, 모집 상태 구분</div>
    <div class="chip" style="animation-delay:1.1s"><b>비용 관리</b>보고서 1건당 Liner 호출 1회, 결과 캐시·호출 제한</div>
    <div class="chip" style="animation-delay:1.4s"><b>개인정보 보호</b>동의 후 익명화·최소화 전송, 본인 데이터만 접근</div>
    <div class="chip" style="animation-delay:1.7s"><b>확장</b>중장년내일센터 상담 · 기업 전직지원 · 평생교육원 · 다른 생애전환 대상</div>
  </div>`);

export const endingCard = () =>
  base(`<div style="text-align:center">${logo}<h1 style="font-size:76px">당신의 경험을 새로운 가능성으로</h1>
  <p class="sub">https://relife-ai-lemon.vercel.app</p>
  <span class="tag">Liner Deep Research Agent API 기반 생애전환 AI Agent</span></div>`);
