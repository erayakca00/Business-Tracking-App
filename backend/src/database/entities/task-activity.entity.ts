import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type ActivityType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'effort_changed'
  | 'assignee_changed'
  | 'due_date_changed'
  | 'tag_changed'
  | 'title_changed'
  | 'description_changed'
  | 'attachment_added'
  | 'attachment_deleted';

@Entity('task_activities')
export class TaskActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'task_id' })
  taskId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar' })
  type: ActivityType;

  @Column({ type: 'jsonb', nullable: true })
  data: { from?: string; to?: string } | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  actor: User;
}
