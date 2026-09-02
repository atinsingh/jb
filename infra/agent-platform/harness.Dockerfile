# Sandbox image for resume-harness sessions.
#
# One image carries all three harness CLIs plus a TeX install, so a session can
# pick any harness without the Agent Platform having to choose an image at
# provision time — and so the LaTeX build runs in the same place the harness
# does, which is what lets it read and fix its own compile errors.
#
# Build:  docker build -f infra/agent-platform/harness.Dockerfile \
#           -t jobocate/resume-harness:latest infra/agent-platform
#
# No credential is baked in. Every key reaches a container as an environment
# variable at provision time, and it is always a LiteLLM virtual key.

FROM node:20-bookworm-slim

# TeX Live: `recommended` covers the packages a resume realistically needs
# (fontspec, enumitem, geometry, hyperref, titlesec) without pulling the ~5GB
# full distribution. latexmk drives the build loop.
RUN apt-get update && apt-get install -y --no-install-recommends \
      texlive-latex-base \
      texlive-latex-recommended \
      texlive-latex-extra \
      texlive-fonts-recommended \
      latexmk \
      ca-certificates \
      curl \
      git \
    && rm -rf /var/lib/apt/lists/*

# The three harnesses. Pinned so a session's behaviour does not change under it
# mid-week; bump deliberately.
RUN npm install -g --no-fund --no-audit \
      @anthropic-ai/claude-code@latest \
      @openai/codex@latest \
      opencode-ai@latest \
    && npm cache clean --force

# OpenCode drives the proxy through the openai-compatible adapter declared in
# the generated opencode.json; preinstalling it keeps the first turn from
# spending time on a network fetch.
RUN npm install -g --no-fund --no-audit @ai-sdk/openai-compatible

WORKDIR /workspace
RUN mkdir -p /workspace/build

# Non-root: the harness has no reason to write outside the workspace, and the
# sandbox is the isolation boundary the adapters rely on when they disable
# interactive approval.
RUN useradd --create-home --home-dir /workspace --shell /bin/bash harness \
    && chown -R harness:harness /workspace
USER harness

ENV HOME=/workspace \
    NODE_NO_WARNINGS=1 \
    DISABLE_TELEMETRY=1 \
    OPENCODE_DISABLE_AUTOUPDATE=1

CMD ["sleep", "infinity"]
