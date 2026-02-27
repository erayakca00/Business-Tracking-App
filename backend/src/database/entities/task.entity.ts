import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';

export enum TaskStatus {
    TODO = 'todo',
    IN_PROGRESS = 'in_progress',
    REVIEW = 'review',
    DONE = 'done',
    BLOCKED = 'blocked',
}

export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
}

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'group_id' })
    groupId: string;

    @Column({ name: 'assigned_to', nullable: true })
    assignedToId: string;

    @Column({ name: 'created_by' })
    createdById: string;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: TaskStatus,
        default: TaskStatus.TODO,
    })
    status: TaskStatus;

    @Column({
        type: 'enum',
        enum: TaskPriority,
        default: TaskPriority.MEDIUM,
    })
    priority: TaskPriority;

    @Column({ type: 'timestamp', nullable: true })
    deadline: Date;

    @Column({ name: 'estimated_hours', type: 'integer', nullable: true })
    estimatedHours: number;

    @Column({ type: 'jsonb', nullable: true, name: 'required_skills' })
    requiredSkills: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'due_date', type: 'timestamp', nullable: true })
    dueDate: Date;

    @Column({ name: 'project_tag', nullable: true })
    projectTag: string;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;

    @ManyToOne(() => Group, (group) => group.tasks)
    @JoinColumn({ name: 'group_id' })
    group: Group;

    @ManyToOne(() => User, (user) => user.assignedTasks, { nullable: true })
    @JoinColumn({ name: 'assigned_to' })
    assignedTo: User;

    @ManyToOne(() => User, (user) => user.createdTasks)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;
}
