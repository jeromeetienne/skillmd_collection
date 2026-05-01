#!/bin/bash

# Goto linkedin messaging page using the CLI commands below:
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- navigate_page --url https://www.linkedin.com/messaging/

# list[name="Conversation list"] > listitem > heading
NODE_OPTIONS='' NPM_CONFIG_LOGLEVEL=silent npm run dev:cli -- query_selectors_all -s 'list[name="Conversation List"] > listitem > heading'