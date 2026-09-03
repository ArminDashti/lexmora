#!/usr/bin/env python3
"""Split t3_import.sql into small statement batches for D1 HTTP API."""
from __future__ import annotations

import json
import re
from pathlib import Path

SQL = Path(__file__).resolve().parent / "t3_import.sql"
OUT_DIR = Path(__file__).resolve().parent / "d1_batches"
DB_ID = "3ba3926f-5411-43fd-85a3-bdd66645cd88"
ACCOUNT = "0b9173381c4580ae6fc430fff3d08018"


def split_statements(text: str) -> list[str]:
    # Simple split on ';\n' — statements do not contain bare semicolon-newline inside strings
    # because we escaped quotes only. Content may have semicolons mid-string though.
    # Safer: parse line-oriented INSERTs (each statement is one logical SQL ending with ;)
    stmts: list[str] = []
    buf: list[str] = []
    in_str = False
    i = 0
    s = text
    while i < len(s):
        ch = s[i]
        if ch == "'" and in_str:
            if i + 1 < len(s) and s[i + 1] == "'":
                buf.append("''")
                i += 2
                continue
            in_str = False
            buf.append(ch)
            i += 1
            continue
        if ch == "'" and not in_str:
            in_str = True
            buf.append(ch)
            i += 1
            continue
        if ch == ";" and not in_str:
            stmt = "".join(buf).strip()
            if stmt and stmt.upper() not in ("BEGIN TRANSACTION", "COMMIT"):
                stmts.append(stmt)
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail and tail.upper() not in ("BEGIN TRANSACTION", "COMMIT"):
        stmts.append(tail)
    return stmts


def main() -> None:
    stmts = split_statements(SQL.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(exist_ok=True)
    # Batch by approximate size (~80KB soft limit for D1 query body)
    batches: list[list[str]] = []
    cur: list[str] = []
    size = 0
    for st in stmts:
        add = len(st) + 2
        if cur and size + add > 80_000:
            batches.append(cur)
            cur = []
            size = 0
        cur.append(st)
        size += add
    if cur:
        batches.append(cur)

    manifest = []
    for idx, batch in enumerate(batches):
        path = OUT_DIR / f"batch_{idx:03d}.sql"
        path.write_text(";\n".join(batch) + ";\n", encoding="utf-8")
        # Also JSON array of statements for API that accepts sql as single string with multiple
        jpath = OUT_DIR / f"batch_{idx:03d}.json"
        # D1 API accepts one sql string; join with semicolons
        payload = {"sql": ";\n".join(batch)}
        jpath.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        manifest.append({"index": idx, "statements": len(batch), "bytes": path.stat().st_size})
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"statements={len(stmts)} batches={len(batches)}")
    for m in manifest:
        print(m)


if __name__ == "__main__":
    main()
