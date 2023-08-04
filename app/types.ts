import {
  Kysely,
  Generated,
  ColumnType,
  Selectable,
  Insertable,
  Updateable,
} from 'kysely';
import { RequestType } from './lib/request-types';

export type OrgId = number;
export type UserId = number;
export type AuditId = number;
export type RequestId = number;

type ClientSafeOmitTypes = 'id' | 'orgId';

export interface OrgTable {
  id: Generated<OrgId>;
  externalId: ColumnType<string, string, never>;
  name: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type OrgUpdate = Updateable<OrgTable>;
export type NewOrg = Insertable<OrgTable>;
export type Org = Selectable<OrgTable>;

export type Actor = { userId: UserId; type: 'USER' } | { type: 'SYSTEM' };

export interface UserTable {
  id: Generated<UserId>;
  externalId: ColumnType<string, string, never>;
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
  id: Generated<AuditId>;
  externalId: ColumnType<string, string, never>;
  orgId: OrgId;
  name: string | null;
  year: number | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type AuditUpdate = Updateable<AuditTable>;
export type NewAudit = Insertable<AuditTable>;
export type Audit = Selectable<AuditTable>;
export type ClientSafeAudit = Omit<Selectable<AuditTable>, ClientSafeOmitTypes>;

export type RequestData =
  | {
      value: string;
    }
  | {
      value: string[];
    }
  | {
      value: S3File;
    };

export type RequestStatus = 'requested' | 'complete' | 'overdue';
export interface RequestTable {
  id: Generated<RequestId>;
  externalId: string;
  auditId: AuditId;
  name: string | null;
  description: string | null;
  status: RequestStatus;
  type: RequestType;
  //requestee: UserId | null;
  data: RequestData;
  dueDate: Date | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type RequestUpdate = Updateable<RequestTable>;
export type NewRequest = Insertable<RequestTable>;
export type Request = Selectable<RequestTable>;
export type ClientSafeRequest = Omit<
  Selectable<RequestTable>,
  ClientSafeOmitTypes
>;

export type RequestChangeValue = RequestData & {
  status: RequestStatus;
  dueDate: Date | null;
  isDeleted: Boolean;
};
export interface RequestChangeTable {
  id: Generated<number>;
  requestId: RequestId;
  externalId: string;
  auditId: AuditId;
  actor: Actor;
  newData: RequestChangeValue;
  createdAt: ColumnType<Date, string | undefined, never>;
}

export type RequestChangeUpdate = Updateable<RequestChangeTable>;
export type NewRequestChange = Insertable<RequestChangeTable>;
export type RequestChange = Selectable<RequestChangeTable>;
export type ClientSafeRequestChange = Omit<
  Selectable<RequestChangeTable>,
  ClientSafeOmitTypes
>;

export type S3File = {
  key: string;
  bucket: string;
  name: string;
  size: number;
  lastModified: number;
  type: string;
};

export interface Database extends Kysely<Database> {
  account: AccountTable;
  audit: AuditTable;
  org: OrgTable;
  request: RequestTable;
  requestChange: RequestChangeTable;
  password: PasswordTable;
  session: SessionTable;
  user: UserTable;
  verificationToken: VerificationTokenTable;
}

export type IconSVGProps = React.PropsWithoutRef<
  React.SVGProps<SVGSVGElement>
> &
  React.RefAttributes<SVGSVGElement>;
export type IconProps = IconSVGProps & {
  title?: string;
  titleId?: string;
};
