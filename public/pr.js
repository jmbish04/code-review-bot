
document.addEventListener('DOMContentLoaded', () => {
    const pathParts = window.location.pathname.split('/');
    const owner = pathParts[2];
    const repo = pathParts[3];
    const pull_number = pathParts[5];

    const prDetailsContainer = document.getElementById('pr-details-container');
    const commentsContainer = document.getElementById('comments');
    const codeCommentsContainer = document.getElementById('code-comments');

    if (owner && repo && pull_number) {
        // Fetch PR details
        fetch(`/api/prs/${owner}/${repo}/pull/${pull_number}`)
            .then(response => response.json())
            .then(pr => {
                prDetailsContainer.innerHTML = `
                    <h2>${pr.title}</h2>
                    <p><strong>Status:</strong> <span class="pr-status ${pr.state}">${pr.state}</span></p>
                    <p>${pr.body || 'No description provided.'}</p>
                    <p><strong>Conflict Status:</strong> ${pr.mergeable_state === 'dirty' ? 'Conflict' : 'Clean'}</p>
                    <button id="assign-jules-btn" ${pr.mergeable_state !== 'dirty' ? 'disabled' : ''}>Assign Conflict to Jules</button>
                    <a href="/api/prs/${owner}/${repo}/pull/${pull_number}/code_comments.json" target="_blank">
                        <button>Export Code Comments</button>
                    </a>
                `;

                const assignButton = document.getElementById('assign-jules-btn');
                if (assignButton) {
                    assignButton.addEventListener('click', () => {
                        assignButton.disabled = true;
                        assignButton.textContent = 'Assigning...';

                        fetch('/api/jules/tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                task: `Resolve conflict in PR #${pull_number}`,
                                pr_url: pr.html_url
                            })
                        })
                        .then(response => response.json())
                        .then(newTask => {
                            assignButton.textContent = 'Assigned to Jules';
                            alert('Task assigned to Jules!');
                        })
                        .catch(error => {
                            console.error('Failed to assign task:', error);
                            assignButton.textContent = 'Assignment Failed';
                            alert('Failed to assign task. Please try again.');
                        });
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching PR details:', error);
                prDetailsContainer.innerHTML = '<p>Error loading PR details.</p>';
            });

        // Fetch PR comments
        fetch(`/api/prs/${owner}/${repo}/pull/${pull_number}/comments`)
            .then(response => response.json())
            .then(comments => {
                if (comments.length > 0) {
                    commentsContainer.innerHTML = '';
                    comments.forEach(comment => {
                        const commentDiv = document.createElement('div');
                        commentDiv.className = 'comment';
                        commentDiv.innerHTML = `
                            <p class="comment-author"><strong>${comment.user.login}</strong> commented:</p>
                            <div>${comment.body}</div>
                        `;
                        commentsContainer.appendChild(commentDiv);
                    });
                } else {
                    commentsContainer.innerHTML = '<p>No comments on this PR.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching comments:', error);
                commentsContainer.innerHTML = '<p>Error loading comments.</p>';
            });

        // Fetch PR code comments
        fetch(`/api/prs/${owner}/${repo}/pull/${pull_number}/code_comments.json`)
            .then(response => response.json())
            .then(codeComments => {
                if (codeComments.length > 0) {
                    codeCommentsContainer.innerHTML = '';
                    codeComments.forEach(comment => {
                        const commentDiv = document.createElement('div');
                        commentDiv.className = 'comment';
                        commentDiv.innerHTML = `
                            <p class="comment-author"><strong>${comment.user.login}</strong> commented on <strong>${comment.path}</strong>:</p>
                            <div><pre><code>${comment.body}</code></pre></div>
                        `;
                        codeCommentsContainer.appendChild(commentDiv);
                    });
                } else {
                    codeCommentsContainer.innerHTML = '<p>No code comments on this PR.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching code comments:', error);
                codeCommentsContainer.innerHTML = '<p>Error loading code comments.</p>';
            });
    } else {
        prDetailsContainer.innerHTML = '<p>PR details not specified in URL.</p>';
    }
});
