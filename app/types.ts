import { FormField } from './lib/request-types';

import type { OpenAIMessage } from './lib/ai';
import type { DocumentClassificationType } from '@/controllers/document';
import type { AccountType } from '@/lib/finance';
import type {
  ColumnType,
  Generated,
  GeneratedAlways,
  Insertable,
  Kysely,
  Selectable,
  Updateable,
} from 'kysely';

export type AccountMappingId = string;
export type AuditId = string;
export type CommentId = string;
export type DocumentId = string;
export type AiQueryId = string;
export type DocumentQueueId = number;
export type InvitationId = string;
export type OrgId = string;
export type UserOrgId = string;
export type RequestDataId = number;
export type UserAccountId = number;
export type UserId = string;

export interface OrgTable {
  id: GeneratedAlways<OrgId>;
  parentOrgId: OrgId | null;
  canHaveChildOrgs: boolean;
  name: string;
  url: string;
  image: string;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
}

export type OrgUpdate = Updateable<OrgTable>;
export type NewOrg = Insertable<OrgTable>;
export type Org = Selectable<OrgTable>;

export type Actor = { userId: UserId; type: 'USER' } | { type: 'SYSTEM' };

export interface AuthUserTable {
  id: GeneratedAlways<UserId>;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
}

export type UserUpdate = Updateable<AuthUserTable>;
export type NewUser = Insertable<AuthUserTable>;
export type User = Selectable<AuthUserTable>;

export type AuthRole =
  // Can access all child orgs
  | 'SUPERUSER'

  // Reserved for first user in org
  | 'OWNER'

  // All permissions but only for current org/
  // Can't change perms on owner
  // Can set permissions for child orgs
  | 'ADMIN'

  // Normal user
  | 'USER';
export interface AuthUserRoleTable {
  userId: UserId;
  orgId: OrgId;
  // roleId: number;
  role: AuthRole;
  // createdAt: ColumnType<Date, string | undefined, never>;
}

export type NewAuthUserRole = Insertable<AuthUserRoleTable>;
export type AuthUserRole = Selectable<AuthUserRoleTable>;

export interface AuthInvitationTable {
  id: GeneratedAlways<InvitationId>;
  orgId: OrgId;
  email: string;
  createdAt: ColumnType<Date, string | undefined, never>;
  expiresAt: ColumnType<Date, string | undefined, Date>;
}

export type InvitationUpdate = Updateable<AuthInvitationTable>;
export type NewInvitation = Insertable<AuthInvitationTable>;
export type Invitation = Selectable<AuthInvitationTable>;

export interface AuthUserAccountTable {
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
export type UserAccountUpdate = Updateable<AuthUserAccountTable>;
export type NewUserAccount = Insertable<AuthUserAccountTable>;
export type UserAccount = Selectable<AuthUserAccountTable>;

export interface AuthSessionTable {
  id: GeneratedAlways<number>;
  sessionToken: ColumnType<string, string | undefined, never>;
  userId: UserId;
  currentOrgId: OrgId | null;
  expires: Date;
}
export type SessionUpdate = Updateable<AuthSessionTable>;
export type NewSession = Insertable<AuthSessionTable>;
export type Session = Selectable<AuthSessionTable>;

export interface AuthVerificationTokenTable {
  identifier: GeneratedAlways<string>;
  token: string;
  expires: Date;
}
export type NewVerificationToken = Insertable<AuthVerificationTokenTable>;
export type VerificationToken = Selectable<AuthVerificationTokenTable>;

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
  data: { value: FormField['defaultValue'] };
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
  | 'gpt-4-0125-preview';

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
  status: 'PENDING' | 'COMPLETE' | 'ERROR';
  model: OpenAIModel;
  query: { messages: OpenAIMessage[] };
  result: string | null;
  error: string | null;
  isValidated: ColumnType<boolean, boolean | undefined, boolean>;
  usage: AiQueryUsage | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  answeredAt: Date | null;
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
  accountName: string;
  accountType: AccountType | null;
  accountTypeOverride: AccountType | null;
  sortIdx: number;
  context: string | null;
  classificationScore: number | null;
  reasoning: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  isDeleted: ColumnType<boolean, never, boolean>;
}
export type AccountMapping = Selectable<AccountMappingTable>;

export interface AccountBalanceTable {
  id: GeneratedAlways<number>;
  accountMappingId: AccountMappingId | null;
  year: string;
  debit: number;
  credit: number;
  currency: string;
  createdAt: ColumnType<Date, string | undefined, never>;
}
export type AccountBalance = Selectable<AccountBalanceTable>;

export interface KVTable {
  id: GeneratedAlways<number>;
  key: string;
  value: string;
  modifiedAt: ColumnType<Date, string | undefined, never>;
}

export interface Database extends Kysely<Database> {
  'auth.invitation': AuthInvitationTable;
  'auth.session': AuthSessionTable;
  'auth.user': AuthUserTable;
  'auth.userAccount': AuthUserAccountTable;
  'auth.userRole': AuthUserRoleTable;
  'auth.verificationToken': AuthVerificationTokenTable;
  accountBalance: AccountBalanceTable;
  accountMapping: AccountMappingTable;
  aiQuery: AiQueryTable;
  audit: AuditTable;
  comment: CommentTable;
  document: DocumentTable;
  documentQueue: DocumentQueueTable;
  kv: KVTable;
  org: OrgTable;
  requestData: RequestDataTable;
  requestDataDocument: RequestDataDocumentTable;
}

export type IconSVGProps = React.PropsWithoutRef<
  React.SVGProps<SVGSVGElement>
> &
  React.RefAttributes<SVGSVGElement>;
export type IconProps = IconSVGProps & {
  title?: string;
  titleId?: string;
};
