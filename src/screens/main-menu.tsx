import type { CSSProperties } from "react"

export type Screen = "menu" | "daily" | "arcade" | "help" | "about" | "stats"

interface Props {
  onNavigate: (screen: Screen) => void
}

const menuItems: { label: string; description: string; screen: Screen }[] = [
  { label: "Daily", description: "Same player for everyone each day", screen: "daily" },
  { label: "Arcade", description: "Random player every round", screen: "arcade" },
  { label: "Stats", description: "View your statistics", screen: "stats" },
  { label: "Help", description: "How to play", screen: "help" },
  { label: "About", description: "About Playerdle", screen: "about" },
]

export default function MainMenu({ onNavigate }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.titleSection}>
        <h1 style={styles.title}>PLAYERDLE</h1>
        <p style={styles.subtitle}>Guess the NFL player in 5 tries</p>
      </div>

      <div style={styles.menuList}>
        {menuItems.map(item => (
          <button
            key={item.screen}
            style={styles.menuItem}
            onClick={() => onNavigate(item.screen)}
          >
            <span style={styles.menuLabel}>{item.label}</span>
            <span style={styles.menuDesc}>{item.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: "2rem 1rem",
    gap: "2.5rem",
  },
  titleSection: {
    textAlign: "center",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    letterSpacing: "0.15em",
    color: "var(--text)",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginTop: "0.5rem",
  },
  menuList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    width: "100%",
    maxWidth: "20rem",
  },
  menuItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "1rem",
    borderRadius: "0.5rem",
    border: "2px solid var(--border)",
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text)",
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  menuLabel: {
    fontSize: "1.1rem",
    fontWeight: 700,
  },
  menuDesc: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "0.15rem",
  },
}
