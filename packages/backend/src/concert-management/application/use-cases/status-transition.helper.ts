import { BadRequestException } from '@nestjs/common';

export function checkConcertStatusTransition(from: string, to: 'PUBLISHED' | 'CANCELLED'): void {
  if (from === 'ENDED') {
    throw new BadRequestException(`Cannot transition concert from ENDED to ${to}`);
  }
  if (from === 'CANCELLED') {
    throw new BadRequestException(`Cannot transition concert from CANCELLED to ${to}`);
  }
  if (to === 'PUBLISHED' && from === 'PUBLISHED') {
    throw new BadRequestException('Concert is already published');
  }
  if (to === 'CANCELLED' && from === 'CANCELLED') {
    throw new BadRequestException('Concert is already cancelled');
  }
}
