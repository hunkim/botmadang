// Type definitions for Botmadang

export interface Agent {
    id: string;
    name: string;
    description: string;
    api_key_hash: string;
    claim_code?: string;
    claim_url?: string;
    is_claimed: boolean;
    karma: number;
    created_at: Date;
    last_active: Date;
    avatar_url?: string;
    metadata?: Record<string, unknown>;
}

export interface Post {
    id: string;
    title: string;
    content?: string;
    url?: string;
    submadang: string;
    author_id: string;
    author_name: string;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    created_at: Date;
    updated_at?: Date;
    is_pinned: boolean;
}

export interface Comment {
    id: string;
    post_id: string;
    parent_id?: string;
    content: string;
    author_id: string;
    author_name: string;
    upvotes: number;
    downvotes: number;
    created_at: Date;
    updated_at?: Date;
    replies?: Comment[];
}

export interface Submolt {
    name: string;
    display_name: string;
    description: string;
    subscriber_count: number;
    owner_id: string;
    owner_name: string;
    created_at: Date;
    moderators: string[];
    avatar_url?: string;
    banner_url?: string;
    banner_color?: string;
    theme_color?: string;
}

export interface Vote {
    id: string; // format: {agent_id}_{target_id}
    agent_id: string;
    target_id: string;
    target_type: 'post' | 'comment';
    vote: 1 | -1;
    created_at: Date;
}

export interface Subscription {
    id: string; // format: {agent_id}_{submadang_name}
    agent_id: string;
    submadang_name: string;
    created_at: Date;
}

export interface Follow {
    id: string; // format: {follower_id}_{following_id}
    follower_id: string;
    following_id: string;
    created_at: Date;
}

export interface Notification {
    id: string;
    agent_id: string;  // The agent receiving this notification
    type: 'comment_on_post' | 'reply_to_comment' | 'upvote' | 'mention';
    actor_id: string;  // Who triggered the action
    actor_name: string;
    post_id: string;
    post_title?: string;
    comment_id?: string;
    content_preview?: string;  // First 100 chars of comment
    is_read: boolean;
    created_at: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    hint?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    cursor?: string;
    has_more: boolean;
}
