import type { Metadata } from "next";
import Link from "next/link";
import { TopicTabs, type Topic } from "@/components/topic-tabs";
import { chemistrySources } from "@/lib/chemistry";
import { ATTR_NOTES, type Attr } from "@/lib/cards";
import { matches, site } from "@/lib/data";
import { tvWeeks } from "@/lib/tv";
import { ASSIST_WEIGHT, LINK_CHEM, LINK_FULL, POS_CHEM } from "@/lib/ut";
import "./about.css";

export const metadata: Metadata = { title: "How it works" };

export default function About() {
  const s = site();
  const f = s.rating_formula;
  const ms = matches();
  const checked = ms.reduce((a, m) => a + m.review.checked, 0), total = ms.reduce((a, m) => a + m.review.events, 0);
  const byClaude = ms.reduce((a, m) => a + (m.review.claude || 0), 0);
  const goals = ms.reduce((a, m) => a + m.review.goals, 0), goalsChecked = ms.reduce((a, m) => a + m.review.goals_checked, 0);
  const followedIn = ms.filter((m) => m.review.players_checked), followed = followedIn.reduce((a, m) => a + (m.review.players_checked ?? 0), 0);
  const src = chemistrySources(ms);
  const reelSize = tvWeeks()[0]?.top.length;

  const overview = (
    <>
      <h2>Where the numbers come from</h2>
      <p>
        Every number here comes from our own match video. A tracking system follows every player and the ball, names our
        players from their shirts, and finds the moments that matter: passes, interceptions, tackles, shots and goals. A
        second model watches each of our moments again and flags the ones it disagrees with, and those are checked one
        by one before they count: by someone from the team, or by Claude looking closely at the video.
      </p>
      <h3>What counts</h3>
      <ul>
        <li>Only moments the system is sure of, or that were checked one by one. Anything still waiting for a check is left out until it&apos;s decided.</li>
        <li>{goalsChecked} of {goals} goals have been checked by hand, including who scored and who assisted.</li>
        <li>{checked} of {total} of our moments have been checked by hand{byClaude ? <>, and {byClaude} more by Claude from the video</> : null}.</li>
        <li>The other team&apos;s numbers are as the system saw them and aren&apos;t checked.</li>
      </ul>
    </>
  );

  const ratings = f ? (
    <>
      <h2>How ratings work</h2>
      <p>
        Every action is worth points: good ones add, mistakes take away.{" "}
        {f.compare === "fixed"
          ? <>Everyone starts from {f.baseline.toFixed(1)} and their own points move them up or down, the way FotMob and
            {" "}SofaScore rate a match, so a teammate&apos;s goals never pull anyone else down. One goal on its own is worth about
            {" "}+1.3. A curve keeps ratings between</>
          : <>A player&apos;s points are compared with what the team&apos;s average player makes in the same time on camera, and a
            {" "}player who keeps up the average gets {f.baseline.toFixed(1)}. More impact over more time counts for more. A curve
            {" "}keeps ratings between</>}
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
      <p>
        Every rating on the site can be opened line by line, with a link to watch each moment behind it. See{" "}
        <a href="#checks">how stats are counted and checked</a>.
      </p>
      <h3>Points for each action</h3>
      <p className="note">Our third is the third of the pitch nearest our own goal: winning the ball there stops a chance, losing it there gives one away.</p>
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
    </>
  ) : null;

  const cards = (
    <>
      <h2>How the cards are rated</h2>
      <p>
        Each attribute ranks a player against the squad on a few measures, each a rate per minute on camera: the best in the squad gets about
        90, the least about 45. A short spell counts for less, so a cameo has to show something to rate well. The overall is half their
        average match rating and half their attributes weighted for their position: a centre-back&apos;s leans on defending and physical, a
        midfielder&apos;s on passing, a winger&apos;s on pace and dribbling, a striker&apos;s on shooting. Players seen only briefly are pulled a
        little toward 55.
      </p>
      <h3>The six attributes</h3>
      <ul className="card-notes">
        {(Object.keys(ATTR_NOTES) as Attr[]).map((k) => <li key={k}><b>{k}</b>{ATTR_NOTES[k].replace(/^[A-Za-z]+: /, "")}</li>)}
      </ul>
      <p>Each player&apos;s own page has a &ldquo;Why this card&rdquo; section that shows what moved their card, in their own numbers.</p>
    </>
  );

  const ultimateTeam = (
    <>
      <h2>How Ultimate Team works</h2>
      <h3>How chemistry works</h3>
      <ul className="card-notes">
        <li><b>Links</b>Two players next to each other in the formation are linked. A pass between them counts 1, an assist counts {ASSIST_WEIGHT}; {LINK_FULL} makes a full link.</li>
        <li><b>Colours</b>Green is a strong link, amber is some play together, red means they haven&apos;t combined on our videos yet.</li>
        <li><b>The goalkeeper</b>The goalkeeper has an amber link with everyone, whatever they have played together: a keeper plays with the whole team, so every keeper and everyone beside him is treated the same.</li>
        <li><b>Two cards</b>A player with two cards (Arav has his midfield card and a goalkeeper card) is still one person: only one of his cards can be on the pitch at a time, and his links are the same for both.</li>
        <li><b>Player chemistry</b>Out of {POS_CHEM[2] + LINK_CHEM}: up to {POS_CHEM[2]} for playing in their usual position, up to {LINK_CHEM} from their links.</li>
        <li><b>Team chemistry</b>Out of 100: everyone&apos;s chemistry added up. The team rating is the average overall of the rated outfield players on the pitch (keepers aren&apos;t rated yet).</li>
        <li><b>Subs and reserves</b>The five best-rated players off the pitch are the subs; everyone else is in reserve.</li>
        <li><b>Chemistry styles</b>The three-letter label along the bottom of a card (for example HUN, Hunter, for pace and shooting) is the game&apos;s style for the player&apos;s two best attributes. A card that isn&apos;t rated yet shows BAS, Basic.</li>
        <li><b>Where it comes from</b>{src.timelinePasses + src.checkPasses - src.deduped} passes between named teammates and {src.assists} assists, across {ms.length} recorded matches.</li>
      </ul>
    </>
  );

  const checks = (
    <>
      <h2>How stats are counted and checked</h2>
      <h3>Team stats</h3>
      <p>
        Both teams are counted the same way, as the system found them. Our checks are applied to ours; the other team&apos;s aren&apos;t
        checked. A pass counts as failed if it&apos;s cut out or goes out of play. Possession is estimated from ball tracking.
      </p>
      <h3>Running</h3>
      <p>
        Running (distance, speed, sprints) is measured while a player is in shot, then scaled to their minutes. Players are measured while
        the camera has them named, so distance is their pace while tracked times their time on the pitch (warm-up and half-time left out).
        Top speed is the fastest held for a full second.
      </p>
      {followed ? (
        <>
          <h3>Followed player by player</h3>
          <p>
            For some matches Claude followed our players through every moment the ball came near them, so their passes, tackles, runs and
            losses are what the video shows, not the system&apos;s guesses. Each line on a player&apos;s sheet links to those moments. So far
            that covers {followedIn.length} {followedIn.length === 1 ? "match" : "matches"}, with {followed} players followed across {followedIn.length === 1 ? "it" : "them"}.
          </p>
        </>
      ) : null}
    </>
  );

  const tv = (
    <>
      <h2>TV and highlights</h2>
      <p>
        After every match, one short reel of our {reelSize ? `${reelSize} best moments` : "best moments"}: goals, shots, tackles and presses that won the
        ball back. Only moments we have checked make the cut. The reel counts down to number one, and the list beside it jumps straight to any
        moment.
      </p>
      <p>
        Each match also has a Highlights tab: every goal on video, from the build-up to the finish, then every tackle won and interception of
        ours. The critical ones were won in our third, where losing it gives a chance away.
      </p>
    </>
  );

  const topics: Topic[] = [
    { id: "overview", label: "Overview", content: overview },
    ...(ratings ? [{ id: "ratings", label: "How ratings work", content: ratings }] : []),
    { id: "cards", label: "How cards are rated", content: cards },
    { id: "ultimate-team", label: "How Ultimate Team works", content: ultimateTeam },
    { id: "checks", label: "How stats are counted", content: checks },
    { id: "tv", label: "TV and highlights", content: tv },
  ];

  return (
    <main className="wrap page">
      <h1 className="sr-only">How it works</h1>
      <TopicTabs topics={topics} label="How it works topics" />
      <section className="section prose about-mistake">
        <h2>Spotted a mistake?</h2>
        <p>Tell the admin the minute and what really happened. It gets fixed at the source and shows up on the next update. <Link className="more" href="/contact/">Contact the admin</Link></p>
      </section>
    </main>
  );
}
