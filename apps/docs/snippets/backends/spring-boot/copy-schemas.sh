#!/bin/sh
# Copies each kit's JSON Schema into the app, where DocumentSchemas reads it.
# Run it from the app's folder after installing or updating the kits beside the
# checker, so the schemas and the checker's checks are always the same version.
set -eu
CHECKER_DIR="${1:-../checker}"
mkdir -p src/main/resources/schemas
for kit in email article form card popup; do
  cp "$CHECKER_DIR/node_modules/@builderset/$kit/schema/$kit.schema.json" \
     "src/main/resources/schemas/$kit.schema.json"
done
