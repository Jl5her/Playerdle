import type { CSSProperties } from "react"

interface Props {
  onBack: () => void
}

export default function AboutScreen({ onBack }: Props) {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>About</h2>

      <div style={styles.section}>
        <p style={styles.text}>
          <strong>Playerdle</strong> is a daily guessing game for NFL fans. Test your knowledge by
          identifying players based on their conference, division, team, position, and jersey
          number.
        </p>
      </div>

      <div style={styles.section}>
        <p style={styles.text}>Inspired by Wordle and other sports guessing games.</p>
      </div>

      <button
        style={styles.backBtn}
        onClick={onBack}
      >
        Back to Menu
      </button>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem 1.5rem",
    gap: "1.25rem",
    maxWidth: "28rem",
    margin: "0 auto",
    flex: 1,
  },
  heading: {
    fontSize: "1.4rem",
    fontWeight: 800,
    letterSpacing: "0.05em",
    color: "var(--text)",
  },
  section: {
    width: "100%",
  },
  text: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  backBtn: {
    marginTop: "0.5rem",
    padding: "0.5rem 1.5rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#fff",
    backgroundColor: "var(--green)",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
}
