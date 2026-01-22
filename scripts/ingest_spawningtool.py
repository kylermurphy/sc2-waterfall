import json
import sys
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BUILD_DIR = Path("../build-advisor/public/build-orders")
INDEX_FILE = BUILD_DIR / "index.json"

BUILD_DIR.mkdir(parents=True, exist_ok=True)

def extract_build_id(url: str) -> str:
    match = re.search(r"/build/(\d+)", url)
    if not match:
        raise ValueError(f"Invalid Spawning Tool URL: {url}")
    return match.group(1)

def load_index():
    if INDEX_FILE.exists():
        return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    return []

def save_index(index):
    INDEX_FILE.write_text(
        json.dumps(index, indent=2),
        encoding="utf-8"
    )

def ingest_build(url: str):
    build_id = extract_build_id(url)
    build_file = BUILD_DIR / f"{build_id}.json"

    if build_file.exists():
        print(f"✔ {build_id} already ingested, skipping")
        return None

    print(f"⏬ Fetching {build_id}")
    res = requests.get(url, timeout=15)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")

    title = soup.select_one("h1")
    title = title.text.strip() if title else f"Build {build_id}"

    race = "Unknown"
    race_el = soup.select_one(".race")
    if race_el:
        race = race_el.text.strip()

    steps = []
    for row in soup.select("table.build-table tr"):
        cols = [c.text.strip() for c in row.select("td")]
        if len(cols) < 3:
            continue

        supply, time, action = cols[:3]
        if ":" not in time:
            continue

        steps.append({
            "supply": int(supply) if supply.isdigit() else supply,
            "time": time,
            "action": action
        })

    if not steps:
        raise RuntimeError(f"No steps parsed for build {build_id}")

    build_data = {
        "name": title,
        "race": race,
        "steps": steps
    }

    build_file.write_text(
        json.dumps(build_data, indent=2),
        encoding="utf-8"
    )

    print(f"💾 Saved {build_file}")
    return { "id": build_id, "name": title }

def expand_inputs(args):
    urls = []
    for arg in args:
        if arg.endswith(".txt"):
            urls.extend(
                line.strip()
                for line in Path(arg).read_text().splitlines()
                if line.strip()
            )
        else:
            urls.append(arg)
    return urls

def main():
    if len(sys.argv) < 2:
        print("Usage: python ingest_spawningtool.py <url | file.txt> [...]")
        sys.exit(1)

    urls = expand_inputs(sys.argv[1:])
    index = load_index()
    index_ids = {b["id"] for b in index}

    new_entries = []

    for url in urls:
        try:
            entry = ingest_build(url)
            if entry and entry["id"] not in index_ids:
                new_entries.append(entry)
        except Exception as e:
            print(f"❌ {url}: {e}")

    if new_entries:
        index.extend(new_entries)
        index.sort(key=lambda b: b["name"].lower())
        save_index(index)
        print(f"📇 index.json updated (+{len(new_entries)})")

if __name__ == "__main__":
    main()
