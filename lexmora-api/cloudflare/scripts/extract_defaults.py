import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
src = (root / "internal/service/instruction.go").read_text(encoding="utf-8")
models = (root / "internal/domain/models.go").read_text(encoding="utf-8")

topics_block = re.search(r"ScientificTopics = \[\]string\{([^}]+)\}", models, re.S).group(1)
topics = re.findall(r'"([^"]+)"', topics_block)

keys = [
    "translate-english-persian-general",
    "translate-english-persian-movie",
    "translate-english-persian-formal",
    "translate-english-persian-music",
]
keys += [f"translate-english-persian-scientific-{t}" for t in topics]
keys += [
    "translate-persian-english-general",
    "translate-persian-english-formal",
]
keys += [f"translate-persian-english-scientific-{t}" for t in topics]
keys += [
    "simplify-english-english",
    "refine-english-english-everyday",
    "refine-english-english-formal",
    "refine-english-english-slang",
    "symptoms-english-english",
    "term-english-english-everyday",
    "term-english-english-formal",
    "term-english-english-slang",
    "compare-english-english",
    "compare-persian-persian",
    "grammar-english-english",
    "grammar-persian-persian",
    "cursor-persian-english-skill",
    "cursor-persian-english-agent",
    "frontend-persian-english-for-agent",
    "frontend-english-english-for-agent",
]

defaults = {}
for key in keys:
    pat = rf'case "{re.escape(key)}":\s*return `([^`]*)`'
    m = re.search(pat, src, re.S)
    if m:
        defaults[key] = m.group(1)
        continue
    # scientific keys use helper; reconstruct from scientificTranslateContent
    if "-scientific-" in key:
        topic = key.split("-scientific-", 1)[1]
        if key.startswith("translate-english-persian-"):
            src_lang, dst_lang = "English", "Persian"
        else:
            src_lang, dst_lang = "Persian", "English"
        hint_pat = rf'case "{re.escape(topic)}":\s*return "([^"]+)"'
        hm = re.search(hint_pat, src)
        hint = hm.group(1) if hm else "Use precise domain vocabulary for this scientific topic; keep units and formulas exact."
        label = "-".join(p[:1].upper() + p[1:] for p in topic.split("-"))
        defaults[key] = (
            f"You are a {src_lang}→{dst_lang} scientific translator specializing in **{label}**.\n\n"
            f"## Task\nTranslate the {src_lang} input into accurate {dst_lang} using standard scientific and technical terminology for {label}.\n\n"
            f"## Domain focus\n{hint}\n\n"
            "## Rules\n"
            "- Prefer established scientific terms in the target language; keep widely used foreign terms in parentheses only when helpful.\n"
            "- Preserve precision: units, formulas, symbols, and technical modifiers must stay exact.\n"
            "- Do not oversimplify or popularize the content.\n"
            "- No commentary outside the translation.\n\n"
            f"## Output\nReturn only the scientific {dst_lang} translation. Use markdown lists or emphasis when they improve clarity."
        )
    else:
        defaults[key] = (
            "You are a careful language assistant.\n\n"
            "## Task\nProduce the final useful result for the user's request.\n\n"
            "## Rules\n- Prefer clear structure and light markdown when it helps readability.\n"
            "- Do not invent facts.\n\n"
            "## Output\nReturn only the result text."
        )

out = Path(__file__).resolve().parents[1] / "src" / "instruction-defaults.json"
out.write_text(json.dumps(defaults, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {out} keys={len(keys)} size={out.stat().st_size}")
