import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payments')
export class PaymentEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  orderId!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column()
  status!: string;

  @Column('simple-json')
  paymentMethod!: {
    type: string;
    details: string;
  };

  @Column({ nullable: true })
  failureReason?: string;

  @Column()
  processingAttempts!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

