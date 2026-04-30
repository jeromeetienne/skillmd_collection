#!/usr/bin/env bash
# post-to-x.sh — post a message on x.com via fastbrowser
# usage: ./post-to-x.sh "your message here"

set -euo pipefail

MESSAGE="${1:?usage: $0 \"message\"}"

# 1. Open x.com (assumes you're already logged in)
npx fastbrowser_cli new_page --url https://x.com/home

# 2. Open the composer (sidebar Post link → /compose/post)
npx fastbrowser_cli click -s 'link[name="Post"]'

# 3. Fill the composer textbox inside the modal
npx fastbrowser_cli fill_form -s 'dialog textbox' -v "$MESSAGE"

# 4. Submit
npx fastbrowser_cli click -s 'dialog button[name="Post"]'

# 5. Close the page
npx fastbrowser_cli close_page --page-id 0

echo "posted: $MESSAGE"