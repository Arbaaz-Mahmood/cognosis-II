#!/bin/sh

export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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
export ENVIRONMENT="ai-workshop"

# Function to send messages to Slack
send_to_slack() {
  # Escape double quotes in the input text
  escaped_text=$(echo "$1" | sed 's/"/\\"/g')
  curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"$escaped_text\"}" $SLACK_WEBHOOK_URL
}

cd /home/basedgpt/based-gpt/

# Get the current HEAD revision
old_revision=$(git rev-parse HEAD)

# Update the repository
git_pull_result=$(git pull 2>&1)
if [ $? -ne 0 ]; then
  send_to_slack "Git pull failed:\n$git_pull_result"
  exit 1
fi

# Get the new HEAD revision
new_revision=$(git rev-parse HEAD)

# If the old and new revisions are the same, exit without sending messages to Slack
if [ "$old_revision" = "$new_revision" ]; then
  exit 0
fi

send_to_slack "AI Workshop repository updated."



# Display the commit history between the old and the new revision
commit_history=$(git log --pretty=format:"%h - %an, %ar : %s" $old_revision..$new_revision)
send_to_slack "Commit history between $old_revision and $new_revision:\n$commit_history"

npm_i_result=$(npm i 2>&1)
if [ $? -ne 0 ]; then
  send_to_slack "npm install failed:\n$npm_i_result"
  exit 1
fi

cd /home/basedgpt/based-gpt/backend
npm_i_result=$(npm i 2>&1)
if [ $? -ne 0 ]; then
  send_to_slack "npm install failed:\n$npm_i_result"
  exit 1
fi

cd /home/basedgpt/based-gpt/frontend
npm_i_result=$(npm i 2>&1)
if [ $? -ne 0 ]; then
  send_to_slack "npm install failed:\n$npm_i_result"
  exit 1
fi


retry_count=0
max_retries=3

restart_result=$(sudo service based-gpt-backend restart 2>&1)
if [ $? -ne 0 ]; then
  send_to_slack "Service restart failed:\n$restart_result"
  exit 1
fi

restart_result=$(sudo service based-gpt-frontend restart 2>&1)
if [ $? -ne 0 ]; then
  send_to_slack "Service restart failed:\n$restart_result"
  exit 1
fi


send_to_slack "$ENVIRONMENT :passenger_ship: :ship: :rocket: :passenger_ship:"
