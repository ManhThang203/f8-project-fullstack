/** User từ Better Auth `get-session` (server + client). */
export type ServerAuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
};
