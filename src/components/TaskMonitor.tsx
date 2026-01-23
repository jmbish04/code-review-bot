import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2 } from 'lucide-react';

interface Task {
    id: number;
    prompt: string;
    status: string;
    provider: string;
    createdAt: string;
}

export const TaskMonitor = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [followUpPrompt, setFollowUpPrompt] = useState('');
    const [sending, setSending] = useState(false);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) {
                const data = await res.json() as Task[];
                setTasks(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const handleFollowUp = async () => {
        if (!selectedTask) return;
        setSending(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: `[Follow-up to Task #${selectedTask.id}] ${followUpPrompt}`,
                    repoName: 'jmbish04/code-review-bot',
                    provider: selectedTask.provider,
                    assignee: 'jules'
                })
            });
            if (res.ok) {
                setSelectedTask(null);
                setFollowUpPrompt('');
                fetchTasks();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    return (
        <Card className="col-span-1 h-full flex flex-col relative">
            <CardHeader>
                <CardTitle>Recent Activity (Live)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                 <div className="space-y-4">
                    {tasks.length === 0 ? (
                        <div className="text-muted-foreground text-sm">No recent activity.</div>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className="flex justify-between items-start border-b border-border pb-2 last:border-0 group">
                                <div>
                                    <div className="font-medium text-sm">{task.prompt.substring(0, 80)}...</div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(task.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full bg-secondary`}>
                                            {task.status}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => setSelectedTask(task)}
                                            title="Follow-up"
                                        >
                                            <Play className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{task.provider}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>

            {/* Follow-up Modal */}
            {selectedTask && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4 rounded-lg">
                    <Card className="w-full max-w-sm shadow-lg border-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Follow-up on Task #{selectedTask.id}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-xs text-muted-foreground line-clamp-2 italic">
                                "{selectedTask.prompt}"
                            </div>
                            <Textarea
                                placeholder="Enter follow-up instructions..."
                                value={followUpPrompt}
                                onChange={(e) => setFollowUpPrompt(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>Cancel</Button>
                                <Button size="sm" onClick={handleFollowUp} disabled={sending || !followUpPrompt.trim()}>
                                    {sending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    Send
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </Card>
    );
};
