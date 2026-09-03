from pathlib import Path

env = {}
for line in Path("../.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

Path("dist/secrets.env").write_text(
    f"JWT_SECRET={env['JWT_SECRET']}\nDEFAULT_PASSWORD={env.get('DEFAULT_PASSWORD', 'dopadopa123')}\n",
    encoding="utf-8",
)
print("secrets_ready")
