import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Channel } from "./Channel";
import { Message } from "./Message";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phone: string;

  @Column({ type: "text", nullable: true })
  session_string: string;

  @Column({ nullable: true })
  telegram_id: string;

  @Column({ default: false })
  is_active: boolean;

  @Column({ nullable: true })
  last_login: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Channel, (channel) => channel.session)
  channels: Channel[];

  @OneToMany(() => Message, (message) => message.session)
  messages: Message[];
}