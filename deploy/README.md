# Jobocate production deployment

This release flow mirrors the existing `pragra-new` Docker/`doctl` workflow,
with immutable tags and digest-pinned Kubernetes deployments added for safe
rollback. It deploys Jobocate into its own `jobocate-prod` namespace and does
not modify the existing `perfectum-prod` frontend/backend workloads.

## Required inputs

- DigitalOcean cluster: `perfectum-k8s` by default
- DigitalOcean registry: `perfectum` by default
- `jobocate.pragra.io`, created/updated by the deploy script as an A record
  pointing at the cluster ingress address
- One root `.env.production`, copied from `.env.production.example`; the deploy
  script splits it into short-lived image-specific files before each build
- A reachable MongoDB, Supabase project, SMTP provider, Stripe account,
  LiteLLM proxy, and sandbox platform
- A private Supabase Storage bucket plus S3-compatible access key, secret,
  endpoint, and project region; backend pods do not mount an uploads volume
- An nginx ingress controller and the `letsencrypt-prod` cert-manager
  `ClusterIssuer` (both already exist on `perfectum-k8s`)

The root production env and generated image-specific files are ignored by Git,
and Docker prints neither file during the build. They are copied into the
images because this is the requested packaging model. Anyone who can pull a
backend image can extract its embedded configuration, and every secret rotation
requires a new backend image. Moving server secrets to Kubernetes Secrets is a
separate owner decision.

`NEXT_PUBLIC_*` values are compiled into browser JavaScript and are public by
definition. `scripts/prepare-production-env.ps1` writes only those values to
the frontend build context and excludes them from the backend copy.

## Agentic résumé dependency

The backend's working local sandbox driver executes the Docker CLI. DOKS worker
nodes use containerd and do not provide a Docker daemon to application pods, so
the deploy preflight requires `RESUME_SANDBOX_DRIVER=agent-platform` plus a
reachable `AGENT_PLATFORM_URL`. That service and LiteLLM are external
dependencies of this frontend/backend ticket; deploy and verify them before the
authenticated smoke test. This prevents a rollout that looks healthy while the
AI résumé flow returns 503.

## Validate without deploying

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-production.ps1 `
  -ValidateOnly `
  -Domain jobocate.pragra.io
```

Validation checks required env keys, public/private separation, production
URLs, manifest rendering, and Kubernetes client validation. It does not build,
push, or change the cluster.

## Build, push, and deploy

```powershell
$env:JOBOCATE_SMOKE_ACCESS_TOKEN = '<short-lived candidate access token>'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-production.ps1 `
  -Domain jobocate.pragra.io `
  -DnsZone pragra.io `
  -DnsRecord jobocate
Remove-Item Env:JOBOCATE_SMOKE_ACCESS_TOKEN
```

The script:

1. validates the combined production env and rejects local/placeholder URLs;
2. logs Docker into DOCR with `doctl`;
3. builds and pushes `jobocate-frontend` and `jobocate-backend` under the Git
   commit tag;
4. resolves each pushed image to its registry digest;
5. loads the DOKS kubeconfig and installs private registry pull credentials;
6. creates or corrects the `jobocate.pragra.io` A record with `doctl`;
7. saves the currently deployed digests under `.deploy-state/` when a prior
   complete release exists;
8. applies namespace, deployments, services, TLS ingress, probes, and
   resource bounds;
9. waits for both rollouts and checks the five candidate v1 pages, backend
   readiness, sandbox availability, owner model routes, and owner credits.

The public frontend and backend share one origin. nginx routes `/api`,
`/health`, and `/socket.io` to NestJS and routes everything else to Next.js.
Therefore `NEXT_PUBLIC_API_URL` is `https://jobocate.pragra.io`, while the
actual REST endpoints remain under `https://jobocate.pragra.io/api/...`.

The access token stays in the process environment and is never written to the
manifest, state file, image, ticket, or command line. Without it, public smoke
checks run and the script clearly reports that authenticated checks were
skipped.

## Roll back

After the first release, each deployment writes a timestamped state file with
the exact previous image digests. Restore it with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/rollback-production.ps1 `
  -StateFile .deploy-state/rollback-YYYYMMDD-HHMMSS.json
```

The rollback script accepts digest-pinned DOCR images only, restores both
deployments, and waits for both rollouts. Its state validation is covered by
`tests/deployment-contract.test.cjs`.
