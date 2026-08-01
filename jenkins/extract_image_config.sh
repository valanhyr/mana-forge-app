#!/usr/bin/env bash
IMAGES=(
  ghcr.io/valanhyr/mana-forge-web:latest
  ghcr.io/valanhyr/mana-forge-api:latest
  ghcr.io/valanhyr/mana-forge-engine:latest
)
for img in "${IMAGES[@]}"; do
  safe=$(echo "$img" | sed 's/[^A-Za-z0-9]/_/g')
  tarpath="/tmp/${safe}.tar"
  printf '---PROCESSING_IMAGE:%s---\n' "$img"
  if docker inspect --type=image "$img" >/dev/null 2>&1; then
    printf 'Saving to:%s\n' "$tarpath"
    docker save "$img" -o "$tarpath" || { printf 'ERROR: docker save failed for %s\n' "$img"; continue; }
    cfgpath=$(tar -xO -f "$tarpath" manifest.json | sed -n 's/.*"Config"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
    printf 'CFG_PATH:%s\n' "$cfgpath"
    printf '---MANIFEST_JSON---\n'
    tar -xO -f "$tarpath" manifest.json || true
    printf '---CONFIG_JSON---\n'
    if [ -n "$cfgpath" ]; then
      tar -xO -f "$tarpath" "$cfgpath" || { printf 'EXTRACT_FAIL:%s\n' "$cfgpath"; }
    else
      printf 'NO_CONFIG_JSON_FOUND\n'
    fi
    rm -f "$tarpath"
  else
    printf 'IMAGE_NOT_PRESENT:%s\n' "$img"
  fi
done
