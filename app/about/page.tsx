import type { Metadata } from "next";
import { matches, site } from "@/lib/data";

export const metadata: Metadata = { title: "How it works" };

export default function About() {
  const s = site();
  const f = s.rating_formula;
  const ms = matches();
  const checked = ms.reduce((a, m) => a + m.review.checked, 0), total = ms.reduce((a, m) => a + m.review.events, 0);
  const goals = ms.reduce((a, m) => a + m.review.goals, 0), goalsChecked = ms.reduce((a, m) => a + m.review.goals_checked, 0);
  const sections = f ? [...new Set(f.actions.map((a) => a.section))] : [];
  return (
    <main className="wrap">
      <div className="prose">
        <h1 style={{ fontSize: "2.4rem" }}>How it works</h1>
        <p>
          Every number here comes from our own match video. A tracking system follows every player and the ball,
          names our players from their shirts, and finds the moments that matter: passes, interceptions, tackles,
          shots and goals. A second model then watches each of our moments again and flags the ones it disagrees with,
          and someone from the team checks those by hand before they count.
        </p>
        <h2>What counts</h2>
        <ul>
          <li>Only moments the system is sure of, or that were checked by hand. Anything still waiting to be checked is left out until it is.</li>
          <li>{goalsChecked} of {goals} goals have been checked by hand, including who scored and who assisted.</li>
          <li>So far {checked} of {total} of our moments have been checked one by one.</li>
          <li>The other team&apos;s numbers are as the system saw them and aren&apos;t checked.</li>
          <li>Running (distance, speed, sprints) is measured while a player is in shot, then scaled to their minutes.</li>
        </ul>
        {f ? (
          <>
            <h2>How ratings work</h2>
            <p>
              Everyone starts at {f.baseline.toFixed(1)}. Each action is worth points, the points are scaled to an hour
              on the pitch, and that moves the rating up or down from there. Players need at least {f.min_minutes} minutes
              to be rated. Keepers aren&apos;t rated yet, because saves aren&apos;t measured.
            </p>
            {sections.map((sec) => (
              <div key={sec}>
                <h3 style={{ marginBottom: "0.4rem" }}>{sec}</h3>
                <ul>
                  {f.actions.filter((a) => a.section === sec).map((a) => (
                    <li key={a.key}>{a.label}: {a.each > 0 ? "+" : ""}{a.each} points each</li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : null}
        <h2>Spotted a mistake?</h2>
        <p>Tell the person who runs the site the minute and what really happened. It&apos;s fixed at the source and shows up on the next update.</p>
      </div>
    </main>
  );
}
