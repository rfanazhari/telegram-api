import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { Session } from "./Session";
import { Channel } from "./Channel";
import { User } from "./User";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  message_id: string;

  @Column("text")
  content: string;

  @Column()
  channel_id: number;

  @ManyToOne(() => Channel, (channel) => channel.messages)
  @JoinColumn({ name: "channel_id" })
  channel: Channel;

  @Column()
  session_id: number;

  @ManyToOne(() => Session, (session) => session.messages)
  @JoinColumn({ name: "session_id" })
  session: Session;

  @Column({ nullable: true })
  user_id: number;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "datetime" })
  timestamp: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}