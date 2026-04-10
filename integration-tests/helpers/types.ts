export interface User {
  id: string;
  username: string;
  name?: string;
  bio?: string;
  status?: string;
  settings: UserSettings;
  createdAt: string;
}

export interface UserSettings {
  dark?: boolean;
  anon?: boolean;
}

export interface Post {
  id: string;
  content: string;
  locality: {
    lat: number;
    lon: number;
  };
  authorID: string;
  authorName?: string;
  upvotes: number;
  replies: number;
  createdAt: string;
  editedAt?: string;
  hidden?: boolean;
}

export interface Report {
  id: string;
  userID: string;
  reporter: string;
  reason: string;
  content: string;
  time: string;
  resolved: boolean;
  action?: string;
  reportedPostID?: string;
  reportedUserID?: string;
}

export interface ApiError {
  code: string;
  error?: string;
}

export interface OkResponse {
  status: "OK";
}

export interface ApiResponse {
  posts?: Post[];
  comments?: Post[];
  post?: Post;
  user?: User;
  reports?: Report[];
  report?: Report;
  hidden?: boolean;
}

export interface FeedResponse {
  posts: Post[];
}

export interface GdprSarResponse {
  generatedAt: string;
  requestType: string;
  user: User;
  posts: Post[];
  reportsAgainstUser: Report[];
  reportsFiled: Report[];
}

export interface PostReplyResponse {
  replies: Post[];
}