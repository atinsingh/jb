import { InterviewBuddyService } from './interview-buddy.service';

const USER_ID = 'user123';

describe('InterviewBuddyService.chat (llm migration)', () => {
  let service: InterviewBuddyService;
  let interviewChat: { chat: jest.Mock };

  beforeEach(() => {
    interviewChat = { chat: jest.fn() };
    // Models are only touched when applicationId/resumeId are supplied; the
    // tests below omit them, so empty stubs are sufficient.
    service = new InterviewBuddyService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      interviewChat as any,
    );
  });

  it('delegates to InterviewChatService.chat with the userId + built messages', async () => {
    interviewChat.chat.mockResolvedValue('Structure your answer with STAR.');

    const result = await service.chat(USER_ID, 'How do I introduce myself?');

    expect(interviewChat.chat).toHaveBeenCalledTimes(1);
    const [passedUserId, messages] = interviewChat.chat.mock.calls[0];
    expect(passedUserId).toBe(USER_ID);
    expect(messages[0].role).toBe('system');
    expect(messages[messages.length - 1]).toEqual({
      role: 'user',
      content: 'How do I introduce myself?',
    });
    expect(result).toBe('Structure your answer with STAR.');
  });

  it('returns the canned STAR guidance when the llm service throws', async () => {
    interviewChat.chat.mockRejectedValue(new Error('provider down'));

    const result = await service.chat(USER_ID, 'help');

    expect(result).toContain('STAR');
    expect(result).toContain('temporarily unable');
  });
});
