import type { Metadata } from "next";
import { MomentCard } from "@/components/moment-card";
import { ClipCard, SectionHead } from "@/components/ui";
import { match, site } from "@/lib/data";
import { winner, winTag } from "@/lib/format";

export const metadata: Metadata = { title: "Highlights" };

export default async function Highlights({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = match(id);
  const team = site().team.name;
  const goals = m.goals.filter((g) => g.clip);
  const shots = m.timeline.filter((t) => t.kind === "shot" && t.clip);
  // our ball-winning moments, the critical ones (won in our third) first
  const wins = m.timeline.filter((t) => t.still).sort((a, b) => Number(!!b.critical) - Number(!!a.critical) || a.t - b.t);
  const critical = wins.filter((w) => w.critical).length;
  return (
    <div className="page">
      <section className="section">
        <SectionHead title="Goals" note={`Every goal on video, from the build-up to the finish.${m.goals_missing.us + m.goals_missing.them
          ? ` ${m.goals_missing.us + m.goals_missing.them} goals in the final score couldn't be found on the video.` : ""}`} />
        {goals.length ? (
          <div className="clips">
            {goals.map((g, i) => (
              <ClipCard key={i} clip={g.clip!} min={g.minute} title={g.team === 0 ? g.scorer?.name ?? team : m.opponent}
                sub={g.team === 0 ? (g.assist ? `assisted by ${g.assist.name}` : `for ${team}`) : "goal against"} />
            ))}
          </div>
        ) : <p className="muted">No goals on video.</p>}
      </section>
      {wins.length ? (
        <section className="section">
          <SectionHead title="Winning the ball"
            note={`Every tackle won and interception of ours. ${critical ? `${critical} were critical: won in our third, where losing it gives a chance away.` : ""}`} />
          <div className="moments-grid">
            {wins.map((w, i) => (
              <MomentCard key={i} still={w.still!} t={w.t} minute={w.minute} title={winner(w)} tag={winTag(w)} critical={!!w.critical}
                sub={w.kind === "tackle" ? `won it back from ${m.opponent}` : `cut out ${m.opponent}'s pass`} video={m.video} matchId={id} />
            ))}
          </div>
        </section>
      ) : null}
      {shots.length ? (
        <section className="section">
          <SectionHead title="Shots" />
          <div className="clips">
            {shots.map((t, i) => (
              <ClipCard key={i} clip={t.clip!} min={t.minute} title={t.from?.team === 0 ? t.from.name : m.opponent}
                sub={t.on_target ? "on target" : "off target"} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
