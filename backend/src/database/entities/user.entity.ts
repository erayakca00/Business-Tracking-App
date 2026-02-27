import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToMany,
} from 'typeorm';
import { UserGroup } from './user-group.entity';
import { Task } from './task.entity';

export enum UserRole {
    ADMIN = 'admin',
    MEMBER = 'member',
    VIEWER = 'viewer',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    name: string;

    @Column({ type: 'jsonb', nullable: true })
    skills: string[];

    @Column({ default: 'light' })
    webTheme: string;

    @Column({ default: 'light' })
    mobileTheme: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => UserGroup, (userGroup) => userGroup.user)
    userGroups: UserGroup[];

    @OneToMany(() => Task, (task) => task.assignedTo)
    assignedTasks: Task[];

    @OneToMany(() => Task, (task) => task.createdBy)
    createdTasks: Task[];
}
