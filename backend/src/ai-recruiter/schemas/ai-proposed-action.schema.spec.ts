import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import {
  AiProposedAction,
  AiProposedActionSchema,
  AiProposedActionDocument,
} from './ai-proposed-action.schema';

describe('AiProposedAction schema', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let model: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: AiProposedAction.name, schema: AiProposedActionSchema },
        ]),
      ],
    }).compile();
    model = module.get(getModelToken(AiProposedAction.name));
  });

  afterAll(async () => {
    await module.close();
    await mongod.stop();
  });

  it('defaults a new proposal to pending status', async () => {
    const doc: AiProposedActionDocument = await model.create({
      ownerId: new Types.ObjectId(),
      source: 'autopilot',
      actionType: 'reject',
      applicantId: new Types.ObjectId(),
      rationale: 'Score below threshold',
    });

    expect(doc.status).toBe('pending');
    expect(doc.payload).toEqual({});
  });

  it('rejects an actionType outside the enum', async () => {
    await expect(
      model.create({
        ownerId: new Types.ObjectId(),
        source: 'copilot',
        actionType: 'delete_everything',
        applicantId: new Types.ObjectId(),
        rationale: 'x',
      }),
    ).rejects.toThrow();
  });
});
