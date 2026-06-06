import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from './user.entity';
import { TaskPriority } from './task.entity';

@Entity('task_templates')
export class TaskTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'group_id' })
  groupId: string;

  @Index()
  @Column({ name: 'created_by', nullable: true })
  createdById: string | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
    nullable: true,
  })
  priority: TaskPriority;

  @Column({ type: 'integer', nullable: true })
  effort: number;

  @Column({ name: 'project_tag', nullable: true })
  projectTag: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;
}
