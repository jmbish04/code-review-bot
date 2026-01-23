Please modify this worker 

1) It should subscribe to all github events with the github app sending all events to this worker via webhook 

2) All webhooks should be saved into d1 -- d1 managed by drizzle schema and interactions through drizzle orm ... with d1 setup with migrations and pnpm run migrate:remote .. drizzle generate && wrangler d1 migrations apply DB --remote  

4) thiss app will be responsible for taking automatic actions based on triggered webhook events 
 - when a code conflict is reported, the worker should automatically jump in to clear the conflicts 

 - after gemini code assist posts code_comments (sometimes this can happen multiple times on a PR), this app should be triggered by new pr_code_comments (note, not PR comments ... pr_code_comments) and this worker should 1) export all pr_code_comments to d1 to log them and provide an api that will list all code comments for the pr  (url pattern should be  something like {repo-name}/pr/{#}/code_comments and by repo-name I mean excluding the owner which is specified as a var on wrangler.jsonc (jmbish04/{repo-name} -- jmbish04 willl be set as a var on wrangler.jsonc so that oktokit can dynamically pull in owner .. but i dont want to have to enter in my github username on this app ever -- would be repetive) .... once the app has automatically extracted pr_code_comments and logged in d1,  triggered by a webhook following pr_code_comments added event -- the service should then init jules api request, gemini-cli, codex, or claude code ... depending on what the selected provider is from vars on wrangler.jsonc .. default is jules api ... with the provider being prompted by an agent on the worker (cloudflare agents sdk framework) prompting the provider (jules by default) to fix tehe pr_code_comments and patch the pr. 

** Note that the agent on this worker should also detect whether the code is intended for cloudflare workers and if it is ... the agent will utilize the cloudflare docs mcp tool to verify the worker is running best practices .... to do this, the agent will review the bindings on the worker to genreate an array of queries it can ask cloudflare docs mcp for context that it can then compare against the code in order to append additional changes for the provider to address in addition to gemini-code-assist pr_code_comments. 

 - the agent will log the queries it generates in a d1 table along with the repo name and pr # .. with each row in d1 being a generated query with the response from cloudflare docs mcp tool 

 - another table will log the prompt that the agent generates for the provider {jules api, gemini cli, codex cli, or claude code} to address the pr_code_comments {and possible addition code_comments from the agent specific to cloudflare workers} .. this prompt will be setup as a task with a status of open .. until a webhook is received from github that the pr has been patched by the assigned provider at which time the agent will update the status of the tasked prompt to complete. 

5) The app will also be triggered by webhook event when a pr is merged to check whether the event specifies a cloudflare worker ci cd deployment from github action or from cloudflare dash ci /cd ... 

  - the agent will open a pending task for verifying the worker deployment


   - the agent will then utilize cloudflare typescript sdk to lookup the worker (using the worker name from wrangler.jsonc or wrangler.toml), investigating the deployment status to determine 

- the agent will then open a 10 minute loop where it will go to sleep and wake back up again every 30 seconds to see if the deployment has completed 

 - once the deployment has completed the agent will check the deployment build logs to determine whether the build was successful or if it failed (by reading the logs) 

 - if the deployment build failed due to an issue like a frozen lock file requiring something like an npm install etc, the agent will the utilize sandbox sdk and git to clone down the repo (with merged pr) to then perform the fix for frozen file (or other common issue) and then open a new branch, commit the code, and open a pr against the default branch -- but only after the agent has confirmed the fix worked by performing the npm run deploy script from package.json or wrangler deploy if there is no script -- and after a successful deployment, the agent will commit the code and open a new pr. 

 - if the deployment build logs are specific to cloudflare bindings or cloudflare infrastructure -- the agent will again generate an array of questions for cloudflare docs mcp tool that it logs as rows into a d1 table and then proceed to ask cloudflare docs each question and save each response to the corresponding d1 row ... the agent will then take the context of all these docs responses to surgically isolate the change needed -- and again, the agent will ensure that the fixes are complete as defined by a successful worker deployment using sandbox sdk. 

6) The last series of webhook event (for now) that this app will handle are special cloudflare worker auto-pilot tasks -- so for each and every webnhook event, the app will check if the app is a cloudflare worker by scanning all files for wrangler.jscon or wrangler.toml -- if the app is able to detect that the webhook is for a cloudflare worker app, then it will spawn our agent (cloudflre agents sdk) in order to check the bindings on wrangler.jsonc and/or wrangler.toml

  - if the bindings are blamk on wrangler.jsonc or wrangler.toml -- the agent will utilize its cloudflare typescript sdk tools to create the new binding and add the configurations to the wrangler.sjonc or wrangler.toml config files -- like when i fork or clone an intereesting cloudflare worker app, it will often have something liek `<enter d1 database id and name here>` which is a placeholder for a binding i dont have yet ... this app will automatically create the binding(S) and name the bindings exactly as the worker name (as seen in wrangler.jsonc or wrangler.toml) and then update the wrangler.jsonc or wrangler.toml with the new binding config(s). 

- the app will also scan the wrangler.jsonc or wrangler.toml to ensure that observability is ALWAYS enabled 

- the app will also look for worker-configuration.d.ts and/or env.d.ts and ensure that these are properly configured in tsconfig.json ... and it will take special attention for things like durable object ... ensuring to ask cloudflare docs mcp about this to ensure that the right imports are being used and in the right way. 

this worker should have a basic astro dark themeed shadcn frontend for seeing an operational log of what the agent is doing at any given time and to also update settings like which provider to assign to tasks (jules is the default always), etc etc. 
