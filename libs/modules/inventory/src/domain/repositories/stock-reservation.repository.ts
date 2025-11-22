import { DataSource, Repository } from 'typeorm';
import { StockReservation } from '../entities/stock-reservation';
import { StockReservationEntity } from '../entities/stock-reservation.entity';
import { v4 as uuidv4 } from 'uuid';

export class StockReservationRepository {
  private repository: Repository<StockReservationEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(StockReservationEntity);
  }

  async save(reservation: StockReservation): Promise<void> {
    const entity = this.repository.create({
      id: reservation.id,
      orderId: reservation.orderId,
      sku: reservation.sku,
      quantity: reservation.quantity,
      createdAt: reservation.createdAt,
      expiresAt: reservation.expiresAt ?? undefined,
      released: reservation.released,
    });

    await this.repository.save(entity);
  }

  async create(
    orderId: string,
    sku: string,
    quantity: number
  ): Promise<string> {
    const reservation = new StockReservation(
      uuidv4(),
      orderId,
      sku,
      quantity,
      new Date(),
      null,
      false
    );

    await this.save(reservation);
    return reservation.id;
  }

  async findById(id: string): Promise<StockReservation | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrderId(orderId: string): Promise<StockReservation[]> {
    const entities = await this.repository.find({
      where: { orderId },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findBySku(sku: string): Promise<StockReservation[]> {
    const entities = await this.repository.find({
      where: { sku },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async releaseByOrderId(orderId: string): Promise<void> {
    await this.repository.update(
      { orderId },
      { released: true }
    );
  }

  private toDomain(entity: StockReservationEntity): StockReservation {
    return new StockReservation(
      entity.id,
      entity.orderId,
      entity.sku,
      entity.quantity,
      entity.createdAt,
      entity.expiresAt ?? null,
      entity.released
    );
  }
}

