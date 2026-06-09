#!/usr/bin/env python3
"""graphify-orient: thin graph-first helper for this repo.

Subcommands:
  orient            Freshness verdict + one-screen god-node / community map.
  blast "<symbol>"  Freshness verdict + `graphify affected` blast radius, with an
                    honest under-recall warning when the graph returns little.

The freshness GATE is the point: graphify stamps graph.json with `built_at_commit`,
but nothing checks it at query time. This compares that stamp to HEAD (and looks for
the needs_update flag / a dirty working tree) and labels the graph GROUND TRUTH or
HINT so the agent never silently trusts a stale graph. Phase 0 showed the graph is
authoritative for function/import/call structure but under-recalls non-function value
bindings and field-level data flow -- there, fall back to grep.
"""
import json, subprocess, sys, shutil
from pathlib import Path

OUT = Path("graphify-out")
GRAPH = OUT / "graph.json"


def _git(*args):
    try:
        return subprocess.run(["git", *args], capture_output=True, text=True,
                              timeout=5).stdout.strip()
    except Exception:
        return ""


def freshness():
    """Return (verdict, detail). verdict is 'GROUND TRUTH' or 'HINT'."""
    if not GRAPH.exists():
        return "HINT", "no graphify-out/graph.json - run a build first"
    if (OUT / "needs_update").exists() or (OUT / ".needs_update").exists():
        return "HINT", "needs_update flag set (doc/semantic change pending `graphify update .`)"
    built = json.loads(GRAPH.read_text(encoding="utf-8")).get("built_at_commit")
    head = _git("rev-parse", "HEAD")
    if not built:
        return "HINT", "graph.json has no built_at_commit stamp"
    code = (".ts", ".tsx", ".js", ".jsx")
    # Uncommitted code edits in the working tree -- checked regardless of HEAD position.
    dirty_code = [l[3:].strip() for l in _git("status", "--porcelain").splitlines()
                  if l.strip().endswith(code)]
    # Code committed since the graph was built (HEAD has moved past built_at_commit).
    changed_code, noncode = [], 0
    if built != head:
        changed = [f for f in _git("diff", "--name-only", built, "HEAD").splitlines() if f]
        changed_code = [f for f in changed if f.endswith(code)]
        noncode = len(changed) - len(changed_code)
    if dirty_code or changed_code:
        detail = f"graph built at {built[:7]}, HEAD {head[:7]}; code out of sync:"
        detail += "".join(f"\n  committed:   {f}" for f in changed_code)
        detail += "".join(f"\n  uncommitted: {f}" for f in dirty_code)
        return "HINT", detail
    note = "tree clean" if built == head else f"{noncode} non-code change(s) since build; code topology unchanged"
    return "GROUND TRUTH", f"built_at_commit {built[:7]} vs HEAD {head[:7]} ({note})"


def _print_verdict():
    v, d = freshness()
    bar = "=" * 60
    print(f"{bar}\nGRAPH FRESHNESS: {v}\n  {d}\n{bar}")
    if v == "HINT":
        print("  -> Treat graph answers as hints; verify changed files directly.\n")
    return v


def orient():
    _print_verdict()
    report = OUT / "GRAPH_REPORT.md"
    if report.exists():
        print("Map (god nodes / communities from GRAPH_REPORT.md):\n")
        text = report.read_text(encoding="utf-8")
        for header in ("## God Nodes", "## Communities", "## Suggested Questions"):
            i = text.find(header)
            if i != -1:
                j = text.find("\n## ", i + 1)
                print(text[i:j if j != -1 else i + 1200].strip(), "\n")
    else:
        print("No GRAPH_REPORT.md. Run the build to generate the map.")


def blast(symbol):
    _print_verdict()
    if not shutil.which("graphify"):
        print("graphify CLI not found on PATH.")
        return
    res = subprocess.run(["graphify", "affected", symbol], capture_output=True, text=True)
    out = res.stdout.strip()
    print(out or res.stderr.strip())
    if "No affected nodes found" in out or out.count("\n") < 3:
        print(f"\n[!] Sparse blast radius for {symbol!r}. Phase 0 caveat: the AST graph "
              f"under-recalls non-function value bindings (const/options objects) and field-level "
              f"data flow. Confirm with: grep -rn \"{symbol}\" --include=*.ts --include=*.tsx .")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "orient"
    if cmd == "orient":
        orient()
    elif cmd == "blast" and len(sys.argv) > 2:
        blast(sys.argv[2])
    else:
        print(__doc__)
        sys.exit(1)
