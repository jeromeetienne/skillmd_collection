#!/bin/bash

# Goto linkedin messaging page using the CLI commands below:
npx fastbrowser_cli navigate_page --url https://www.linkedin.com/messaging/

# list[name="Conversation list"] > listitem > heading
npx fastbrowser_cli query_selectors -s 'list[name="Conversation List"] > listitem heading' -a

# Select the conversation with Eric Defiez
npx fastbrowser_cli click -s 'list[name="Conversation List"] > listitem heading[name^="Eric Defiez"]' 

# Fill the message content
npx fastbrowser_cli fill_form -s 'textbox[name^="Write"]' -v "Hello"

# Click the "Send" button to send the message
npx fastbrowser_cli click -s 'button[name^="Send"]'