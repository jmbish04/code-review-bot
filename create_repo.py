import os
import subprocess
import sys
from github import Github, GithubException

def run_command(command, cwd=None):
    """Runs a shell command and prints the output."""
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            check=True,
            text=True,
            capture_output=True
        )
        print(f"✅ Executed: {' '.join(command)}")
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ Error executing: {' '.join(command)}")
        print(f"   Stderr: {e.stderr.strip()}")
        sys.exit(1)

def main():
    # 1. Load and Sanitize Token (The Fix)
    token = os.environ.get("MY_GITHUB_TOKEN")
    if not token:
        print("❌ Error: GITHUB_TOKEN environment variable not set.")
        sys.exit(1)
    
    # STRIP WHITESPACE to prevent BadCredentialsException
    token = token.strip()
    
    repo_name = "code-review-bot"
    
    print(f"🚀 Initializing process for repo: {repo_name}...")

    # 2. Create Remote Repository via PyGithub
    try:
        g = Github(token)
        user = g.get_user()
        print(f"🔑 Authenticated as: {user.login}")

        # Check if repo exists to avoid 422 error
        try:
            repo = user.get_repo(repo_name)
            print(f"⚠️  Repo '{repo_name}' already exists. Using existing remote.")
        except:
            print(f"✨ Creating new repository '{repo_name}' on GitHub...")
            # auto_init=False ensures it's empty so we can push our local code easily
            repo = user.create_repo(
                name=repo_name,
                private=False, # Set to True if you want a private repo
                description="Automated code review bot"
            )
            print(f"✅ Repository created: {repo.html_url}")

        clone_url = repo.clone_url
        
    except GithubException as e:
        print(f"❌ GitHub API Error: {e}")
        sys.exit(1)

    # 3. Setup Local Git
    print("\n📦 Setting up local git...")
    
    # Initialize if not already a repo
    if not os.path.exists(".git"):
        run_command(["git", "init"])
    else:
        print("ℹ️  .git directory already exists.")

    # Configure Remote
    try:
        # Remove origin if it exists to ensure we set the correct one
        subprocess.run(["git", "remote", "remove", "origin"], capture_output=True)
    except:
        pass
    
    run_command(["git", "remote", "add", "origin", clone_url])

    # 4. Commit Code
    print("\n💾 Committing code...")
    run_command(["git", "add", "."])
    
    # Check if there are changes to commit
    status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
    if status.stdout.strip():
        run_command(["git", "commit", "-m", "Initial commit: Add code-review-bot base"])
    else:
        print("ℹ️  No changes to commit.")

    # 5. Push to Main
    print(f"\n🚀 Pushing to {clone_url}...")
    # Rename branch to main to match modern defaults
    run_command(["git", "branch", "-M", "main"])
    run_command(["git", "push", "-u", "origin", "main"])

    print("\n🎉 Done! Your code is live.")

if __name__ == "__main__":
    main()
