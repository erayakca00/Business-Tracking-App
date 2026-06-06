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

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string; // The user receiving the notification

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  actorId: string; // The user who triggered the notification

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @Column()
  type: string; // e.g., 'mention', 'assigned', 'task_completed'

  @Column()
  message: string;

  @Column({ nullable: true })
  taskId: string;

  @Index()
  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
