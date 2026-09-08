import { api } from '../lib/api/http';
import { uploadMultipartVideo, type MultipartVideoUploadState } from '../lib/uploads/multipartVideo';
import { uploadFileViaBackend, uploadToSignedUrl } from '../lib/uploads/sharedUpload';
import type { BacSection } from '../constants/bacSections';

const buildSingleFileFormData = (fieldName: string, file: File) => {
  const formData = new FormData()
  formData.append(fieldName, file)
  return formData
}

const uploadFormDataViaBackend = <T>({
  endpoint,
  formData,
  mapResponse,
  onUploadProgress,
  signal,
  method,
}: {
  endpoint: string
  formData: FormData
  mapResponse: (data: any) => T
  onUploadProgress?: (progressEvent: any) => void
  signal?: AbortSignal
  method?: 'post' | 'put' | 'patch'
}) =>
  uploadFileViaBackend({
    endpoint,
    formData,
    mapResponse,
    onUploadProgress,
    signal,
    method,
  })

const uploadViaPresignedEndpoint = async <T>({
  file,
  presignPath,
  mapResponse,
  onUploadProgress,
  signal,
  fallback,
}: {
  file: File
  presignPath: string
  mapResponse: (data: any) => T
  onUploadProgress?: (progress: number) => void
  signal?: AbortSignal
  fallback: () => Promise<{ data: T }>
}) => {
  try {
    const presignResponse = await api.post(presignPath, {
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    })

    await uploadToSignedUrl({
      uploadUrl: presignResponse.data.uploadUrl as string,
      body: file,
      contentType: file.type,
      signal,
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onUploadProgress(progress)
        }
      },
    })

    return {
      data: mapResponse(presignResponse.data),
    }
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }
    return fallback()
  }
}

export type VideoUploadOptions = {
  onProgress?: (state: MultipartVideoUploadState) => void
  signal?: AbortSignal
}

// Auth API
export const authAPI = {
  register: (data: { firstName: string; lastName: string; phone: string; password: string; bacSection: BacSection }) =>
    api.post('/auth/register', data),
  login: (data: { phone: string; password: string }) =>
    api.post('/auth/login', data),
  getCurrentUser: () =>
    api.get('/auth/me'),
};

// Subjects API
export const subjectsAPI = {
  getAll: (params?: { activeOnly?: boolean; bacSection?: BacSection }) =>
    api.get('/subjects', { params }),
  getById: (id: string) =>
    api.get(`/subjects/${id}`),
  create: (data: any) =>
    api.post('/subjects', data),
  update: (id: string, data: any) =>
    api.put(`/subjects/${id}`, data),
  delete: (id: string) =>
    api.delete(`/subjects/${id}`),
  reorder: (orderedItems: Array<{ id: string; order: number }>) =>
    api.put('/subjects/reorder', { orderedItems }),
  setActive: (id: string, isActive: boolean) =>
    api.put(`/subjects/${id}`, { isActive }),
};

// Learning Steps API
export const stepsAPI = {
  getPublic: () => api.get('/steps'),
  getById: (id: string) => api.get(`/steps/${id}`),
  getAllAdmin: () => api.get('/steps/admin/all'),
  create: (data: any) => api.post('/steps/admin', data),
  update: (id: string, data: any) => api.put(`/steps/admin/${id}`, data),
  delete: (id: string) => api.delete(`/steps/admin/${id}`),
  reorder: (orderedIds: string[]) => api.put('/steps/admin/reorder', { orderedIds }),
  setPublish: (id: string, isPublished: boolean) => api.put(`/steps/admin/${id}/publish`, { isPublished }),
};

// Learning Path API (student)
export const learningPathAPI = {
  getTree: () => api.get('/learning-path'),
};

// Teacher API
export const teacherAPI = {
  getMe: () => api.get('/teachers/me'),
  updateProfile: (data: any) => api.put('/teachers/profile', data),
  getContent: () => api.get('/teachers/content'),
  getScope: () => api.get('/teachers/scope'),
  listPublic: (params?: { limit?: number }) => api.get('/teachers/public', { params }),
  getPublicProfile: (id: string) => api.get(`/teachers/${id}/public`),
  uploadPhoto: (file: File) => {
    const formData = buildSingleFileFormData('photo', file);
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/teachers/photo/presign',
      mapResponse: (data) => ({ fileUrl: data.fileUrl }),
      fallback: () =>
        uploadFormDataViaBackend({
          endpoint: '/teachers/photo',
          formData,
          mapResponse: (data) => data,
        }),
    });
  },
};

// Teacher Ads API
export const teacherAdsAPI = {
  getPublic: () => api.get('/teacher-ads'),
  getAllAdmin: () => api.get('/teacher-ads/all'),
  create: (data: any) => api.post('/teacher-ads', data),
  update: (id: string, data: any) => api.put(`/teacher-ads/${id}`, data),
  delete: (id: string) => api.delete(`/teacher-ads/${id}`),
  reorder: (orderedItems: Array<{ id: string; order: number }>) => api.put('/teacher-ads/reorder', { orderedItems }),
  uploadImage: (file: File) => {
    const formData = buildSingleFileFormData('image', file);
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/admin/media/upload/teacher-ads/presign',
      mapResponse: (data) => ({ fileUrl: data.fileUrl }),
      fallback: () =>
        uploadFormDataViaBackend({
          endpoint: '/admin/media/upload/teacher-ads',
          formData,
          mapResponse: (data) => data,
        }),
    });
  },
};

// Shop API
export const shopAPI = {
  getPublic: () => api.get('/shop'),
  listAll: () => api.get('/shop').then((res) => (res.data as any)?.products || (res.data as any)?.items || res.data),
  getDetail: (id: string) => api.get(`/shop/${id}`).then((res) => (res.data as any)?.product || res.data),
  getAllAdmin: () => api.get('/shop/all'),
  create: (data: any) => api.post('/shop', data),
  update: (id: string, data: any) => api.put(`/shop/${id}`, data),
  delete: (id: string) => api.delete(`/shop/${id}`),
  reorder: (orderedItems: Array<{ id: string; order: number }>) => api.put('/shop/reorder', { orderedItems }),
  uploadImage: (file: File) => {
    const formData = buildSingleFileFormData('image', file);
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/admin/media/upload/shop/presign',
      mapResponse: (data) => ({ fileUrl: data.fileUrl }),
      fallback: () =>
        uploadFormDataViaBackend({
          endpoint: '/admin/media/upload/shop',
          formData,
          mapResponse: (data) => data,
        }),
    });
  },
};

export const progressAPI = {
  getMyProgress: () => api.get('/progress/me'),
  getAggregate: () => api.get('/progress/me/aggregate'),
  upsert: (data: { courseId?: string; exerciseId?: string; completed?: boolean; lastReadPos?: number }) =>
    api.post('/progress/upsert', data),
  markCompleted: (data: { courseId?: string; exerciseId?: string }) =>
    api.post('/progress/mark-completed', data),
};

export const objectivesAPI = {
  listMy: () => api.get('/objectives/me').then((res) => (res.data as any)?.objectives || res.data),
  create: (payload: {
    title: string
    description?: string
    stepId?: string
    subjectId?: string
    courseId?: string
    exerciseId?: string
    targetDate?: string
    progress?: number
  }) => api.post('/objectives', payload).then((res) => (res.data as any)?.objective || res.data),
  get: (id: string) => api.get(`/objectives/${id}`),
  update: (id: string, payload: any) => api.put(`/objectives/${id}`, payload),
  delete: (id: string) => api.delete(`/objectives/${id}`),
  complete: (id: string) => api.post(`/objectives/${id}/complete`).then((res) => (res.data as any)?.objective || res.data),
};

export const tipsAPI = {
  listPublic: (params?: { stepId?: string; subjectId?: string; bacSection?: BacSection }) =>
    api.get('/tips/public', { params }).then((res) => (res.data as any)?.tips || res.data),
  listAll: () => api.get('/tips/all').then((res) => (res.data as any)?.tips || res.data),
  create: (payload: {
    title?: string
    content: string
    stepId?: string
    subjectId?: string
    courseId?: string
    bacSection?: BacSection
    order?: number
    isPublished?: boolean
  }) => api.post('/tips', payload),
  update: (id: string, payload: any) => api.put(`/tips/${id}`, payload),
  delete: (id: string) => api.delete(`/tips/${id}`),
  setPublish: (id: string, isPublished: boolean) => api.put(`/tips/${id}/publish`, { isPublished }),
};

// Admin teacher management API
export const adminTeachersAPI = {
  getAll: (params?: { search?: string }) => api.get('/admin/teachers', { params }),
  getById: (id: string) => api.get(`/admin/teachers/${id}`),
  createTeacher: (data: any) => api.post('/admin/teachers', data),
  setAssignments: (id: string, assignments: Array<{ subjectId?: string | null; bacSection?: string | null }>) =>
    api.put(`/admin/teachers/${id}/assign`, { assignments }),
  uploadImage: (file: File) => {
    const formData = buildSingleFileFormData('image', file);
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/admin/media/upload/teacher-profiles/presign',
      mapResponse: (data) => ({ fileUrl: data.fileUrl }),
      fallback: () =>
        uploadFormDataViaBackend({
          endpoint: '/admin/media/upload/teacher-profiles',
          formData,
          mapResponse: (data) => data,
        }),
    });
  },
};

// Courses API
export const coursesAPI = {
  getAll: (params?: { subjectId?: string; search?: string; bacSection?: BacSection }) =>
    api.get('/courses', { params }),
  getById: (id: string) =>
    api.get(`/courses/${id}`),
  create: (data: any) =>
    api.post('/courses', data),
  update: (id: string, data: any) =>
    api.put(`/courses/${id}`, data),
  setPublish: (id: string, isPublished: boolean) =>
    api.put(`/courses/${id}/publish`, { isPublished }),
  delete: (id: string) =>
    api.delete(`/courses/${id}`),
  reorder: (orderedItems: Array<{ id: string; order: number }>) =>
    api.put('/courses/reorder', { orderedItems }),
  uploadVideo: (file: File, onUploadProgress?: (progress: number) => void) => {
    return uploadFormDataViaBackend({
      endpoint: '/upload/video',
      formData: buildSingleFileFormData('video', file),
      mapResponse: (data) => data,
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
  },
};

// Exercises API
export const exercisesAPI = {
  getAll: (params?: { subjectId?: string; courseId?: string; difficulty?: string; bacSection?: BacSection }) =>
    api.get('/exercises', { params }),
  getById: (id: string) =>
    api.get(`/exercises/${id}`),
  create: (data: any) =>
    api.post('/exercises', data),
  update: (id: string, data: any) =>
    api.put(`/exercises/${id}`, data),
  setPublish: (id: string, isPublished: boolean) =>
    api.put(`/exercises/${id}/publish`, { isPublished }),
  delete: (id: string) =>
    api.delete(`/exercises/${id}`),
  reorder: (orderedItems: Array<{ id: string; order: number }>) =>
    api.put('/exercises/reorder', { orderedItems }),
};

// Users API
export const usersAPI = {
  getProfile: () =>
    api.get('/users/profile'),
  updateProfile: (data: any) =>
    api.put('/users/profile', data),
  getStats: () =>
    api.get('/users/stats'),
};

export const communicationsAPI = {
  getStudentFeed: (params?: { limit?: number; bacSection?: BacSection }) =>
    api.get('/communications', { params }),
};

// Admin API
export const adminAPI = {
  getStats: (params?: { bacSection?: BacSection }) =>
    api.get('/admin/stats', { params }),

  getUsers: (params?: {
    search?: string;
    status?: string;
    role?: string;
    bacSection?: BacSection;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    pageSize?: number;
  }) => api.get('/admin/users', { params }),
    
  getUserById: (id: string) =>
    api.get(`/admin/users/${id}`),

  updateUserRole: (id: string, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }),

  updateUser: (id: string, data: any) =>
    api.put(`/admin/users/${id}`, data),

  updateUserPassword: (id: string, password: string) =>
    api.put(`/admin/users/${id}/password`, { password }),

  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`),
    
  approveUser: (id: string) =>
    api.put(`/admin/users/${id}/approve`),
    
  rejectUser: (id: string) =>
    api.put(`/admin/users/${id}/reject`),
    
  suspendUser: (id: string) =>
    api.put(`/admin/users/${id}/suspend`),
    
  reactivateUser: (id: string) =>
    api.put(`/admin/users/${id}/reactivate`),
    
  bulkApproveUsers: (userIds: string[]) =>
    api.post('/admin/users/bulk-approve', { userIds }),
    
  bulkSuspendUsers: (userIds: string[]) =>
    api.post('/admin/users/bulk-suspend', { userIds }),
    
  bulkDeleteUsers: (userIds: string[]) =>
    api.post('/admin/users/bulk-delete', { userIds }),

  getSubjects: (params?: { activeOnly?: boolean; bacSection?: BacSection }) =>
    api.get('/admin/subjects', { params }),

  getSubjectUsage: (id: string) =>
    api.get(`/admin/subjects/${id}/usage`),

  createSubject: (data: any) =>
    api.post('/admin/subjects', data),

  updateSubject: (id: string, data: any) =>
    api.put(`/admin/subjects/${id}`, data),

  deleteSubject: (id: string) =>
    api.delete(`/admin/subjects/${id}`),

  getSettings: () =>
    api.get('/admin/settings'),

  updateSettings: (items: Array<{ key: string; value: any }>) =>
    api.put('/admin/settings', { items }),

  uploadSettingAsset: (
    asset: 'logo' | 'favicon' | 'offer-background' | 'offer-banner' | 'offer-logo' | 'offer-video',
    file: File,
    options?: VideoUploadOptions
  ) => {
    if (asset === 'offer-video') {
      return uploadMultipartVideo({
        file,
        initiatePath: '/admin/settings/upload/offer-video/multipart/initiate',
        signPartPath: '/admin/settings/upload/offer-video/multipart/sign-part',
        statusPath: '/admin/settings/upload/offer-video/multipart/status',
        completePath: '/admin/settings/upload/offer-video/multipart/complete',
        abortPath: '/admin/settings/upload/offer-video/multipart/abort',
        mapCompleteResponse: (data) => ({
          fileUrl: data.fileUrl,
          setting: data.setting,
          key: data.key,
        }),
        onProgress: options?.onProgress,
        signal: options?.signal,
      })
    }

    return uploadFormDataViaBackend({
      endpoint: `/admin/settings/upload/${asset}`,
      formData: buildSingleFileFormData('file', file),
      mapResponse: (data) => data,
    });
  },

  addCourseResource: (courseId: string, data: any) =>
    api.post(`/admin/courses/${courseId}/resources`, data),

  deleteCourseResource: (resourceId: string) =>
    api.delete(`/admin/resources/${resourceId}`),

  createExerciseResource: (data: any) =>
    api.post('/admin/exercise-resources', data),

  deleteExerciseResource: (resourceId: string) =>
    api.delete(`/admin/exercise-resources/${resourceId}`),

  deleteExerciseCorrection: (correctionId: string) =>
    api.delete(`/admin/exercise-corrections/${correctionId}`),

  uploadExerciseCorrection: (formData: FormData) =>
    uploadFormDataViaBackend({
      endpoint: '/admin/exercise-correction',
      formData,
      mapResponse: (data) => data,
    }),

  uploadExercisePdf: (formData: FormData) =>
    (() => {
      const file = formData.get('pdf')
      if (!(file instanceof File)) {
        return uploadFormDataViaBackend({
          endpoint: '/admin/exercises/upload-pdf',
          formData,
          mapResponse: (data) => data,
        })
      }
      return uploadViaPresignedEndpoint({
        file,
        presignPath: '/admin/exercises/upload-pdf/presign',
        mapResponse: (data) => ({ fileUrl: data.fileUrl }),
        fallback: () =>
          uploadFormDataViaBackend({
            endpoint: '/admin/exercises/upload-pdf',
            formData,
            mapResponse: (data) => data,
          }),
      })
    })(),

  uploadCourseAdvertisementImage: (formData: FormData) =>
    (() => {
      const file = formData.get('image')
      if (!(file instanceof File)) {
        return uploadFormDataViaBackend({
          endpoint: '/admin/courses/upload-advertisement-image',
          formData,
          mapResponse: (data) => data,
        })
      }
      return uploadViaPresignedEndpoint({
        file,
        presignPath: '/admin/courses/upload-advertisement-image/presign',
        mapResponse: (data) => ({ fileUrl: data.fileUrl }),
        fallback: () =>
          uploadFormDataViaBackend({
            endpoint: '/admin/courses/upload-advertisement-image',
            formData,
            mapResponse: (data) => data,
          }),
      })
    })(),

  uploadExerciseAdvertisementImage: (formData: FormData) =>
    (() => {
      const file = formData.get('image')
      if (!(file instanceof File)) {
        return uploadFormDataViaBackend({
          endpoint: '/admin/exercises/upload-advertisement-image',
          formData,
          mapResponse: (data) => data,
        })
      }
      return uploadViaPresignedEndpoint({
        file,
        presignPath: '/admin/exercises/upload-advertisement-image/presign',
        mapResponse: (data) => ({ fileUrl: data.fileUrl }),
        fallback: () =>
          uploadFormDataViaBackend({
            endpoint: '/admin/exercises/upload-advertisement-image',
            formData,
            mapResponse: (data) => data,
          }),
      })
    })(),

  uploadAdminVideo: async (file: File, options?: VideoUploadOptions) => {
    return uploadMultipartVideo({
      file,
      initiatePath: '/admin/uploads/video/multipart/initiate',
      signPartPath: '/admin/uploads/video/multipart/sign-part',
        statusPath: '/admin/uploads/video/multipart/status',
      completePath: '/admin/uploads/video/multipart/complete',
      abortPath: '/admin/uploads/video/multipart/abort',
      mapCompleteResponse: (data) => ({
        videoPath: data.videoPath,
        key: data.key,
      }),
      onProgress: options?.onProgress,
      signal: options?.signal,
    })
  },

  listUploads: (params?: { q?: string; kind?: string; prefix?: string; limit?: number }) =>
    api.get('/admin/uploads', { params }),

  deleteUpload: (data: { path: string; force?: boolean }) =>
    api.delete('/admin/uploads', { data }),

  replaceUpload: (targetPath: string, file: File) => {
    const formData = buildSingleFileFormData('file', file)
    formData.append('targetPath', targetPath)
    return uploadFormDataViaBackend({
      endpoint: '/admin/uploads/replace',
      formData,
      mapResponse: (data) => data,
    });
  },

  createExerciseCorrection: (data: any) =>
    api.post('/admin/exercise-correction', data),
  uploadExerciseCorrectionPdf: (formData: FormData) =>
    uploadFormDataViaBackend({
      endpoint: '/admin/exercise-correction',
      formData,
      mapResponse: (data) => data,
    }),

  createResource: (data: any) =>
    api.post('/admin/resources', data),

  getSubmissions: (params?: { bacSection?: BacSection }) =>
    api.get('/admin/submissions', { params }),

  reviewSubmission: (id: string, data: any) =>
    api.put(`/admin/submissions/${id}/review`, data),

  uploadCoursePdf: (formData: FormData) =>
    (() => {
      const file = formData.get('pdf')
      if (!(file instanceof File)) {
        return uploadFormDataViaBackend({
          endpoint: '/admin/courses/upload-pdf',
          formData,
          mapResponse: (data) => data,
        })
      }
      return uploadViaPresignedEndpoint({
        file,
        presignPath: '/admin/courses/upload-pdf/presign',
        mapResponse: (data) => ({ fileUrl: data.fileUrl }),
        fallback: () =>
          uploadFormDataViaBackend({
            endpoint: '/admin/courses/upload-pdf',
            formData,
            mapResponse: (data) => data,
          }),
      })
    })(),

  uploadCorrection: (id: string, file: File) => {
    return uploadFormDataViaBackend({
      endpoint: `/admin/submissions/${id}/correction`,
      formData: buildSingleFileFormData('correction', file),
      mapResponse: (data) => data,
      method: 'put',
    });
  },

  getCommunications: (params?: {
    search?: string;
    type?: string;
    priority?: string;
    status?: string;
    visibility?: string;
    bacSection?: BacSection;
    fromDate?: string;
    toDate?: string;
    sortBy?: string;
    sortDirection?: string;
    page?: number;
    pageSize?: number;
  }) => api.get('/admin/communications', { params }),

  getCommunicationById: (id: string) =>
    api.get(`/admin/communications/${id}`),

  createCommunication: (data: any) =>
    api.post('/admin/communications', data),

  updateCommunication: (id: string, data: any) =>
    api.put(`/admin/communications/${id}`, data),

  deleteCommunication: (id: string) =>
    api.delete(`/admin/communications/${id}`),

  duplicateCommunication: (id: string) =>
    api.post(`/admin/communications/${id}/duplicate`),

  publishCommunication: (id: string) =>
    api.post(`/admin/communications/${id}/publish`),

  scheduleCommunication: (id: string, data: { publishAt: string; expireAt?: string | null }) =>
    api.post(`/admin/communications/${id}/schedule`, data),

  archiveCommunication: (id: string) =>
    api.post(`/admin/communications/${id}/archive`),

  setCommunicationVisibility: (id: string, isVisible: boolean) =>
    api.patch(`/admin/communications/${id}/visibility`, { isVisible }),

  uploadCommunicationImage: (file: File) => {
    const formData = buildSingleFileFormData('file', file)
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/admin/communications/uploads/image/presign',
      mapResponse: (data) => ({ attachment: data.attachment }),
      fallback: () =>
        uploadFormDataViaBackend({
          endpoint: '/admin/communications/uploads/image',
          formData,
          mapResponse: (data) => data,
        }),
    });
  },

  uploadCommunicationPdf: (file: File) => {
    const formData = buildSingleFileFormData('file', file)
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/admin/communications/uploads/pdf/presign',
      mapResponse: (data) => ({ attachment: data.attachment }),
      fallback: () =>
        uploadFormDataViaBackend({
          endpoint: '/admin/communications/uploads/pdf',
          formData,
          mapResponse: (data) => data,
        }),
    });
  },

  uploadCommunicationVideo: async (file: File, options?: VideoUploadOptions) => {
    return uploadMultipartVideo({
      file,
      initiatePath: '/admin/communications/uploads/video/multipart/initiate',
      signPartPath: '/admin/communications/uploads/video/multipart/sign-part',
        statusPath: '/admin/communications/uploads/video/multipart/status',
      completePath: '/admin/communications/uploads/video/multipart/complete',
      abortPath: '/admin/communications/uploads/video/multipart/abort',
      mapCompleteResponse: (data) => ({
        attachment: {
          ...(data.attachment || {}),
          label: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      }),
      onProgress: options?.onProgress,
      signal: options?.signal,
    })
  },
};

export const plannerAPI = {
  getTasks: (params?: { bacSection?: BacSection }) => api.get('/planner', { params }),
  createTask: (data: any) => api.post('/planner', data),
  updateTask: (id: string, data: any) => api.put(`/planner/${id}`, data),
  deleteTask: (id: string) => api.delete(`/planner/${id}`),
  toggleComplete: (id: string) => api.patch(`/planner/${id}/complete`),
};

export const studentPlannerAPI = {
  getTasks: () => api.get('/student-planner'),
  createTask: (data: any) => api.post('/student-planner', data),
  updateTask: (id: string, data: any) => api.put(`/student-planner/${id}`, data),
  deleteTask: (id: string) => api.delete(`/student-planner/${id}`),
  toggleComplete: (id: string) => api.patch(`/student-planner/${id}/complete`),
};

export const adminPlannerTemplatesAPI = {
  getAll: (params?: { published?: boolean }) => api.get('/admin/planner-templates', { params }),
  create: (data: any) => api.post('/admin/planner-templates', data),
  update: (id: string, data: any) => api.put(`/admin/planner-templates/${id}`, data),
  publish: (id: string) => api.post(`/admin/planner-templates/${id}/publish`),
  delete: (id: string) => api.delete(`/admin/planner-templates/${id}`),
};

// Parascolaires API
export const parascolairesAPI = {
  getAll: (params?: { bacSection?: BacSection }) => api.get('/parascolaires', { params }),
  getById: (id: string) => api.get(`/parascolaires/${id}`),
  create: (data: any) => api.post('/parascolaires', data),
  update: (id: string, data: any) => api.put(`/parascolaires/${id}`, data),
  delete: (id: string) => api.delete(`/parascolaires/${id}`),
  uploadCover: (formData: FormData) => {
    const file = formData.get('cover')
    if (!(file instanceof File)) {
      return uploadFormDataViaBackend({
        endpoint: '/parascolaires/upload-cover',
        formData,
        mapResponse: (data) => data,
      })
    }
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/parascolaires/upload-cover/presign',
      mapResponse: (data) => ({ fileUrl: data.fileUrl }),
      fallback: () =>
        uploadFormDataViaBackend({
          endpoint: '/parascolaires/upload-cover',
          formData,
          mapResponse: (data) => data,
        }),
    })
  },
  uploadPdf: (formData: FormData) => {
    const file = formData.get('pdf')
    if (!(file instanceof File)) {
      return uploadFormDataViaBackend({
        endpoint: '/parascolaires/upload-pdf',
        formData,
        mapResponse: (data) => data,
      })
    }
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/parascolaires/upload-pdf/presign',
      mapResponse: (data) => ({ fileUrl: data.fileUrl }),
      fallback: () =>
        uploadFormDataViaBackend({
          endpoint: '/parascolaires/upload-pdf',
          formData,
          mapResponse: (data) => data,
        }),
    })
  },
};

export const studySquadAPI = {
  listMySquads: () => api.get('/study-squads/mine').then((res) => (res.data as any)?.squads || res.data),
  listMyInvitations: () => api.get('/study-squads/invitations').then((res) => (res.data as any)?.invitations || res.data),
  createSquad: (payload: { name: string }) => api.post('/study-squads', payload).then((res) => (res.data as any)?.squad || res.data),
  joinByCode: (payload: { code: string }) => api.post('/study-squads/join-by-code', payload).then((res) => (res.data as any)?.squad || res.data),
  getSquad: (id: string) => api.get(`/study-squads/${id}`).then((res) => (res.data as any)?.squad || res.data),
  renameSquad: (id: string, payload: { name: string }) => api.patch(`/study-squads/${id}/rename`, payload).then((res) => (res.data as any)?.squad || res.data),
  leaveSquad: (id: string) => api.post(`/study-squads/${id}/leave`).then((res) => (res.data as any) || {}),
  disbandSquad: (id: string) => api.post(`/study-squads/${id}/disband`).then((res) => (res.data as any) || {}),
  inviteByPhone: (id: string, payload: { phone: string }) => api.post(`/study-squads/${id}/invite`, payload).then((res) => (res.data as any)?.invitation || res.data),
  cancelInvitation: (id: string, invitationId: string) => api.delete(`/study-squads/${id}/invitations/${invitationId}`).then((res) => (res.data as any) || {}),
  acceptInvitation: (invitationId: string) => api.post(`/study-squads/invitations/${invitationId}/accept`).then((res) => (res.data as any)?.squad || res.data),
  declineInvitation: (invitationId: string) => api.post(`/study-squads/invitations/${invitationId}/decline`).then((res) => (res.data as any) || {}),
  removeMember: (id: string, userId: string) => api.post(`/study-squads/${id}/members/${userId}/remove`).then((res) => (res.data as any) || {}),
  upsertGoal: (id: string, payload: { title: string; description?: string; targetDate?: string; progress?: number; completed?: boolean }) =>
    api.post(`/study-squads/${id}/goal`, payload).then((res) => (res.data as any)?.goal || res.data),
  listChat: (id: string) => api.get(`/study-squads/${id}/chat`).then((res) => (res.data as any)?.messages || res.data),
  sendChatMessage: (id: string, payload: { content: string }) =>
    api.post(`/study-squads/${id}/chat`, payload).then((res) => (res.data as any)?.message || res.data),
};

export const liveStudyAPI = {
  listSessions: () => api.get('/live-study/sessions').then((res) => (res.data as any)?.sessions || res.data),
  createSession: (payload: { subject?: string; topic?: string; title?: string; subjectId?: string; studySquadId?: string }) =>
    api.post('/live-study/sessions', payload).then((res) => (res.data as any)?.session || res.data),
  getSession: (id: string) =>
    api.get(`/live-study/sessions/${id}`).then((res) => (res.data as any)?.session || res.data),
  joinSession: (id: string) =>
    api.post(`/live-study/sessions/${id}/join`).then((res) => (res.data as any)?.session || res.data),
  leaveSession: (id: string) =>
    api.post(`/live-study/sessions/${id}/leave`).then((res) => (res.data as any)?.session || res.data),
  finishSession: (id: string) =>
    api.post(`/live-study/sessions/${id}/finish`).then((res) => (res.data as any)?.session || res.data),
  heartbeat: (id: string) =>
    api.post(`/live-study/sessions/${id}/heartbeat`).then((res) => (res.data as any) || {}),
  updateMediaState: (id: string, payload: { mic?: boolean; camera?: boolean; micEnabled?: boolean; camEnabled?: boolean }) =>
    api.put(`/live-study/sessions/${id}/media`, payload),
  sendChat: (id: string, payload: { content: string }) =>
    api.post(`/live-study/sessions/${id}/chat`, payload).then((res) => (res.data as any)?.message || res.data),
  sendChatMessage: (id: string, content: string) =>
    api.post(`/live-study/sessions/${id}/chat`, { content }).then((res) => (res.data as any)?.message || res.data),
  getChatHistory: (id: string) =>
    api.get(`/live-study/sessions/${id}/chat`).then((res) => (res.data as any)?.messages || res.data),
  getParticipants: (id: string) =>
    api.get(`/live-study/sessions/${id}/participants`).then((res) => (res.data as any)?.participants || res.data),
  getRanking: (period: 'daily' | 'weekly' | 'monthly') =>
    api.get(`/live-study/ranking`, { params: { period } }).then((res) => (res.data as any)?.ranking || res.data),
  getBadges: () =>
    api.get('/live-study/badges').then((res) => (res.data as any)?.badges || res.data),
  postHeartbeat: (sessionId?: string) =>
    api.post('/live-study/heartbeat', { sessionId }).then((res) => (res.data as any) || {}),
  listAdminSessions: () => api.get('/admin/live-study/sessions').then((res) => (res.data as any)?.sessions || res.data),
  adminListAllSessions: (params?: {
    bacSection?: string;
    subject?: string;
    status?: string;
    creatorSearch?: string;
  }) =>
    api.get('/admin/live-study/sessions', { params }).then((res) => (res.data as any)?.sessions || (res.data as any)?.items || res.data),
  adminToggleGlobal: (enabled: boolean) =>
    api.post('/admin/live-study/toggle-global', { enabled }).then((res) => (res.data as any) || {}),
  adminCloseSession: (id: string, payload?: { reason?: string }) =>
    api.post(`/admin/live-study/sessions/${id}/close`, payload || {}).then((res) => (res.data as any) || {}),
  adminDeleteSession: (id: string) =>
    api.delete(`/admin/live-study/sessions/${id}`).then((res) => (res.data as any) || {}),
};

export default api;
