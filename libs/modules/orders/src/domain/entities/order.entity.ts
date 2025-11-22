import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('orders')
export class OrderEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  customerId!: string;

  @Column('simple-json')
  items!: Array<{ sku: string; quantity: number; unitPrice: number }>;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount!: number;

  @Column('simple-json')
  shippingAddress!: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  @Column()
  status!: string;

  @Column({ nullable: true })
  paymentId?: string;

  @Column({ nullable: true })
  shipmentId?: string;

  @Column({ nullable: true })
  cancellationReason?: string;

  @Column({ nullable: true })
  rejectionReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

