#!/usr/bin/env python3
"""
DSA Widgets Catalog Scanner & Generator
- Scans all visualizer HTML files in the folder (strictly READ-ONLY).
- Categorizes widgets and extracts tags, titles, and descriptions without modifying files.
- Generates widgets-data.js manifest for the study hub.
"""

import os
import re
import json
import datetime
import subprocess
import shutil
import sys
import argparse
from pathlib import Path

CATEGORY_DEFS = [
    {
        "category": "Complexity & Analysis",
        "icon": "⏱️",
        "color": "#6ea8dd",
        "title_keywords": [
            r"complexity", r"big-o", r"big\s*o", r"asymptotic", r"asymptotics",
            r"speed[-_\s]matters?", r"runtime", r"growth[-_\s]rate", r"time[-_\s]complexity",
            r"why[-_\s]speed", r"linear[-_\s]vs"
        ],
        "content_keywords": [
            r"upper bound", r"omega", r"theta", r"o\(n\)", r"o\(1\)", r"o\(log\s*n\)", 
            r"operations", r"polynomial", r"logarithmic", r"linear\s+scan", r"binary\s+search"
        ]
    },
    {
        "category": "Memory & Architecture",
        "icon": "🧠",
        "color": "#3f8f84",
        "title_keywords": [
            r"malloc", r"calloc", r"dynamic[-_\s]memory", r"heap", r"stack[-_\s]memory",
            r"pointer[-_\s]walkthrough", r"allocation", r"memory[-_\s]layout"
        ],
        "content_keywords": [
            r"stack zone", r"heap zone", r"sizeof", r"struct\s+node", r"address", 
            r"dynamic memory", r"deallocation", r"zone-heap", r"zone-stack"
        ]
    },
    {
        "category": "Linked Lists",
        "icon": "🔗",
        "color": "#c89b3c",
        "title_keywords": [
            r"linked[-_\s]list", r"dummy[-_\s]node", r"middle[-_\s]of",
            r"kth[-_\s]from[-_\s]end", r"singly", r"doubly", r"reverse[-_\s]list",
            r"slow[-_\s]fast", r"tortoise"
        ],
        "content_keywords": [
            r"head->next", r"dummy node", r"slow pointer", r"fast pointer",
            r"node->next", r"curr->next"
        ]
    },
    {
        "category": "Searching & Sorting",
        "icon": "⚡",
        "color": "#e07a5f",
        "title_keywords": [
            r"binary[-_\s]search", r"linear[-_\s]search", r"quicksort", r"mergesort",
            r"bubble[-_\s]sort", r"insertion[-_\s]sort", r"selection[-_\s]sort", r"sorting"
        ],
        "content_keywords": [
            r"pivot element", r"partition", r"midpoint", r"sorted array", r"divide and conquer"
        ]
    },
    {
        "category": "Trees & Graphs",
        "icon": "🌲",
        "color": "#81b29a",
        "title_keywords": [
            r"binary[-_\s]tree", r"bst", r"graph", r"bfs", r"dfs",
            r"tree[-_\s]traversal", r"dijkstra", r"avl[-_\s]tree", r"trie", r"directed[-_\s]graph"
        ],
        "content_keywords": [
            r"root node", r"left child", r"right child", r"adjacency list", r"tree node", r"vertex", r"edges"
        ]
    },
    {
        "category": "Stacks & Queues",
        "icon": "🥞",
        "color": "#f2cc8f",
        "title_keywords": [
            r"stack", r"queue", r"fifo", r"lifo", r"monotonic[-_\s]stack", r"deque"
        ],
        "content_keywords": [
            r"push\(", r"pop\(", r"enqueue", r"dequeue", r"top of stack"
        ]
    },
    {
        "category": "Dynamic Programming",
        "icon": "🧩",
        "color": "#9d4edd",
        "title_keywords": [
            r"dynamic[-_\s]programming", r"memoization", r"tabulation", r"knapsack",
            r"subsequence", r"dp[-_\s]"
        ],
        "content_keywords": [
            r"memo\[", r"dp\[", r"overlapping subproblems", r"optimal substructure"
        ]
    }
]

DEFAULT_CATEGORY = {
    "category": "General DSA",
    "icon": "📚",
    "color": "#c89b3c"
}

def clean_html_text(raw_html):
    """Strip HTML tags, styles, scripts and normalize whitespace."""
    text = re.sub(r'<script[^>]*>[\s\S]*?</script>', ' ', raw_html, flags=re.IGNORECASE)
    text = re.sub(r'<style[^>]*>[\s\S]*?</style>', ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&[a-zA-Z0-9#]+;', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def extract_metadata(file_path):
    """Inspect an HTML file in READ-ONLY mode and extract metadata."""
    filename = file_path.name
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_content = f.read()
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return None

    cleaned_body = clean_html_text(raw_content)

    # 1. Extract <title>
    title_match = re.search(r'<title[^>]*>(.*?)</title>', raw_content, re.IGNORECASE | re.DOTALL)
    if title_match:
        raw_title = clean_html_text(title_match.group(1))
    else:
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', raw_content, re.IGNORECASE | re.DOTALL)
        if h1_match:
            raw_title = clean_html_text(h1_match.group(1))
        else:
            raw_title = filename.replace(".html", "").replace("-", " ").replace("_", " ").title()

    title_parts = re.split(r'\s*[—–]\s*|\s+-\s+', raw_title, maxsplit=1)
    main_title = title_parts[0].strip()
    subtitle = title_parts[1].strip() if len(title_parts) > 1 else ""

    h1_text = ""
    h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', raw_content, re.IGNORECASE | re.DOTALL)
    if h1_match:
        h1_text = clean_html_text(h1_match.group(1))

    # 2. Extract stamp/badge text
    stamp = ""
    stamp_match = re.search(r'class=[\'"][^\'"]*stamp[^\'"]*[\'"][^>]*>(.*?)<', raw_content, re.IGNORECASE)
    if stamp_match:
        stamp = clean_html_text(stamp_match.group(1))
    elif subtitle:
        stamp = subtitle

    # 3. Categorization by weighted scoring
    search_target_title = f"{filename} {raw_title} {h1_text}".lower()
    search_target_content = cleaned_body[:10000].lower()

    best_cat = None
    best_score = 0

    for cat_def in CATEGORY_DEFS:
        score = 0
        for kw in cat_def.get("title_keywords", []):
            if re.search(r'\b' + kw + r'\b', search_target_title):
                score += 50
            elif kw in search_target_title:
                score += 30

        for kw in cat_def.get("content_keywords", []):
            if re.search(r'\b' + kw + r'\b', search_target_content):
                score += 15

        if score > best_score:
            best_score = score
            best_cat = cat_def

    if not best_cat or best_score == 0:
        best_cat = DEFAULT_CATEGORY

    # 4. Description Extraction
    description = ""
    meta_desc = re.search(r'<meta\s+name=[\'"]description[\'"]\s+content=[\'"](.*?)[\'"]', raw_content, re.IGNORECASE)
    if meta_desc:
        description = clean_html_text(meta_desc.group(1))

    if not description:
        p_matches = re.findall(r'<p[^>]*>(.*?)</p>', raw_content, re.IGNORECASE | re.DOTALL)
        for p in p_matches:
            cleaned = clean_html_text(p)
            if len(cleaned) > 28 and not cleaned.startswith("Note:") and "cookie" not in cleaned.lower():
                description = cleaned[:200] + ("..." if len(cleaned) > 200 else "")
                break

    if not description:
        fn_lower = filename.lower()
        if "malloc" in fn_lower:
            description = "Step-by-step visual exploration of allocating struct nodes in Heap vs Stack memory, pointer linking, and struct initialization."
        elif "middle" in fn_lower:
            description = "Interactive visualization of the slow and fast pointer (Tortoise & Hare) algorithm to find the midpoint in a single pass."
        elif "delete-kth" in fn_lower:
            description = "Visual demonstration of two-pointer offset window and sentinel dummy head nodes to safely remove the k-th node from the end."
        elif "speed-matters" in fn_lower:
            description = "Interactive comparison comparing linear scan O(n) against binary search O(log n) efficiency on large datasets."
        elif "complexity" in fn_lower:
            description = "Intuitive field report on Big-O upper bounds, Omega lower bounds, and Theta tight bounds with speed limit analogies."
        else:
            description = f"Interactive visualizer and field study exploring {main_title}."

    # 5. Extract Tags
    tags = set()
    tags.add(best_cat["category"])

    tag_candidates = [
        ("Two Pointers", [r"two[-_\s]pointer", r"slow\s*&\s*fast", r"tortoise", r"middle"]),
        ("Dummy Node", [r"dummy[-_\s]node", r"sentinel", r"dummy[-_\s]head"]),
        ("Dynamic Memory", [r"malloc", r"heap", r"calloc", r"free"]),
        ("Pointers", [r"pointer", r"dereference", r"struct\s+node"]),
        ("Big-O", [r"big-o", r"big\s*o", r"asymptotic", r"time\s*complexity"]),
        ("Binary Search", [r"binary[-_\s]search", r"log\s*n"]),
        ("Linear Search", [r"linear[-_\s]search", r"linear\s+scan"]),
        ("Stack vs Heap", [r"stack\s+zone", r"heap\s+zone", r"zone-stack"]),
        ("Edge Cases", [r"nullbox", r"edge\s*case", r"even-length", r"odd-length"]),
        ("Visual Sim", [r"btnplay", r"btnnext", r"code-panel", r"visualizer"])
    ]

    combined_text = (search_target_title + " " + search_target_content + " " + raw_content[:4000]).lower()
    for tag_name, patterns in tag_candidates:
        if any(re.search(pat, combined_text) for pat in patterns):
            tags.add(tag_name)

    # 6. File statistics & timings
    stat = file_path.stat()
    dt = datetime.datetime.fromtimestamp(stat.st_mtime)
    last_modified = f"{dt.strftime('%b')} {dt.day}, {dt.year}"
    size_kb = round(stat.st_size / 1024, 1)
    lines_count = len(raw_content.splitlines())
    estimated_minutes = 5 if lines_count < 300 else (10 if lines_count < 550 else 15)

    return {
        "id": re.sub(r'[^a-zA-Z0-9_-]', '_', filename.replace('.html', '')),
        "filename": file_path.relative_to(current_dir).as_posix() if 'current_dir' in globals() or 'current_dir' in locals() else filename,
        "title": main_title,
        "subtitle": subtitle or h1_text,
        "stamp": stamp or best_cat["category"].upper(),
        "category": best_cat["category"],
        "categoryIcon": best_cat["icon"],
        "categoryColor": best_cat["color"],
        "description": description,
        "tags": sorted(list(tags))[:4],
        "sizeKb": size_kb,
        "linesCount": lines_count,
        "estimatedMinutes": estimated_minutes,
        "lastModified": last_modified,
        "timestamp": int(stat.st_mtime)
    }

def scan_and_generate():
    current_dir = Path(__file__).resolve().parent
    widgets_subfolder = current_dir / "widgets"
    print(f"Scanning directory (read-only): {current_dir}")

    excluded_files = {"index.html", "dashboard.html", "home.html", "hub.html"}

    html_files = []
    # 1. Scan widgets/ subfolder first if present
    if widgets_subfolder.exists() and widgets_subfolder.is_dir():
        html_files.extend([
            f for f in widgets_subfolder.glob("*.html")
            if f.name.lower() not in excluded_files and not f.name.startswith(".")
        ])

    # 2. Also scan root directory for any widgets
    root_files = [
        f for f in current_dir.glob("*.html")
        if f.name.lower() not in excluded_files and not f.name.startswith(".")
    ]
    for rf in root_files:
        if rf not in html_files:
            html_files.append(rf)

    widgets = []

    for file_path in sorted(html_files, key=lambda f: f.stat().st_mtime, reverse=True):
        meta = extract_metadata(file_path)
        if meta:
            # Ensure filename is relative to root hub directory
            meta["filename"] = file_path.relative_to(current_dir).as_posix()
            widgets.append(meta)
            print(f"  + Indexed [{meta['category']}]: {meta['title']} ({meta['filename']})")

    output_js_path = current_dir / "widgets-data.js"
    json_str = json.dumps(widgets, indent=2, ensure_ascii=False)

    # Check if data actually changed to avoid spurious timestamp-only commits
    data_changed = True
    if output_js_path.exists():
        try:
            old_content = output_js_path.read_text(encoding="utf-8")
            old_match = re.search(r'const\s+DSA_WIDGETS\s*=\s*(\[\s*[\s\S]*?\]);', old_content)
            if old_match:
                old_data = json.loads(old_match.group(1))
                if old_data == widgets:
                    data_changed = False
        except Exception:
            data_changed = True

    if data_changed:
        js_content = f"""// DSA Interactive Hub - Widgets Data Manifest
// Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
// DO NOT EDIT DIRECTLY: Run 'update_widgets.py' or 'update-widgets.bat' to re-index!

const DSA_WIDGETS = {json_str};

if (typeof window !== 'undefined') {{
  window.DSA_WIDGETS = DSA_WIDGETS;
}}

if (typeof module !== 'undefined' && module.exports) {{
  module.exports = DSA_WIDGETS;
}}
"""
        with open(output_js_path, "w", encoding="utf-8") as f:
            f.write(js_content)
        print(f"\n=======================================================")
        print(f"  SUCCESS: {len(widgets)} widgets indexed into {output_js_path.name}!")
        print(f"=======================================================\n")
    else:
        print(f"\n=======================================================")
        print(f"  INDEX UP-TO-DATE: {len(widgets)} widgets unchanged in {output_js_path.name}.")
        print(f"=======================================================\n")

    return widgets

def sync_to_github(widgets, current_dir=None):
    """
    Check for git changes, generate a meaningful commit message indicating
    new additions and updates, commit the changes, and push to GitHub.
    """
    if current_dir is None:
        current_dir = Path(__file__).resolve().parent

    if not (current_dir / ".git").exists():
        print("[GIT] No .git directory found. Skipping GitHub sync.")
        return False

    if not shutil.which("git"):
        print("[GIT WARNING] 'git' is not installed or not in your PATH. Skipping GitHub sync.")
        return False

    try:
        # Check if there are any working tree changes or untracked files
        status_proc = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=current_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        status_output = status_proc.stdout.strip()
        if not status_output:
            print("[GIT] Working tree is clean. No changes to commit or push.")
            return True

        # Map widget filename / path to metadata
        widget_map = {}
        for w in widgets:
            rel = w.get("filename", "").replace("\\", "/")
            base = Path(rel).name
            widget_map[rel] = w
            widget_map[base] = w

        # Stage all changes
        subprocess.run(["git", "add", "-A"], cwd=current_dir, check=True)

        # Inspect staged changes
        diff_proc = subprocess.run(
            ["git", "diff", "--cached", "--name-status"],
            cwd=current_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        staged_lines = [l.strip() for l in diff_proc.stdout.strip().splitlines() if l.strip()]
        if not staged_lines:
            print("[GIT] No staged changes found.")
            return True

        excluded_files = {"index.html", "dashboard.html", "home.html", "hub.html"}
        new_widgets = []
        updated_widgets = []
        deleted_widgets = []
        other_files = []

        for line in staged_lines:
            parts = line.split(maxsplit=1)
            if len(parts) != 2:
                continue
            status_code = parts[0]
            file_rel = parts[1].replace("\\", "/")
            fname = Path(file_rel).name

            is_widget = (file_rel.startswith("widgets/") or file_rel.endswith(".html")) and fname.lower() not in excluded_files

            meta = widget_map.get(file_rel) or widget_map.get(fname)
            title = meta.get("title") if meta else fname.replace(".html", "").replace("-", " ").replace("_", " ").title()
            category = meta.get("category", "") if meta else ""

            if is_widget:
                if status_code.startswith("A") or status_code.startswith("?"):
                    new_widgets.append({"title": title, "file": file_rel, "category": category})
                elif status_code.startswith("M"):
                    updated_widgets.append({"title": title, "file": file_rel, "category": category})
                elif status_code.startswith("D"):
                    deleted_widgets.append({"title": title, "file": file_rel, "category": category})
                elif status_code.startswith("R"):
                    new_widgets.append({"title": title, "file": file_rel, "category": category})
            else:
                other_files.append({"file": file_rel, "status": status_code})

        # Check if ONLY widgets-data.js changed with no widget additions, edits, or other file changes
        if not new_widgets and not updated_widgets and not deleted_widgets:
            non_manifest_others = [f for f in other_files if f["file"] != "widgets-data.js"]
            if not non_manifest_others:
                subprocess.run(["git", "restore", "--staged", "widgets-data.js"], cwd=current_dir, check=False)
                subprocess.run(["git", "restore", "widgets-data.js"], cwd=current_dir, check=False)
                print("[GIT] Working tree is clean. No widget additions or modifications to commit.")
                return True

        # Generate commit subject
        if new_widgets and not updated_widgets:
            if len(new_widgets) == 1:
                commit_subject = f"Add new widget: {new_widgets[0]['title']}"
            elif len(new_widgets) <= 3:
                titles = ", ".join(w["title"] for w in new_widgets)
                commit_subject = f"Add new widgets: {titles}"
            else:
                commit_subject = f"Add {len(new_widgets)} new widgets ({new_widgets[0]['title']} and others)"
        elif new_widgets and updated_widgets:
            if len(new_widgets) == 1:
                commit_subject = f"Add {new_widgets[0]['title']} and update existing visualizers"
            else:
                commit_subject = f"Add {len(new_widgets)} new widgets and update catalog"
        elif updated_widgets and not new_widgets:
            if len(updated_widgets) == 1:
                commit_subject = f"Update widget: {updated_widgets[0]['title']}"
            else:
                titles = ", ".join(w["title"] for w in updated_widgets[:3])
                commit_subject = f"Update widgets: {titles}"
        elif deleted_widgets:
            commit_subject = f"Remove widget: {deleted_widgets[0]['title']}"
        else:
            commit_subject = "Update widgets catalog and manifest"

        # Generate commit body
        body_lines = []
        if new_widgets:
            body_lines.append("New Additions:")
            for w in new_widgets:
                cat_info = f" [{w['category']}]" if w['category'] else ""
                body_lines.append(f"  + {w['title']}{cat_info} ({w['file']})")
        if updated_widgets:
            body_lines.append("Updated Widgets:")
            for w in updated_widgets:
                body_lines.append(f"  ~ {w['title']} ({w['file']})")
        if deleted_widgets:
            body_lines.append("Removed Widgets:")
            for w in deleted_widgets:
                body_lines.append(f"  - {w['title']} ({w['file']})")
        if other_files:
            body_lines.append("Other Changed Files:")
            for of in other_files:
                body_lines.append(f"  * {of['file']}")

        commit_body = "\n".join(body_lines)

        print(f"=======================================================")
        print(f"  [GIT] Committing changes...")
        print(f"  Subject: {commit_subject}")
        print(f"=======================================================")

        commit_cmd = ["git", "commit", "-m", commit_subject]
        if commit_body:
            commit_cmd.extend(["-m", commit_body])

        subprocess.run(commit_cmd, cwd=current_dir, check=True)
        print("[GIT] Changes successfully committed locally.")

        print("\n[GIT] Pushing commit to GitHub (origin)...")
        push_res = subprocess.run(
            ["git", "push"],
            cwd=current_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if push_res.returncode == 0:
            print("=======================================================")
            print("  SUCCESS: Pushed to GitHub successfully!")
            print(f"  Commit: \"{commit_subject}\"")
            print("=======================================================\n")
            return True
        else:
            # Check if remote has changes that need pull --rebase
            err_msg = push_res.stderr.strip()
            if any(term in err_msg.lower() for term in ["fetch first", "rejected", "non-fast-forward"]):
                print("[GIT INFO] Remote has newer commits. Attempting 'git pull --rebase' before pushing...")
                pull_res = subprocess.run(["git", "pull", "--rebase"], cwd=current_dir, check=False)
                if pull_res.returncode == 0:
                    retry_push = subprocess.run(["git", "push"], cwd=current_dir, check=False)
                    if retry_push.returncode == 0:
                        print("=======================================================")
                        print("  SUCCESS: Rebased and pushed to GitHub successfully!")
                        print(f"  Commit: \"{commit_subject}\"")
                        print("=======================================================\n")
                        return True
            print(f"\n[GIT WARNING] Failed to push to GitHub: {err_msg}")
            print("[GIT INFO] Your changes have been committed locally. Run 'git push' when your connection is ready.")
            return False

    except subprocess.CalledProcessError as e:
        err = e.stderr.strip() if e.stderr else str(e)
        print(f"\n[GIT ERROR] Command failed: {err}")
        return False
    except Exception as e:
        print(f"\n[GIT ERROR] Unexpected error during sync: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="DSA Widgets Catalog Scanner & GitHub Sync")
    parser.add_argument("--no-push", action="store_true", help="Skip git commit and push to GitHub")
    args = parser.parse_args()

    widgets = scan_and_generate()
    if not args.no_push:
        sync_to_github(widgets)

if __name__ == "__main__":
    main()
