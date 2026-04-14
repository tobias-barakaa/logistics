import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { Exclude } from 'class-transformer';
  
  export enum UserRole {
    ADMIN = 'admin',
    DRIVER = 'driver',
  }
  
  @Entity('users')
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    name: string;
  
    @Column({ unique: true })
    email: string;
  
    @Column()
    @Exclude() // never serialise password in API responses
    password: string;
  
    @Column({ type: 'enum', enum: UserRole, default: UserRole.DRIVER })
    role: UserRole;
  
    @Column({ nullable: true })
    phone: string;
  
    @Column({ default: true })
    isActive: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }