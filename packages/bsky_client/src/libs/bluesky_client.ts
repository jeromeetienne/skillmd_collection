// npm imports
import { BskyAgent } from '@atproto/api';

// local imports
import type { AuthSession, BlueskyProfile, BlueskyPost, BlueskyFeedGenerator } from '../types';
import { BskyAuth } from './bluesky/bsky_auth';
import { BskyProfiles } from './bluesky/bsky_profiles';
import { BskyPosts } from './bluesky/bsky_posts';
import { BskyLikes } from './bluesky/bsky_likes';
import { BskyFollows } from './bluesky/bsky_follows';
import { BskyFeeds } from './bluesky/bsky_feeds';
import { BskySearch } from './bluesky/bsky_search';

export class BlueskyClient {
	private auth: BskyAuth;
	private profiles: BskyProfiles;
	private posts: BskyPosts;
	private likes: BskyLikes;
	private follows: BskyFollows;
	private feeds: BskyFeeds;
	private search: BskySearch;

	constructor() {
		const agent = new BskyAgent({ service: 'https://bsky.social' });
		this.auth = new BskyAuth(agent);
		this.profiles = new BskyProfiles(agent);
		this.posts = new BskyPosts(agent);
		this.likes = new BskyLikes(agent);
		this.follows = new BskyFollows(agent);
		this.feeds = new BskyFeeds(agent);
		this.search = new BskySearch(agent);
	}

	async login(username: string, password: string): Promise<AuthSession> {
		return this.auth.login(username, password);
	}

	async restoreSession(session: AuthSession): Promise<void> {
		return this.auth.restoreSession(session);
	}

	async getProfile(): Promise<BlueskyProfile> {
		return this.profiles.getProfile();
	}

	async getUserProfile(handle: string): Promise<BlueskyProfile> {
		return this.profiles.getUserProfile(handle);
	}

	async getUserPosts(limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		return this.posts.getUserPosts(limit, offset);
	}

	async getAuthorPosts(handle: string, limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		return this.posts.getAuthorPosts(handle, limit, offset);
	}

	async getPost(uri: string): Promise<BlueskyPost | null> {
		return this.posts.getPost(uri);
	}

	async createPost(text: string, replyTo?: { uri: string; cid: string }, stripLink: boolean = false): Promise<string> {
		return this.posts.createPost(text, replyTo, stripLink);
	}

	async deletePost(uri: string): Promise<void> {
		return this.posts.deletePost(uri);
	}

	async likePost(uri: string, cid: string): Promise<string> {
		return this.likes.likePost(uri, cid);
	}

	async unlikePost(uri: string): Promise<void> {
		return this.likes.unlikePost(uri);
	}

	async getActorLikes(handle: string | undefined, limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		return this.likes.getActorLikes(handle, limit, offset);
	}

	async followUser(did: string): Promise<string> {
		return this.follows.followUser(did);
	}

	async unfollowUser(handle: string): Promise<void> {
		return this.follows.unfollowUser(handle);
	}

	async getFollowers(handle: string, limit: number = 10, offset: number = 0): Promise<BlueskyProfile[]> {
		return this.follows.getFollowers(handle, limit, offset);
	}

	async getFollows(handle: string, limit: number = 10, offset: number = 0): Promise<BlueskyProfile[]> {
		return this.follows.getFollows(handle, limit, offset);
	}

	async getTimeline(limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		return this.feeds.getTimeline(limit, offset);
	}

	async getCustomFeed(feedUri: string, limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		return this.feeds.getCustomFeed(feedUri, limit, offset);
	}

	async getFeedGeneratorInfo(feedUri: string): Promise<BlueskyFeedGenerator> {
		return this.feeds.getFeedGeneratorInfo(feedUri);
	}

	async getSuggestedFeeds(limit: number = 10, offset: number = 0): Promise<BlueskyFeedGenerator[]> {
		return this.feeds.getSuggestedFeeds(limit, offset);
	}

	async getActorFeeds(handle: string, limit: number = 10, offset: number = 0): Promise<BlueskyFeedGenerator[]> {
		return this.feeds.getActorFeeds(handle, limit, offset);
	}

	async getSavedFeeds(): Promise<BlueskyFeedGenerator[]> {
		return this.feeds.getSavedFeeds();
	}

	async searchPosts(query: string, limit: number = 10, offset: number = 0): Promise<BlueskyPost[]> {
		return this.search.searchPosts(query, limit, offset);
	}

	async searchUsers(query: string, limit: number = 10, offset: number = 0): Promise<BlueskyProfile[]> {
		return this.search.searchUsers(query, limit, offset);
	}
}
