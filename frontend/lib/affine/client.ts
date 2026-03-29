/**
 * Lightweight Affine GraphQL/REST client.
 * No Apollo/urql dependency — just typed fetch wrappers.
 */

import type { AffineConfig, AffineWorkspace, GraphQLResponse } from "./types";

export class AffineClient {
  constructor(private config: AffineConfig) {}

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.accessToken}`,
    };
  }

  /** Execute a GraphQL query/mutation. */
  async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const resp = await fetch(`${this.config.url}/graphql`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });
    if (!resp.ok) throw new Error(`Affine API error: ${resp.status}`);
    const result: GraphQLResponse<T> = await resp.json();
    if (result.errors?.length) {
      throw new Error(`Affine GraphQL error: ${result.errors[0]!.message}`);
    }
    return result.data;
  }

  /** Get workspace info. */
  async getWorkspace(): Promise<AffineWorkspace> {
    const data = await this.graphql<{ workspace: AffineWorkspace }>(
      `query($id: String!) { workspace(id: $id) { id } }`,
      { id: this.config.workspaceId },
    );
    return data.workspace;
  }

  /** Get list of workspaces. */
  async listWorkspaces(): Promise<AffineWorkspace[]> {
    const data = await this.graphql<{ workspaces: AffineWorkspace[] }>(
      `query { workspaces { id } }`,
    );
    return data.workspaces;
  }

  /** Get document markdown via RPC. */
  async getDocMarkdown(docId: string): Promise<string> {
    const resp = await fetch(
      `${this.config.url}/rpc/workspaces/${this.config.workspaceId}/docs/${docId}/markdown`,
      { headers: this.headers },
    );
    if (!resp.ok) throw new Error(`Failed to get doc markdown: ${resp.status}`);
    return resp.text();
  }

  /** Check if Affine is reachable. */
  async checkHealth(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.config.url}/info`, {
        signal: AbortSignal.timeout(5000),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  /** Generate an access token (requires existing session auth). */
  async generateAccessToken(name: string): Promise<string> {
    const data = await this.graphql<{
      generateUserAccessToken: { token: string };
    }>(
      `mutation($name: String!) { generateUserAccessToken(name: $name) { token } }`,
      { name },
    );
    return data.generateUserAccessToken.token;
  }
}
