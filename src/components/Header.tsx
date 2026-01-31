import type { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  header: {
    backgroundColor: "var(--header-bg)",
    color: "var(--header-text)",
    padding: "0.75rem 1rem",
    textAlign: "center",
    flexShrink: 0,
    borderBottom: "2px solid var(--border)",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: 800,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
  },
};

export default function Header() {
  return (
    <header style={styles.header}>
      <h1 style={styles.title}>Athlete Wordle</h1>
    </header>
  );
}
