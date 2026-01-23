import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Copy, Check, Github, MessageSquare } from 'lucide-react';

interface PR {
    number: number;
    title: string;
    user: string;
    html_url: string;
    created_at: string;
    repo_full_name: string;
}

interface Comment {
    id: number;
    body: string;
    path: string;
    line: number;
    user: { login: string };
    created_at: string;
}

export const PRDashboard = () => {
    const [prs, setPrs] = useState<PR[]>([]);
    const [loading, setLoading] = useState(true);
    const [repo, setRepo] = useState('jmbish04/code-review-bot');
    const [selectedPR, setSelectedPR] = useState<PR | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchPRs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/github/prs?repo=${repo}`);
            if (res.ok) {
                const data = await res.json() as PR[];
                setPrs(Array.isArray(data) ? data : []);
            } else {
                setPrs([]);
            }
        } catch (e) {
            console.error(e);
            setPrs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPRs();
    }, []);

    const handlePRClick = async (pr: PR) => {
        setSelectedPR(pr);
        setCommentsLoading(true);
        try {
            const res = await fetch(`/api/github/prs?repo=${pr.repo_full_name}&number=${pr.number}`);
            if (res.ok) {
                const data = await res.json() as Comment[];
                setComments(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCommentsLoading(false);
        }
    };

    const copyComments = () => {
        const text = comments.map(c => `File: ${c.path}:${c.line}\nUser: ${c.user.login}\nComment: ${c.body}`).join('\n\n---\n\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-sm font-medium mb-2 block">Repository</label>
                    <div className="flex gap-2">
                        <Input
                            value={repo}
                            onChange={(e) => setRepo(e.target.value)}
                            placeholder="owner/repo"
                            className="bg-background"
                        />
                        <Button onClick={fetchPRs} disabled={loading}>
                            {loading ? 'Loading...' : 'Fetch'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prs.map(pr => (
                    <Card key={pr.number} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handlePRClick(pr)}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex justify-between items-start gap-2">
                                <span className="truncate">{pr.title}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">#{pr.number}</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                by {pr.user} • {new Date(pr.created_at).toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-2 flex justify-between">
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); window.open(pr.html_url, '_blank') }}>
                                <Github className="w-3 h-3 mr-1" /> GitHub
                            </Button>
                            <div className="text-xs text-muted-foreground flex items-center">
                                <MessageSquare className="w-3 h-3 mr-1" /> Details
                            </div>
                        </CardFooter>
                    </Card>
                ))}
                {prs.length === 0 && !loading && (
                    <div className="col-span-full text-center text-muted-foreground py-8 border rounded-lg border-dashed">
                        No open PRs found for {repo}.
                    </div>
                )}
            </div>

            {/* Modal */}
            {selectedPR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col shadow-lg border-2">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <div>
                                <CardTitle className="text-lg">PR #{selectedPR.number}: {selectedPR.title}</CardTitle>
                                <CardDescription>{selectedPR.repo_full_name}</CardDescription>
                            </div>
                            <Button variant="ghost" onClick={() => setSelectedPR(null)}>Close</Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                            {commentsLoading ? (
                                <div className="text-center py-8">Loading comments...</div>
                            ) : comments.length > 0 ? (
                                comments.map(comment => (
                                    <div key={comment.id} className="border rounded-md p-3 text-sm">
                                        <div className="flex justify-between items-center mb-2 bg-muted/50 p-1 rounded">
                                            <span className="font-mono text-xs">{comment.path}:{comment.line}</span>
                                            <span className="text-xs font-semibold">{comment.user.login}</span>
                                        </div>
                                        <div className="whitespace-pre-wrap">{comment.body}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">No code review comments found.</div>
                            )}
                        </CardContent>
                        <CardFooter className="border-t pt-4 flex justify-between">
                             <Button variant="outline" onClick={() => window.open(selectedPR.html_url, '_blank')}>
                                View on GitHub <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                            <Button onClick={copyComments} disabled={comments.length === 0}>
                                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                {copied ? 'Copied' : 'Copy Comments'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
};
