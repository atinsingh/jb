import { envFileNames } from './load-env';

describe('production environment loading', () => {
  it('loads the baked production file before local fallbacks', () => {
    expect(envFileNames('production')).toEqual([
      '.env.production',
      '.env.local',
      '.env',
    ]);
  });

  it('does not load production configuration in development', () => {
    expect(envFileNames('development')).toEqual(['.env.local', '.env']);
  });
});
