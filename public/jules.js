
document.addEventListener('DOMContentLoaded', () => {
    const taskListContainer = document.getElementById('task-list');
    const newTaskForm = document.getElementById('new-task-form');

    const fetchTasks = () => {
        fetch('/api/jules/tasks')
            .then(response => response.json())
            .then(tasks => {
                if (tasks.length > 0) {
                    taskListContainer.innerHTML = '';
                    tasks.forEach(task => {
                        const taskItem = document.createElement('div');
                        taskItem.className = 'task-item';
                        taskItem.innerHTML = `
                            <div>
                                <p><strong>Task:</strong> ${task.task}</p>
                                ${task.pr_url ? `<p><strong>PR:</strong> <a href="${task.pr_url}" target="_blank">${task.pr_url}</a></p>` : ''}
                                <p><strong>Status:</strong> ${task.status}</p>
                            </div>
                        `;
                        taskListContainer.appendChild(taskItem);
                    });
                } else {
                    taskListContainer.innerHTML = '<p>No tasks found for Jules.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching tasks:', error);
                taskListContainer.innerHTML = '<p>Error loading tasks.</p>';
            });
    };

    if (taskListContainer) {
        fetchTasks();
    }

    if (newTaskForm) {
        newTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const descriptionInput = document.getElementById('task-description');
            const prUrlInput = document.getElementById('task-pr-url');

            const taskData = {
                task: descriptionInput.value,
                pr_url: prUrlInput.value || null,
            };

            fetch('/api/jules/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData),
            })
            .then(response => response.json())
            .then(newTask => {
                alert('Task created successfully!');
                descriptionInput.value = '';
                prUrlInput.value = '';
                fetchTasks(); // Refresh the task list
            })
            .catch(error => {
                console.error('Error creating task:', error);
                alert('Failed to create task.');
            });
        });
    }
});
