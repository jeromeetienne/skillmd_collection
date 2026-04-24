#!/usr/bin/env node
// node imports
import * as Commander from 'commander';

// local imports
import { LocalSessionManager } from './libs/session_manager';
import { createOutput } from './libs/output';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { statusCommand } from './commands/status';
import { postsCommand } from './commands/posts';
import { replyCommand } from './commands/reply';
import { likeCommand } from './commands/like';
import { followCommand } from './commands/follow';
import { profileCommand } from './commands/profile';
import { searchCommand } from './commands/search';
import { installCommand } from './commands/install';
import { feedCommand } from './commands/feed';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Initialize CLI
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const program = new Commander.Command();

const sessionManager = new LocalSessionManager();

program
	.name('bsky_cli')
	.description('Command-line interface for Bluesky social media (ATProto).')
	.version('1.0.0')
	.option('--json', 'Output results as JSON')
	.addHelpText(
		'after',
		[
			'',
			'Workflow:',
			'  1. Authenticate once:  bsky_cli login -u handle.bsky.social -p <app-password>',
			'  2. Interact:           bsky_cli posts list / search posts <query> / reply <uri> <text>',
			'  3. Sign out:           bsky_cli logout',
			'',
			'Key commands for agents:',
			'  posts create <text>    Create a new post',
			'  posts list             Fetch your recent posts (returns URI, text, date, likes)',
			"  posts from <handle>    Fetch another user's posts",
			'  feed timeline          View your home timeline',
			'  feed saved             List your saved/pinned feeds (with their URIs)',
			'  feed discover          Browse suggested/popular feeds',
			'  feed view <uri>        View posts from a custom feed (URI from feed saved or discover)',
			'  feed likes [handle]    View liked posts (defaults to you)',
			'  search posts <query>   Full-text search; returns URI + snippet per result',
			'  search users <query>   Find accounts by name/handle',
			'  reply <uri> <text>     Post a reply; URI comes from posts list or search results',
			'  install --skills       Copy bsky_cli skill into current agent folder',
			'',
			'Tips:',
			'  - Use -l/--limit to control result count (default 10)',
			'  - Post URIs look like: at://did:plc:.../app.bsky.feed.post/...',
			'  - App passwords: Bluesky Settings > Privacy & Security > App Passwords',
			'  - Session is persisted in ~/.bsky_cli/session.json between calls',
		].join('\n')
	);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Authentication Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program
	.command('login')
	.description('Authenticate with Bluesky')
	.option('-u, --username <username>', 'Bluesky handle or email')
	.option('-p, --password <password>', 'App password (from settings)')
	.action((options) => loginCommand.run(options, sessionManager, createOutput(program.opts().json ?? false)));

program
	.command('logout')
	.description('Clear stored authentication')
	.action(() => logoutCommand.run(sessionManager, createOutput(program.opts().json ?? false)));

program
	.command('status')
	.description('Show current authentication status')
	.action(() => statusCommand.run(sessionManager, createOutput(program.opts().json ?? false)));

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Post Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program
	.command('posts')
	.description('Manage posts')
	.addCommand(
		new Commander.Command('list')
			.alias('ls')
			.description('List your posts')
			.option('-l, --limit <number>', 'Number of posts to fetch', '10')
			.option('-o, --offset <number>', 'Number of posts to skip', '0')
			.action((options) => postsCommand.list(options, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('from')
			.description('Get posts from a user')
			.argument('<handle>', 'Bluesky handle (without @)')
			.option('-l, --limit <number>', 'Number of posts to fetch', '10')
			.option('-o, --offset <number>', 'Number of posts to skip', '0')
			.action((handle, options) => postsCommand.from(handle, options, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('view')
			.description('View a specific post')
			.argument('<uri>', 'Post URI')
			.action((uri) => postsCommand.view(uri, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('create')
			.description('Create a new post')
			.argument('<text>', 'Post text (max 300 chars)')
			.option('--no-strip-link', 'Keep the URL in the post text (by default it is removed after building the link card)')
			.action((text, options) => postsCommand.create(text, sessionManager, createOutput(program.opts().json ?? false), options))
	)
	.addCommand(
		new Commander.Command('delete')
			.description('Delete a post')
			.argument('<uri>', 'Post URI')
			.action((uri) => postsCommand.delete(uri, sessionManager, createOutput(program.opts().json ?? false)))
	);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Feed Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program
	.command('feed')
	.description('Browse feeds and timelines')
	.addCommand(
		new Commander.Command('timeline')
			.description('View your home timeline')
			.option('-l, --limit <number>', 'Number of posts to fetch', '10')
			.option('-o, --offset <number>', 'Number of posts to skip', '0')
			.action((options) => feedCommand.timeline(options, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('view')
			.description('View posts from a custom feed')
			.argument('<uri>', 'Feed generator AT-URI')
			.option('-l, --limit <number>', 'Number of posts to fetch', '10')
			.option('-o, --offset <number>', 'Number of posts to skip', '0')
			.action((uri, options) => feedCommand.view(uri, options, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('info')
			.description('Get information about a feed generator')
			.argument('<uri>', 'Feed generator AT-URI')
			.action((uri) => feedCommand.info(uri, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('saved')
			.description('List your saved/pinned feeds')
			.action(() => feedCommand.saved(sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('discover')
			.description('Browse suggested feeds')
			.option('-l, --limit <number>', 'Number of feeds to fetch', '10')
			.option('-o, --offset <number>', 'Number of feeds to skip', '0')
			.action((options) => feedCommand.discover(options, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('from')
			.description('List feeds published by a user')
			.argument('<handle>', 'Bluesky handle')
			.option('-l, --limit <number>', 'Number of feeds to fetch', '10')
			.option('-o, --offset <number>', 'Number of feeds to skip', '0')
			.action((handle, options) => feedCommand.from(handle, options, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('likes')
			.description("View a user's liked posts")
			.argument('[handle]', 'Bluesky handle (defaults to you)')
			.option('-l, --limit <number>', 'Number of posts to fetch', '10')
			.option('-o, --offset <number>', 'Number of posts to skip', '0')
			.action((handle, options) => feedCommand.likes(handle, options, sessionManager, createOutput(program.opts().json ?? false)))
	);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Reply Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program
	.command('reply')
	.description('Reply to a post')
	.argument('<uri>', 'Post URI to reply to')
	.argument('<text>', 'Reply text')
	.action((uri, text) => replyCommand.run(uri, text, sessionManager, createOutput(program.opts().json ?? false)));

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Like / Unlike Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program
	.command('like')
	.description('Like a post')
	.argument('<uri>', 'Post URI')
	.action((uri) => likeCommand.like(uri, sessionManager, createOutput(program.opts().json ?? false)));

program
	.command('unlike')
	.description('Remove a like from a post')
	.argument('<uri>', 'Post URI')
	.action((uri) => likeCommand.unlike(uri, sessionManager, createOutput(program.opts().json ?? false)));

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Follow / Unfollow Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program
	.command('follow')
	.description('Follow a user')
	.argument('<handle>', 'Bluesky handle')
	.action((handle) => followCommand.follow(handle, sessionManager, createOutput(program.opts().json ?? false)));

program
	.command('unfollow')
	.description('Unfollow a user')
	.argument('<handle>', 'Bluesky handle')
	.action((handle) => followCommand.unfollow(handle, sessionManager, createOutput(program.opts().json ?? false)));

program
	.command('followers')
	.description('List followers of a user')
	.argument('[handle]', 'Bluesky handle (defaults to you)')
	.option('-l, --limit <number>', 'Number of results to fetch', '10')
	.option('-o, --offset <number>', 'Number of results to skip', '0')
	.action((handle, options) => followCommand.followers(handle, options, sessionManager, createOutput(program.opts().json ?? false)));

program
	.command('following')
	.description('List accounts a user follows')
	.argument('[handle]', 'Bluesky handle (defaults to you)')
	.option('-l, --limit <number>', 'Number of results to fetch', '10')
	.option('-o, --offset <number>', 'Number of results to skip', '0')
	.action((handle, options) => followCommand.following(handle, options, sessionManager, createOutput(program.opts().json ?? false)));

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Profile Command
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program
	.command('profile')
	.description('Get profile information for a user')
	.argument('[handle]', 'Bluesky handle (defaults to logged-in user)')
	.action((handle) => profileCommand.run(handle, sessionManager, createOutput(program.opts().json ?? false)));

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Search Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program
	.command('search')
	.description('Search for posts and users')
	.addCommand(
		new Commander.Command('posts')
			.description('Search for posts')
			.argument('<query>', 'Search query')
			.option('-l, --limit <number>', 'Number of results to fetch', '10')
			.option('-o, --offset <number>', 'Number of results to skip', '0')
			.option('-s, --sort <type>', 'Sort by: latest, top, popular', 'latest')
			.action((query, options) => searchCommand.posts(query, options, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('users')
			.description('Search for users')
			.argument('<query>', 'User search query')
			.option('-l, --limit <number>', 'Number of results to fetch', '10')
			.option('-o, --offset <number>', 'Number of results to skip', '0')
			.action((query, options) => searchCommand.users(query, options, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('advanced')
			.description('Advanced search with filters')
			.argument('<query>', 'Search query')
			.option('-l, --limit <number>', 'Number of results to fetch', '10')
			.option('-o, --offset <number>', 'Number of results to skip', '0')
			.option('-t, --type <type>', 'Content type: posts, replies, reposts')
			.option('-a, --author <handle>', 'Filter by author handle')
			.option('--since <date>', 'Results after date (YYYY-MM-DD)')
			.option('--until <date>', 'Results before date (YYYY-MM-DD)')
			.option('--language <lang>', 'Filter by language code (en, es, fr, etc.)')
			.action((query, options) => searchCommand.advanced(query, options, sessionManager, createOutput(program.opts().json ?? false)))
	)
	.addCommand(
		new Commander.Command('help')
			.description('Show search help and examples')
			.action(() => searchCommand.help())
	);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Install Commands
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program
	.command('install')
	.description('Install bsky_cli assets')
	.option('--skills', 'Install the bsky_cli skill into the current directory')
	.action((options) => installCommand.run(options));

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

program.parseAsync(process.argv).catch(async (error) => {
	const jsonMode = program.opts().json ?? false;
	const message = error instanceof Error ? error.message : String(error);
	if (jsonMode) {
		process.stderr.write(JSON.stringify({ success: false, error: { message } }) + '\n');
	} else {
		console.error(`Error: ${message}`);
	}
	process.exit(1);
});
