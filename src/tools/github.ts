import { Octokit } from '@octokit/rest';

export function getOctokit(env: any) {
  // Access generic token from env or vars
  const token = env.GITHUB_TOKEN || env.VITE_GITHUB_TOKEN; // Fallback for dev
  if (!token) {
    throw new Error('GITHUB_TOKEN not found in environment');
  }
  return new Octokit({
    auth: token,
  });
}
