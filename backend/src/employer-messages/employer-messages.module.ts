import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerMessagesController } from './employer-messages.controller';
import { EmployerMessagesService } from './employer-messages.service';
import {
  EmployerConversation,
  EmployerConversationSchema,
} from './schemas/employer-conversation.schema';
import {
  EmployerMessage,
  EmployerMessageSchema,
} from './schemas/employer-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerConversation.name, schema: EmployerConversationSchema },
      { name: EmployerMessage.name, schema: EmployerMessageSchema },
    ]),
  ],
  controllers: [EmployerMessagesController],
  providers: [EmployerMessagesService],
  exports: [EmployerMessagesService, MongooseModule],
})
export class EmployerMessagesModule {}
