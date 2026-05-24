import Link from "next/link";

export default function Home() {
  return (
    <main className="artify-gateway">
      <div className="artify-gateway-media" aria-hidden="true" />
      <section className="artify-gateway-content" aria-label="Choose Artify mode">
        <p className="artify-gateway-kicker">Artify</p>
        <h1>Choose how you want to experience art.</h1>
        <p>
          Start the museum scanner when you are standing in front of an artwork, or open the social
          platform to discover, like, save, and launch AR-ready pieces.
        </p>
        <div className="artify-gateway-actions">
          <Link className="artify-gateway-primary" href="/ar">
            I am in a museum
          </Link>
          <Link className="artify-gateway-secondary" href="/social">
            Open social platform
          </Link>
        </div>
      </section>
    </main>
  );
}
