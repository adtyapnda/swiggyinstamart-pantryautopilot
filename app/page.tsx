export default function Home() {
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "5rem 1.5rem",
        maxWidth: 640,
        margin: "0 auto",
        lineHeight: 1.55,
      }}
    >
      <h1 style={{ fontSize: "2.25rem", marginBottom: "0.25rem" }}>
        Pantry Autopilot
      </h1>
      <p style={{ color: "#666", marginBottom: "2rem", fontSize: "1rem" }}>
        Coming soon.
      </p>

      <p>
        A WhatsApp agent that models household grocery consumption passively
        and sends one-tap reorder carts for Swiggy Instamart before you run
        out. Zero typing, ever.
      </p>

      <p>
        Instamart order history is ground truth. Swiggy Food orders act as a
        negative consumption signal, so the nights you eat out dampen
        next-day grocery predictions.
      </p>

      <p style={{ marginTop: "2.5rem", color: "#888", fontSize: "0.9rem" }}>
        Built on the Swiggy MCP stack as part of Builders Club.
      </p>
    </main>
  );
}
