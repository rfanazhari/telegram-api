import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { Session } from "./Session";
import { Message } from "./Message";
import { User } from "./User";

@Entity("channels")
export class Channel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  channel_id: string;

  @Column()
  name: string;

  @Column()
  session_id: number;

  @ManyToOne(() => Session, (session) => session.channels)
  @JoinColumn({ name: "session_id" })
  session: Session;

  @Column({ nullable: true })
  user_id: number;

  @ManyToOne(() => User, (user) => user.channels)
  @JoinColumn({ name: "user_id" })
  user: User;

  @OneToMany(() => Message, (message) => message.channel)
  messages: Message[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}