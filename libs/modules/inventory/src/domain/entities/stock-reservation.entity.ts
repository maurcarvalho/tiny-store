import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('stock_reservations')
export class StockReservationEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  orderId!: string;

  @Column()
  sku!: string;

  @Column()
  quantity!: number;

  @Column()
  createdAt!: Date;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ default: false })
  released!: boolean;
}

