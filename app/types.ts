import {
  Kysely,
  Generated,
  ColumnType,
  Selectable,
  Insertable,
  Updateable,
} from 'kysely';

export type OrgId = number;
export type UserId = number;
export type AuditId = number;

type ClientSafeOmitTypes = 'id' | 'orgId';

export interface OrgTable {
  id: Generated<OrgId>;
  name: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
}

export type OrgUpdate = Updateable<OrgTable>;
export type NewOrg = Insertable<OrgTable>;
export type Org = Selectable<OrgTable>;

export interface UserTable {
  id: Generated<UserId>;
  externalId: ColumnType<string, string | undefined, never>;
  orgId: OrgId;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type UserUpdate = Updateable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type User = Selectable<UserTable>;
export type ClientSafeUser = Omit<Selectable<UserTable>, ClientSafeOmitTypes>;

export interface PasswordTable {
  id: Generated<number>;
  userId: UserId;
  value: string;
  createdAt: ColumnType<Date, string | undefined, never>;
}
export type PasswordUpdate = Updateable<PasswordTable>;
export type NewPassword = Insertable<PasswordTable>;
export type Password = Selectable<PasswordTable>;

export interface AccountTable {
  id: Generated<number>;
  userId: UserId;
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
  createdAt: ColumnType<Date, string | undefined, never>;
}
export type AccountUpdate = Updateable<AccountTable>;
export type NewAccount = Insertable<AccountTable>;
export type Account = Selectable<AccountTable>;

export interface SessionTable {
  id: Generated<number>;
  sessionToken: ColumnType<string, string | undefined, never>;
  userId: UserId;
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

export interface AuditTable {
  id: Generated<UserId>;
  externalId: string;
  orgId: OrgId;
  name: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type AuditUpdate = Updateable<AuditTable>;
export type NewAudit = Insertable<AuditTable>;
export type Audit = Selectable<AuditTable>;

export interface RequestTable {
  id: Generated<UserId>;
  externalId: string;
  auditId: AuditId;
  name: string | null;
  description: string | null;
  status: 'requested' | 'complete' | 'overdue';
  requestee: UserId | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type RequestUpdate = Updateable<RequestTable>;
export type NewRequest = Insertable<RequestTable>;
export type Request = Selectable<RequestTable>;

export interface Database extends Kysely<Database> {
  account: AccountTable;
  audit: AuditTable;
  org: OrgTable;
  request: RequestTable;
  password: PasswordTable;
  session: SessionTable;
  user: UserTable;
  verificationToken: VerificationTokenTable;
}
