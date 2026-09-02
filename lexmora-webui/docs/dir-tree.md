# Directory Tree

```
lexmora-webui/
├── .armin/
│   └── docker-scripts/
│       ├── run-on-docker-local.ps1     # Local Docker deploy (YAML-only, force-recreate)
│       ├── run-on-docker-local.yaml    # Local stack/network/API/publish_port config
│       ├── run-on-docker-server.ps1    # Remote SSH deploy (YAML-only)
│       └── run-on-docker-server.yaml   # Remote deploy config (ssh + api_host)
├── .cursor/
│   └── skills/
│       └── docker-deploy/              # Skill that owns .armin/docker-scripts
├── .docker/
│   └── stack.manifest.json             # Docker image tags and ports
├── docs/
│   ├── description.md                  # Project overview
│   ├── dir-tree.md                     # This tree
│   ├── endpoints.md                    # API contract used by the UI
│   ├── modules/
│   │   ├── docker.md                   # Docker / nginx notes
│   │   ├── frontend.md                 # Frontend module notes
│   │   └── module1.md                  # Deploy module notes
│   ├── suggestion/
│   │   └── suggestion1.md              # Improvement ideas
│   └── potentional-bugs/
│       ├── red.md                      # Critical risks
│       └── yellow.md                   # Minor risks
├── public/
│   ├── apple-touch-icon.png            # iOS home-screen icon
│   ├── favicon.ico                     # Legacy browser favicon
│   ├── favicon.svg                     # Primary browser favicon
│   ├── pwa-192x192.png                 # PWA install icon (small)
│   └── pwa-512x512.png                 # PWA install icon (large)
├── src/
│   ├── api/
│   │   └── client.ts                   # Fetch wrapper, auth helpers, API types
│   ├── components/
│   │   ├── AppLayout.vue               # Shell nav and logout
│   │   └── HistoryModal.vue            # History row detail modal
│   ├── router/
│   │   └── index.ts                    # Routes and auth guard
│   ├── views/
│   │   ├── HistoryView.vue             # Sortable history table
│   │   ├── InstructionsView.vue        # Edit AI instruction prompts
│   │   ├── LoginView.vue               # Login form
│   │   ├── SettingsView.vue            # OpenRouter settings / clear data
│   │   ├── StatsView.vue               # Usage stats by period
│   │   └── TransformView.vue           # Transform operations UI
│   ├── App.vue                         # Root component
│   ├── main.ts                         # App bootstrap
│   ├── style.css                       # Tailwind and shared styles
│   └── vite-env.d.ts                   # Vite type shims
├── create-image.ps1                    # Build Docker image
├── Dockerfile                          # Vue build + nginx image
├── docker-compose.yml                  # lexmora-webui service
├── nginx.conf.template                 # nginx /api proxy (Docker DNS + envsubst)
├── package.json                        # npm dependencies and scripts
├── vite.config.ts                      # Vite config, proxy, and PWA plugin
└── README.md                           # Setup and usage guide
```
