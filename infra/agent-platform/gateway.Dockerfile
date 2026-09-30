FROM node:22-bookworm-slim
ARG KUBECTL_VERSION=v1.34.1
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl -fsSLo /usr/local/bin/kubectl https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl \
    && curl -fsSLo /tmp/kubectl.sha256 https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl.sha256 \
    && echo "$(cat /tmp/kubectl.sha256)  /usr/local/bin/kubectl" | sha256sum -c - \
    && chmod 0555 /usr/local/bin/kubectl && rm -rf /var/lib/apt/lists/* /tmp/kubectl.sha256
WORKDIR /app
COPY gateway.cjs ./
USER node
EXPOSE 4100
CMD ["node","gateway.cjs"]
