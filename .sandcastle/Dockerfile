FROM node:22-bookworm

# Enable pnpm via corepack — pin to project's packageManager version
RUN corepack enable pnpm && corepack prepare pnpm@9.15.0 --activate

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Install Supabase CLI
RUN curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh

# Copy entrypoint before switching to non-root user
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Create non-root agent user (required — Claude Code must run as non-root)
RUN useradd -m -s /bin/bash agent
USER agent
WORKDIR /home/agent

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/agent/.local/bin:${PATH}"

WORKDIR /home/agent/workspace

ENTRYPOINT ["entrypoint.sh"]
