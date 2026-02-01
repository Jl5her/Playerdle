import { type CSSProperties } from "react"
import { calculateStats } from "@/utils/stats"

interface Props {
  onClose: () => void
}

export default function StatsModal({ onClose }: Props) {
  const stats = calculateStats()

  const maxGuessCount = Math.max(...Object.values(stats.guessDistribution), 1)

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
    >
      <div
        style={styles.modal}
        onClick={e => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>Statistics</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.played}</div>
              <div style={styles.statLabel}>Played</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.winPercentage}</div>
              <div style={styles.statLabel}>Win %</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.currentStreak}</div>
              <div style={styles.statLabel}>
                Current
                <br />
                Streak
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.maxStreak}</div>
              <div style={styles.statLabel}>
                Max
                <br />
                Streak
              </div>
            </div>
          </div>

          <div style={styles.distribution}>
            <h3 style={styles.distributionTitle}>Guess Distribution</h3>
            {[1, 2, 3, 4, 5, 6].map(guessNum => {
              const count = stats.guessDistribution[guessNum] || 0
              const percentage = maxGuessCount > 0 ? (count / maxGuessCount) * 100 : 0

              return (
                <div
                  key={guessNum}
                  style={styles.distributionRow}
                >
                  <div style={styles.distributionLabel}>{guessNum}</div>
                  <div style={styles.distributionBarContainer}>
                    <div
                      style={{
                        ...styles.distributionBar,
                        width: `${Math.max(percentage, count > 0 ? 7 : 0)}%`,
                      }}
                    >
                      <span style={styles.distributionCount}>{count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
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
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "0.5rem",
    marginBottom: "2rem",
  },
  statBox: {
    textAlign: "center",
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "var(--text)",
  },
  statLabel: {
    fontSize: "0.7rem",
    color: "var(--text-secondary)",
    marginTop: "0.25rem",
    lineHeight: 1.3,
  },
  distribution: {
    marginTop: "1.5rem",
  },
  distributionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: "1rem",
  },
  distributionRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: "0.4rem",
    gap: "0.5rem",
  },
  distributionLabel: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text)",
    width: "1rem",
    flexShrink: 0,
  },
  distributionBarContainer: {
    flex: 1,
    position: "relative",
  },
  distributionBar: {
    backgroundColor: "var(--text-secondary)",
    padding: "0.3rem 0.5rem",
    borderRadius: "2px",
    minWidth: "2rem",
    transition: "width 0.3s ease",
  },
  distributionCount: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--bg)",
  },
}
