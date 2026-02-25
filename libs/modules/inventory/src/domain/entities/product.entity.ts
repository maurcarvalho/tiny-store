import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('products')
export class ProductEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  sku!: string;

  @Column()
  name!: string;

  @Column({ default: 0 })
  stockQuantity!: number;

  @Column()
  reservedQuantity!: number;

  @Column()
  status!: string;

  @Column()
  createdAt!: Date;

  @Column()
  updatedAt!: Date;
}

