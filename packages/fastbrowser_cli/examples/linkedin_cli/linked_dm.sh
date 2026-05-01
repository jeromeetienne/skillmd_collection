#!/bin/bash

# Restart the server to clear any previous state
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- server restart  

# Goto linkedin messaging page using the CLI commands below:
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- navigate_page --url https://www.linkedin.com/messaging/

# list all the threads conversations in the left sidebar
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- query_selectors -s 'list[name="Conversation List"] > listitem heading' -a

# Select the conversation with Eric Defiez
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- click -s 'list[name="Conversation List"] > listitem heading[name^="Eric Defiez"]' 

# Fill the message content
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- fill_form -s 'textbox[name^="Write"]' -v "Hello"

# Click the "Send" button to send the message
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- click -s 'button[name^="Send"]'