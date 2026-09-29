import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AsyncLocalStorage } from 'async_hooks';
import { Model } from 'mongoose';

@Schema({ collection: 'ai_operations', timestamps: true })
export class AiOperation {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) operationId: string;
  @Prop({ required: true }) status: string;
  @Prop({ default: false }) cancelRequested: boolean;
  @Prop({ required: true }) expiresAt: Date;
}
export const AiOperationSchema = SchemaFactory.createForClass(AiOperation);
AiOperationSchema.index({ userId: 1, operationId: 1 }, { unique: true });
AiOperationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export class AiOperationCancelledException extends ConflictException {
  readonly code = 'AI_OPERATION_CANCELLED';
  constructor() { super({ code: 'AI_OPERATION_CANCELLED', message: 'Operation cancelled. Any AI usage already incurred is still counted.' }); }
}

type Context = { cancelled: boolean; cleanup: Map<string, () => Promise<void>>; finalizers: Map<string, () => Promise<unknown>>; stopping?: Promise<void> };

@Injectable()
export class AiOperationService {
  private readonly scope = new AsyncLocalStorage<Context>();
  constructor(@InjectModel(AiOperation.name) private readonly model: Model<AiOperation>) {}

  private key(userId: string, operationId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operationId || '')) {
      throw new BadRequestException('Invalid operation ID');
    }
    return { userId, operationId };
  }

  async cancel(userId: string, operationId: string) {
    const key = this.key(userId, operationId);
    // A tombstone also covers Cancel arriving before the work request.
    await this.model.findOneAndUpdate(key, {
      $set: { cancelRequested: true },
      $setOnInsert: { status: 'cancelled', expiresAt: new Date(Date.now() + 86400000) },
    }, { upsert: true, new: true }).exec();
    return this.status(userId, operationId);
  }

  async status(userId: string, operationId: string) {
    const row = await this.model.findOne(this.key(userId, operationId)).exec();
    return { status: row?.status === 'running' && row.cancelRequested ? 'cancelling' : row?.status || 'pending' };
  }

  checkpoint() {
    if (this.scope.getStore()?.cancelled) throw new AiOperationCancelledException();
  }

  isCancelled() { return this.scope.getStore()?.cancelled === true; }

  onCancelled(id: string, finish: () => Promise<unknown>) {
    this.scope.getStore()?.finalizers.set(id, finish);
  }

  async resource(id: string, stop: () => Promise<void>) {
    const context = this.scope.getStore();
    if (!context) return;
    if (context.cancelled) { await stop(); throw new AiOperationCancelledException(); }
    context.cleanup.set(id, stop);
  }

  async run<T>(userId: string, operationId: string, work: () => Promise<T>): Promise<T> {
    const key = this.key(userId, operationId);
    const previous = await this.model.findOneAndUpdate(key, {
      $setOnInsert: { status: 'running', cancelRequested: false, expiresAt: new Date(Date.now() + 86400000) },
    }, { upsert: true, new: false }).exec();
    if (previous?.cancelRequested) throw new AiOperationCancelledException();
    if (previous) throw new ConflictException('This operation has already started.');
    const context: Context = { cancelled: false, cleanup: new Map(), finalizers: new Map() };
    const stop = () => {
      context.cancelled = true;
      // A failed teardown remains retryable; never acknowledge stopped work
      // while a provider sandbox could still be issuing requests.
      return context.stopping ||= (async () => {
        for (const [id, cleanup] of context.cleanup) {
          await cleanup();
          context.cleanup.delete(id);
        }
      })().finally(() => { context.stopping = undefined; });
    };
    let checking: Promise<void> | undefined;
    let finished = false;
    let terminalStatus = 'failed';
    const finalize = async () => {
      if (context.cancelled) {
        await stop();
        for (const [id, finish] of context.finalizers) {
          await finish();
          context.finalizers.delete(id);
        }
        terminalStatus = 'cancelled';
      }
      await this.model.updateOne(key, { $set: { status: terminalStatus } }).exec();
      clearInterval(timer);
    };
    const check = () => checking ||= (async () => {
        const row = await this.model.findOne(key).exec();
        if (row?.cancelRequested) await stop();
        if (finished) await finalize();
    })().finally(() => { checking = undefined; });
    const timer = setInterval(() => { void check().catch(() => { /* retry on next poll */ }); }, 500);
    timer.unref();
    return this.scope.run(context, async () => {
      try {
        await check();
        this.checkpoint();
        const result = await work();
        await check();
        this.checkpoint();
        terminalStatus = 'completed';
        return result;
      } catch (error) {
        if (context.cancelled) {
          await stop();
          terminalStatus = 'cancelled';
          throw new AiOperationCancelledException();
        }
        throw error;
      } finally {
        finished = true;
        try {
          await finalize();
        } catch {
          // Keep the poller alive to retry a transient teardown/database
          // failure. The API remains "cancelling" until cleanup succeeds.
          throw new ServiceUnavailableException('Cancellation cleanup is still pending. Please check again shortly.');
        }
      }
    });
  }
}
