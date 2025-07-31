import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Channel } from "./Channel";
import { Message } from "./Message";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  msisdn: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  telegram_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Channel, (channel) => channel.user)
  channels: Channel[];

  @OneToMany(() => Message, (message) => message.user)
  messages: Message[];
}