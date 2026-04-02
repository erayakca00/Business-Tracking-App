import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Task } from './task.entity';

export enum SprintStatus {
    PLANNED = 'planned',
    ACTIVE = 'active',
    COMPLETED = 'completed',
}

@Entity('sprints')
export class Sprint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'group_id' })
    groupId: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    goal: string;

    @Column({
        type: 'enum',
        enum: SprintStatus,
        default: SprintStatus.PLANNED,
    })
    status: SprintStatus;

    @Column({ name: 'start_date', type: 'timestamp', nullable: true })
    startDate: Date;

    @Column({ name: 'end_date', type: 'timestamp', nullable: true })
    endDate: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => Group, (group) => group.sprints, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'group_id' })
    group: Group;

    @OneToMany(() => Task, (task) => task.sprint)
    tasks: Task[];
}
