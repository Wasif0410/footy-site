import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap page" style={{ minHeight: "55vh" }}>
      <section className="section">
        <h1>Page not found</h1>
        <p className="lede" style={{ margin: "0.7rem 0 1.2rem" }}>That page isn&apos;t here. It may be a match or a player that hasn&apos;t been added yet.</p>
        <Link className="more" href="/">Back to the home page</Link>
      </section>
    </main>
  );
}
