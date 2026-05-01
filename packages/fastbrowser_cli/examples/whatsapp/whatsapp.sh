#!/bin/env bash

# restart the server
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- server restart

# navigate to whatsapp web
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- navigate_page --url https://web.whatsapp.com/

# List all conversations in the chat list
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- query_selectors -s 'grid[name="Chat list"] > row' -a