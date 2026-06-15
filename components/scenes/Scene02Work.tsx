"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { ShinyText } from "@/components/visual-effects/ShinyText";
import { TiltedCard } from "@/components/visual-effects/TiltedCard";
import { WorkCardThumb } from "@/components/scenes/WorkCardArt";
import { WorkCaseStudyModal, type WorkCaseStudy } from "@/components/scenes/WorkCaseStudyModal";
import type { SceneRenderContext } from "@/types/spatial";

const projects: WorkCaseStudy[] = [
  {
    title: "ExaCache GTM & Site Redesign",
    category: "AI infra positioning · full website redesign",
    year: "2024",
    art: "velocity",
    image: "/exacache-hero.png",
    summary:
      "I led positioning for ExaCache — an S3 caching layer that sits on GPU clusters to cut input stalls and recover wasted GPU spend — using AI-enabled workflows to land the strategic brief and messaging in under two days. I then redesigned the company website (tpc.cloud) end to end: information architecture, all copy, and a branded visual system aimed at enterprise buyers.",
  },
  {
    title: "Dell Financial Services",
    category: "+$104M new revenue · 500K customers acquired",
    year: "2023",
    art: "revenue",
    image: "/dfs.png",
    summary:
      "As Merchandising Lead for Consumer & SMB North America, I directed integrated portfolio promotions and campaigns across multibillion-dollar OEM financial services channels. By optimizing buyer journeys, loyalty programs, and customer incentives, the work raised over $104M in new-accounts revenue and acquired roughly 500,000 new customers.",
  },
  {
    title: "Premium Financing Launches",
    category: "+1,200 bps average financing penetration",
    year: "2022",
    art: "surge",
    image: "/alienware-financing.png",
    summary:
      "To fill seasonal gaps in a scaled-back campaign roadmap without eroding launch pricing, I made the business case for financing-exclusive promotions on premium releases — an exception to the standard 90-day post-launch discount ban. Piloting two Alienware models and one XPS, the campaigns drove an average +1,200 bps lift in financing penetration and scaled into the standard GTM playbook for dozens of premium launches over the next two years.",
  },
  {
    title: "Consumer Ecommerce Merchandising",
    category: "$76M portfolio · +20% YoY holiday margin",
    year: "2020",
    art: "gridUptick",
    image: "/accessories.png",
    summary:
      "As an Ecommerce Producer, I drove a $76M portfolio across eight hardware categories — producing sitewide campaigns, redesigning homepages around demand and profit, and optimizing discoverability for thousands of products. Owning Black Friday merchandising for the category delivered a +20% year-over-year margin gain on top of outperforming revenue targets.",
  },
  {
    title: "B2B Demand Gen Strategy",
    category: "Warm-outreach plan · high-intent enterprise leads",
    year: "2024",
    art: "funnel",
    image: "/demand-gen.webp",
    summary:
      "A consulting client needed to attract high-intent enterprise digital-transformation executives and book sales calls. I defined the campaign objectives — build awareness, attract leads, build trust — designed the lead-in and remarketing approach to fit their resources and timeline, and built a follow-up flow to nurture prospects from scheduling to meeting. Once implemented, the plan immediately drove engagement and generated several quality leads.",
  },
  {
    title: "Enterprise Lead List",
    category: "30 Fortune 500 decision-makers · CRM foundation",
    year: "2024",
    art: "network",
    image: "/lead-list.webp",
    summary:
      "To seed account-based outreach targeting CIOs, CTOs, and IT VPs focused on cloud transformation, I built a research strategy qualifying leads on IT budget, transformation readiness, recent news, connection strength, and job signals. Cross-referencing the client's network against market data, I curated a shortlist of 30 high-potential Fortune 500 decision-makers — complete with insights and engagement recommendations — that became the foundation of the firm's CRM.",
  },
  {
    title: "Alienware Arena Campaign",
    category: "63% coupon redemption · +480 bps financing",
    year: "2022",
    art: "redemption",
    image: "/arena.png",
    summary:
      "Analyzing traffic for a new Alienware launch, I found high-intent referral volume arriving from Alienware Arena, the brand's community hub. Partnering with its community manager, I designed a gamified campaign that used the site's rewards system to vend a financing-exclusive coupon for the model. The two-week campaign broke even in week one, hit a 63% coupon redemption rate, and lifted financing on the product by roughly 480 points.",
  },
  {
    title: "Dell Rewards Sign-Up Bonus",
    category: "Stabilized acquisition · +36% vs. business",
    year: "2022",
    art: "stabilize",
    image: "/bonus.jpg",
    summary:
      "When Dell cut back its Rewards program — including the 2x incentive on financed orders — financing customer acquisition was at risk. Recognizing that returning customers reliably reused financing, I reframed the problem as acquisition and proposed a leaner sign-up bonus for new finance accounts. I led the program changes end to end; the incentive halted the decline in weekly account openings and kept financed revenue outperforming the rest of the business by roughly 36%.",
  },
  {
    title: "Affiliate Channel Financing",
    category: "9x conversion vs. top transactional page",
    year: "2021",
    art: "multiplier",
    summary:
      "Breaking financing into the affiliate channel meant resolving a conflict: legal required regulatory language beside every promotion, while affiliates demanded a direct path to the product funnel and had no space for disclosures. I designed and launched a dedicated landing page that satisfied both — banner, promotional copy, disclosures, and product stacks. In its first month it converted 9x higher than Dell's top-performing transactional page and became a go-to destination for targeted financing campaigns.",
  },
  {
    title: "Black Friday PC Accessories",
    category: "Zero-error launch · +20% YoY margin",
    year: "2019",
    art: "flawless",
    summary:
      "For Dell's largest sales event of the year, I led all merchandising and digital execution for PC Accessories — coordinating hundreds of offers, managing campaign tracking, and overseeing real-time operations across teams. Every deal launched on time with zero errors, and the category drove a 20% year-over-year margin gain on top of outperforming its revenue targets.",
  },
  {
    title: "POS Attach Optimization",
    category: "+25% attach revenue · 2x growth target",
    year: "2017",
    art: "attach",
    summary:
      "Asked to create point-of-sale attach insights, I built a reporting framework exposing revenue-per-unit and attach rates by order code, model, family, and category. When no segment owners had bandwidth to act on the findings, I reconfigured hundreds of accessory assortments myself and authored the SOP for upkeep and future launches — delivering attach-rate and revenue-per-unit gains at roughly 2x the growth target. The reporting became standard practice across segments and earned a global sales award.",
  },
  {
    title: "Black Friday $6M Recovery",
    category: "Diagnosed in <2 hrs · $6M recovered · NA SB MVP",
    year: "2017",
    art: "rebound",
    summary:
      "During Black Friday, a broken coupon left Small Business customers unable to redeem offers on roughly 80 products at peak demand — with a 24-hour vendor SLA on the fix. Called in at midnight because I'd built the campaign logic, I traced the fault to a separate, misconfigured campaign suppressing mine, corrected it so both could run, and filed the RCA — all in under two hours, beating the SLA by 22 hours. Leadership sized the recovery at about $6M and the year's run of clean saves earned me NA SB MVP.",
  },
];

const PAGE_SIZE = 4;
const PAGE_COUNT = Math.ceil(projects.length / PAGE_SIZE);

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -40 : 40 }),
};

/**
 * A single project card. `tilt` wraps it in the pointer-driven TiltedCard
 * (desktop only); the flow page renders it flat. The clickable body and its
 * contents are identical in both layouts so the copy stays single-sourced.
 */
function WorkCard({
  project,
  focused,
  onSelect,
  tilt,
  index,
}: {
  project: WorkCaseStudy;
  focused: boolean;
  onSelect: (project: WorkCaseStudy) => void;
  tilt: boolean;
  index: number;
}): React.JSX.Element {
  const body = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(project);
        }
      }}
      aria-label={`Open ${project.title} case study`}
      className="group h-full cursor-pointer rounded-2xl border border-ink/[0.08] bg-ink/[0.03] p-5 transition-all duration-300 hover:border-ink/[0.15] hover:bg-ink/[0.05]"
      style={{
        // Fade in once the rail snaps the frame into focus; the per-card delay
        // lives only on the opacity transition so hover (border/bg) stays snappy.
        opacity: focused ? 1 : 0,
        transition: `opacity 0.9s ease ${focused ? index * 80 : 0}ms, border-color 0.2s, background-color 0.2s`,
      }}
    >
      <div className="relative mb-4 h-[110px] overflow-hidden rounded-xl bg-ink/[0.05]">
        <WorkCardThumb motif={project.art} image={project.image} title={project.title} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="font-display text-[14px] font-medium text-ink">
            {project.title}
          </h3>
          <span className="text-[12px] text-ink/35">{project.category}</span>
        </div>
        <span className="font-mono text-[11px] text-ink/20">{project.year}</span>
      </div>
    </div>
  );

  return tilt ? <TiltedCard>{body}</TiltedCard> : body;
}

function Chevron({ direction }: { direction: "left" | "right" }): React.JSX.Element {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

export function Scene02Work({ ctx }: { ctx: SceneRenderContext }): React.JSX.Element {
  // [pageIndex, slideDirection] — direction drives the enter/exit offset sign.
  const [[page, direction], setPage] = useState<[number, number]>([0, 0]);
  const [selected, setSelected] = useState<WorkCaseStudy | null>(null);
  const flow = ctx.layout === "flow";
  const focused = flow || ctx.focused;

  function paginate(dir: number): void {
    setPage(([prev]) => [(prev + dir + PAGE_COUNT) % PAGE_COUNT, dir]);
  }

  const start = page * PAGE_SIZE;
  const visible = projects.slice(start, start + PAGE_SIZE);

  // Mobile flow: the paginated carousel becomes one continuous, tappable list
  // of every project — traditional vertical scroll, no chevrons or tilt.
  if (flow) {
    return (
      <div className="relative w-full py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mb-8">
            <p className="mb-2 font-mono text-[22px] uppercase tracking-[0.3em] text-accent">
              <ShinyText text="Portfolio" />
            </p>
            <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-ink">
              Selected Works
            </h2>
            <span className="mt-1 block font-mono text-[13px] uppercase tracking-[0.25em] text-ink/25">
              2014 – Present
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {projects.map((project, i) => (
              <WorkCard
                key={project.title}
                project={project}
                focused={focused}
                onSelect={setSelected}
                tilt={false}
                index={i}
              />
            ))}
          </div>
        </div>

        <WorkCaseStudyModal project={selected} onClose={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-2 font-mono text-[22px] uppercase tracking-[0.3em] text-accent">
              <ShinyText text="Portfolio" />
            </p>
            <h2 className="font-display text-[40px] font-semibold tracking-[-0.022em] text-ink">
              Selected Works
            </h2>
          </div>
          <span className="mb-1 font-mono text-[22px] uppercase tracking-[0.25em] text-ink/25">
            2014 – Present
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => paginate(-1)}
            aria-label="Previous projects"
            className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 text-accent/70 transition-all duration-200 hover:scale-110 hover:text-accent sm:-left-10 lg:-left-14"
          >
            <Chevron direction="left" />
          </button>

          <button
            type="button"
            onClick={() => paginate(1)}
            aria-label="Next projects"
            className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 text-accent/70 transition-all duration-200 hover:scale-110 hover:text-accent sm:-right-10 lg:-right-14"
          >
            <Chevron direction="right" />
          </button>

          <div className="relative px-2 py-6">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={page}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2"
              >
                {visible.map((project, i) => (
                  <WorkCard
                    key={project.title}
                    project={project}
                    focused={ctx.focused}
                    onSelect={setSelected}
                    tilt
                    index={i}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: PAGE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(([prev]) => [i, i > prev ? 1 : -1])}
              aria-label={`Go to projects page ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === page ? "w-6 bg-ink/60" : "w-1.5 bg-ink/20 hover:bg-ink/35"
              }`}
            />
          ))}
        </div>
      </div>

      <WorkCaseStudyModal project={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
