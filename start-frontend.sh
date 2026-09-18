#!/bin/bash
# Starts the web app on http://localhost:5173
cd "$(dirname "$0")/frontend" || exit 1
[ -d node_modules ] || npm install
npm run dev
