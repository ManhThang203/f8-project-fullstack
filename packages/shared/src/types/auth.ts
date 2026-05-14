/** Public user returned from auth endpoints. */
export interface AuthUserDto {
  id: string;
  email: string | null;
  username: string;
  name: string | null;
}

/** `details` on 409 CONFLICT when register duplicates email or username. */
export interface RegisterConflictDetails {
  field: 'email' | 'username';
}
