import type { Metadata } from "next";
import { SectionHead } from "@/components/ui";
import { matches, site } from "@/lib/data";

export const metadata: Metadata = { title: "How it works" };

export default function About() {
  const s = site();
  const f = s.rating_formula;
  const ms = matches();
  const checked = ms.reduce((a, m) => a + m.review.checked, 0), total = ms.reduce((a, m) => a + m.review.events, 0);
  const byClaude = ms.reduce((a, m) => a + (m.review.claude || 0), 0);
  const goals = ms.reduce((a, m) => a + m.review.goals, 0), goalsChecked = ms.reduce((a, m) => a + m.review.goals_checked, 0);
  return (
    <main className="wrap page">
      <section className="section prose">
        <h1>How it works</h1>
        <p className="lede">
          Every number here comes from our own match video. A tracking system follows every player and the ball, names our
          players from their shirts, and finds the moments that matter: passes, interceptions, tackles, shots and goals. A
          second model watches each of our moments again and flags the ones it disagrees with, and those are checked one
          by one before they count: by someone from the team, or by Claude looking closely at the video.
        </p>
        <h2>What counts</h2>
        <ul>
          <li>Only moments the system is sure of, or that were checked one by one. Anything still waiting for a check is left out until it&apos;s decided.</li>
          <li>{goalsChecked} of {goals} goals have been checked by hand, including who scored and who assisted.</li>
          <li>{checked} of {total} of our moments have been checked by hand{byClaude ? <>, and {byClaude} more by Claude from the video</> : null}.</li>
          <li>The other team&apos;s numbers are as the system saw them and aren&apos;t checked.</li>
          <li>Running (distance, speed, sprints) is measured while a player is in shot, then scaled to their minutes. Top speed is the fastest held for a full second.</li>
        </ul>
        {f ? (
          <>
            <h2>How ratings work</h2>
            <p>
              Every action is worth points: good ones add, mistakes take away. A player&apos;s points are compared with what the
              team&apos;s average player makes in the same time on camera, and a player who keeps up the average gets
              {" "}{f.baseline.toFixed(1)}. More impact over more time counts for more. A curve keeps ratings between
              {" "}{(f.baseline - f.spread).toFixed(1)} and {(f.baseline + f.spread).toFixed(1)}, and makes them harder to raise the higher they
              are. Players need {f.min_minutes} minutes to be rated, and keepers aren&apos;t rated yet because saves aren&apos;t measured.
            </p>
            {f.sure ? (
              <p>
                Points count for how sure we are of each moment: in full when someone from the team checked it,
                {" "}{Math.round(100 * f.sure.claude)}% when Claude decided it from the video, and {Math.round(100 * f.sure.auto)}% for
                {" "}the system&apos;s own call that nobody has checked yet. Moments still waiting for a check don&apos;t count; the
                {" "}± beside a rating shows how far it could move once they&apos;re checked.
              </p>
            ) : null}
            <p>Every rating on the site can be opened line by line, with a link to watch each moment behind it.</p>
          </>
        ) : null}
      </section>
      {f ? (
        <section className="section">
          <SectionHead title="Points for each action" note="Our third is the third of the pitch nearest our own goal: winning the ball there stops a chance, losing it there gives one away." />
          <div className="points-table">
            {f.sections.map((sec) => (
              <div key={sec}>
                <h3>{sec}</h3>
                <ul>
                  {f.actions.filter((a) => a.section === sec).map((a) => (
                    <li key={a.key}><span>{a.label}</span><b className={a.each < 0 ? "neg" : "pos"}>{a.each > 0 ? "+" : "−"}{Math.abs(a.each)}</b></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="section prose">
        <h2>Spotted a mistake?</h2>
        <p>Tell whoever runs the site the minute and what really happened. It gets fixed at the source and shows up on the next update.</p>
      </section>
    </main>
  );
}
