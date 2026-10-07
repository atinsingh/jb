import { envFileNames } from './load-env';

describe('production environment loading', () => {
  it('loads only the production file in production', () => {
    expect(envFileNames('production')).toEqual(['.env.production']);
  });

  it('does not load production configuration in development', () => {
    expect(envFileNames('development')).toEqual(['.env.local']);
  });
});
