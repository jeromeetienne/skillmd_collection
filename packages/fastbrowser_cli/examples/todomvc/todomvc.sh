#!/bin/bash

# Goto https://demo.playwright.dev/todomvc/ 
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- open_page --url https://demo.playwright.dev/todomvc/   

# Add a todo item "walk outside" using the CLI commands below:
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- fill_form -s 'textbox[name^="What needs to be done?"]' --value 'walk outside'
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- press_keys --keys Enter

# List all todo items
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- query_selectors_all -s 'list > listitem generic[value*=""]' 