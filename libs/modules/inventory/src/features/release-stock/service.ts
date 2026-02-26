import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { StockReservationRepository } from '../../domain/repositories/stock-reservation.repository';
import { EventBus } from '@tiny-store/shared-infrastructure';
import { ReleaseStockDto, ReleaseStockResponse } from './dto';
import {
  createInventoryReleasedEvent,
  InventoryReleasedPayload,
} from '../../domain/events/inventory-released.event';

export class ReleaseStockService {
  private productRepository: ProductRepository;
  private reservationRepository: StockReservationRepository;
  private eventBus: EventBus;

  constructor(db: DrizzleDb) {
    this.productRepository = new ProductRepository(db);
    this.reservationRepository = new StockReservationRepository(db);
    this.eventBus = EventBus.getInstance();
  }

  async execute(dto: ReleaseStockDto): Promise<ReleaseStockResponse> {
    const reservations = await this.reservationRepository.findByOrderId(
      dto.orderId
    );

    const released = [];

    for (const reservation of reservations) {
      const product = await this.productRepository.findBySku(reservation.sku);

      if (product) {
        product.releaseStock(reservation.quantity);
        await this.productRepository.save(product);
      }

      reservation.release();
      await this.reservationRepository.save(reservation);

      released.push({ sku: reservation.sku, quantity: reservation.quantity });
    }

    if (released.length > 0) {
      const payload: InventoryReleasedPayload = {
        orderId: dto.orderId,
        reservations: released,
      };

      const event = createInventoryReleasedEvent(dto.orderId, payload);
      await this.eventBus.publish(event);
    }

    return {
      success: true,
      orderId: dto.orderId,
      releasedReservations: released,
    };
  }
}

