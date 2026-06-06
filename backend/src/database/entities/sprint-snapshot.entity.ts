import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Sprint } from './sprint.entity';

@Entity('sprint_snapshots')
@Index(['sprintId', 'date'], { unique: true })
export class SprintSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sprint_id' })
  sprintId: string;

  @ManyToOne(() => Sprint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'integer', name: 'total_tasks' })
  totalTasks: number;

  @Column({ type: 'integer', name: 'completed_tasks' })
  completedTasks: number;

  @Column({ type: 'integer', default: 0, name: 'total_effort' })
  totalEffort: number;

  @Column({ type: 'integer', default: 0, name: 'completed_effort' })
  completedEffort: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
