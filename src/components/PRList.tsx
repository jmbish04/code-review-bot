import { useState, useEffect } from 'react';

interface PullRequest {
  id: number;
  title: string;
  number: number;
  user?: { login: string };
  html_url: string;
  state: string;
}

export function PRList() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');

  useEffect(() => {
    const fetchPRs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/prs?status=${status}`);
        if (!response.ok) {
          throw new Error('Failed to fetch PRs');
        }
        const data = await response.json();
        setPrs(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPRs();
  }, [status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading pull requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setStatus('open')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            status === 'open'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setStatus('closed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            status === 'closed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Closed
        </button>
        <button
          onClick={() => setStatus('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            status === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
      </div>

      {prs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No pull requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prs.map((pr) => (
            <a
              key={pr.id}
              href={pr.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{pr.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    #{pr.number} opened by {pr.user?.login}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    pr.state === 'open'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {pr.state}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
