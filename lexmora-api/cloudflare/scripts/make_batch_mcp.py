import json
from pathlib import Path

DB = "3ba3926f-5411-43fd-85a3-bdd66645cd88"


def make_batch_code(batch_path: Path, out_path: Path) -> None:
    data = json.loads(batch_path.read_text(encoding="utf-8"))
    stmts = []
    for i, chunk in enumerate(data["chunks"]):
        idx = data["start"] + i
        stmts.append(
            {
                "sql": "INSERT INTO _deploy_chunks (i, chunk) VALUES (?, ?)",
                "params": [str(idx), chunk],
            }
        )
    code = (
        "async () => {\n"
        f"  const dbId = {json.dumps(DB)};\n"
        f"  const batch = {json.dumps(stmts)};\n"
        "  const res = await cloudflare.request({\n"
        "    method: 'POST',\n"
        "    path: `/accounts/${accountId}/d1/database/${dbId}/query`,\n"
        "    body: { batch },\n"
        "  });\n"
        "  return { success: res.success, errors: res.errors, n: batch.length, start: "
        + str(data["start"])
        + " };\n"
        "}"
    )
    out_path.write_text(code, encoding="utf-8")
    print(out_path.name, out_path.stat().st_size)


def main() -> None:
    for b in range(0, 55, 5):
        src = Path(f"dist/batch_{b:02d}.json")
        if not src.exists():
            continue
        make_batch_code(src, Path(f"dist/mcp_batch_{b:02d}.js"))


if __name__ == "__main__":
    main()
