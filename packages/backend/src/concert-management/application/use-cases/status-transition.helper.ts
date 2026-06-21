import { InvalidConcertStatusTransitionError } from '../../domain/errors';

export function checkConcertStatusTransition(from: string, to: 'PUBLISHED' | 'CANCELLED'): void {
  if (from === 'ENDED') {
    throw new InvalidConcertStatusTransitionError(from, to);
  }
  if (from === 'CANCELLED') {
    throw new InvalidConcertStatusTransitionError(from, to);
  }
  if (to === 'PUBLISHED' && from === 'PUBLISHED') {
    throw new InvalidConcertStatusTransitionError(from, to);
  }
  if (to === 'CANCELLED' && from === 'CANCELLED') {
    throw new InvalidConcertStatusTransitionError(from, to);
  }
}
