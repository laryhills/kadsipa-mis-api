import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StateEntity } from './state.entity';
import { WardEntity } from '@/wards/entities/ward.entity';

@Entity('lgas')
export class LgaEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, nullable: false })
  name: string;

  @ManyToOne(() => StateEntity, (state) => state.lgas, { nullable: false })
  @JoinColumn({ name: 'state_id' })
  state: StateEntity;

  @Column({ name: 'state_id' })
  state_id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => WardEntity, (ward) => ward.lga)
  wards: WardEntity[];
}
