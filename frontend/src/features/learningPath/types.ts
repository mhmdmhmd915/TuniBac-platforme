import type { BacSection } from '../../constants/bacSections'

export interface PathProgress {
  completed: number
  total: number
  percent: number
}

export interface PathCourseNode {
  id: string
  title: string
  description?: string | null
  difficulty: string
  isPublished: boolean
  order: number
  hasVideo: boolean
  hasPdf: boolean
  hasText: boolean
  hasLink: boolean
  completed: boolean
}

export interface PathExerciseNode {
  id: string
  title: string
  description?: string | null
  difficulty: string
  groupTitle?: string | null
  isPublished: boolean
  order: number
  completed: boolean
}

export interface PathSubjectNode {
  id: string
  name: string
  description?: string | null
  color: string
  icon: string
  order: number
  isActive: boolean
  bacSection: BacSection
  sections: BacSection[]
  courses: PathCourseNode[]
  exercises: PathExerciseNode[]
  courseCount: number
  exerciseCount: number
  progress: PathProgress
}

export interface PathStepNode {
  id: string
  title: string
  description?: string | null
  icon: string
  image?: string | null
  color: string
  order: number
  isPublished: boolean
  subjects: PathSubjectNode[]
  subjectCount: number
  courseCount: number
  exerciseCount: number
  progress: PathProgress
}

export interface LearningPathTree {
  steps: PathStepNode[]
}

export interface StepSummary {
  id: string
  title: string
  description?: string | null
  icon: string
  image?: string | null
  color: string
  order: number
  isPublished: boolean
  subjectCount: number
  courseCount: number
  exerciseCount: number
}
