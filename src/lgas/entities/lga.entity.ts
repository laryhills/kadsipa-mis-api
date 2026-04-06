import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StateEntity } from './state.entity';
import { WardEntity } from '../../wards/entities/ward.entity';
import { InterventionEntity } from '../../interventions/entities/intervention.entity';

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

  @ManyToMany(() => InterventionEntity, (intervention) => intervention.lgas)
  interventions: InterventionEntity[];
}
