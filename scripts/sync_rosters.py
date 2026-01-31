#!/usr/bin/env python3
"""
Fetch all NFL players from all 32 teams via ESPN and output src/data/players.json.
Uses the ESPN JSON API for active rosters and scrapes HTML pages for IR/practice squad.
"""

import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

TEAMS = [
    # AFC East
    {"id": 2, "abbr": "buf", "slug": "buffalo-bills", "name": "Buffalo Bills", "conference": "AFC", "division": "AFC East"},
    {"id": 15, "abbr": "mia", "slug": "miami-dolphins", "name": "Miami Dolphins", "conference": "AFC", "division": "AFC East"},
    {"id": 17, "abbr": "ne", "slug": "new-england-patriots", "name": "New England Patriots", "conference": "AFC", "division": "AFC East"},
    {"id": 20, "abbr": "nyj", "slug": "new-york-jets", "name": "New York Jets", "conference": "AFC", "division": "AFC East"},
    # AFC North
    {"id": 33, "abbr": "bal", "slug": "baltimore-ravens", "name": "Baltimore Ravens", "conference": "AFC", "division": "AFC North"},
    {"id": 4, "abbr": "cin", "slug": "cincinnati-bengals", "name": "Cincinnati Bengals", "conference": "AFC", "division": "AFC North"},
    {"id": 5, "abbr": "cle", "slug": "cleveland-browns", "name": "Cleveland Browns", "conference": "AFC", "division": "AFC North"},
    {"id": 23, "abbr": "pit", "slug": "pittsburgh-steelers", "name": "Pittsburgh Steelers", "conference": "AFC", "division": "AFC North"},
    # AFC South
    {"id": 34, "abbr": "hou", "slug": "houston-texans", "name": "Houston Texans", "conference": "AFC", "division": "AFC South"},
    {"id": 11, "abbr": "ind", "slug": "indianapolis-colts", "name": "Indianapolis Colts", "conference": "AFC", "division": "AFC South"},
    {"id": 30, "abbr": "jax", "slug": "jacksonville-jaguars", "name": "Jacksonville Jaguars", "conference": "AFC", "division": "AFC South"},
    {"id": 10, "abbr": "ten", "slug": "tennessee-titans", "name": "Tennessee Titans", "conference": "AFC", "division": "AFC South"},
    # AFC West
    {"id": 7, "abbr": "den", "slug": "denver-broncos", "name": "Denver Broncos", "conference": "AFC", "division": "AFC West"},
    {"id": 12, "abbr": "kc", "slug": "kansas-city-chiefs", "name": "Kansas City Chiefs", "conference": "AFC", "division": "AFC West"},
    {"id": 13, "abbr": "lv", "slug": "las-vegas-raiders", "name": "Las Vegas Raiders", "conference": "AFC", "division": "AFC West"},
    {"id": 24, "abbr": "lac", "slug": "los-angeles-chargers", "name": "Los Angeles Chargers", "conference": "AFC", "division": "AFC West"},
    # NFC East
    {"id": 6, "abbr": "dal", "slug": "dallas-cowboys", "name": "Dallas Cowboys", "conference": "NFC", "division": "NFC East"},
    {"id": 19, "abbr": "nyg", "slug": "new-york-giants", "name": "New York Giants", "conference": "NFC", "division": "NFC East"},
    {"id": 21, "abbr": "phi", "slug": "philadelphia-eagles", "name": "Philadelphia Eagles", "conference": "NFC", "division": "NFC East"},
    {"id": 28, "abbr": "wsh", "slug": "washington-commanders", "name": "Washington Commanders", "conference": "NFC", "division": "NFC East"},
    # NFC North
    {"id": 3, "abbr": "chi", "slug": "chicago-bears", "name": "Chicago Bears", "conference": "NFC", "division": "NFC North"},
    {"id": 8, "abbr": "det", "slug": "detroit-lions", "name": "Detroit Lions", "conference": "NFC", "division": "NFC North"},
    {"id": 9, "abbr": "gb", "slug": "green-bay-packers", "name": "Green Bay Packers", "conference": "NFC", "division": "NFC North"},
    {"id": 16, "abbr": "min", "slug": "minnesota-vikings", "name": "Minnesota Vikings", "conference": "NFC", "division": "NFC North"},
    # NFC South
    {"id": 1, "abbr": "atl", "slug": "atlanta-falcons", "name": "Atlanta Falcons", "conference": "NFC", "division": "NFC South"},
    {"id": 29, "abbr": "car", "slug": "carolina-panthers", "name": "Carolina Panthers", "conference": "NFC", "division": "NFC South"},
    {"id": 18, "abbr": "no", "slug": "new-orleans-saints", "name": "New Orleans Saints", "conference": "NFC", "division": "NFC South"},
    {"id": 27, "abbr": "tb", "slug": "tampa-bay-buccaneers", "name": "Tampa Bay Buccaneers", "conference": "NFC", "division": "NFC South"},
    # NFC West
    {"id": 22, "abbr": "ari", "slug": "arizona-cardinals", "name": "Arizona Cardinals", "conference": "NFC", "division": "NFC West"},
    {"id": 14, "abbr": "lar", "slug": "los-angeles-rams", "name": "Los Angeles Rams", "conference": "NFC", "division": "NFC West"},
    {"id": 26, "abbr": "sf", "slug": "san-francisco-49ers", "name": "San Francisco 49ers", "conference": "NFC", "division": "NFC West"},
    {"id": 25, "abbr": "sea", "slug": "seattle-seahawks", "name": "Seattle Seahawks", "conference": "NFC", "division": "NFC West"},
]

API_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team_id}/roster"
DEPTH_CHART_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team_id}/depthcharts"
HTML_URL = "https://www.espn.com/nfl/team/roster/_/name/{abbr}/{slug}"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
})


def fetch_api_roster(team):
    """Fetch players from the ESPN JSON API."""
    url = API_URL.format(team_id=team["id"])
    players = []
    try:
        resp = SESSION.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        # The API returns athletes grouped by position categories
        for group in data.get("athletes", []):
            # Check if this is the practice squad group
            group_position = group.get("position", "")
            is_practice_squad_group = group_position == "practiceSquad"
            
            for athlete in group.get("items", []):
                name = athlete.get("displayName") or athlete.get("fullName", "Unknown")
                jersey = athlete.get("jersey")
                position = athlete.get("position", {}).get("abbreviation", "")
                
                # Player is on practice squad if in practice squad group
                # OR if their status explicitly says so
                status = athlete.get("status", {})
                practice_squad = is_practice_squad_group or status.get("type") == "practiceSquad"
                
                try:
                    number = int(jersey)
                except (ValueError, TypeError):
                    continue  # Skip players with no jersey number
                
                players.append({
                    "name": name,
                    "position": position,
                    "number": number,
                    "practiceSquad": practice_squad,
                    "espn_id": athlete.get("id"),  # Store for popularity lookup
                })
    except requests.RequestException as e:
        print(f"  WARNING: API fetch failed for {team['name']}: {e}", file=sys.stderr)
    except (KeyError, json.JSONDecodeError) as e:
        print(f"  WARNING: API parse failed for {team['name']}: {e}", file=sys.stderr)

    return players


def fetch_html_roster(team):
    """Scrape the ESPN HTML roster page for IR and practice squad players."""
    url = HTML_URL.format(abbr=team["abbr"], slug=team["slug"])
    players = []
    try:
        resp = SESSION.get(url, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # ESPN roster pages use tables with player data
        # Look for all player links in roster tables
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all("td")
                if len(cells) < 2:
                    continue

                # Try to find player name - usually in an anchor tag
                name_link = row.find("a", href=re.compile(r"/nfl/player/"))
                if not name_link:
                    continue

                name = name_link.get_text(strip=True)
                if not name:
                    continue

                # Extract ESPN ID from player link
                espn_id = None
                href = name_link.get("href", "")
                player_id_match = re.search(r"/id/(\d+)/", href)
                if player_id_match:
                    espn_id = player_id_match.group(1)

                # Extract jersey number and position from cells
                number = None
                position = ""

                for cell in cells:
                    text = cell.get_text(strip=True)
                    # Check if cell contains just a number (jersey)
                    if text.isdigit() and number is None:
                        number = int(text)
                    # Check for position abbreviations
                    elif text in (
                        "QB", "RB", "FB", "WR", "TE", "OL", "OT", "OG", "C", "T", "G",
                        "DL", "DE", "DT", "NT", "LB", "ILB", "OLB", "MLB",
                        "DB", "CB", "S", "FS", "SS", "K", "P", "LS", "KR", "PR",
                        "EDGE",
                    ):
                        position = text

                if number is None:
                    continue  # Skip players with no jersey number

                players.append({
                    "name": name,
                    "position": position,
                    "number": number,
                    "practiceSquad": False,  # HTML doesn't clearly show practice squad during postseason
                    "espn_id": espn_id,
                })

    except requests.RequestException as e:
        print(f"  WARNING: HTML fetch failed for {team['name']}: {e}", file=sys.stderr)
    except Exception as e:
        print(f"  WARNING: HTML parse failed for {team['name']}: {e}", file=sys.stderr)

    return players


def fetch_depth_chart(team):
    """Fetch depth chart from ESPN API and return a dict mapping espn_id -> depth rank."""
    url = DEPTH_CHART_URL.format(team_id=team["id"])
    depth_map = {}
    
    try:
        resp = SESSION.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        
        # ESPN depth chart structure: positions array, each with athletes ranked by slot
        for position_group in data.get("positions", []):
            position_abbr = position_group.get("abbreviation", "")
            athletes = position_group.get("athletes", [])
            
            # Rank athletes by their slot (1-indexed)
            for athlete in athletes:
                espn_id = str(athlete.get("athlete", {}).get("id", ""))
                slot = athlete.get("slot", 99)  # Default to 99 if no slot
                
                if espn_id:
                    # Store as position + rank (e.g., "QB1", "WR2")
                    depth_map[espn_id] = {
                        "position": position_abbr,
                        "rank": slot
                    }
                    
    except requests.RequestException as e:
        print(f"  WARNING: Depth chart fetch failed for {team['name']}: {e}", file=sys.stderr)
    except (KeyError, json.JSONDecodeError) as e:
        print(f"  WARNING: Depth chart parse failed for {team['name']}: {e}", file=sys.stderr)
    
    return depth_map



def merge_players(api_players, html_players):
    """Merge API and HTML players, deduplicating by name."""
    seen = {}
    for p in api_players:
        seen[p["name"]] = p
    for p in html_players:
        if p["name"] not in seen:
            seen[p["name"]] = p
    return list(seen.values())


def calculate_popularity(player):
    """
    Calculate a popularity/recognizability score (0-100) for a player.
    
    Factors:
    - Position importance: QB/RB/WR/TE are more recognizable
    - Has ESPN ID: indicates trackable player
    - Practice squad status: reduces popularity
    - Depth chart position: starters get higher scores
    
    Returns a score from 0-100 where higher = more recognizable
    """
    score = 0
    position = player.get("position", "")
    
    # Position-based scoring (0-50 points)
    if position == "QB":
        score += 50  # Quarterbacks are most recognizable
    elif position in ("RB", "WR", "TE"):
        score += 40  # Skill positions
    elif position in ("K", "P"):
        score += 25  # Kickers/punters less recognizable
    elif position in ("OT", "OG", "C", "G", "T"):
        score += 20  # Offensive line
    elif position in ("DE", "DT", "LB", "OLB", "ILB", "MLB", "EDGE"):
        score += 30  # Defensive stars
    elif position in ("CB", "S", "FS", "SS", "DB"):
        score += 35  # Defensive backs
    else:
        score += 15  # Other positions
    
    # Has ESPN ID (0-20 points)
    if player.get("espn_id"):
        score += 20  # ESPN tracks them = more notable
    
    # Depth chart bonus (0-30 points)
    depth_rank = player.get("depthRank")
    if depth_rank == 1:
        score += 30  # Starters get big boost
    elif depth_rank == 2:
        score += 15  # Second string
    elif depth_rank == 3:
        score += 5   # Third string
    
    # Practice squad penalty (-20 points)
    if player.get("practiceSquad"):
        score -= 20
    
    # Ensure score is in 0-100 range
    return max(0, min(100, score))


def assign_difficulty(player):
    """
    Assign difficulty tier based on popularity and practice squad status.
    
    Tiers:
    - easy: Well-known players only, no practice squad (popularity > 70)
    - medium: More than just well-known players (popularity > 40, not practice squad)
    - hard: All active roster players (not practice squad)
    - expert: All players including practice squad
    """
    popularity = player.get("popularity", 0)
    is_practice_squad = player.get("practiceSquad", False)
    
    if is_practice_squad:
        return "expert"
    elif popularity > 70:
        return "easy"
    elif popularity > 40:
        return "medium"
    else:
        return "hard"


def write_players_json(all_players, output_path):
    """Write the players.json file."""
    # Calculate popularity and difficulty for each player
    for player in all_players:
        player["popularity"] = calculate_popularity(player)
        player["difficulty"] = assign_difficulty(player)
    
    # Sort by conference, division, team, then name for consistent output
    all_players.sort(key=lambda p: (p["conference"], p["division"], p["team"], p["name"]))

    # Build JSON data for players
    json_data = []
    for p in all_players:
        json_data.append({
            "espnId": p.get("espn_id") or None,
            "teamId": p.get("teamId"),
            "name": p["name"],
            "conference": p["conference"],
            "division": p["division"],
            "team": p["team"],
            "position": p["position"],
            "number": p["number"],
            "practiceSquad": p.get("practiceSquad", False),
            "popularity": p.get("popularity", 0),
            "difficulty": p.get("difficulty", "medium"),
            "depthChart": p.get("depthChart"),  # e.g., "QB1", "RB2", None
        })

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    print(f"\nWrote {len(all_players)} players to {output_path}")


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_path = os.path.join(project_root, "src", "data", "players.json")

    all_players = []
    team_counts = {}

    print(f"Fetching rosters for {len(TEAMS)} NFL teams...")
    print()

    for i, team in enumerate(TEAMS):
        print(f"[{i + 1}/{len(TEAMS)}] {team['name']}...", end=" ", flush=True)

        api_players = fetch_api_roster(team)
        print(f"API: {len(api_players)}", end="", flush=True)

        time.sleep(0.5)

        html_players = fetch_html_roster(team)
        print(f", HTML: {len(html_players)}", end="", flush=True)

        time.sleep(0.5)

        depth_chart = fetch_depth_chart(team)
        print(f", Depth: {len(depth_chart)}", end="", flush=True)

        merged = merge_players(api_players, html_players)
        
        # Add depth chart info to merged players
        for p in merged:
            espn_id = str(p.get("espn_id", ""))
            if espn_id in depth_chart:
                depth_info = depth_chart[espn_id]
                p["depthChart"] = f"{depth_info['position']}{depth_info['rank']}"
                p["depthRank"] = depth_info["rank"]
            else:
                p["depthChart"] = None
                p["depthRank"] = None
        
        print(f", merged: {len(merged)}")

        for p in merged:
            p["conference"] = team["conference"]
            p["division"] = team["division"]
            p["team"] = team["name"]
            p["teamId"] = team["id"]

        all_players.extend(merged)
        team_counts[team["name"]] = len(merged)

        # Rate limit
        if i < len(TEAMS) - 1:
            time.sleep(1)

    print("\n--- Summary ---")
    for team_name, count in sorted(team_counts.items()):
        print(f"  {team_name}: {count} players")
    print(f"\n  Total: {len(all_players)} players")

    write_players_json(all_players, output_path)


if __name__ == "__main__":
    main()
