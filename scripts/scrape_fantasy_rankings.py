#!/usr/bin/env python3
"""
Scrape FantasyPros rankings to build a fantasy-focused player database.
Separate from the main players.json database.
"""

import json
import time
import argparse
from pathlib import Path
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup

# Default position rankings to scrape
DEFAULT_POSITIONS = {
    "QB": 50,
    "RB": 75,
    "WR": 100,
    "TE": 60,
    "K": 25,
    "DL": 25,
    "LB": 50,
    "DB": 45,
}

# FantasyPros position mapping
FANTASYPROS_POSITIONS = {
    "QB": "qb",
    "RB": "rb",
    "WR": "wr",
    "TE": "te",
    "K": "k",
    "DL": "dl",
    "LB": "lb",
    "DB": "db",
}


def load_nfl_player_data():
    """Load existing NFL player data and teams to enrich fantasy rankings with team info."""
    script_dir = Path(__file__).parent
    players_file = script_dir.parent / "src" / "data" / "players.json"
    teams_file = script_dir.parent / "src" / "data" / "teams.json"
    
    if not players_file.exists():
        print("Warning: players.json not found. Team enrichment will be limited.")
        return []
    
    # Load teams data
    teams = {}
    if teams_file.exists():
        with open(teams_file, 'r') as f:
            teams = json.load(f)
    
    # Load players and enrich with team info
    with open(players_file, 'r') as f:
        players = json.load(f)
    
    # Add team info to each player
    for player in players:
        team_id = str(player.get('teamId', ''))
        if team_id in teams:
            player['team'] = teams[team_id].get('abbr', '').upper()
            player['conference'] = teams[team_id].get('conference')
            player['division'] = teams[team_id].get('division')
    
    return players


def find_player_team_info(player_name: str, position: str, nfl_data: List[Dict]) -> Optional[Dict]:
    """
    Find team information for a player from the NFL database.
    Returns dict with team, conference, division, number if found.
    """
    # Normalize name for comparison
    normalized_search = player_name.lower().strip()
    
    for player in nfl_data:
        normalized_player = player['name'].lower().strip()
        
        # Exact match
        if normalized_player == normalized_search:
            return {
                "team": player.get("team"),
                "conference": player.get("conference"),
                "division": player.get("division"),
                "number": player.get("number"),
            }
        
        # Partial match (last name match for common cases)
        search_parts = normalized_search.split()
        player_parts = normalized_player.split()
        if search_parts and player_parts and search_parts[-1] == player_parts[-1]:
            # Check position matches if available
            if player.get("position") == position:
                return {
                    "team": player.get("team"),
                    "conference": player.get("conference"),
                    "division": player.get("division"),
                    "number": player.get("number"),
                }
    
    return None


def scrape_fantasypros_rankings(position: str, top_n: int) -> List[Dict]:
    """
    Scrape FantasyPros stats for a specific position.
    Uses stats pages which show all players regardless of byes/playoffs.
    Returns list of players with rank, name, and position.
    """
    fp_position = FANTASYPROS_POSITIONS.get(position)
    if not fp_position:
        print(f"Warning: Position {position} not mapped for FantasyPros")
        return []
    
    # FantasyPros stats URL - shows all players regardless of bye weeks or playoffs
    url = f"https://www.fantasypros.com/nfl/stats/{fp_position}.php"
    
    print(f"Scraping {position} stats from {url}...")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        players = []
        
        # Stats pages typically use table id="data"
        table = soup.find('table', {'id': 'data'}) or soup.find('table', class_='table')
        
        if not table:
            print(f"Warning: Could not find stats table for {position}")
            return []
        
        tbody = table.find('tbody')
        if not tbody:
            print(f"Warning: Could not find tbody for {position}")
            return []
            
        rows = tbody.find_all('tr')
        
        for idx, row in enumerate(rows[:top_n], 1):
            try:
                # Stats pages use player-label class or fp-player-link
                player_cell = row.find('td', class_='player-label') or row.find('a', class_='fp-player-link')
                
                if not player_cell:
                    # Fallback to first td
                    cols = row.find_all('td')
                    if cols:
                        player_cell = cols[0]
                
                if player_cell:
                    player_name = player_cell.get_text(strip=True)
                    
                    # Clean up name (remove team info in parentheses)
                    player_name = player_name.split('(')[0].strip()
                    
                    if player_name:
                        players.append({
                            "rank": idx,
                            "name": player_name,
                            "position": position,
                        })
            except Exception as e:
                print(f"Error parsing row {idx} for {position}: {e}")
                continue
        
        print(f"  Found {len(players)} {position} players")
        return players
        
    except requests.RequestException as e:
        print(f"Error fetching {position} stats: {e}")
        return []


def enrich_fantasy_data(fantasy_players: List[Dict], nfl_data: List[Dict]) -> List[Dict]:
    """
    Enrich fantasy rankings with NFL team data.
    """
    enriched = []
    
    for player in fantasy_players:
        team_info = find_player_team_info(player['name'], player['position'], nfl_data)
        
        enriched_player = {
            **player,
            "team": team_info['team'] if team_info else None,
            "conference": team_info['conference'] if team_info else None,
            "division": team_info['division'] if team_info else None,
            "number": team_info['number'] if team_info else None,
        }
        
        enriched.append(enriched_player)
    
    return enriched


def main():
    parser = argparse.ArgumentParser(
        description="Scrape FantasyPros rankings for fantasy player database"
    )
    parser.add_argument(
        '--positions',
        type=str,
        help='JSON string of positions and counts, e.g. \'{"QB": 50, "RB": 75}\'',
        default=None
    )
    parser.add_argument(
        '--output',
        type=str,
        default='fantasy_players.json',
        help='Output filename (default: fantasy_players.json)'
    )
    parser.add_argument(
        '--delay',
        type=float,
        default=1.0,
        help='Delay between requests in seconds (default: 1.0)'
    )
    
    args = parser.parse_args()
    
    # Parse position configuration
    if args.positions:
        try:
            positions_config = json.loads(args.positions)
        except json.JSONDecodeError:
            print("Error: Invalid JSON for positions argument")
            return
    else:
        positions_config = DEFAULT_POSITIONS
    
    print("Fantasy Rankings Scraper")
    print("=" * 50)
    print(f"Positions to scrape: {positions_config}")
    print()
    
    # Load NFL data for enrichment
    nfl_data = load_nfl_player_data()
    print(f"Loaded {len(nfl_data)} NFL players for team enrichment")
    print()
    
    # Scrape each position
    all_fantasy_players = []
    
    for position, count in positions_config.items():
        players = scrape_fantasypros_rankings(position, count)
        all_fantasy_players.extend(players)
        time.sleep(args.delay)  # Be respectful to the server
    
    print()
    print(f"Total fantasy players scraped: {len(all_fantasy_players)}")
    
    # Enrich with team data
    print("Enriching with NFL team data...")
    enriched_players = enrich_fantasy_data(all_fantasy_players, nfl_data)
    
    # Count how many have team info
    with_team = sum(1 for p in enriched_players if p['team'])
    print(f"  {with_team}/{len(enriched_players)} players matched with team data")
    
    # Save to output file
    script_dir = Path(__file__).parent
    output_path = script_dir.parent / "src" / "data" / args.output
    
    with open(output_path, 'w') as f:
        json.dump(enriched_players, f, indent=2)
    
    print()
    print(f"✓ Fantasy player database saved to {output_path}")
    print(f"  Total players: {len(enriched_players)}")
    
    # Print summary by position
    print("\nBreakdown by position:")
    for position in positions_config.keys():
        pos_count = sum(1 for p in enriched_players if p['position'] == position)
        pos_with_team = sum(1 for p in enriched_players if p['position'] == position and p['team'])
        print(f"  {position}: {pos_count} players ({pos_with_team} with team data)")


if __name__ == "__main__":
    main()
