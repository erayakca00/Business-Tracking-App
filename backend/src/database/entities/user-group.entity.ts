import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('user_groups')
export class UserGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'group_id' })
  groupId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @ManyToOne(() => User, (user) => user.userGroups)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Group, (group) => group.userGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group;
}
