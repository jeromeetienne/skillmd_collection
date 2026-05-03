#!/bin/bash

# Check if the CLI is working properly
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- check

# Goto linkedin feed page using the CLI commands below:
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- navigate_page --url https://www.linkedin.com/feed/

# Click the "Start" button to open the post creation dialog using the CLI commands below:
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- click -s 'button[name^="Start a post"]'

# Fill the post content in the opened dialog using the CLI commands below
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- fill_form -s 'textbox[name^="Text editor"]' -v "Hello"

# Click the "Post" button to send the post using the CLI commands below:
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- click -s 'button[name^="Post"]'
