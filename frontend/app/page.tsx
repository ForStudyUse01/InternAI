import { HomepageBackground } from "@/components/home/HomepageBackground";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  HomepageAudience,
  HomepageCapabilities,
  HomepageCoachPreview,
  HomepageFinalCta,
  HomepageHero,
  HomepageStoryScroll
} from "@/components/home/v2/homepage-sections";
import "./homepage.css";
import "./homepage-story.css";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="internai-home min-h-screen overflow-x-clip focus:outline-none">
      <HomepageBackground />

      <div className="internai-home-content">
        <Navbar theme="dark" />

        <div className="hp-main">
          <HomepageHero />
          <HomepageStoryScroll />
          <HomepageCapabilities />
          <HomepageCoachPreview />
          <HomepageAudience />
          <HomepageFinalCta />
        </div>

        <Footer theme="dark" />
      </div>
    </main>
  );
}
