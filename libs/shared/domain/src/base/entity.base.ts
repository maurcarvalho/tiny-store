export abstract class Entity {
  constructor(public readonly id: string) {}

  equals(entity: Entity): boolean {
    return this.id === entity.id;
  }
}

