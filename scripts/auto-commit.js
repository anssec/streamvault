const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../last_commit.txt');

/**
 * Runs a command and returns the output.
 * @param {string} command 
 */
function run(command) {
  try {
    return execSync(command).toString();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.stderr?.toString() || error.message);
    return null;
  }
}

// Ensure last_commit.txt exists
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, 'Activity Log initiated\n');
}

const numCommits = Math.floor(Math.random() * 3) + 1; // 1 to 3 commits
console.log(`Making ${numCommits} commits today...`);

const messages = [
  "Update activity log",
  "Refactor: Maintain consistency",
  "Docs: Update maintenance status",
  "Chore: Automated daily update",
  "Style: Minor tweaks for activity"
];

for (let i = 0; i < numCommits; i++) {
  const date = new Date().toLocaleString();
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];
  
  fs.appendFileSync(logFile, `Commit at ${date} - ${randomMsg}\n`);
  
  run('git add last_commit.txt');
  // Use simple commit message
  const commitResult = run(`git commit -m "${randomMsg} (${date})"`);
  
  if (commitResult) {
    console.log(`Commit ${i + 1} done: ${randomMsg}`);
  } else {
    console.log(`Commit ${i + 1} skipped or failed (perhaps no changes).`);
  }
}

// If running in local environment, we might not want to push automatically if not configured.
// But the core goal is automation.
if (process.env.GITHUB_ACTIONS) {
  console.log('Pushing changes...');
  run('git push');
} else {
  console.log('Skipping push (not in GitHub Actions).');
}
