#!/bin/bash
# Starts the API. Run once: cd backend && npm install && cp .env.example .env
cd "$(dirname "$0")/backend" || exit 1
[ -d node_modules ] || npm install
[ -f .env ] || { echo "No backend/.env — copy .env.example to .env and fill it in first."; exit 1; }
npm start
