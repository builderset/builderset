#!/bin/sh
# The SQL page's eight files, as Flyway's versioned migrations, in order.
set -eu
SQL_DIR="${1:-../sql}"
mkdir -p src/main/resources/db/migration
for file in 01_base 02_emails 03_articles 04_forms 05_library 06_activity 07_cards 08_popups; do
  version="${file%%_*}"
  cp "$SQL_DIR/$file.sql" "src/main/resources/db/migration/V${version#0}__${file#*_}.sql"
done
