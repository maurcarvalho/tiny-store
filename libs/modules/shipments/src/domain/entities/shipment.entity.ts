import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('shipments')
export class ShipmentEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  orderId!: string;

  @Column()
  trackingNumber!: string;

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
  dispatchedAt?: Date;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @Column({ nullable: true })
  estimatedDeliveryDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

