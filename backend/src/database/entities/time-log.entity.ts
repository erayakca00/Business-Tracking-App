import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('time_logs')
export class TimeLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamp', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', name: 'ended_at', nullable: true })
  endedAt: Date;

  @Column({ type: 'integer', nullable: true })
  duration: number; // in seconds

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
