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
import { Sprint } from './sprint.entity';
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

    @Column({ type: 'integer', nullable: true })
    effort: number; // 1 (trivial) to 5 (very complex)

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

    @Column({ name: 'sprint_id', nullable: true })
    sprintId: string | null;

    @ManyToOne(() => Group, (group) => group.tasks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group: Group;

    @ManyToOne(() => Sprint, (sprint) => sprint.tasks, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'sprint_id' })
    sprint: Sprint;

    @ManyToOne(() => User, (user) => user.assignedTasks, { nullable: true })
    @JoinColumn({ name: 'assigned_to' })
    assignedTo: User;

    @ManyToOne(() => User, (user) => user.createdTasks)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @Column({ name: 'depends_on_id', nullable: true })
    dependsOnId: string | null;

    @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'depends_on_id' })
    dependsOn: Task;
}
