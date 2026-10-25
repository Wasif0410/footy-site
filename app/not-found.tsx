import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" style={{ minHeight: "50vh" }}>
      <h1 style={{ fontSize: "2.4rem" }}>Page not found</h1>
      <p className="muted" style={{ margin: "0.5rem 0 1rem" }}>That page isn&apos;t here. It may be a match or player that hasn&apos;t been added yet.</p>
      <Link href="/">Back to the match centre</Link>
    </main>
  );
}
