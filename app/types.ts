import {
  Kysely,
  Generated,
  ColumnType,
  Selectable,
  Insertable,
  Updateable,
} from "kysely";

export interface UserTable {
  id: Generated<number>;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
}

export type UserUpdate = Updateable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type User = Selectable<UserTable>;

export interface AccountTable {
  id: Generated<number>;
  userId: number;
  type: string;
  provider: string;
  providerAccountId: string;
  refreshToken: string | null;
  accessToken: string | null;
  expiresAt: number | null;
  tokenType: string | null;
  scope: string | null;
  idToken: string | null;
  session_state: string | null;
}
export type AccountUpdate = Updateable<AccountTable>;
export type NewAccount = Insertable<AccountTable>;
export type Account = Selectable<AccountTable>;

export interface SessionTable {
  id: Generated<number>;
  sessionToken: string;
  userId: string;
  expires: Date;
}
export type SessionUpdate = Updateable<SessionTable>;
export type NewSession = Insertable<SessionTable>;
export type Session = Selectable<SessionTable>;

export interface VerificationTokenTable {
  identifier: Generated<number>;
  token: string;
  expires: Date;
}
export type VerificationTokenUpdate = Updateable<VerificationTokenTable>;
export type NewVerificationToken = Insertable<VerificationTokenTable>;
export type VerificationToken = Selectable<VerificationTokenTable>;

export interface Database extends Kysely<Database> {
  account: AccountTable;
  session: SessionTable;
  user: UserTable;
  verificationToken: VerificationTokenTable;
}
