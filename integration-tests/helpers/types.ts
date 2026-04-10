export interface User {
  id: string;
  username: string;
  name?: string;
  bio?: string;
  status?: string;
  settings: {
    dark?: boolean;
    anon?: boolean;
  };
  createdAt: string;
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

export interface ApiResponse<T = unknown> {
  status: string;
  user?: User;
  post?: Post;
  posts?: Post[];
  comments?: Post[];
  report?: Report;
  reports?: Report[];
}