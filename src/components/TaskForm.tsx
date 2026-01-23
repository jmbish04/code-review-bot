import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const TaskForm = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('Refining Prompt & Creating Task...');
        
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const payload = Object.fromEntries(data.entries());
        
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                 setStatus('Task Created Successfully!');
                 form.reset();
            } else {
                 setStatus('Error creating task.');
            }
        } catch (err) {
            setStatus('Network error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col">
            <div className="space-y-2">
                <Label htmlFor="repoName">Repository</Label>
                <Input 
                    id="repoName"
                    name="repoName" 
                    defaultValue="jmbish04/code-review-bot"
                    required
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                     <Label htmlFor="assignee">Assignee</Label>
                     <Select name="assignee" defaultValue="jules">
                        <SelectTrigger>
                            <SelectValue placeholder="Select Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="jules">Jules (Default)</SelectItem>
                            <SelectItem value="gemini">Gemini 2.0</SelectItem>
                            <SelectItem value="gpt4">GPT-4</SelectItem>
                        </SelectContent>
                     </Select>
                </div>
                 <div className="space-y-2">
                     <Label htmlFor="provider">Provider</Label>
                     <Select name="provider" defaultValue="jules">
                        <SelectTrigger>
                            <SelectValue placeholder="Select Provider" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="jules">Jules</SelectItem>
                            <SelectItem value="gemini">Gemini</SelectItem>
                        </SelectContent>
                     </Select>
                </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea 
                    id="prompt"
                    name="prompt" 
                    className="flex-1 resize-none"
                    placeholder="Describe the task..."
                    required
                />
            </div>

            <Button 
                type="submit" 
                disabled={loading}
                className="w-full"
            >
                {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                {loading ? 'Processing...' : 'Create Task'}
            </Button>
            
            {status && (
                <div className="mt-2 text-sm text-center text-muted-foreground">
                    {status}
                </div>
            )}
        </form>
    );
};
