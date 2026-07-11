import axios from 'axios';
import { api } from '../lib/api/http';
import { uploadMultipartVideo, type MultipartVideoUploadState } from '../lib/uploads/multipartVideo';
import type { BacSection } from '../constants/bacSections';

const uploadToSignedUrl = async (
  uploadUrl: string,
  file: File,
  onUploadProgress?: (progress: number) => void
) => {
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onUploadProgress(progress)
      }
    },
  })
}

const uploadViaPresignedEndpoint = async <T>({
  file,
  presignPath,
  mapResponse,
  onUploadProgress,
  fallback,
}: {
  file: File
  presignPath: string
  mapResponse: (data: any) => T
  onUploadProgress?: (progress: number) => void
  fallback: () => Promise<{ data: T }>
}) => {
  try {
    const presignResponse = await api.post(presignPath, {
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    })

    await uploadToSignedUrl(presignResponse.data.uploadUrl as string, file, onUploadProgress)

    return {
      data: mapResponse(presignResponse.data),
    }
  } catch {
    return fallback()
  }
}

export type VideoUploadOptions = {
  onProgress?: (state: MultipartVideoUploadState) => void
  signal?: AbortSignal
}

// Auth API
export const authAPI = {
  register: (data: { firstName: string; lastName: string; email: string; password: string; bacSection: BacSection }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
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
  delete: (id: string) =>
    api.delete(`/courses/${id}`),
  uploadVideo: (file: File, onUploadProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('video', file);
    return api.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
  getAll: (params?: { subjectId?: string; difficulty?: string; bacSection?: BacSection }) =>
    api.get('/exercises', { params }),
  getById: (id: string) =>
    api.get(`/exercises/${id}`),
  create: (data: any) =>
    api.post('/exercises', data),
  update: (id: string, data: any) =>
    api.put(`/exercises/${id}`, data),
  delete: (id: string) =>
    api.delete(`/exercises/${id}`),
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

// Homework API
export const homeworkAPI = {
  upload: (file: File, onUploadProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('homework', file);
    return api.post('/homework/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
  },
  getMySubmissions: () =>
    api.get('/homework/my-submissions'),
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

    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/admin/settings/upload/${asset}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
    api.post('/admin/exercise-correction', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  uploadExercisePdf: (formData: FormData) =>
    (() => {
      const file = formData.get('pdf')
      if (!(file instanceof File)) {
        return api.post('/admin/exercises/upload-pdf', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      }
      return uploadViaPresignedEndpoint({
        file,
        presignPath: '/admin/exercises/upload-pdf/presign',
        mapResponse: (data) => ({ fileUrl: data.fileUrl }),
        fallback: () =>
          api.post('/admin/exercises/upload-pdf', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }),
      })
    })(),

  uploadAdminVideo: (file: File, options?: VideoUploadOptions) =>
    uploadMultipartVideo({
      file,
      initiatePath: '/admin/uploads/video/multipart/initiate',
      signPartPath: '/admin/uploads/video/multipart/sign-part',
      completePath: '/admin/uploads/video/multipart/complete',
      abortPath: '/admin/uploads/video/multipart/abort',
      mapCompleteResponse: (data) => ({
        videoPath: data.videoPath,
        key: data.key,
      }),
      onProgress: options?.onProgress,
      signal: options?.signal,
    }),

  listUploads: (params?: { q?: string; kind?: string; prefix?: string; limit?: number }) =>
    api.get('/admin/uploads', { params }),

  deleteUpload: (data: { path: string; force?: boolean }) =>
    api.delete('/admin/uploads', { data }),

  replaceUpload: (targetPath: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetPath', targetPath);
    return api.post('/admin/uploads/replace', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  createExerciseCorrection: (data: any) =>
    api.post('/admin/exercise-correction', data),
  uploadExerciseCorrectionPdf: (formData: FormData) =>
    api.post('/admin/exercise-correction', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
        return api.post('/admin/courses/upload-pdf', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      }
      return uploadViaPresignedEndpoint({
        file,
        presignPath: '/admin/courses/upload-pdf/presign',
        mapResponse: (data) => ({ fileUrl: data.fileUrl }),
        fallback: () =>
          api.post('/admin/courses/upload-pdf', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }),
      })
    })(),

  uploadCorrection: (id: string, file: File) => {
    const formData = new FormData();

    formData.append('correction', file);

    return api.put(
      `/admin/submissions/${id}/correction`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
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
    const formData = new FormData();
    formData.append('file', file);
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/admin/communications/uploads/image/presign',
      mapResponse: (data) => ({ attachment: data.attachment }),
      fallback: () =>
        api.post('/admin/communications/uploads/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
    });
  },

  uploadCommunicationPdf: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/admin/communications/uploads/pdf/presign',
      mapResponse: (data) => ({ attachment: data.attachment }),
      fallback: () =>
        api.post('/admin/communications/uploads/pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
    });
  },

  uploadCommunicationVideo: (file: File, options?: VideoUploadOptions) =>
    uploadMultipartVideo({
      file,
      initiatePath: '/admin/communications/uploads/video/multipart/initiate',
      signPartPath: '/admin/communications/uploads/video/multipart/sign-part',
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
    }),
};

export const plannerAPI = {
  getTasks: (params?: { bacSection?: BacSection }) => api.get('/planner', { params }),
  createTask: (data: any) => api.post('/planner', data),
  updateTask: (id: string, data: any) => api.put(`/planner/${id}`, data),
  deleteTask: (id: string) => api.delete(`/planner/${id}`),
  toggleComplete: (id: string) => api.patch(`/planner/${id}/complete`),
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
      return api.post('/parascolaires/upload-cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/parascolaires/upload-cover/presign',
      mapResponse: (data) => ({ fileUrl: data.fileUrl }),
      fallback: () =>
        api.post('/parascolaires/upload-cover', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
    })
  },
  uploadPdf: (formData: FormData) => {
    const file = formData.get('pdf')
    if (!(file instanceof File)) {
      return api.post('/parascolaires/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return uploadViaPresignedEndpoint({
      file,
      presignPath: '/parascolaires/upload-pdf/presign',
      mapResponse: (data) => ({ fileUrl: data.fileUrl }),
      fallback: () =>
        api.post('/parascolaires/upload-pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
    })
  },
};

export default api;
