## command 'dm_page' - to go to the messages page
```
npx fastbrowser_cli navigate_page --url 'https://x.com/i/chat/'
```

## command 'dm_list' - To get the profile url of all the users im talking with
```
npx fastbrowser_cli query_selectors --selector 'listitem:has(link[name="user avatar"]) link[name="user avatar"]' -a     
```

## to get the whole info about each conversation
- the name of the user
- the profile url of the user
- the last message in the conversation (if it is starting with "You: " then it means that the last message is from me, otherwise it is from the other user)
```
npx fastbrowser_cli query_selectors --selector 'listitem:has(link[name="user avatar"])' -a --wc
```


## command 'dm_thread' partial - to select given conversation and get the whole info about it
```
uid=e360 listitem
  uid=s15 unknown url="/i/chat/10142-10162102"
    uid=e363 generic
      uid=e365 link "user avatar" url="https://x.com/JamesCorbett"
        uid=e366 img "user avatar"
      uid=e367 generic
        uid=e368 generic
          uid=e371 generic value="James Corbett"
          uid=e373 generic value="387w"
        uid=e376 generic value="You: Sounds good"
```

click on the listem from the previous command that has the profile url of the user you want to select
```
npx fastbrowser_cli click -s "#e360"    
```

## command 'dm_thread' partial - To get messages from the selected conversation
The simplest one — grab each message bubble subtree:

```
npx fastbrowser_cli query_selectors --all --limit 0 \
    --selector 'main listitem' --with-children
```

Each listitem is one of:
  - a date separator — single child generic value="Dec 12, 2017" / "Today"
  - a received message (Julien) — text + one timestamp generic
  - a sent message (you) — text + timestamp + a trailing img (delivery
  indicator)

To split sender from receiver in one query, use :has():

```
npx fastbrowser_cli query_selectors --all --limit 0 \
    --selector 'main listitem:has(img)'   \
    --selector 'main listitem:not(:has(img))' \
    --with-children
```

First selector → your messages, second → Julien's + date headers.

To pull only the text bodies (skip the AM/PM timestamps client-side):

```
npx fastbrowser_cli query_selectors --all --limit 0 \
    --selector 'main listitem generic[value]'
```

output the messages in this format:
```
{dateIso}:{myName|otherName}:{messageText}
```

## command 'dm_send' - To send a message in the selected conversation
To set the message content, fill the textbox with the name "Unencrypted message":
```
npx fastbrowser_cli fill_form -s 'textbox[name="Unencrypted message"]' -v 'hello Julien'
```

To send the message, click on the button that is a sibling of the textbox:
```
npx fastbrowser_cli click -s 'generic:has(> textbox[name="Unencrypted message"]) > button'
```