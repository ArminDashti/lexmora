# Architecture (non-technical)

Users open the Lexmora web app in a browser. The app talks to a separate API service for login, transforms, history, and settings. For production, the website is packaged in a Docker container that also forwards API requests to the API container. Deploy scripts under `.armin/docker-scripts` build and start that website container on your machine or on a remote server.
