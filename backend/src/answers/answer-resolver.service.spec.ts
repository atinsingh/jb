import { AnswerResolverService, FormField } from './answer-resolver.service';
import { AnswerProfileService } from './answer-profile.service';
import { AnswerBankService } from './answer-bank.service';
import { OptionMapperService } from './option-mapper.service';
import { QUESTION_CATALOG_SEED } from './question-catalog.seed';
import { normalizeQuestion } from './question-normalizer';
import { QuestionClass } from '../schemas/question-catalog.schema';
import { WorkAuthStatus } from '../schemas/answer-profile.schema';

const USER_ID = '507f1f77bcf86cd799439011';

describe('AnswerResolverService', () => {
  let service: AnswerResolverService;
  let llm: { getProviderForFeature: jest.Mock; getFeatureConfig: jest.Mock };
  let chat: jest.Mock;
  let profileDoc: any;
  let bankRows: any[];

  beforeEach(() => {
    profileDoc = {};
    bankRows = [];
    chat = jest.fn().mockResolvedValue({ content: 'A drafted answer.' });

    llm = {
      getProviderForFeature: jest.fn().mockReturnValue({ chat }),
      getFeatureConfig: jest.fn().mockReturnValue({ model: 'm', temperature: 0.3, maxTokens: 500 }),
    };

    const catalogModel: any = { find: () => ({ lean: () => Promise.resolve(QUESTION_CATALOG_SEED) }) };
    const profileModel: any = {
      findOne: () => ({ exec: () => Promise.resolve(profileDoc) }),
      create: () => Promise.resolve(profileDoc),
      findOneAndUpdate: () => ({ exec: () => Promise.resolve(profileDoc) }),
    };
    const bankModel: any = {
      find: () => ({ exec: () => Promise.resolve(bankRows) }),
      updateMany: () => ({ exec: () => Promise.resolve({}) }),
      findOneAndUpdate: () => ({ exec: () => Promise.resolve({}) }),
    };

    service = new AnswerResolverService(
      catalogModel,
      new AnswerProfileService(profileModel),
      new AnswerBankService(bankModel),
      new OptionMapperService(),
      llm as any,
    );
  });

  const workAuthField = (options?: { value: string; label: string }[]): FormField => ({
    name: 'work_auth',
    label: 'Are you legally authorized to work in the United States?',
    type: options ? 'select' : 'text',
    required: true,
    options,
  });

  const YES_NO = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];

  const SELF_DESCRIBING = [
    { value: '1', label: 'I am legally authorized to work in the United States without sponsorship' },
    { value: '2', label: 'I will require sponsorship now or in the future' },
    { value: '3', label: 'Prefer not to say' },
  ];

  // ======================================================== AC2.2 ========
  describe('attestations never reach a model', () => {
    it('blocks an unanswered attestation and makes NO llm call', async () => {
      const res = await service.resolve(USER_ID, [workAuthField(SELF_DESCRIBING)]);

      expect(res.answers).toHaveLength(0);
      expect(res.blockers).toHaveLength(1);
      expect(res.blockers[0].questionClass).toBe(QuestionClass.ATTESTATION);
      expect(res.blockers[0].required).toBe(true);

      // The assertion this whole feature rests on.
      expect(llm.getProviderForFeature).not.toHaveBeenCalled();
      expect(chat).not.toHaveBeenCalled();
    });

    it('makes no llm call for an unanswered demographic question either', async () => {
      const res = await service.resolve(USER_ID, [
        { name: 'gender', label: 'Gender', type: 'select', options: [{ value: 'f', label: 'Female' }] },
      ]);

      expect(res.blockers).toHaveLength(1);
      expect(res.blockers[0].questionClass).toBe(QuestionClass.DEMOGRAPHIC);
      expect(chat).not.toHaveBeenCalled();
    });

    it('makes no llm call for an unrecognised question', async () => {
      const res = await service.resolve(USER_ID, [
        { name: 'q1', label: 'Which build tool do you prefer and why?', type: 'textarea', required: true },
      ]);

      expect(res.blockers).toHaveLength(1);
      expect(res.blockers[0].questionClass).toBeNull();
      expect(res.unknownQuestions).toContain('Which build tool do you prefer and why?');
      expect(chat).not.toHaveBeenCalled();
    });
  });

  // ================================================= stored facts ========
  describe('resolving from a stored fact', () => {
    it('maps a known work-authorization fact onto self-describing options', async () => {
      profileDoc = { workAuthorization: { US: WorkAuthStatus.AUTHORIZED } };

      const res = await service.resolve(USER_ID, [workAuthField(SELF_DESCRIBING)]);

      expect(res.blockers).toHaveLength(0);
      expect(res.answers).toHaveLength(1);
      expect(res.answers[0].value).toBe('1');
      expect(res.answers[0].source).toBe('profile');
      expect(chat).not.toHaveBeenCalled();
    });

    it('picks the sponsorship option when that is the candidate\'s status', async () => {
      profileDoc = { workAuthorization: { US: WorkAuthStatus.REQUIRES_SPONSORSHIP } };

      const res = await service.resolve(USER_ID, [workAuthField(SELF_DESCRIBING)]);

      expect(res.answers[0].value).toBe('2');
    });

    it('scopes work authorization per country — a US fact does not answer a Canadian question', async () => {
      profileDoc = { workAuthorization: { US: WorkAuthStatus.AUTHORIZED } };

      const res = await service.resolve(USER_ID, [
        { ...workAuthField(SELF_DESCRIBING), label: 'Are you authorized to work in Canada?' },
      ]);

      expect(res.answers).toHaveLength(0);
      expect(res.blockers).toHaveLength(1);
      expect(chat).not.toHaveBeenCalled();
    });

    // The polarity trap: bare Yes/No cannot be mapped safely from the fact
    // alone, because the question could be "are you authorized" or "do you
    // require sponsorship". Guessing would be a wrong legal statement.
    it('blocks rather than guessing on an ambiguous Yes/No attestation', async () => {
      profileDoc = { workAuthorization: { US: WorkAuthStatus.AUTHORIZED } };

      const res = await service.resolve(USER_ID, [workAuthField(YES_NO)]);

      expect(res.answers).toHaveLength(0);
      expect(res.blockers).toHaveLength(1);
      expect(res.blockers[0].reason).toMatch(/confidence/i);
    });

    it('fills a free-text preference straight from the profile', async () => {
      profileDoc = { noticePeriodDays: 30 };

      const res = await service.resolve(USER_ID, [
        { name: 'notice', label: 'Notice period', type: 'text', required: true },
      ]);

      expect(res.blockers).toHaveLength(0);
      expect(res.answers[0].value).toBe(30);
    });
  });

  // =========================================== the learning loop ========
  describe('the answer bank', () => {
    it('resolves a previously-answered question without asking again', async () => {
      const label = 'Which build tool do you prefer and why?';
      // Derive the key rather than hardcoding it — the normalizer owns that
      // shape, and a literal here would rot the moment stopwords change.
      bankRows = [
        {
          questionKey: normalizeQuestion(label).key,
          value: 'Bazel, for reproducibility.',
          confidence: 1,
        },
      ];

      const res = await service.resolve(USER_ID, [{ name: 'q1', label, type: 'textarea' }]);

      expect(res.blockers).toHaveLength(0);
      expect(res.answers[0].value).toBe('Bazel, for reproducibility.');
      expect(res.answers[0].source).toBe('bank');
      expect(chat).not.toHaveBeenCalled();
    });
  });

  // ==================================================== prose ===========
  describe('prose', () => {
    it('is the only class a model may draft', async () => {
      const res = await service.resolve(
        USER_ID,
        [{ name: 'why', label: 'Why do you want to work at Acme?', type: 'textarea', maxLength: 500 }],
        { companyName: 'Acme', jobTitle: 'Engineer' },
      );

      expect(res.answers).toHaveLength(1);
      expect(res.answers[0].source).toBe('ai_draft');
      expect(res.answers[0].value).toBe('A drafted answer.');
      expect(chat).toHaveBeenCalledTimes(1);
    });

    it('blocks instead of failing when drafting errors', async () => {
      chat.mockRejectedValue(new Error('provider down'));

      const res = await service.resolve(USER_ID, [
        { name: 'why', label: 'Why do you want to work here?', type: 'textarea' },
      ]);

      expect(res.answers).toHaveLength(0);
      expect(res.blockers).toHaveLength(1);
    });

    it('respects the field maxLength', async () => {
      chat.mockResolvedValue({ content: 'x'.repeat(900) });

      const res = await service.resolve(USER_ID, [
        { name: 'why', label: 'Why do you want to work here?', type: 'textarea', maxLength: 100 },
      ]);

      expect(String(res.answers[0].value).length).toBe(100);
    });
  });

  describe('files', () => {
    it('are skipped — the résumé builders own them', async () => {
      const res = await service.resolve(USER_ID, [
        { name: 'resume', label: 'Résumé', type: 'file', required: true },
      ]);

      expect(res.answers).toHaveLength(0);
      expect(res.blockers).toHaveLength(0);
    });
  });
});
