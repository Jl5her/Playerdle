#!/usr/bin/env python3
"""
Simple depth chart scraper using Playwright.
Scrapes ESPN depth chart pages and outputs depth chart data to merge with rosters.
"""

import json
import time
from playwright.sync_api import sync_playwright

TEAMS = [
    {"abbr": "buf", "slug": "buffalo-bills", "name": "Buffalo Bills"},
    {"abbr": "mia", "slug": "miami-dolphins", "name": "Miami Dolphins"},
    {"abbr": "ne", "slug": "new-england-patriots", "name": "New England Patriots"},
    {"abbr": "nyj", "slug": "new-york-jets", "name": "New York Jets"},
    {"abbr": "bal", "slug": "baltimore-ravens", "name": "Baltimore Ravens"},
    {"abbr": "cin", "slug": "cincinnati-bengals", "name": "Cincinnati Bengals"},
    {"abbr": "cle", "slug": "cleveland-browns", "name": "Cleveland Browns"},
    {"abbr": "pit", "slug": "pittsburgh-steelers", "name": "Pittsburgh Steelers"},
    {"abbr": "hou", "slug": "houston-texans", "name": "Houston Texans"},
    {"abbr": "ind", "slug": "indianapolis-colts", "name": "Indianapolis Colts"},
    {"abbr": "jax", "slug": "jacksonville-jaguars", "name": "Jacksonville Jaguars"},
    {"abbr": "ten", "slug": "tennessee-titans", "name": "Tennessee Titans"},
    {"abbr": "den", "slug": "denver-broncos", "name": "Denver Broncos"},
    {"abbr": "kc", "slug": "kansas-city-chiefs", "name": "Kansas City Chiefs"},
    {"abbr": "lv", "slug": "las-vegas-raiders", "name": "Las Vegas Raiders"},
    {"abbr": "lac", "slug": "los-angeles-chargers", "name": "Los Angeles Chargers"},
    {"abbr": "dal", "slug": "dallas-cowboys", "name": "Dallas Cowboys"},
    {"abbr": "nyg", "slug": "new-york-giants", "name": "New York Giants"},
    {"abbr": "phi", "slug": "philadelphia-eagles", "name": "Philadelphia Eagles"},
    {"abbr": "wsh", "slug": "washington-commanders", "name": "Washington Commanders"},
    {"abbr": "chi", "slug": "chicago-bears", "name": "Chicago Bears"},
    {"abbr": "det", "slug": "detroit-lions", "name": "Detroit Lions"},
    {"abbr": "gb", "slug": "green-bay-packers", "name": "Green Bay Packers"},
    {"abbr": "min", "slug": "minnesota-vikings", "name": "Minnesota Vikings"},
    {"abbr": "atl", "slug": "atlanta-falcons", "name": "Atlanta Falcons"},
    {"abbr": "car", "slug": "carolina-panthers", "name": "Carolina Panthers"},
    {"abbr": "no", "slug": "new-orleans-saints", "name": "New Orleans Saints"},
    {"abbr": "tb", "slug": "tampa-bay-buccaneers", "name": "Tampa Bay Buccaneers"},
    {"abbr": "ari", "slug": "arizona-cardinals", "name": "Arizona Cardinals"},
    {"abbr": "lar", "slug": "los-angeles-rams", "name": "Los Angeles Rams"},
    {"abbr": "sf", "slug": "san-francisco-49ers", "name": "San Francisco 49ers"},
    {"abbr": "sea", "slug": "seattle-seahawks", "name": "Seattle Seahawks"},
]

DEPTH_CHART_URL = "https://www.espn.com/nfl/team/depth/_/name/{abbr}/{slug}"


def scrape_depth_chart(page, team):
    """Scrape depth chart and return list of {name, position, rank}."""
    url = DEPTH_CHART_URL.format(abbr=team["abbr"], slug=team["slug"])
    depth_data = []
    
    try:
        print(f"  Loading {url}...")
        page.goto(url, wait_until="domcontentloaded", timeout=20000)
        page.wait_for_timeout(2000)  # Give page time to render
        
        # Save HTML for debugging
        html = page.content()
        
        # Look for depth chart tables
        # ESPN uses Table__TR class for rows
        rows = page.locator('tr.Table__TR').all()
        
        current_position = None
        position_counts = {}
        
        for row in rows:
            try:
                cells = row.locator('td').all()
                if not cells:
                    continue
                
                # First cell often contains position or player name
                first_cell_text = cells[0].inner_text().strip() if cells else ""
                
                # Check if this row is a position header
                is_position = any(pos in first_cell_text for pos in [
                    "QUARTERBACK", "RUNNING BACK", "FULLBACK", "WIDE RECEIVER",
                    "TIGHT END", "LEFT TACKLE", "LEFT GUARD", "CENTER",
                    "RIGHT GUARD", "RIGHT TACKLE", "DEFENSIVE END",
                    "DEFENSIVE TACKLE", "LINEBACKER", "CORNERBACK",
                    "SAFETY", "KICKER", "PUNTER", "LONG SNAPPER"
                ])
                
                if is_position:
                    # Map full name to abbreviation
                    pos_map = {
                        "QUARTERBACK": "QB", "RUNNING BACK": "RB", "FULLBACK": "FB",
                        "WIDE RECEIVER": "WR", "TIGHT END": "TE",
                        "LEFT TACKLE": "LT", "LEFT GUARD": "LG", "CENTER": "C",
                        "RIGHT GUARD": "RG", "RIGHT TACKLE": "RT",
                        "DEFENSIVE END": "DE", "DEFENSIVE TACKLE": "DT",
                        "LINEBACKER": "LB", "CORNERBACK": "CB", "SAFETY": "S",
                        "KICKER": "K", "PUNTER": "P", "LONG SNAPPER": "LS"
                    }
                    for full_name, abbr in pos_map.items():
                        if full_name in first_cell_text:
                            current_position = abbr
                            position_counts[abbr] = 0
                            break
                    continue
                
                # Extract player name from links
                if current_position:
                    player_links = row.locator('a[href*="/player/"]').all()
                    for link in player_links:
                        player_name = link.inner_text().strip()
                        if player_name:
                            position_counts[current_position] += 1
                            rank = position_counts[current_position]
                            
                            depth_data.append({
                                "name": player_name,
                                "position": current_position,
                                "rank": rank,
                                "depthChart": f"{current_position}{rank}"
                            })
                            
            except Exception as e:
                continue
        
        print(f"  Found {len(depth_data)} players in depth chart")
        
    except Exception as e:
        print(f"  ERROR scraping {team['name']}: {e}")
    
    return depth_data


def main():
    all_depth_data = {}
    
    print("Scraping depth charts from ESPN...")
    print(f"This will scrape {len(TEAMS)} teams\n")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for i, team in enumerate(TEAMS):
            print(f"[{i+1}/{len(TEAMS)}] {team['name']}")
            
            depth_data = scrape_depth_chart(page, team)
            all_depth_data[team['name']] = depth_data
            
            time.sleep(1)  # Rate limit
        
        browser.close()
    
    # Save to JSON file
    output_path = "../depth_chart_data.json"
    with open(output_path, "w") as f:
        json.dump(all_depth_data, f, indent=2)
    
    print(f"\nSaved depth chart data to {output_path}")
    
    total_players = sum(len(v) for v in all_depth_data.values())
    print(f"Total players with depth chart data: {total_players}")


if __name__ == "__main__":
    main()
