import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';

export interface UpdateMyProfileCommand {
  displayName?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  addressLine?: string | null;
  city?: string | null;
  district?: string | null;
}

@Injectable()
export class UpdateMyProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string, cmd: UpdateMyProfileCommand): Promise<void> {
    const updateData: any = {};
    if (cmd.displayName !== undefined) updateData.displayName = cmd.displayName;
    if (cmd.phone !== undefined) updateData.phone = cmd.phone;
    if (cmd.dateOfBirth !== undefined) {
      updateData.dateOfBirth = cmd.dateOfBirth ? new Date(cmd.dateOfBirth) : null;
    }
    if (cmd.gender !== undefined) updateData.gender = cmd.gender;
    if (cmd.addressLine !== undefined) updateData.addressLine = cmd.addressLine;
    if (cmd.city !== undefined) updateData.city = cmd.city;
    if (cmd.district !== undefined) updateData.district = cmd.district;

    await this.userRepo.updateProfile(userId, updateData);
  }
}
