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
export type CommentId = string;
export type DocumentId = string;
export type DocumentQueryId = string;
export type DocumentQueueId = string;
export type UserId = string;
export type AuditId = string;
export type AccountMappingId = string;
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
      value: boolean;
    }
  | {
      value: string;
    }
  | {
      value: string[];
    }
  // | {
  //     value: S3File;
  //   }
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
  isProcessed: ColumnType<Boolean, never, Boolean>;
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

export type DocumentStatus =
  | 'TO_EXTRACT'
  | 'START_EXTRACT'
  | 'TO_ASK_DEFAULT_QUESTIONS'
  | 'START_ASK_DEFAULT_QUESTIONS'
  | 'ERROR';
export interface DocumentQueueTable {
  id: GeneratedAlways<string>;
  documentId: DocumentId;
  status: DocumentStatus;
  createdAt: ColumnType<Date, string | undefined, never>;
  //lastModifiedAt: ColumnType<Date, Date | undefined, Date>;
}

export type DocumentQueueUpdate = Updateable<DocumentQueueTable>;
export type NewDocumentQueue = Insertable<DocumentQueueTable>;
export type DocumentQueue = Selectable<DocumentQueueTable>;

export type OpenAIModel = 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k' | 'gpt-4';

export type DocumentQueryResult = {
  role: 'assistant';
  content: string;
};

export type DocumentQueryUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timeMs: number;
};

export interface DocumentQueryTable {
  id: GeneratedAlways<string>;
  documentId: DocumentId;
  model: OpenAIModel;
  identifier: string;
  query: string;
  result: DocumentQueryResult;
  usage: DocumentQueryUsage;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type DocumentQueryUpdate = Updateable<DocumentQueryTable>;
export type NewDocumentQuery = Insertable<DocumentQueryTable>;
export type DocumentQuery = Selectable<DocumentQueryTable>;

export type S3File = {
  documentId: string;
  key: string;
  bucket: string;
  name: string;
  size: number;
  lastModified: number;
  type: string;
};

export interface CommentTable {
  id: GeneratedAlways<string>;
  orgId: OrgId;
  userId: UserId;
  requestId: RequestId | null;
  documentId: DocumentId | null;
  comment: string;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type CommentUpdate = Updateable<CommentTable>;
export type NewComment = Insertable<CommentTable>;
export type Comment = Selectable<CommentTable>;

export type AccountType =
  // Asset
  | 'ASSET_CASH'
  | 'ASSET_PREPAID_EXPENSES'
  | 'ASSET_PROPERTY_AND_EQUIPMENT'
  | 'ASSET_INTANGIBLE_ASSETS'
  | 'ASSET_OPERATING_LEASE_RIGHT_OF_USE'
  | 'ASSET_OTHER'

  // Liability
  | 'LIABILITY_ACCOUNTS_PAYABLE'
  | 'LIABILITY_ACCRUED_EXPENSES'
  | 'LIABILITY_OPERATING_LEASE_LIABILITIES_CURRENT'
  | 'LIABILITY_ACCRUED_INTEREST'
  | 'LIABILITY_CONVERTIBLE_NOTES_PAYABLE'
  | 'LIABILITY_OPERATING_LEASE_LIABILITIES_NET_OF_CURRENT_PORTION'

  // Equity
  | 'EQUITY_PREFERRED_STOCK'
  | 'EQUITY_COMMON_STOCK'
  | 'EQUITY_PAID_IN_CAPITAL'
  | 'EQUITY_ACCUMULATED_DEFICIT';

export interface AccountMappingTable {
  id: GeneratedAlways<string>;
  documentId: DocumentId;
  orgId: OrgId;
  account: string;
  type: AccountType | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<Boolean, never, Boolean>;
}

export type AccountMappingUpdate = Updateable<AccountMappingTable>;
export type NewAccountMapping = Insertable<AccountMappingTable>;
export type AccountMapping = Selectable<AccountMappingTable>;

export interface Database extends Kysely<Database> {
  account: AccountTable;
  audit: AuditTable;
  accountMapping: AccountMappingTable;
  comment: CommentTable;
  document: DocumentTable;
  documentQueue: DocumentQueueTable;
  documentQuery: DocumentQueryTable;
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
