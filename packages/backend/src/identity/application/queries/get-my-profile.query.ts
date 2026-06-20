import type { ProfileProjection, ProfileQueryPort } from '../ports/profile-query.port';

export class GetMyProfileQuery {
  constructor(private readonly profiles: ProfileQueryPort) {}

  execute(userId: string): Promise<ProfileProjection | null> {
    return this.profiles.findByUserId(userId);
  }
}
