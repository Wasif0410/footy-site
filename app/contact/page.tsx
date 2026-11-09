import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function Contact() {
  return (
    <main className="wrap page">
      <section className="section prose">
        <h1 className="sr-only">Contact</h1>
        <p className="lede">
          Something wrong, missing or not working on the site? Contact the admin and it gets fixed. Every number here is
          checked against our match video, so if you spot a mistake, say so.
        </p>

        <h2>What to send</h2>
        <ul>
          <li><b>Which match</b>, and its date.</li>
          <li><b>When it happened</b>: the time in the video, or the game clock (say which one).</li>
          <li><b>What&apos;s wrong, and what it should be</b>: a goal time, who scored or set it up, a line in someone&apos;s rating, a name or a photo.</li>
          <li><b>For something that doesn&apos;t work</b>: the page, and the phone or computer you were on.</li>
        </ul>

        <h2>What the admin can sort out</h2>
        <ul>
          <li>A stat or a moment that&apos;s wrong or missing.</li>
          <li>Your name, number, position or photo.</li>
          <li>A page that&apos;s broken or hard to use.</li>
          <li>Ideas for the site.</li>
        </ul>
      </section>
    </main>
  );
}
