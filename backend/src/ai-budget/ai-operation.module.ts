import { CallHandler, Controller, ExecutionContext, Global, Injectable, Module, NestInterceptor, Param, Post, Get, Request, UseGuards } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { defer, lastValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiOperation, AiOperationSchema, AiOperationService } from './ai-operation.service';

@Injectable()
export class AiOperationInterceptor implements NestInterceptor {
  constructor(private readonly operations: AiOperationService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const id = req.headers['x-ai-operation-id'];
    if (!id || req.method !== 'POST') return next.handle();
    return defer(async () => {
      try {
        return await this.operations.run(String(req.user._id ?? req.user.id), id, () => lastValueFrom(next.handle()));
      } catch (error) {
        // Streaming controllers already deliver the cancellation error as SSE.
        if (context.switchToHttp().getResponse().headersSent) return;
        throw error;
      }
    });
  }
}

@Controller('ai-operations')
@UseGuards(JwtAuthGuard)
class AiOperationController {
  constructor(private readonly operations: AiOperationService) {}
  @Post(':id/cancel')
  cancel(@Request() req, @Param('id') id: string) {
    return this.operations.cancel(String(req.user._id ?? req.user.id), id);
  }
  @Get(':id')
  status(@Request() req, @Param('id') id: string) {
    return this.operations.status(String(req.user._id ?? req.user.id), id);
  }
}

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: AiOperation.name, schema: AiOperationSchema }])],
  controllers: [AiOperationController],
  providers: [AiOperationService, AiOperationInterceptor],
  exports: [AiOperationService, AiOperationInterceptor],
})
export class AiOperationModule {}
