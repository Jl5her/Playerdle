import type { CSSProperties } from "react";

interface Props {
  onBack: () => void;
}

export default function HelpScreen({ onBack }: Props) {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>How to Play</h2>

      <div style={styles.section}>
        <p style={styles.text}>
          Guess the NFL player in <strong>5 tries</strong>. After each guess,
          the tiles will change color to show how close your guess was.
        </p>
      </div>

      <div style={styles.section}>
        <div style={styles.colorRow}>
          <span style={{ ...styles.swatch, backgroundColor: "var(--green)" }} />
          <span style={styles.text}>Exact match</span>
        </div>
        <div style={styles.colorRow}>
          <span style={{ ...styles.swatch, backgroundColor: "var(--yellow)" }} />
          <span style={styles.text}>Same division but wrong team</span>
        </div>
        <div style={styles.colorRow}>
          <span style={{ ...styles.swatch, backgroundColor: "var(--red)" }} />
          <span style={styles.text}>No match</span>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.subheading}>Categories</h3>
        <p style={styles.text}>
          Each guess reveals clues across five categories: <strong>Conference</strong>,{" "}
          <strong>Division</strong>, <strong>Team</strong>, <strong>Position</strong>,
          and <strong>Jersey Number</strong>.
        </p>
        <p style={styles.text}>
          For jersey number, an arrow indicates whether the answer's number is
          higher or lower.
        </p>
      </div>

      <div style={styles.section}>
        <h3 style={styles.subheading}>Game Modes</h3>
        <p style={styles.text}>
          <strong>Daily</strong> &mdash; Everyone gets the same player each day.
        </p>
        <p style={styles.text}>
          <strong>Arcade</strong> &mdash; Play unlimited rounds with a random player each time.
        </p>
      </div>

      <button style={styles.backBtn} onClick={onBack}>Back to Menu</button>
    </div>
  );
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
    overflowY: "auto",
    flex: 1,
  },
  heading: {
    fontSize: "1.4rem",
    fontWeight: 800,
    letterSpacing: "0.05em",
    color: "var(--text)",
  },
  subheading: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: "0.25rem",
  },
  section: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  text: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  colorRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  swatch: {
    display: "inline-block",
    width: "1.25rem",
    height: "1.25rem",
    borderRadius: "3px",
    flexShrink: 0,
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
};
