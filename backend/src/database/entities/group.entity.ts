import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserGroup } from './user-group.entity';
import { Task } from './task.entity';

@Entity('groups')
export class Group {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'owner_id' })
    ownerId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => UserGroup, (userGroup) => userGroup.group)
    userGroups: UserGroup[];

    @OneToMany(() => Task, (task) => task.group)
    tasks: Task[];
}
