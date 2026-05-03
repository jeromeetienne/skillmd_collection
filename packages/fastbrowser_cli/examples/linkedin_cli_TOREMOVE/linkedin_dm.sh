#!/bin/bash

# export NODE_OPTIONS='' 
# export NPM_CONFIG_LOGLEVEL=silent
FASTBROWSER_CLI="npm run dev:cli --"
# FASTBROWSER_CLI="npx fastbrowser_cli"

# Function to sleep for a random duration between delayBase - delayRange/2 and delayBase + delayRange/2
# Usage: random_sleep <delayBase> <delayRange>
random_sleep() {
	local delayBase="$1"
	local delayRange="$2"
	local delay
	delay=$(awk -v b="$delayBase" -v r="$delayRange" 'BEGIN { srand(); printf "%.3f", b - r/2 + rand()*r }')
	sleep "$delay"
}

#######################################################################################

# Check if the CLI is working properly
eval "$FASTBROWSER_CLI" check

# Goto linkedin messaging page using the CLI commands below:
eval "$FASTBROWSER_CLI" navigate_page --url https://www.linkedin.com/messaging/

# list all the threads conversations in the left sidebar
eval "$FASTBROWSER_CLI" query_selectors -s 'list[name="Conversation List"] > listitem heading' -a

#######################################################################################

# Select the conversation with Eric Defiez
eval "$FASTBROWSER_CLI" click -s 'list[name="Conversation List"] > listitem heading[name^="Eric Defiez"]'

#######################################################################################

# Fill the message content
eval "$FASTBROWSER_CLI" fill_form -s 'textbox[name^="Write"]' -v "Hello"

# Click the "Send" button to send the message
eval "$FASTBROWSER_CLI" click -s 'button[name^="Send"]'