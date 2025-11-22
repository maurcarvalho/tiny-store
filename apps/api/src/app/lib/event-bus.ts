import { EventBus } from '@tiny-store/shared-infrastructure';

export function getEventBus(): EventBus {
  return EventBus.getInstance();
}

