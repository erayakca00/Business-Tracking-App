import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SprintsService } from './sprints.service';
import { SprintsController } from './sprints.controller';
import { Sprint } from '../database/entities/sprint.entity';
import { Task } from '../database/entities/task.entity';
import { UserGroup } from '../database/entities/user-group.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Sprint, Task, UserGroup])],
    controllers: [SprintsController],
    providers: [SprintsService],
    exports: [SprintsService],
})
export class SprintsModule {}
