import sqlite3
import json
from datetime import datetime
from collections import defaultdict

def parse_firefox_places(path):
    conn = sqlite3.connect(path)
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            moz_places.url,
            moz_places.title,
            moz_places.visit_count,
            moz_historyvisits.visit_date
        FROM moz_places
        JOIN moz_historyvisits
            ON moz_places.id = moz_historyvisits.place_id
        WHERE moz_places.url NOT NULL
        ORDER BY moz_historyvisits.visit_date ASC;
    """)

    entries = defaultdict(lambda: {
        "type": "browser",
        "url": "",
        "title": "",
        "timestamps": [],
        "visit_count": 0
    })

    for url, title, visit_count, visit_date in cur.fetchall():
        if not url or not visit_date:
            continue

        ts = datetime.utcfromtimestamp(visit_date / 1_000_000).isoformat()

        if entries[url]["url"] == "":
            entries[url]["url"] = url
            entries[url]["title"] = title or ""
            entries[url]["visit_count"] = visit_count

        entries[url]["timestamps"].append(ts)

    conn.close()

    # Convert dict → array
    return list(entries.values())


if __name__ == "__main__":
    path = input("Path to places.sqlite: ").strip()
    events = parse_firefox_places(path)

    out = "history_firefox.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)

    print(f"\nExported {len(events)} grouped history entries → {out}")
