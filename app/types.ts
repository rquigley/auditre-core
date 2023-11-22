import type { OpenAIMessage } from './lib/ai';
import type { AccountType } from '@/controllers/account-mapping';
import type { DocumentClassificationType } from '@/controllers/document';
import type {
  ColumnType,
  Generated,
  GeneratedAlways,
  Insertable,
  Kysely,
  Selectable,
  Updateable,
} from 'kysely';

export type AccountBalanceId = string;
export type AccountMappingId = string;
export type AuditId = string;
export type CommentId = string;
export type DocumentId = string;
export type AiQueryId = string;
export type DocumentQueueId = number;
export type InvitationId = string;
export type OrgId = string;
export type UserRoleId = string;
export type RequestDataId = number;
export type UserAccountId = number;
export type UserId = string;

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
  id: GeneratedAlways<UserId>;
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

export interface UserRoleTable {
  id: GeneratedAlways<UserRoleId>;
  userId: UserId;
  orgId: OrgId;
  role: 'user' | 'admin' | 'owner';
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
}

export type UserRoleUpdate = Updateable<UserRoleTable>;
export type NewUserRole = Insertable<UserRoleTable>;
export type UserRole = Selectable<UserRoleTable>;

export interface UserCurrentOrgTable {
  userId: UserId;
  orgId: OrgId;
  createdAt: ColumnType<Date, string | undefined, never>;
}

export type UserCurrentOrgUpdate = Updateable<UserCurrentOrgTable>;
export type NewUserCurrentOrg = Insertable<UserCurrentOrgTable>;
export type UserCurrentOrg = Selectable<UserCurrentOrgTable>;

export interface InvitationTable {
  id: GeneratedAlways<InvitationId>;
  orgId: OrgId;
  email: string;
  createdAt: ColumnType<Date, string | undefined, never>;
  expiresAt: ColumnType<Date, string | undefined, never>;
  isUsed: ColumnType<boolean, never, boolean>;
}

export type InvitationUpdate = Updateable<InvitationTable>;
export type NewInvitation = Insertable<InvitationTable>;
export type Invitation = Selectable<InvitationTable>;

export interface UserAccountTable {
  id: GeneratedAlways<UserAccountId>;
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
export type UserAccountUpdate = Updateable<UserAccountTable>;
export type NewUserAccount = Insertable<UserAccountTable>;
export type UserAccount = Selectable<UserAccountTable>;

export interface SessionTable {
  id: GeneratedAlways<number>;
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

export type RequestStatus = 'requested' | 'complete' | 'overdue';
export type RequestGroup =
  | 'Background'
  | 'Accounting information'
  | 'Business operations'
  | 'Other';

export interface RequestDataTable {
  id: Generated<RequestDataId>;
  auditId: AuditId;
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
}

export type RequestDataUpdate = Updateable<RequestDataTable>;
export type NewRequestData = Insertable<RequestDataTable>;
export type RequestData = Selectable<RequestDataTable>;

export interface RequestDataDocumentTable {
  id: Generated<number>;
  requestDataId: RequestDataId;
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
  classifiedType: ColumnType<
    DocumentClassificationType,
    DocumentClassificationType | undefined,
    DocumentClassificationType
  >;
  extracted: string | null;
  usage: {
    extractMs: number;
    classifyMs: number;
    askQuestionsMs: number;
    numQuestions: number;
  } | null;
  isProcessed: ColumnType<boolean, boolean | undefined, boolean>;
  fileLastModified: Date;
  orgId: OrgId;
  uploadedByUserId: UserId | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
}

export type DocumentUpdate = Updateable<DocumentTable>;
export type NewDocument = Insertable<DocumentTable>;
export type Document = Selectable<DocumentTable>;

export type DocumentStatus =
  | 'TO_EXTRACT'
  | 'START_EXTRACT'
  | 'TO_ASK_DEFAULT_QUESTIONS'
  | 'START_ASK_DEFAULT_QUESTIONS'
  | 'ERROR';
export interface DocumentQueueTable {
  id: GeneratedAlways<number>;
  documentId: DocumentId;
  status: DocumentStatus;
  createdAt: ColumnType<Date, string | undefined, never>;
  //lastModifiedAt: ColumnType<Date, Date | undefined, Date>;
}

export type DocumentQueueUpdate = Updateable<DocumentQueueTable>;
export type NewDocumentQueue = Insertable<DocumentQueueTable>;
export type DocumentQueue = Selectable<DocumentQueueTable>;

export type OpenAIModel =
  | 'gpt-3.5-turbo'
  | 'gpt-3.5-turbo-16k'
  | 'gpt-3.5-turbo-1106'
  | 'gpt-4'
  | 'gpt-4-1106-preview';

export type AiQueryUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timeMs: number;
};

export interface AiQueryTable {
  id: GeneratedAlways<AiQueryId>;
  auditId: AuditId | null;
  documentId: DocumentId | null;
  identifier: string;
  model: OpenAIModel;
  query: { messages: OpenAIMessage[] };
  result: string;
  isValidated: ColumnType<boolean, boolean | undefined, boolean>;
  usage: AiQueryUsage;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
}

export type AiQueryUpdate = Updateable<AiQueryTable>;
export type NewAiQuery = Insertable<AiQueryTable>;
export type AiQuery = Selectable<AiQueryTable>;

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

export interface AccountMappingTable {
  id: GeneratedAlways<AccountMappingId>;
  auditId: AuditId;
  accountNumber: string;
  accountName: string;
  accountType: AccountType | null;
  context: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
}

export type AccountMappingUpdate = Updateable<AccountMappingTable>;
export type NewAccountMapping = Insertable<AccountMappingTable>;
export type AccountMapping = Selectable<AccountMappingTable>;

export interface AccountBalanceTable {
  id: GeneratedAlways<AccountBalanceId>;
  auditId: AuditId;
  accountMappingId: AccountMappingId | null;
  // account_number/account_name are persisted despite some redundancy with account_mapping.
  // 1. The names are sometimes subtly different, specifically in Quickbooks
  // 2. If we import the trial balance prior to the Chart of Accounts, we still want to show something to the user
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  currency: string;
  context: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
}

export type AccountBalanceUpdate = Updateable<AccountBalanceTable>;
export type NewAccountBalance = Insertable<AccountBalanceTable>;
export type AccountBalance = Selectable<AccountBalanceTable>;
}

export interface Database extends Kysely<Database> {
  accountBalance: AccountBalanceTable;
  accountMapping: AccountMappingTable;
  aiQuery: AiQueryTable;
  audit: AuditTable;
  comment: CommentTable;
  document: DocumentTable;
  documentQueue: DocumentQueueTable;
  invitation: InvitationTable;
  kv: KVTable;
  org: OrgTable;
  requestData: RequestDataTable;
  requestDataDocument: RequestDataDocumentTable;
  session: SessionTable;
  user: UserTable;
  userAccount: UserAccountTable;
  userCurrentOrg: UserCurrentOrgTable;
  userRole: UserRoleTable;
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
