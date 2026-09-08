
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  bacSection: 'bacSection',
  role: 'role',
  status: 'status',
  tokenVersion: 'tokenVersion',
  approvalDate: 'approvalDate',
  lastLogin: 'lastLogin',
  isVerified: 'isVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LearningStepScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  icon: 'icon',
  image: 'image',
  color: 'color',
  order: 'order',
  isPublished: 'isPublished',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubjectScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  bacSection: 'bacSection',
  stepId: 'stepId',
  color: 'color',
  icon: 'icon',
  order: 'order',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubjectSectionScalarFieldEnum = {
  id: 'id',
  subjectId: 'subjectId',
  bacSection: 'bacSection',
  createdAt: 'createdAt'
};

exports.Prisma.TeacherProfileScalarFieldEnum = {
  id: 'id',
  teacherId: 'teacherId',
  photo: 'photo',
  bio: 'bio',
  whatsapp: 'whatsapp',
  externalLink: 'externalLink',
  isPublic: 'isPublic',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeacherAssignmentScalarFieldEnum = {
  id: 'id',
  teacherId: 'teacherId',
  subjectId: 'subjectId',
  bacSection: 'bacSection',
  createdAt: 'createdAt'
};

exports.Prisma.TeacherAdvertisementScalarFieldEnum = {
  id: 'id',
  image: 'image',
  teacherName: 'teacherName',
  subject: 'subject',
  description: 'description',
  whatsapp: 'whatsapp',
  externalLink: 'externalLink',
  bacSection: 'bacSection',
  subjectId: 'subjectId',
  isActive: 'isActive',
  isApproved: 'isApproved',
  order: 'order',
  teachingMethod: 'teachingMethod',
  videoUrl: 'videoUrl',
  videoType: 'videoType',
  resources: 'resources',
  teacherId: 'teacherId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShopProductScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  image: 'image',
  price: 'price',
  whatsapp: 'whatsapp',
  externalLink: 'externalLink',
  isActive: 'isActive',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CourseScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  contentUrl: 'contentUrl',
  videoUrl: 'videoUrl',
  videoPath: 'videoPath',
  contentText: 'contentText',
  externalLink: 'externalLink',
  advertisementImage: 'advertisementImage',
  advertisementTeacherName: 'advertisementTeacherName',
  advertisementSubject: 'advertisementSubject',
  advertisementWhatsapp: 'advertisementWhatsapp',
  advertisementDescription: 'advertisementDescription',
  difficulty: 'difficulty',
  tags: 'tags',
  isPublished: 'isPublished',
  order: 'order',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CourseSectionAssignmentScalarFieldEnum = {
  id: 'id',
  courseId: 'courseId',
  bacSection: 'bacSection',
  createdAt: 'createdAt'
};

exports.Prisma.LessonScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  contentUrl: 'contentUrl',
  videoUrl: 'videoUrl',
  orderIndex: 'orderIndex',
  courseId: 'courseId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExerciseScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  contentUrl: 'contentUrl',
  groupTitle: 'groupTitle',
  advertisementImage: 'advertisementImage',
  advertisementTeacherName: 'advertisementTeacherName',
  advertisementSubject: 'advertisementSubject',
  advertisementWhatsapp: 'advertisementWhatsapp',
  advertisementDescription: 'advertisementDescription',
  difficulty: 'difficulty',
  isPublished: 'isPublished',
  order: 'order',
  subjectId: 'subjectId',
  courseId: 'courseId',
  teacherId: 'teacherId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExerciseSectionAssignmentScalarFieldEnum = {
  id: 'id',
  exerciseId: 'exerciseId',
  bacSection: 'bacSection',
  createdAt: 'createdAt'
};

exports.Prisma.CorrectionScalarFieldEnum = {
  id: 'id',
  title: 'title',
  contentUrl: 'contentUrl',
  exerciseId: 'exerciseId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProgressTrackingScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  courseId: 'courseId',
  exerciseId: 'exerciseId',
  completed: 'completed',
  lastReadPos: 'lastReadPos',
  updatedAt: 'updatedAt'
};

exports.Prisma.EnrollmentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  courseId: 'courseId',
  enrolledAt: 'enrolledAt',
  status: 'status'
};

exports.Prisma.HomeworkSubmissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  bacSection: 'bacSection',
  fileUrl: 'fileUrl',
  fileType: 'fileType',
  submittedAt: 'submittedAt',
  status: 'status',
  feedback: 'feedback',
  grade: 'grade',
  correctionUrl: 'correctionUrl'
};

exports.Prisma.CourseResourceScalarFieldEnum = {
  id: 'id',
  title: 'title',
  url: 'url',
  type: 'type',
  courseId: 'courseId',
  createdAt: 'createdAt'
};

exports.Prisma.ExerciseResourceScalarFieldEnum = {
  id: 'id',
  title: 'title',
  url: 'url',
  type: 'type',
  exerciseId: 'exerciseId',
  createdAt: 'createdAt'
};

exports.Prisma.StudyTaskScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  subjectId: 'subjectId',
  stepId: 'stepId',
  courseId: 'courseId',
  exerciseId: 'exerciseId',
  date: 'date',
  startTime: 'startTime',
  endTime: 'endTime',
  priority: 'priority',
  completed: 'completed',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PlannerTemplateScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  dueAt: 'dueAt',
  priority: 'priority',
  subjectId: 'subjectId',
  attachmentKind: 'attachmentKind',
  attachmentLabel: 'attachmentLabel',
  attachmentFilePath: 'attachmentFilePath',
  attachmentUrl: 'attachmentUrl',
  attachmentMimeType: 'attachmentMimeType',
  attachmentSizeBytes: 'attachmentSizeBytes',
  targetAll: 'targetAll',
  targetBacSections: 'targetBacSections',
  publishedAt: 'publishedAt',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentPlannerTaskScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  dueAt: 'dueAt',
  priority: 'priority',
  completed: 'completed',
  attachmentKind: 'attachmentKind',
  attachmentLabel: 'attachmentLabel',
  attachmentFilePath: 'attachmentFilePath',
  attachmentUrl: 'attachmentUrl',
  attachmentMimeType: 'attachmentMimeType',
  attachmentSizeBytes: 'attachmentSizeBytes',
  isPersonal: 'isPersonal',
  subjectId: 'subjectId',
  stepId: 'stepId',
  courseId: 'courseId',
  exerciseId: 'exerciseId',
  userId: 'userId',
  templateId: 'templateId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ParascolaireScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  bacSection: 'bacSection',
  coverImage: 'coverImage',
  category: 'category',
  isFree: 'isFree',
  hasPdf: 'hasPdf',
  pdfUrl: 'pdfUrl',
  pdfPrice: 'pdfPrice',
  hasPaperBook: 'hasPaperBook',
  paperPrice: 'paperPrice',
  paperOrderUrl: 'paperOrderUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContactScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  message: 'message',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AppSettingScalarFieldEnum = {
  key: 'key',
  value: 'value',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt'
};

exports.Prisma.LearningObjectiveScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  stepId: 'stepId',
  subjectId: 'subjectId',
  courseId: 'courseId',
  exerciseId: 'exerciseId',
  targetDate: 'targetDate',
  progress: 'progress',
  status: 'status',
  completed: 'completed',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudyTipScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  stepId: 'stepId',
  subjectId: 'subjectId',
  courseId: 'courseId',
  bacSection: 'bacSection',
  order: 'order',
  isPublished: 'isPublished',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CommunicationScalarFieldEnum = {
  id: 'id',
  type: 'type',
  priority: 'priority',
  priorityRank: 'priorityRank',
  status: 'status',
  isVisible: 'isVisible',
  isPinned: 'isPinned',
  pinOrder: 'pinOrder',
  audience: 'audience',
  bacSection: 'bacSection',
  title: 'title',
  description: 'description',
  contentHtml: 'contentHtml',
  externalLink: 'externalLink',
  meetingLink: 'meetingLink',
  buttonText: 'buttonText',
  buttonUrl: 'buttonUrl',
  publishAt: 'publishAt',
  expireAt: 'expireAt',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CommunicationAttachmentScalarFieldEnum = {
  id: 'id',
  communicationId: 'communicationId',
  kind: 'kind',
  label: 'label',
  filePath: 'filePath',
  url: 'url',
  mimeType: 'mimeType',
  sizeBytes: 'sizeBytes',
  createdAt: 'createdAt'
};

exports.Prisma.StudySessionScalarFieldEnum = {
  id: 'id',
  bacSection: 'bacSection',
  subjectId: 'subjectId',
  topic: 'topic',
  title: 'title',
  createdById: 'createdById',
  studySquadId: 'studySquadId',
  status: 'status',
  startedAt: 'startedAt',
  endedAt: 'endedAt'
};

exports.Prisma.StudySquadScalarFieldEnum = {
  id: 'id',
  name: 'name',
  bacSection: 'bacSection',
  ownerId: 'ownerId',
  invitationCode: 'invitationCode',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudySquadMemberScalarFieldEnum = {
  id: 'id',
  squadId: 'squadId',
  userId: 'userId',
  role: 'role',
  joinedAt: 'joinedAt'
};

exports.Prisma.StudySquadInvitationScalarFieldEnum = {
  id: 'id',
  squadId: 'squadId',
  inviterId: 'inviterId',
  inviteeId: 'inviteeId',
  status: 'status',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.StudySquadGoalScalarFieldEnum = {
  id: 'id',
  squadId: 'squadId',
  createdById: 'createdById',
  title: 'title',
  description: 'description',
  targetDate: 'targetDate',
  progress: 'progress',
  completed: 'completed',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudySquadChatMessageScalarFieldEnum = {
  id: 'id',
  squadId: 'squadId',
  userId: 'userId',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.SessionParticipantScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  userId: 'userId',
  bacSection: 'bacSection',
  joinedAt: 'joinedAt',
  leftAt: 'leftAt',
  isActive: 'isActive',
  micEnabled: 'micEnabled',
  camEnabled: 'camEnabled',
  lastSeenAt: 'lastSeenAt'
};

exports.Prisma.SessionChatMessageScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  userId: 'userId',
  bacSection: 'bacSection',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.StudyHeartbeatScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  sessionId: 'sessionId',
  bacSection: 'bacSection',
  minuteKey: 'minuteKey',
  minutes: 'minutes',
  createdAt: 'createdAt'
};

exports.Prisma.StudyBadgeScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  title: 'title',
  description: 'description',
  icon: 'icon',
  colorHex: 'colorHex',
  thresholdUnit: 'thresholdUnit',
  thresholdMinutes: 'thresholdMinutes',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.UserStudyBadgeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  badgeId: 'badgeId',
  bacSection: 'bacSection',
  awardedAt: 'awardedAt',
  evidenceRef: 'evidenceRef'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.BacSection = exports.$Enums.BacSection = {
  MATHEMATIQUES: 'MATHEMATIQUES',
  SCIENCES_EXPERIMENTALES: 'SCIENCES_EXPERIMENTALES',
  TECHNIQUE: 'TECHNIQUE',
  LETTRES: 'LETTRES',
  ECONOMIE_GESTION: 'ECONOMIE_GESTION',
  INFORMATIQUE: 'INFORMATIQUE',
  SPORT: 'SPORT'
};

exports.Role = exports.$Enums.Role = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN'
};

exports.UserStatus = exports.$Enums.UserStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED'
};

exports.Difficulty = exports.$Enums.Difficulty = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED'
};

exports.ObjectiveStatus = exports.$Enums.ObjectiveStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

exports.CommunicationType = exports.$Enums.CommunicationType = {
  GENERAL_INFORMATION: 'GENERAL_INFORMATION',
  EXAM_ANNOUNCEMENT: 'EXAM_ANNOUNCEMENT',
  HOMEWORK: 'HOMEWORK',
  COURSE_REMINDER: 'COURSE_REMINDER',
  ONLINE_COURSE: 'ONLINE_COURSE',
  MEETING: 'MEETING',
  COMPETITION: 'COMPETITION',
  NEW_COURSE: 'NEW_COURSE',
  PLATFORM_UPDATE: 'PLATFORM_UPDATE',
  URGENT: 'URGENT',
  HOLIDAY: 'HOLIDAY',
  MAINTENANCE: 'MAINTENANCE',
  OTHER: 'OTHER'
};

exports.CommunicationPriority = exports.$Enums.CommunicationPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.CommunicationStatus = exports.$Enums.CommunicationStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

exports.CommunicationAudience = exports.$Enums.CommunicationAudience = {
  ALL_STUDENTS: 'ALL_STUDENTS'
};

exports.StudySessionStatus = exports.$Enums.StudySessionStatus = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  ENDED: 'ENDED'
};

exports.StudySquadStatus = exports.$Enums.StudySquadStatus = {
  ACTIVE: 'ACTIVE',
  DISBANDED: 'DISBANDED'
};

exports.StudySquadMemberRole = exports.$Enums.StudySquadMemberRole = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER'
};

exports.StudySquadInvitationStatus = exports.$Enums.StudySquadInvitationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

exports.StudyBadgeThresholdUnit = exports.$Enums.StudyBadgeThresholdUnit = {
  SINGLE_SESSION_MINUTES: 'SINGLE_SESSION_MINUTES',
  WEEKLY_TOTAL_MINUTES: 'WEEKLY_TOTAL_MINUTES',
  TOTAL_MINUTES: 'TOTAL_MINUTES'
};

exports.Prisma.ModelName = {
  User: 'User',
  LearningStep: 'LearningStep',
  Subject: 'Subject',
  SubjectSection: 'SubjectSection',
  TeacherProfile: 'TeacherProfile',
  TeacherAssignment: 'TeacherAssignment',
  TeacherAdvertisement: 'TeacherAdvertisement',
  ShopProduct: 'ShopProduct',
  Course: 'Course',
  CourseSectionAssignment: 'CourseSectionAssignment',
  Lesson: 'Lesson',
  Exercise: 'Exercise',
  ExerciseSectionAssignment: 'ExerciseSectionAssignment',
  Correction: 'Correction',
  ProgressTracking: 'ProgressTracking',
  Enrollment: 'Enrollment',
  HomeworkSubmission: 'HomeworkSubmission',
  CourseResource: 'CourseResource',
  ExerciseResource: 'ExerciseResource',
  StudyTask: 'StudyTask',
  PlannerTemplate: 'PlannerTemplate',
  StudentPlannerTask: 'StudentPlannerTask',
  Parascolaire: 'Parascolaire',
  Contact: 'Contact',
  AppSetting: 'AppSetting',
  LearningObjective: 'LearningObjective',
  StudyTip: 'StudyTip',
  Communication: 'Communication',
  CommunicationAttachment: 'CommunicationAttachment',
  StudySession: 'StudySession',
  StudySquad: 'StudySquad',
  StudySquadMember: 'StudySquadMember',
  StudySquadInvitation: 'StudySquadInvitation',
  StudySquadGoal: 'StudySquadGoal',
  StudySquadChatMessage: 'StudySquadChatMessage',
  SessionParticipant: 'SessionParticipant',
  SessionChatMessage: 'SessionChatMessage',
  StudyHeartbeat: 'StudyHeartbeat',
  StudyBadge: 'StudyBadge',
  UserStudyBadge: 'UserStudyBadge'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
