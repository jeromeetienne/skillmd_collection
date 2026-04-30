Output claude_stream_viewer.gif

Set Shell "bash"
Set FontSize 24
Set Width 800
Set Height 600
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms
Set PlaybackSpeed 1.0
Env PS1 "$ "

Hide
Type "export PATH=$PWD/.bin:$PATH && clear" Enter
Sleep 500ms
Show

Type "# raw stream-json from claude --output-format stream-json" Enter
Sleep 800ms
Type "claude --model haiku --output-format stream-json --verbose -p 'count up to 10'" Enter
Sleep 4s

Type "clear" Enter
Sleep 300ms

Type "# now pipe the same stream through claude_stream_viewer" Enter
Sleep 800ms
Type "claude --model haiku --output-format stream-json --verbose -p 'count up to 10' | npx claude_stream_viewer@latest" Enter
Sleep 6s
