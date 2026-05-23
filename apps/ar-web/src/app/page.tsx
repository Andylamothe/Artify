export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <div style={{ textAlign: "center", maxWidth: 700 }}>
        <h1 style={{ marginBottom: "1rem" }}>Hack The Summit AR Museum</h1>
        <p style={{ marginBottom: "1.4rem", lineHeight: 1.5 }}>
          Launch the mobile-first AR experience to scan artworks and reveal unique visual effects, history, and audio narration.
        </p>
        <a
          href="/ar"
          style={{
            display: "inline-block",
            background: "#12263a",
            color: "#fff",
            padding: "0.8rem 1.2rem",
            borderRadius: 12,
            fontWeight: 600,
          }}
        >
          Open AR Experience
        </a>
      </div>
    </main>
  );
}
