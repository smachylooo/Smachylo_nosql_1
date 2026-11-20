#!/usr/bin/env bash
# Run from this directory on a machine that can reach Atlas.
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v mongosh >/dev/null; then
  printf '%s\n' 'Помилка: встановіть mongosh: https://www.mongodb.com/docs/mongodb-shell/install/' >&2
  exit 1
fi
if [[ ! -f .env ]]; then
  printf '%s\n' 'Помилка: створіть .env за шаблоном .env.example і вкажіть MONGO_URI.' >&2
  exit 1
fi
if [[ ! -f dataset.csv ]]; then
  printf '%s\n' 'Помилка: помістіть dataset.csv у папку проєкту.' >&2
  exit 1
fi
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
# Read dotenv without evaluating it as shell code or exposing URI in output.
MONGO_URI="$(.venv/bin/python -c 'from dotenv import dotenv_values; print(dotenv_values(".env").get("MONGO_URI", ""))')"
if [[ -z "$MONGO_URI" || "$MONGO_URI" == *'USER:PASSWORD@CLUSTER.mongodb.net'* ]]; then
  printf '%s\n' 'Помилка: заповніть справжній MONGO_URI у .env.' >&2
  exit 1
fi
export MONGO_URI
mkdir -p results
printf '%s\n' 'Увага: замінюються spotify.tracks_raw і spotify.tracks.'
read -r -p 'Введіть YES, щоб продовжити: ' answer
if [[ "$answer" != YES ]]; then exit 1; fi
.venv/bin/python scripts/01_load_data.py | tee results/part1_load.txt
mongosh "$MONGO_URI" --quiet --file scripts/02_transform.js | tee results/part1_transform.txt
mongosh "$MONGO_URI" --quiet --file queries/part2_queries.js > results/part2.txt
mongosh "$MONGO_URI" --quiet --file part3_indexes.js > results/part3_explain.txt
unset MONGO_URI
printf '%s\n' 'Готово. Перевірте результати в папці results і додайте фактичні explain до README.'
