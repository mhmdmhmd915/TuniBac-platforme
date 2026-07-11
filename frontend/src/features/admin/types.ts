export type UserRole = 'STUDENT' | 'ADMIN';
export type UserStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
export type BacSection =
  | 'MATHEMATIQUES'
  | 'SCIENCES_EXPERIMENTALES'
  | 'TECHNIQUE'
  | 'LETTRES'
  | 'ECONOMIE_GESTION'
  | 'INFORMATIQUE'
  | 'SPORT';

export interface AdminUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bacSection: BacSection;
  role: UserRole;
  status: UserStatus;
  approvalDate?: string;
  lastLogin?: string;
  isVerified: boolean;
  createdAt: string;
  _count: {
    enrollments: number;
    homeworks: number;
    studyTasks: number;
  };
}

export interface AdminSubject {
  id: string;
  name: string;
  description?: string;
  bacSection: BacSection;
  color: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

