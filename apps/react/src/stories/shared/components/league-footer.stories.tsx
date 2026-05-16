import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  faBaseball,
  faBasketball,
  faFootball,
  faHockeyPuck,
  faMap,
} from "@fortawesome/free-solid-svg-icons"
import { fn } from "storybook/test"
import LeagueFooter, { type FooterTab } from "./league-footer"

const nflTab: FooterTab = {
  id: "nfl",
  icon: faFootball,
  label: "NFL",
  active: true,
  onSelect: fn(),
}

const mlbTab: FooterTab = {
  id: "mlb",
  icon: faBaseball,
  label: "MLB",
  active: false,
  onSelect: fn(),
}

const nhlTab: FooterTab = {
  id: "nhl",
  icon: faHockeyPuck,
  label: "NHL",
  active: false,
  onSelect: fn(),
}

const nbaTab: FooterTab = {
  id: "nba",
  icon: faBasketball,
  label: "NBA",
  active: false,
  onSelect: fn(),
}

const meta = {
  title: "UI/LeagueFooter",
  component: LeagueFooter,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    tabs: [nflTab, mlbTab, nhlTab, nbaTab],
  },
} satisfies Meta<typeof LeagueFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AllInactive: Story = {
  args: {
    tabs: [
      { ...nflTab, active: false },
      { ...mlbTab, active: false },
      { ...nhlTab, active: false },
      { ...nbaTab, active: false },
    ],
  },
}

export const SingleTab: Story = {
  args: {
    tabs: [
      {
        id: "map",
        icon: faMap,
        label: "All Leagues",
        active: true,
        onSelect: fn(),
      },
    ],
  },
}
