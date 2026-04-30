Output claude_stream_viewer.gif

Set Shell "zsh"
Set FontSize 16
Set Width 1200
Set Height 720
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms
Set PlaybackSpeed 1.0

Hide
Type "export PATH=$PWD/.bin:$PATH && clear" Enter
Sleep 500ms
Show

Type "# raw stream-json from claude --output-format stream-json" Enter
Sleep 800ms
Type "cat fixture_demo.jsonl" Enter
Sleep 4s

Type "clear" Enter
Sleep 300ms

Type "# now pipe the same stream through claude_stream_viewer" Enter
Sleep 800ms
Type "cat fixture_demo.jsonl | claude_stream_viewer" Enter
Sleep 5s
