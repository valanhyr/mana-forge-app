export const DEFAULT_AVATAR = "ava1.jpg";
export const AVATAR_OPTIONS = Array.from(
  { length: 105 },
  (_, index) => `ava${index + 1}.jpg`,
);

export const getAvatarUrl = (avatar?: string | null): string =>
  `/images/avatars/${avatar || DEFAULT_AVATAR}`;
