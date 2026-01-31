#!/usr/bin/env python3
"""
Fetch all NFL players from all 32 teams via ESPN and output src/data/players.json.
Uses Playwright to scrape depth charts and roster information.
"""

import json
import os
import re
import sys
import time

import requests
from playwright.sync_api import sync_playwright

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
DEPTH_CHART_URL = "https://www.espn.com/nfl/team/depth/_/name/{abbr}/{slug}"

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
                    "espn_id": athlete.get("id"),
                })
    except requests.RequestException as e:
        print(f"  WARNING: API fetch failed for {team['name']}: {e}", file=sys.stderr)
    except (KeyError, json.JSONDecodeError) as e:
        print(f"  WARNING: API parse failed for {team['name']}: {e}", file=sys.stderr)

    return players


def scrape_depth_chart(page, team):
    """Scrape depth chart from ESPN using Playwright."""
    url = DEPTH_CHART_URL.format(abbr=team["abbr"], slug=team["slug"])
    depth_map = {}  # Maps player name -> {position, rank}
    
    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
        
        # ESPN depth chart uses tables with position groups
        # Look for depth chart tables or sections
        depth_sections = page.locator('[class*="DepthChart"], [class*="depth-chart"], table').all()
        
        for section in depth_sections:
            # Try to find position headers and player lists
            try:
                # Look for position labels
                position_headers = section.locator('th, [class*="position"], h3, h4').all()
                
                for header in position_headers:
                    header_text = header.inner_text().strip()
                    
                    # Check if this is a position abbreviation
                    if header_text in ("QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
                                      "DE", "DT", "NT", "LB", "OLB", "ILB", "MLB", "CB", "S", 
                                      "FS", "SS", "K", "P", "LS", "KR", "PR"):
                        # Find players under this position
                        # ESPN typically lists players in order of depth
                        position_players = []
                        
                        # Try different selectors for finding player names
                        parent = header.locator('xpath=ancestor::*[1]')
                        player_links = parent.locator('a[href*="/player/"]').all()
                        
                        if not player_links:
                            # Try looking in sibling elements
                            player_links = section.locator(f'xpath=//th[contains(text(), "{header_text}")]/following::a[contains(@href, "/player/")]').all()
                        
                        rank = 1
                        for link in player_links[:10]:  # Limit to top 10 per position
                            player_name = link.inner_text().strip()
                            if player_name and len(player_name) > 2:  # Filter out invalid names
                                depth_map[player_name] = {
                                    "position": header_text,
                                    "rank": rank
                                }
                                rank += 1
                                
            except Exception as e:
                continue  # Skip sections that don't parse correctly
        
        # Alternative approach: Look for ordered lists or numbered items
        if not depth_map:
            # Try finding all player links and their context
            all_player_rows = page.locator('[class*="Table__TR"], tr').all()
            current_position = None
            
            for row in all_player_rows:
                row_text = row.inner_text()
                
                # Check if row contains a position header
                for pos in ("QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
                           "DE", "DT", "NT", "LB", "OLB", "ILB", "MLB", "CB", "S", 
                           "FS", "SS", "K", "P", "LS"):
                    if pos in row_text.split():
                        current_position = pos
                        break
                
                # Extract player name if we have a current position
                if current_position:
                    player_links = row.locator('a[href*="/player/"]').all()
                    for link in player_links:
                        player_name = link.inner_text().strip()
                        if player_name and player_name not in depth_map:
                            # Count how many players already at this position
                            rank = sum(1 for v in depth_map.values() if v["position"] == current_position) + 1
                            if rank <= 5:  # Only keep top 5 per position
                                depth_map[player_name] = {
                                    "position": current_position,
                                    "rank": rank
                                }
                    
    except Exception as e:
        print(f"  WARNING: Depth chart scrape failed for {team['name']}: {e}", file=sys.stderr)
    
    return depth_map


def merge_players(api_players, depth_map):
    """Merge API players with depth chart information."""
    seen = {}
    
    for p in api_players:
        name = p["name"]
        seen[name] = p
        
        # Add depth chart info if available
        if name in depth_map:
            depth_info = depth_map[name]
            p["depthChart"] = f"{depth_info['position']}{depth_info['rank']}"
            p["depthRank"] = depth_info["rank"]
        else:
            p["depthChart"] = None
            p["depthRank"] = None
    
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
    elif position in ("OT", "OG", "C", "G", "T", "LT", "RT", "LG", "RG"):
        score += 20  # Offensive line
    elif position in ("DE", "DT", "LB", "OLB", "ILB", "MLB", "EDGE", "NT"):
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
            "depthChart": p.get("depthChart"),
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
    print("NOTE: This uses Playwright to scrape depth charts, which may take several minutes.")
    print()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for i, team in enumerate(TEAMS):
            print(f"[{i + 1}/{len(TEAMS)}] {team['name']}...", end=" ", flush=True)

            api_players = fetch_api_roster(team)
            print(f"API: {len(api_players)}", end="", flush=True)

            time.sleep(0.5)

            depth_map = scrape_depth_chart(page, team)
            print(f", Depth: {len(depth_map)}", end="", flush=True)

            merged = merge_players(api_players, depth_map)
            print(f", merged: {len(merged)}")

            for p in merged:
                p["conference"] = team["conference"]
                p["division"] = team["division"]
                p["team"] = team["name"]
                p["teamId"] = team["id"]

            all_players.extend(merged)
            team_counts[team["name"]] = len(merged)

            # Rate limit
            time.sleep(1)
        
        browser.close()

    print("\n--- Summary ---")
    for team_name, count in sorted(team_counts.items()):
        print(f"  {team_name}: {count} players")
    print(f"\n  Total: {len(all_players)} players")
    
    # Print depth chart statistics
    with_depth = sum(1 for p in all_players if p.get("depthChart"))
    print(f"  Players with depth chart info: {with_depth} ({with_depth/len(all_players)*100:.1f}%)")

    write_players_json(all_players, output_path)


if __name__ == "__main__":
    main()
