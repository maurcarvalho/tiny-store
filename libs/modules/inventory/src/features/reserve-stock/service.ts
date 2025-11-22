import { DataSource } from 'typeorm';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { StockReservationRepository } from '../../domain/repositories/stock-reservation.repository';
import { EventBus } from '@tiny-store/shared-infrastructure';
import { ReserveStockDto, ReserveStockResponse } from './dto';
import {
  createInventoryReservedEvent,
  InventoryReservedPayload,
} from '../../domain/events/inventory-reserved.event';
import {
  createInventoryReservationFailedEvent,
  InventoryReservationFailedPayload,
} from '../../domain/events/inventory-reservation-failed.event';

export class ReserveStockService {
  private productRepository: ProductRepository;
  private reservationRepository: StockReservationRepository;
  private eventBus: EventBus;

  constructor(dataSource: DataSource) {
    this.productRepository = new ProductRepository(dataSource);
    this.reservationRepository = new StockReservationRepository(dataSource);
    this.eventBus = EventBus.getInstance();
  }

  async execute(dto: ReserveStockDto): Promise<ReserveStockResponse> {
    try {
      // Check if all products are available
      const products = [];
      for (const item of dto.items) {
        const product = await this.productRepository.findBySku(item.sku);
        
        if (!product) {
          await this.publishFailureEvent(
            dto.orderId,
            `Product ${item.sku} not found`,
            dto.items
          );
          
          return {
            success: false,
            orderId: dto.orderId,
            error: `Product ${item.sku} not found`,
          };
        }

        if (!product.canReserve(item.quantity)) {
          await this.publishFailureEvent(
            dto.orderId,
            `Insufficient stock for ${item.sku}. Available: ${product.availableStock}, Requested: ${item.quantity}`,
            dto.items
          );
          
          return {
            success: false,
            orderId: dto.orderId,
            error: `Insufficient stock for ${item.sku}`,
          };
        }

        products.push({ product, quantity: item.quantity });
      }

      // Reserve all stock
      const reservations = [];
      for (const { product, quantity } of products) {
        product.reserveStock(quantity);
        await this.productRepository.save(product);
        
        const reservationId = await this.reservationRepository.create(
          dto.orderId,
          product.sku.value,
          quantity
        );
        
        reservations.push({ sku: product.sku.value, quantity });
      }

      // Publish success event
      const payload: InventoryReservedPayload = {
        orderId: dto.orderId,
        reservations,
      };

      const event = createInventoryReservedEvent(products[0].product.id, payload);
      await this.eventBus.publish(event);

      return {
        success: true,
        orderId: dto.orderId,
        reservations,
      };
    } catch (error) {
      await this.publishFailureEvent(
        dto.orderId,
        error instanceof Error ? error.message : 'Unknown error',
        dto.items
      );
      
      return {
        success: false,
        orderId: dto.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async publishFailureEvent(
    orderId: string,
    reason: string,
    requestedItems: Array<{ sku: string; quantity: number }>
  ): Promise<void> {
    const payload: InventoryReservationFailedPayload = {
      orderId,
      reason,
      requestedItems,
    };

    const event = createInventoryReservationFailedEvent(orderId, payload);
    await this.eventBus.publish(event);
  }
}

