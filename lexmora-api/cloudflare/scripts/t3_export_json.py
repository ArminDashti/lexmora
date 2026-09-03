#!/usr/bin/env python3
"""Export Lexmora Postgres tables from Irancell-T3 to local JSON for D1 import."""
from __future__ import annotations

import base64
import json
import subprocess
import sys
from pathlib import Path

KEY = Path.home() / ".ssh" / "id_ed25519_cloud-admin_2-144-27-74"
HOST = "cloud-admin@2.144.27.124"
PORT = "443"
OUT = Path(__file__).resolve().parent / "t3_export.json"

REMOTE_SQL = r"""
SELECT json_build_object(
  'users', (SELECT COALESCE(json_agg(row_to_json(u)), '[]'::json) FROM users u),
  'app_settings', (SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) FROM app_settings s),
  'instructions', (SELECT COALESCE(json_agg(row_to_json(i)), '[]'::json) FROM instructions i),
  'history', (SELECT COALESCE(json_agg(row_to_json(h)), '[]'::json) FROM history h)
);
""".strip()


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if check and proc.returncode != 0:
        raise SystemExit(
            f"command failed ({proc.returncode}): {' '.join(cmd)}\n"
            f"stdout: {proc.stdout}\nstderr: {proc.stderr}"
        )
    return proc


def ssh(remote_cmd: str) -> str:
    return run(
        [
            "ssh",
            "-p",
            PORT,
            "-i",
            str(KEY),
            "-o",
            "IdentitiesOnly=yes",
            "-o",
            "BatchMode=yes",
            HOST,
            remote_cmd,
        ]
    ).stdout


def scp_from(remote_path: str, local_path: Path) -> None:
    run(
        [
            "scp",
            "-P",
            PORT,
            "-i",
            str(KEY),
            "-o",
            "IdentitiesOnly=yes",
            "-o",
            "BatchMode=yes",
            f"{HOST}:{remote_path}",
            str(local_path),
        ]
    )


def main() -> None:
    b64 = base64.b64encode(REMOTE_SQL.encode()).decode()
    remote = (
        f"echo {b64} | base64 -d > /tmp/lexmora_export.sql && "
        "docker cp /tmp/lexmora_export.sql lexmora-pgsql:/tmp/lexmora_export.sql && "
        "docker exec lexmora-pgsql psql -U translator -d translator -t -A "
        "-o /tmp/lexmora_export.json -f /tmp/lexmora_export.sql && "
        "docker cp lexmora-pgsql:/tmp/lexmora_export.json /tmp/lexmora_export.json && "
        "wc -c /tmp/lexmora_export.json"
    )
    print(ssh(remote).strip())
    scp_from("/tmp/lexmora_export.json", OUT)
    data = json.loads(OUT.read_text(encoding="utf-8"))
    for table, rows in data.items():
        print(f"{table}: {len(rows)} rows")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
