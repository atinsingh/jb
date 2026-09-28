import { LiteLLMProvider } from './litellm.provider';
describe('LiteLLM owner key requirement', () => {
  it('does not turn shared or master credentials into an owner model client', () => {
    const previous = { shared: process.env.LITELLM_API_KEY, master: process.env.LITELLM_MASTER_KEY };
    process.env.LITELLM_API_KEY = 'sk-shared-test'; process.env.LITELLM_MASTER_KEY = 'sk-master-test';
    try { expect(new LiteLLMProvider().isAvailable()).toBe(false); }
    finally {
      if (previous.shared === undefined) delete process.env.LITELLM_API_KEY; else process.env.LITELLM_API_KEY = previous.shared;
      if (previous.master === undefined) delete process.env.LITELLM_MASTER_KEY; else process.env.LITELLM_MASTER_KEY = previous.master;
    }
  });
});
