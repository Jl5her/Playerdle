import type { CSSProperties } from "react";

interface Props {
  onClose: () => void;
}

export default function TutorialScreen({ onClose }: Props) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>How to Play</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.content}>
          <p style={styles.text}>
            Guess the mystery NFL player in 6 tries.
          </p>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>How It Works</h3>
            <p style={styles.text}>
              Each guess reveals clues about the player's conference, division, team, position, and jersey number.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Color Guide</h3>
            <div style={styles.examples}>
              <div style={styles.example}>
                <div style={{ ...styles.exampleTile, background: "var(--ok)" }}>
                  <span style={styles.exampleText}>NFC</span>
                </div>
                <p style={styles.exampleLabel}>Green = Correct match</p>
              </div>

              <div style={styles.example}>
                <div style={{ ...styles.exampleTile, background: "var(--yellow)" }}>
                  <span style={styles.exampleText}>15 ↑</span>
                </div>
                <p style={styles.exampleLabel}>Yellow = Number within 5</p>
              </div>

              <div style={styles.example}>
                <div style={{ ...styles.exampleTile, background: "var(--bad)" }}>
                  <span style={styles.exampleText}>QB</span>
                </div>
                <p style={styles.exampleLabel}>Red = Incorrect</p>
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <p style={styles.text}>
              Arrows (↑ ↓) indicate if the mystery player's number is higher or lower.
            </p>
          </div>

          <button style={styles.playButton} onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "var(--bg)",
    borderRadius: "8px",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    border: "2px solid var(--border)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem 1.5rem",
    borderBottom: "2px solid var(--border)",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text)",
    margin: 0,
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "1.5rem",
    cursor: "pointer",
    padding: "0.25rem",
    lineHeight: 1,
    transition: "color 0.2s",
  },
  content: {
    padding: "1.5rem",
  },
  section: {
    marginTop: "1.5rem",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: "0.75rem",
  },
  text: {
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    margin: "0.5rem 0",
  },
  examples: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginTop: "1rem",
  },
  example: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  exampleTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "80px",
    height: "60px",
    borderRadius: "4px",
    border: "2px solid rgba(0,0,0,0.08)",
    flexShrink: 0,
  },
  exampleText: {
    color: "var(--state-text)",
    fontWeight: 700,
    fontSize: "0.9rem",
    position: "relative",
    zIndex: 1,
  },
  exampleLabel: {
    color: "var(--text)",
    margin: 0,
    fontSize: "0.9rem",
  },
  playButton: {
    marginTop: "2rem",
    width: "100%",
    padding: "0.875rem",
    backgroundColor: "var(--color-accent-primary)",
    color: "var(--color-bg-primary)",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s",
  },
};
