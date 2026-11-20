# Security

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub: the
repository's **Security** tab → **Report a vulnerability**.

<!-- Step 01 of the plan adds the project's security email here. -->

You get an answer within a week. A fix is released before the report is made
public, and the reporter is credited unless they ask not to be.

## What counts

The editor runs in a back office; the renderers run on servers and their output
reaches readers. The most serious problems are therefore:

- a document that passes the checks (`check*`, `parse*`, the JSON Schema) and
  still renders script, an unsafe link or media from outside its own folders;
- renderer output that escapes its own markup;
- anything in `host` that sends credentials or documents somewhere the host
  project did not ask for.

## Supported versions

Fixes go to the latest release only. Before 1.0 that means the latest minor
version (`0.x`): upgrading is the fix.
