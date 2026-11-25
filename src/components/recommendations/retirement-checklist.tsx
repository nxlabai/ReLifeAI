"use client";
import { useState } from "react";
import { ListPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/lib/data/store";
import { newId } from "@/lib/id";

const ITEMS = [
  { title: "국민연금 예상 수령액과 수령 시기 확인", url: "https://www.nps.or.kr" },
  { title: "퇴직연금·개인연금 적립 현황 확인 (통합연금포털)", url: "https://www.fss.or.kr" },
  { title: "은퇴 후 월 필수 생활비(주거·식비·의료·통신) 항목 정리" },
  { title: "건강보험 자격 변동(직장→지역가입) 확인" },
  { title: "소득 공백 기간과 비상자금 규모 점검" },
  { title: "여가·사회공헌·평생학습 활동 계획 세우기" },
];

export function RetirementChecklist() {
  const { upsertTask } = useAppData();
  const [added, setAdded] = useState<string[]>([]);
  return (
    <section className="mb-10 rounded-2xl bg-white p-5 ring-1 ring-border" aria-labelledby="ret-check">
      <h2 id="ret-check" className="text-xl font-bold">노후 준비 기본 점검표</h2>
      <p className="mt-1 text-[0.95rem] text-muted-foreground">필요한 항목을 실행 로드맵에 추가해 관리하세요.</p>
      <ul className="mt-4 divide-y">
        {ITEMS.map((it) => (
          <li key={it.title} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span>{it.title}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={added.includes(it.title)}
              onClick={async () => {
                await upsertTask({ id: newId(), title: it.title, category: "retirement", done: false, origin: "user", sourceUrl: it.url, createdAt: new Date().toISOString() });
                setAdded((a) => [...a, it.title]);
              }}
            >
              {added.includes(it.title) ? <Check aria-hidden /> : <ListPlus aria-hidden />} {added.includes(it.title) ? "추가됨" : "로드맵에 추가"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
