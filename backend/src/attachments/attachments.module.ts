import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { TaskAttachment } from '../database/entities/task-attachment.entity';
import { TasksModule } from '../tasks/tasks.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TaskAttachment]),
        forwardRef(() => TasksModule)
    ],
    providers: [AttachmentsService],
    controllers: [AttachmentsController],
    exports: [AttachmentsService]
})
export class AttachmentsModule { }
