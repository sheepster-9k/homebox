/** TypeScript types for Affine API integration. */

export interface AffineConfig {
  url: string;
  workspaceId: string;
  accessToken: string;
}

export interface AffineWorkspace {
  id: string;
  name: string;
}

export interface AffineDoc {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffineSearchResult {
  docId: string;
  title: string;
  score: number;
  highlight: string;
}

export interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}
