import type {
  Kysely,
  Generated,
  GeneratedAlways,
  ColumnType,
  Selectable,
  Insertable,
  Updateable,
} from 'kysely';
import type { RequestType } from './lib/request-types';

export type OrgId = string;
export type DocumentId = string;
export type UserId = string;
export type AuditId = string;
export type RequestId = string;

type ClientSafeOmitTypes = 'orgId';

export interface OrgTable {
  id: GeneratedAlways<string>;
  name: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type OrgUpdate = Updateable<OrgTable>;
export type NewOrg = Insertable<OrgTable>;
export type Org = Selectable<OrgTable>;

export type Actor = { userId: UserId; type: 'USER' } | { type: 'SYSTEM' };

export interface UserTable {
  id: GeneratedAlways<string>;
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

export interface InvitationTable {
  id: GeneratedAlways<string>;
  orgId: OrgId;
  email: string;
  createdAt: ColumnType<Date, string | undefined, never>;
  expiresAt: ColumnType<Date, string | undefined, never>;
  isUsed: ColumnType<Boolean, never, Boolean>;
}

export type InvitationUpdate = Updateable<InvitationTable>;
export type NewInvitation = Insertable<InvitationTable>;
export type Invitation = Selectable<InvitationTable>;
export type ClientSafeInvitation = Omit<
  Selectable<InvitationTable>,
  ClientSafeOmitTypes
>;

export interface AccountTable {
  id: GeneratedAlways<string>;
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
  id: GeneratedAlways<string>;
  sessionToken: ColumnType<string, string | undefined, never>;
  userId: UserId;
  expires: Date;
}
export type SessionUpdate = Updateable<SessionTable>;
export type NewSession = Insertable<SessionTable>;
export type Session = Selectable<SessionTable>;

export interface VerificationTokenTable {
  identifier: GeneratedAlways<string>;
  token: string;
  expires: Date;
}
export type VerificationTokenUpdate = Updateable<VerificationTokenTable>;
export type NewVerificationToken = Insertable<VerificationTokenTable>;
export type VerificationToken = Selectable<VerificationTokenTable>;

export interface AuditTable {
  id: GeneratedAlways<AuditId>;
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
    }
  | {
      businessName: string;
      description: string;
      businessModels: string[];
      chiefDecisionMaker: string;
    }
  | {
      year: string;
      hasBeenAudited: boolean;
      fiscalYearEnd: string;
    };

export type RequestStatus = 'requested' | 'complete' | 'overdue';
export interface RequestTable {
  id: Generated<RequestId>;
  auditId: AuditId;
  orgId: OrgId;
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

export interface DocumentTable {
  id: Generated<string>;
  key: Generated<string>;
  bucket: string;
  name: string;
  size: number;
  type: string;
  extracted: string | null;
  lastModified: Date;
  orgId: OrgId;
  requestId: RequestId | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type DocumentUpdate = Updateable<DocumentTable>;
export type NewDocument = Insertable<DocumentTable>;
export type Document = Selectable<DocumentTable>;
export type ClientSafeDocument = Omit<
  Selectable<DocumentTable>,
  ClientSafeOmitTypes
>;

export type S3File = {
  documentId: string;
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
  document: DocumentTable;
  invitation: InvitationTable;
  org: OrgTable;
  request: RequestTable;
  requestChange: RequestChangeTable;
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
