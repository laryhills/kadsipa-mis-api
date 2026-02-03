import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LgaEntity } from '@/lgas/entities/lga.entity';

@Entity('wards')
export class WardEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, nullable: false })
  name: string;

  @ManyToOne(() => LgaEntity, (lga) => lga.wards, { nullable: false })
  @JoinColumn({ name: 'lga_id' })
  lga: LgaEntity;

  @Column({ name: 'lga_id' })
  lga_id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
