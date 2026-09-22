import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

describe('LiteLLM Docker persistence', () => {
  const root = join(process.cwd(), '..');
  const compose = parse(
    readFileSync(join(root, 'docker-compose.yml'), 'utf8'),
  );
  const liteLlm = parse(
    readFileSync(join(root, 'infra', 'litellm', 'config.yaml'), 'utf8'),
  );

  it('persists virtual keys and spend in a healthy pinned PostgreSQL service', () => {
    const database = compose.services['litellm-db'];
    expect(database.image).toMatch(/^postgres:\d+\.\d+-alpine$/);
    expect(database.image).not.toContain('latest');
    expect(database.healthcheck.test.join(' ')).toContain('pg_isready');
    expect(database.volumes).toContain(
      'litellm_postgres_data:/var/lib/postgresql/data',
    );
    expect(compose.volumes).toHaveProperty('litellm_postgres_data');
    expect(database.ports).toBeUndefined();
  });

  it('gives LiteLLM a nonblank in-network URL and waits for database health', () => {
    const proxy = compose.services.litellm;
    const databaseUrl = proxy.environment.find((entry: string) =>
      entry.startsWith('LITELLM_DATABASE_URL='),
    );
    expect(databaseUrl).toMatch(
      /^LITELLM_DATABASE_URL=postgresql:\/\/[^:]+:[^@]+@litellm-db:5432\/[^\s]+$/,
    );
    expect(proxy.depends_on['litellm-db']).toEqual({
      condition: 'service_healthy',
    });
    expect(liteLlm.general_settings.database_url).toBe(
      'os.environ/LITELLM_DATABASE_URL',
    );
  });

  it('does not change the established host port contract', () => {
    expect(compose.services.frontend.ports).toContain('3000:3000');
    expect(compose.services.litellm.ports).toContain('4000:4000');
    expect(compose.services['agent-platform'].ports).toContain('4100:4100');
    expect(compose.services.backend.ports).toContain('8000:8000');
    expect(compose.services.mongodb.ports).toContain('27018:27017');
  });
});
