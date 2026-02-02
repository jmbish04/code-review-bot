
document.addEventListener('DOMContentLoaded', () => {
    const prListContainer = document.getElementById('pr-list');

    if (prListContainer) {
        fetch('/api/prs')
            .then(response => response.json())
            .then(data => {
                if (data.items && data.items.length > 0) {
                    prListContainer.innerHTML = ''; // Clear loading message
                    data.items.forEach(pr => {
                        const prItem = document.createElement('div');
                        prItem.className = 'pr-item';

                        const prTitle = document.createElement('a');

                        // Extract owner, repo, and pull_number
                        const repoUrlParts = new URL(pr.repository_url).pathname.split('/');
                        const owner = repoUrlParts[2];
                        const repo = repoUrlParts[3];
                        const pull_number = pr.number;

                        prTitle.href = `/prs/${owner}/${repo}/pull/${pull_number}`;
                        prTitle.textContent = `#${pr.number} ${pr.title}`;

                        const prStatus = document.createElement('span');
                        prStatus.className = `pr-status ${pr.state}`;
                        prStatus.textContent = pr.state;

                        prItem.appendChild(prTitle);
                        prItem.appendChild(prStatus);
                        prListContainer.appendChild(prItem);
                    });
                } else {
                    prListContainer.innerHTML = '<p>No open pull requests found.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching PRs:', error);
                prListContainer.innerHTML = '<p>Error loading pull requests.</p>';
            });
    }
});
