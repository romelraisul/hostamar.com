#!/usr/bin/env python3
"""Parse upstream Hermes Agent / Gemini API release notes into structured JSON."""
import argparse
import json
import sys
from datetime import datetime
from urllib.request import urlopen, Request


def fetch_gemini_release_notes():
    """Fetch Gemini API release notes from ai.google.dev."""
    url = "https://ai.google.dev/gemini-api/docs/release-notes"
    try:
        req = Request(url, headers={"User-Agent": "HermesAgent/1.0"})
        with urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8")
    except Exception as e:
        print(f"WARNING: Could not fetch Gemini release notes: {e}", file=sys.stderr)
        return []

    # Minimal parsing: find h2 version headers + following list items
    entries = []
    current_version = ""
    in_h2 = False
    in_li = False
    current_text = ""

    for line in html.split("\n"):
        line_stripped = line.strip()
        # Version header (h2)
        if "<h2" in line_stripped.lower() or line_stripped.startswith("<h2>"):
            in_h2 = True
            # Extract text between > and <
            if ">" in line_stripped and "<" in line_stripped:
                current_version = line_stripped.split(">", 1)[1].split("<", 1)[0].strip()
        elif "</h2>" in line_stripped.lower():
            in_h2 = False
        # List items
        elif "<li" in line_stripped.lower() or line_stripped.startswith("<li>"):
            in_li = True
            current_text = ""
            if ">" in line_stripped and "<" in line_stripped:
                current_text = line_stripped.split(">", 1)[1].split("<", 1)[0].strip()
        elif "</li>" in line_stripped.lower() and in_li:
            if current_text.strip():
                entries.append({"version": current_version, "text": current_text.strip()})
            in_li = False
            current_text = ""
        elif in_li:
            # Continuation text (strip tags)
            clean = line_stripped
            for tag in ["<p>", "</p>", "<strong>", "</strong>", "<em>", "</em>", "<code>", "</code>"]:
                clean = clean.replace(tag, "")
            if clean.strip():
                current_text += " " + clean.strip()

    return entries


def classify_entry(text):
    """Classify a release note entry as feature/fix/breaking/deprecated."""
    text_lower = text.lower()
    if any(kw in text_lower for kw in ["breaking", "remove", "deprecat", "drop support", "no longer"]):
        return "breaking"
    if any(kw in text_lower for kw in ["fix", "bug", "patch", "resolve", "correct", "issue"]):
        return "fix"
    if any(kw in text_lower for kw in ["deprecat", "will be removed", "sunset"]):
        return "deprecated"
    return "feature"


def assess_hostamar_impact(entry_type, text):
    """Assess whether an upstream change affects hostamar-build."""
    text_lower = text.lower()
    if entry_type == "breaking":
        return "high"
    if any(kw in text_lower for kw in ["security", "auth", "token", "api key", "oauth", "credential"]):
        return "high"
    if any(kw in text_lower for kw in ["new model", "vision", "audio", "video", "code", "multimodal"]):
        return "medium"
    if any(kw in text_lower for kw in ["skill", "tool", "command", "api", "endpoint"]):
        return "medium"
    return "low"


def parse_upstream(source, output_path):
    """Parse upstream release notes and write structured JSON."""
    if source == "gemini-api":
        entries = fetch_gemini_release_notes()
    else:
        print(f"Unknown source: {source}", file=sys.stderr)
        sys.exit(1)

    result = {
        "version": "latest",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "source": source,
        "features": [],
        "fixes": [],
        "breaking": [],
        "deprecated": [],
        "summary": ""
    }

    for entry in entries:
        text = entry.get("text", "")
        if not text.strip():
            continue
        etype = classify_entry(text)
        impact = assess_hostamar_impact(etype, text)
        item = {
            "text": text,
            "hostamar_impact": impact,
            "notes": ""
        }
        if etype == "feature":
            result["features"].append(item)
        elif etype == "fix":
            result["fixes"].append(item)
        elif etype == "breaking":
            result["breaking"].append(item)
        elif etype == "deprecated":
            result["deprecated"].append(item)

    high_impact = len(result["breaking"])
    result["summary"] = (
        f"Parsed {len(entries)} entries from {source}: "
        f"{len(result['features'])} features, {len(result['fixes'])} fixes, "
        f"{len(result['breaking'])} breaking, {len(result['deprecated'])} deprecated. "
        f"{high_impact} high-impact items for hostamar-build."
    )

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"Wrote {output_path}: {len(entries)} entries, {high_impact} high-impact")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse upstream release notes")
    parser.add_argument("--source", choices=["gemini-api"], required=True,
                        help="Upstream source to parse")
    parser.add_argument("--output", required=True, help="Output JSON path")
    args = parser.parse_args()
    parse_upstream(args.source, args.output)
