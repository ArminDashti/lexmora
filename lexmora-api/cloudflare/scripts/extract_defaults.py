import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
src = (root / "internal/service/instruction.go").read_text(encoding="utf-8")
models = (root / "internal/domain/models.go").read_text(encoding="utf-8")
keys_block = re.search(r"InstructionKeys = \[\]string\{([^}]+)\}", models, re.S).group(1)
key_list = re.findall(r'"([^"]+)"', keys_block)
defaults = {}
for key in key_list:
    pat = rf'case "{re.escape(key)}":\s*return `([^`]*)`'
    m = re.search(pat, src, re.S)
    if m:
        defaults[key] = m.group(1)
    else:
        defaults[key] = (
            "You are a careful language assistant.\n\n"
            "Return only the final useful result for the user's request."
        )
out = Path(__file__).resolve().parents[1] / "src" / "instruction-defaults.json"
out.write_text(json.dumps(defaults, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {out} keys={len(key_list)} size={out.stat().st_size}")
