export const PROFILE_QUERY = Symbol('ProfileQuery');

export interface ProfileProjection {
  email: string;
  displayName: string;
}

export interface ProfileQueryPort {
  findByUserId(userId: string): Promise<ProfileProjection | null>;
}
