import { HomeHero, PurposeCards, HomeDashboard, DemoPersonas, HowItWorks } from "@/components/home/home-sections";
import { CoachFab } from "@/components/home/coach-fab";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        <HomeDashboard />
        <PurposeCards />
        <HowItWorks />
        <DemoPersonas />
      </div>
      <CoachFab />
    </>
  );
}
