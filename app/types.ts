//import type { DocumentType } from './controllers/document-query';
import type { OpenAIMessage } from './lib/ai';
import type {
  ColumnType,
  Generated,
  GeneratedAlways,
  Insertable,
  Kysely,
  Selectable,
  Updateable,
} from 'kysely';

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
  isDeleted: ColumnType<boolean, never, boolean>;
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
  isDeleted: ColumnType<boolean, never, boolean>;
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
  isUsed: ColumnType<boolean, never, boolean>;
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
  name: string;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
}

export type AuditUpdate = Updateable<AuditTable>;
export type NewAudit = Insertable<AuditTable>;
export type Audit = Selectable<AuditTable>;
export type ClientSafeAudit = Omit<Selectable<AuditTable>, ClientSafeOmitTypes>;

export type RequestStatus = 'requested' | 'complete' | 'overdue';
export type RequestGroup =
  | 'Background'
  | 'Accounting Information'
  | 'Business Operations'
  | 'Other';

export interface RequestDataTable {
  id: Generated<RequestId>;
  auditId: AuditId;
  orgId: OrgId;
  requestType: string;
  requestId: string;
  data:
    | { value: unknown }
    // We save documentIds here in addition to RequestDataDocumentTable to reflect that a change
    // has occurred. I don't love that we're duplicating data here, but the simplicity tradeoff
    // feels worth it.
    | { isDocuments: true; documentIds: DocumentId[] }
    | null;
  actorUserId: UserId | null;
  createdAt: ColumnType<Date, Date | undefined, never>;
  // isDeleted: ColumnType<boolean, never, boolean>;
}

export type RequestDataUpdate = Updateable<RequestDataTable>;
export type NewRequestData = Insertable<RequestDataTable>;
export type RequestData = Selectable<RequestDataTable>;

export interface RequestDataDocumentTable {
  id: Generated<string>;
  requestDataId: RequestId;
  documentId: DocumentId;
  createdAt: ColumnType<Date, Date | undefined, never>;
}

export type NewRequestDataDocument = Insertable<RequestDataDocumentTable>;
export type RequestDataDocument = Selectable<RequestDataDocumentTable>;

export interface DocumentTable {
  id: Generated<string>;
  key: Generated<string>;
  bucket: string;
  name: string;
  size: number;
  mimeType: string;
  // classifiedType: ColumnType<
  //   DocumentType | 'UNCLASSIFIED',
  //   never,
  //   DocumentType
  // >;
  classifiedType: ColumnType<string | 'UNCLASSIFIED', never, string>;
  extracted: string | null;
  usage: {
    extractMs: number;
    classifyMs: number;
    askQuestionsMs: number;
    numQuestions: number;
  } | null;
  isProcessed: ColumnType<boolean, never, boolean>;
  fileLastModified: Date;
  orgId: OrgId;
  uploadedByUserId: UserId | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
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
  query: { messages: OpenAIMessage[] };
  result: string;
  usage: DocumentQueryUsage;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
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
  auditId: AuditId;
  requestType: string;
  documentId: DocumentId | null;
  comment: string;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
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
  documentId: DocumentId | null;
  orgId: OrgId;
  auditId: AuditId;
  accountId: string;
  accountMappedTo: AccountType | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
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
  requestData: RequestDataTable;
  requestDataDocument: RequestDataDocumentTable;
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
