#!/bin/bash

# Goto https://demo.playwright.dev/todomvc/ 
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- navigate_page --url https://www.linkedin.com/feed/

# Click the "Start" button to open the post creation dialog using the CLI commands below:
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- click -s 'button[name^="Start"]'
