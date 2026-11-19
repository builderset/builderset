#!/bin/sh
# Builds the Python wheel and sdist of a commit, the way the release does.
#
#   tooling/build-python.sh [<commit>] [<out dir>]     (defaults: HEAD, python/dist)
#
# The release workflow attaches what this writes to the GitHub release, and a
# project that vendors the wheel (decision D9) can build the same commit here
# and get the same bytes — compare the SHA-256 with the release's notes. Three
# things make that hold:
#   - `git archive` of the commit, with LF endings (as .gitattributes stores them)
#     and Unix file modes, whatever the machine checking it out;
#   - one container image, pinned by digest: the same uv, Python and zlib;
#   - hatchling pinned exactly in python/pyproject.toml.
# A wheel built on Windows has the same files but different zip metadata.
set -eu

IMAGE='ghcr.io/astral-sh/uv:0.9.30-python3.12-bookworm-slim@sha256:e5b65587bce7de595f299855d7385fe7fca39b8a74baa261ba1b7147afa78e58'
ref=${1:-HEAD}
out=${2:-python/dist}

mkdir -p "$out"
git -c core.autocrlf=false archive --format=tar "$ref" |
  MSYS_NO_PATHCONV=1 docker run --rm -i "$IMAGE" sh -c '
    set -eu
    mkdir /repo && cd /repo && tar -x
    uv build --quiet python
    cd python/dist && tar -c *.whl *.tar.gz
  ' | tar -x -C "$out"

(cd "$out" && sha256sum -- *.whl *.tar.gz)
