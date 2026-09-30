const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = resolve(__dirname, '..');

test('Windows PowerShell keeps pull output out of image digests and handles first deployment', () => {
  const script = readFileSync(join(root, 'scripts/deploy-production.ps1'), 'utf8');
  const checked = script.slice(script.indexOf('function Invoke-Checked'), script.indexOf('function Render-Manifest'));
  const current = script.slice(script.indexOf('function Get-CurrentImage'), script.indexOf('$previousFrontend ='));
  const digest = `registry.digitalocean.com/perfectum/jobocate-frontend@sha256:${'e'.repeat(64)}`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', `
    $ErrorActionPreference = 'Stop'
    $Namespace = 'jobocate-prod'
    function docker {
      $global:LASTEXITCODE = 0
      if ($args[0] -eq 'pull') { Write-Output 'Pulling image progress'; return }
      Write-Output '["${digest}","registry.digitalocean.com/other/image@sha256:${'f'.repeat(64)}"]'
    }
    function kubectl { $global:LASTEXITCODE = 0 }
    ${checked}
    ${current}
    $image = Get-PinnedImage 'tagged-image' 'registry.digitalocean.com/perfectum/jobocate-frontend'
    if ($image -ne '${digest}') { throw 'Pull output polluted the digest' }
    if ($null -ne (Get-CurrentImage 'jobocate-frontend' 'frontend')) { throw 'First deployment must have no prior image' }
  `], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('production deployment renders a Kubernetes-valid, digest-pinned release', () => {
  const temp = mkdtempSync(join(tmpdir(), 'jobocate-deploy-'));
  const productionEnv = join(temp, 'production.env');
  const frontendEnv = join(temp, 'prepared-frontend.env');
  const backendEnv = join(temp, 'prepared-backend.env');
  const renderDir = join(temp, 'rendered');

  writeFileSync(
    productionEnv,
    [
      'NEXT_PUBLIC_API_URL=https://jobocate.test',
      'NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key',
      'NODE_ENV=production',
      'PORT=8000',
      'MONGODB_URI=mongodb+srv://user:pass@db.example/jobocate',
      'SUPABASE_URL=https://project.supabase.co',
      'SUPABASE_JWKS_URL=https://project.supabase.co/auth/v1/.well-known/jwks.json',
      'SUPABASE_SERVICE_ROLE_KEY=server-only-key',
      'FRONTEND_URL=https://jobocate.test',
      'RESUME_SHARE_SECRET=resume-secret',
      'STRIPE_SECRET_KEY=sk_test_example',
      'STRIPE_WEBHOOK_SECRET=whsec_example',
      'SMTP_HOST=smtp.example.test',
      'SMTP_USER=mailer',
      'SMTP_PASSWORD=mail-secret',
      'LITELLM_BASE_URL=https://litellm.example.test',
      'LITELLM_MASTER_KEY=sk-litellm-example',
      'RESUME_SANDBOX_DRIVER=agent-platform',
      'AGENT_PLATFORM_URL=https://agents.example.test',
      'AGENT_PLATFORM_API_KEY=agent-secret',
      'DEFAULT_AUTOMATIC_MODEL_ALIAS=anthropic/claude-sonnet-4-6/low',
      'STORAGE_DRIVER=s3',
      'S3_BUCKET=jobocate',
      'S3_REGION=us-east-1',
      'S3_ENDPOINT=https://project.storage.supabase.co/storage/v1/s3',
      'S3_ACCESS_KEY_ID=s3-access',
      'S3_SECRET_ACCESS_KEY=s3-secret',
      '',
    ].join('\n'),
  );

  try {
    const prepared = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        join(root, 'scripts', 'prepare-production-env.ps1'),
        '-SourceFile',
        productionEnv,
        '-FrontendOutput',
        frontendEnv,
        '-BackendOutput',
        backendEnv,
      ],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(prepared.status, 0, `${prepared.stdout}\n${prepared.stderr}`);
    assert.match(readFileSync(frontendEnv, 'utf8'), /^NEXT_PUBLIC_API_URL=/m);
    assert.doesNotMatch(readFileSync(frontendEnv, 'utf8'), /MONGODB_URI/);
    assert.match(readFileSync(backendEnv, 'utf8'), /^MONGODB_URI=/m);
    assert.doesNotMatch(readFileSync(backendEnv, 'utf8'), /NEXT_PUBLIC_/);

    const result = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        join(root, 'scripts', 'deploy-production.ps1'),
        '-ValidateOnly',
        '-Domain',
        'jobocate.test',
        '-DnsZone',
        'test',
        '-DnsRecord',
        'jobocate',
        '-ProductionEnvFile',
        productionEnv,
        '-RenderDirectory',
        renderDir,
      ],
      { cwd: root, encoding: 'utf8' },
    );

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const manifest = readFileSync(join(renderDir, 'jobocate.yaml'), 'utf8');
    assert.match(manifest, /kind: Namespace/);
    assert.match(manifest, /kind: Ingress/);
    assert.match(manifest, /readinessProbe:/);
    assert.match(manifest, /livenessProbe:/);
    assert.match(manifest, /resources:/);
    assert.match(manifest, /imagePullSecrets:/);
    assert.match(manifest, /@sha256:[a-f0-9]{64}/);
    assert.doesNotMatch(manifest, /kind: PersistentVolumeClaim/);
    assert.doesNotMatch(manifest, /mountPath: \/app\/uploads/);
    assert.doesNotMatch(manifest, /- name: uploads/);

    const kubectl = spawnSync(
      'kubectl',
      ['apply', '--dry-run=client', '-f', join(renderDir, 'jobocate.yaml')],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(kubectl.status, 0, `${kubectl.stdout}\n${kubectl.stderr}`);

    const stateFile = join(temp, 'rollback.json');
    writeFileSync(
      stateFile,
      JSON.stringify({
        cluster: 'perfectum-k8s',
        namespace: 'jobocate-prod',
        frontendImage: `registry.digitalocean.com/perfectum/jobocate-frontend@sha256:${'c'.repeat(64)}`,
        backendImage: `registry.digitalocean.com/perfectum/jobocate-backend@sha256:${'d'.repeat(64)}`,
      }),
    );
    const rollback = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        join(root, 'scripts', 'rollback-production.ps1'),
        '-ValidateOnly',
        '-StateFile',
        stateFile,
      ],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(rollback.status, 0, `${rollback.stdout}\n${rollback.stderr}`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('combined production template contains both public and server values', () => {
  const text = readFileSync(
    join(root, '.env.production.example'),
    'utf8',
  );
  const keys = text
    .split(/\r?\n/)
    .map((line) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)?.[1])
    .filter(Boolean);
  assert.ok(keys.length > 0);
  assert.ok(keys.some((key) => key.startsWith('NEXT_PUBLIC_')));
  assert.ok(keys.some((key) => !key.startsWith('NEXT_PUBLIC_')));
});

test('backend production template uses the Supabase S3 bucket', () => {
  const text = readFileSync(
    join(root, '.env.production.example'),
    'utf8',
  );
  assert.match(text, /^STORAGE_DRIVER=s3$/m);
  for (const key of [
    'S3_BUCKET',
    'S3_REGION',
    'S3_ENDPOINT',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
  ]) {
    assert.match(text, new RegExp(`^${key}=.+$`, 'm'));
  }
});
