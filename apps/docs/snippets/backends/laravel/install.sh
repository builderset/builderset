# A Laravel 12 app, and the JSON Schema validator for the shape check.
composer create-project laravel/laravel:^12 my-app
cd my-app
composer require opis/json-schema:^2.4

# The Builderset checker beside it: the kits' own checks, in Node 22.6 or later.
mkdir checker
cd checker
npm init -y
npm install @builderset/engine@0.4 @builderset/email@0.4 @builderset/article@0.4 \
  @builderset/form@0.4 @builderset/card@0.4 @builderset/popup@0.4
# Save server.ts from the checker page here, then run it:
#   CHECKER_PORT=4319 node --experimental-strip-types server.ts

# The kits' JSON Schemas, from the same packages, so both checks read one version.
# Run this again whenever you upgrade the kits.
mkdir -p ../resources/schemas
for kit in email article form card popup; do
  cp "node_modules/@builderset/$kit/schema/$kit.schema.json" ../resources/schemas/
done
