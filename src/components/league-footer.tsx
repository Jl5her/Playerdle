import {
  faBaseball,
  faBasketball,
  faFootball,
  faHockeyPuck,
} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { getAllSportMeta, type SportId } from "@/sports"

interface Props {
  currentSportId: SportId
  onSelectSport: (sportId: SportId) => void
}

const sports = getAllSportMeta()

function SportIcon({ sportId }: { sportId: SportId }) {
  if (sportId === "nfl")
    return (
      <FontAwesomeIcon
        icon={faFootball}
        className="text-[1.35rem]"
      />
    )
  if (sportId === "mlb")
    return (
      <FontAwesomeIcon
        icon={faBaseball}
        className="text-[1.35rem]"
      />
    )
  if (sportId === "nhl")
    return (
      <FontAwesomeIcon
        icon={faHockeyPuck}
        className="text-[1.35rem]"
      />
    )
  return (
    <FontAwesomeIcon
      icon={faBasketball}
      className="text-[1.35rem]"
    />
  )
}

export default function LeagueFooter({ currentSportId, onSelectSport }: Props) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-primary-100/70 dark:bg-primary-800/70 backdrop-blur-sm">
      <div className="max-w-lg mx-auto px-3 py-2 flex items-center justify-center gap-3">
        {sports.map(sport => {
          const isActive = sport.id === currentSportId
          return (
            <button
              key={sport.id}
              type="button"
              title={sport.displayName}
              aria-label={`Switch to ${sport.displayName}`}
              className={`w-10 h-10 rounded-full transition-colors inline-flex items-center justify-center ${
                isActive
                  ? "bg-primary-700/10 text-primary-700 ring-1 ring-primary-500/20 dark:bg-primary-200/12 dark:text-primary-100 dark:ring-primary-300/22"
                  : "text-primary-500 hover:text-primary-300 dark:text-primary-300 dark:hover:text-primary-100"
              }`}
              onClick={() => onSelectSport(sport.id)}
            >
              <SportIcon sportId={sport.id} />
            </button>
          )
        })}
      </div>
    </footer>
  )
}
