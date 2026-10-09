module.exports = {
  ROLES: {
    TEACHER: 'teacher',
    STUDENT: 'student'
  },
  USER_STATUS: {
    ACTIVE: 'active',
    LOCKED: 'locked'
  },
  SUBMISSION_STATUS: {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    GRADED: 'graded',
    RESUBMISSION_REQUESTED: 'resubmission_requested'
  },
  TARGET_TYPE: {
    CLASS: 'class',
    STUDENT: 'student'
  },
  ENTITY_TYPE: {
    ASSIGNMENT: 'assignment',
    SUBMISSION: 'submission'
  },
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25 MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
};
