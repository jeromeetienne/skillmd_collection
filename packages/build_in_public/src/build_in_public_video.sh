#!/usr/bin/env bash

# Bash equivalent of build_in_public_video.ts build
# Creates a Remotion video project, adds skills, and streams Claude output through the viewer.

set -euo pipefail

###############################################################################
# Configuration
###############################################################################

# The prompt sent to Claude — describes the build-in-public video to generate.
USER_PROMPT='Generate a build-in-public video

topic: why fastbrowser + a11y_parse are great to scrape the web with AI
description: |
  Based on those 2 folders, in a monorepo
  - https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/a11y_parse
  - https://github.com/jeromeetienne/skillmd_collection/tree/main/packages/fastbrowser_cli
'

# Resolve the directory of this script, then walk up to the monorepo root.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Path to the local claude_stream_viewer entrypoint (run via tsx).
STREAM_VIEWER_SCRIPT="${REPOSITORY_ROOT}/packages/claude_stream_viewer/src/claude_stream_viewer.ts"

###############################################################################
# Project setup
###############################################################################

# Build a unique project name using an ISO timestamp (colons/dots replaced for filesystem safety).
TMP_DIR='/tmp'
SUFFIX="$(date -u +'%Y-%m-%dT%H-%M-%S-%3NZ')"
PROJECT_NAME="video_build_in_public_${SUFFIX}"
PROJECT_DIR="${TMP_DIR}/${PROJECT_NAME}"

echo "Creating project in ${PROJECT_DIR}..."

# Scaffold a blank Remotion project in /tmp.
(cd "${TMP_DIR}" && npx create-video@latest --yes --blank "${PROJECT_NAME}")

echo "Adding claude-code skill to project..."

# Install the upstream claude-code skill into the new project.
(cd "${PROJECT_DIR}" && npx skills add remotion-dev/skills -a claude-code --yes)

echo "Copying build-in-public-video skill to project..."

# Copy the local build-in-public-video skill into the project's .claude/skills directory.
SKILL_SOURCE="${HOME}/webwork/transformer_bitcoin_ai/.claude/skills-disabled/build-in-public-video"
SKILL_DEST="${PROJECT_DIR}/.claude/skills/build-in-public-video"
mkdir -p "$(dirname "${SKILL_DEST}")"
cp -Rp "${SKILL_SOURCE}" "${SKILL_DEST}"

###############################################################################
# Stream Claude output to the viewer
###############################################################################

echo "Streaming Claude output to viewer..."

# Pipe Claude's stream-json output into the viewer process.
# - Claude stdout -> viewer stdin
# - Viewer stdout/stderr -> terminal
# `set -o pipefail` ensures we surface a non-zero exit if either side fails.
(
	cd "${PROJECT_DIR}" && \
	claude \
		--output-format stream-json \
		--verbose \
		--include-partial-messages \
		--allowed-tools 'Bash,Read,Write,WebFetch' \
		--permission-mode auto \
		-p "${USER_PROMPT}" \
	| npx tsx "${STREAM_VIEWER_SCRIPT}"
)

echo 'Done!'
