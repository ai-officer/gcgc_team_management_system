import { z } from 'zod'

// Section 1: Header Information Schema
export const ossbHeaderSchema = z.object({
  branchOrDepartment: z.string()
    .min(1, 'Branch/Department is required')
    .max(100, 'Branch/Department must not exceed 100 characters')
    .trim(),
  objectiveTitle: z.string()
    .min(1, 'Objective title is required')
    .min(5, 'Objective title must be at least 5 characters')
    .max(200, 'Objective title must not exceed 200 characters')
    .trim(),
  versionNo: z.string()
    .max(50, 'Version number must not exceed 50 characters')
    .optional()
    .or(z.literal('')),
  partOfAnnualPlan: z.boolean().default(false)
})

// Section 2: Project Information Schema
export const ossbProjectInfoSchema = z.object({
  mipClassification: z.enum(['MAINTENANCE', 'IMPROVEMENT', 'PROJECT'], {
    required_error: 'M/I/P classification is required',
    invalid_type_error: 'Invalid classification type'
  }),
  kraOrCpaNumber: z.number()
    .int('KRA/CPA number must be a whole number')
    .positive('KRA/CPA number must be positive')
    .max(999999, 'KRA/CPA number is too large')
    .optional()
    .nullable(),
  projectNumber: z.number()
    .int('Project number must be a whole number')
    .positive('Project number must be positive')
    .max(999999, 'Project number is too large')
    .optional()
    .nullable(),
  kraOrCpaName: z.string()
    .max(200, 'KRA/CPA name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  titleObjective: z.string()
    .min(1, 'Title/Objective statement is required')
    .min(10, 'Title/Objective must be at least 10 characters')
    .max(1000, 'Title/Objective must not exceed 1000 characters')
    .trim(),
  startDate: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Invalid date format'
  }),
  endDate: z.date({
    required_error: 'End date is required',
    invalid_type_error: 'Invalid date format'
  })
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate']
  }
).refine(
  (data) => {
    // Validate project duration (max 5 years)
    const diffInDays = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24))
    return diffInDays <= 1825 // 5 years
  },
  {
    message: 'Project duration cannot exceed 5 years',
    path: ['endDate']
  }
)

// Section 3: Specific Standards / Success Measures Schema
export const ossbSuccessMeasuresSchema = z.object({
  successMeasures: z.array(
    z.string()
      .min(1, 'Success measure cannot be empty')
      .min(5, 'Success measure must be at least 5 characters')
      .max(500, 'Success measure must not exceed 500 characters')
      .trim()
  )
    .min(1, 'At least one success measure is required')
    .max(10, 'Cannot have more than 10 success measures')
})

// Section 4: Program Steps Schema
export const ossbProgramStepSchema = z.object({
  stepNumber: z.number()
    .int('Step number must be a whole number')
    .positive('Step number must be positive')
    .max(100, 'Step number cannot exceed 100'),
  description: z.string()
    .min(1, 'Step description is required')
    .min(10, 'Step description must be at least 10 characters')
    .max(1000, 'Step description must not exceed 1000 characters')
    .trim(),
  responsiblePerson: z.string()
    .min(1, 'Responsible person is required')
    .min(2, 'Responsible person must be at least 2 characters')
    .max(200, 'Responsible person must not exceed 200 characters')
    .trim(),
  deadline: z.date({
    required_error: 'Deadline is required',
    invalid_type_error: 'Invalid date format'
  }),
  budget: z.number()
    .nonnegative('Budget must be non-negative')
    .max(999999999.99, 'Budget amount is too large')
    .default(0)
})

export const ossbProgramStepsSchema = z.object({
  programSteps: z.array(ossbProgramStepSchema)
    .min(1, 'At least one program step is required')
    .max(50, 'Cannot have more than 50 program steps'),
  totalBudget: z.number()
    .nonnegative('Total budget must be non-negative')
    .max(9999999999.99, 'Total budget is too large')
    .default(0)
}).refine(
  (data) => {
    // Validate that deadlines are in sequential order
    const deadlines = data.programSteps.map(step => step.deadline.getTime())
    for (let i = 1; i < deadlines.length; i++) {
      if (deadlines[i] < deadlines[i - 1]) {
        return false
      }
    }
    return true
  },
  {
    message: 'Program step deadlines should be in chronological order',
    path: ['programSteps']
  }
).refine(
  (data) => {
    // Validate that calculated total matches sum of steps
    const calculatedTotal = data.programSteps.reduce((sum, step) => sum + step.budget, 0)
    return Math.abs(calculatedTotal - data.totalBudget) < 0.01 // Allow for floating point precision
  },
  {
    message: 'Total budget must equal the sum of all program step budgets',
    path: ['totalBudget']
  }
)

// Section 5: Signatories Schema with conditional validation
export const ossbSignatoriesSchema = z.object({
  preparedBy: z.string()
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  preparedByPosition: z.string()
    .max(200, 'Position must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  datePrepared: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable(),
  endorsedBy: z.string()
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  endorsedByPosition: z.string()
    .max(200, 'Position must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  dateEndorsed: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable(),
  recommendedBy: z.string()
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  recommendedByPosition: z.string()
    .max(200, 'Position must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  dateRecommended: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable(),
  approvedBy: z.string()
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  approvedByPosition: z.string()
    .max(200, 'Position must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  dateApproved: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable()
}).refine(
  (data) => {
    // If name is provided, position should also be provided
    if (data.preparedBy && !data.preparedByPosition) return false
    if (data.endorsedBy && !data.endorsedByPosition) return false
    if (data.recommendedBy && !data.recommendedByPosition) return false
    if (data.approvedBy && !data.approvedByPosition) return false
    return true
  },
  {
    message: 'Position is required when name is provided',
    path: ['preparedByPosition']
  }
).refine(
  (data) => {
    // Validate chronological order of approval dates
    const dates: Array<{ date: Date | null | undefined; name: string }> = [
      { date: data.datePrepared, name: 'prepared' },
      { date: data.dateEndorsed, name: 'endorsed' },
      { date: data.dateRecommended, name: 'recommended' },
      { date: data.dateApproved, name: 'approved' }
    ]

    const validDates = dates.filter(d => d.date instanceof Date)

    for (let i = 1; i < validDates.length; i++) {
      if (validDates[i].date! < validDates[i - 1].date!) {
        return false
      }
    }
    return true
  },
  {
    message: 'Approval dates must be in chronological order (prepared → endorsed → recommended → approved)',
    path: ['dateApproved']
  }
)

// Section 6: Attachments / Supporting Documents Schema
export const ossbAttachmentsSchema = z.object({
  hasGuidelines: z.boolean().default(false),
  hasComputationValue: z.boolean().default(false),
  otherAttachments: z.string()
    .max(500, 'Other attachments description must not exceed 500 characters')
    .trim()
    .optional()
    .or(z.literal(''))
})

// Section 7: CC / Remarks Schema
export const ossbCCRemarksSchema = z.object({
  ccRecipients: z.string()
    .max(1000, 'CC recipients must not exceed 1000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  remarks: z.string()
    .max(2000, 'Remarks must not exceed 2000 characters')
    .trim()
    .optional()
    .or(z.literal(''))
})

// Base schema without refinements for composition
const ossbRequestBaseSchema = z.object({
  // Section 1: Header Information
  branchOrDepartment: z.string()
    .min(1, 'Branch/Department is required')
    .max(100, 'Branch/Department must not exceed 100 characters')
    .trim(),
  objectiveTitle: z.string()
    .min(1, 'Objective title is required')
    .min(5, 'Objective title must be at least 5 characters')
    .max(200, 'Objective title must not exceed 200 characters')
    .trim(),
  versionNo: z.string()
    .max(50, 'Version number must not exceed 50 characters')
    .optional()
    .or(z.literal('')),
  partOfAnnualPlan: z.boolean().default(false),

  // Section 2: Project Information
  mipClassification: z.enum(['MAINTENANCE', 'IMPROVEMENT', 'PROJECT'], {
    required_error: 'M/I/P classification is required',
    invalid_type_error: 'Invalid classification type'
  }),
  kraOrCpaNumber: z.number()
    .int('KRA/CPA number must be a whole number')
    .positive('KRA/CPA number must be positive')
    .max(999999, 'KRA/CPA number is too large')
    .optional()
    .nullable(),
  projectNumber: z.number()
    .int('Project number must be a whole number')
    .positive('Project number must be positive')
    .max(999999, 'Project number is too large')
    .optional()
    .nullable(),
  kraOrCpaName: z.string()
    .max(200, 'KRA/CPA name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  titleObjective: z.string()
    .min(1, 'Title/Objective statement is required')
    .min(10, 'Title/Objective must be at least 10 characters')
    .max(1000, 'Title/Objective must not exceed 1000 characters')
    .trim(),
  startDate: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Invalid date format'
  }),
  endDate: z.date({
    required_error: 'End date is required',
    invalid_type_error: 'Invalid date format'
  }),

  // Section 3: Success Measures
  successMeasures: z.array(
    z.string()
      .min(1, 'Success measure cannot be empty')
      .min(5, 'Success measure must be at least 5 characters')
      .max(500, 'Success measure must not exceed 500 characters')
      .trim()
  )
    .min(1, 'At least one success measure is required')
    .max(10, 'Cannot have more than 10 success measures'),

  // Section 4: Program Steps
  programSteps: z.array(ossbProgramStepSchema)
    .min(1, 'At least one program step is required')
    .max(50, 'Cannot have more than 50 program steps'),
  totalBudget: z.number()
    .nonnegative('Total budget must be non-negative')
    .max(9999999999.99, 'Total budget is too large')
    .default(0),

  // Section 5: Signatories
  preparedBy: z.string()
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  preparedByPosition: z.string()
    .max(200, 'Position must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  datePrepared: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable(),
  endorsedBy: z.string()
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  endorsedByPosition: z.string()
    .max(200, 'Position must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  dateEndorsed: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable(),
  recommendedBy: z.string()
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  recommendedByPosition: z.string()
    .max(200, 'Position must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  dateRecommended: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable(),
  approvedBy: z.string()
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  approvedByPosition: z.string()
    .max(200, 'Position must not exceed 200 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  dateApproved: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable(),

  // Section 6: Attachments
  hasGuidelines: z.boolean().default(false),
  hasComputationValue: z.boolean().default(false),
  otherAttachments: z.string()
    .max(500, 'Other attachments description must not exceed 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  // Section 7: CC / Remarks
  ccRecipients: z.string()
    .max(1000, 'CC recipients must not exceed 1000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  remarks: z.string()
    .max(2000, 'Remarks must not exceed 2000 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  // Meta fields
  status: z.enum(['DRAFT', 'SUBMITTED', 'ENDORSED', 'RECOMMENDED', 'APPROVED', 'REJECTED'], {
    invalid_type_error: 'Invalid status'
  }).default('DRAFT')
})

// Complete OSSB Request Schema with all validations
export const ossbRequestSchema = ossbRequestBaseSchema
  .refine(
    (data) => data.endDate >= data.startDate,
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate']
    }
  )
  .refine(
    (data) => {
      // Validate project duration (max 5 years)
      const diffInDays = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24))
      return diffInDays <= 1825 // 5 years
    },
    {
      message: 'Project duration cannot exceed 5 years',
      path: ['endDate']
    }
  )
  .refine(
    (data) => {
      // Validate that calculated total matches sum of steps
      const calculatedTotal = data.programSteps.reduce((sum, step) => sum + step.budget, 0)
      return Math.abs(calculatedTotal - data.totalBudget) < 0.01 // Allow for floating point precision
    },
    {
      message: 'Total budget must equal the sum of all program step budgets',
      path: ['totalBudget']
    }
  )
  .refine(
    (data) => {
      // If name is provided, position should also be provided
      if (data.preparedBy && !data.preparedByPosition) return false
      if (data.endorsedBy && !data.endorsedByPosition) return false
      if (data.recommendedBy && !data.recommendedByPosition) return false
      if (data.approvedBy && !data.approvedByPosition) return false
      return true
    },
    {
      message: 'Position is required when name is provided',
      path: ['preparedByPosition']
    }
  )
  .refine(
    (data) => {
      // Validate chronological order of approval dates
      const dates: Array<{ date: Date | null | undefined; name: string }> = [
        { date: data.datePrepared, name: 'prepared' },
        { date: data.dateEndorsed, name: 'endorsed' },
        { date: data.dateRecommended, name: 'recommended' },
        { date: data.dateApproved, name: 'approved' }
      ]

      const validDates = dates.filter(d => d.date instanceof Date)

      for (let i = 1; i < validDates.length; i++) {
        if (validDates[i].date! < validDates[i - 1].date!) {
          return false
        }
      }
      return true
    },
    {
      message: 'Approval dates must be in chronological order (prepared → endorsed → recommended → approved)',
      path: ['dateApproved']
    }
  )
  .refine(
    (data) => {
      // Validate that program steps fall within project date range
      const projectStart = data.startDate.getTime()
      const projectEnd = data.endDate.getTime()

      return data.programSteps.every((step) => {
        const stepDeadline = step.deadline.getTime()
        return stepDeadline >= projectStart && stepDeadline <= projectEnd
      })
    },
    {
      message: 'All program step deadlines must fall within the project start and end dates',
      path: ['programSteps']
    }
  )

// Validation schema for updating status (less strict)
export const ossbUpdateSchema = ossbRequestBaseSchema.partial().extend({
  id: z.string().cuid('Invalid OSSB request ID'),
  status: z.enum(['DRAFT', 'SUBMITTED', 'ENDORSED', 'RECOMMENDED', 'APPROVED', 'REJECTED'])
})

// Validation for submission (stricter requirements)
export const ossbSubmitSchema = ossbRequestBaseSchema.extend({
  status: z.literal('SUBMITTED'),
  preparedBy: z.string().min(1, 'Preparer name is required for submission'),
  preparedByPosition: z.string().min(1, 'Preparer position is required for submission'),
  datePrepared: z.date({ required_error: 'Preparation date is required for submission' })
})

// Type exports
export type OSSBHeaderInput = z.infer<typeof ossbHeaderSchema>
export type OSSBProjectInfoInput = z.infer<typeof ossbProjectInfoSchema>
export type OSSBSuccessMeasuresInput = z.infer<typeof ossbSuccessMeasuresSchema>
export type OSSBProgramStepInput = z.infer<typeof ossbProgramStepSchema>
export type OSSBProgramStepsInput = z.infer<typeof ossbProgramStepsSchema>
export type OSSBSignatoriesInput = z.infer<typeof ossbSignatoriesSchema>
export type OSSBAttachmentsInput = z.infer<typeof ossbAttachmentsSchema>
export type OSSBCCRemarksInput = z.infer<typeof ossbCCRemarksSchema>
export type OSSBRequestInput = z.infer<typeof ossbRequestSchema>
export type OSSBUpdateInput = z.infer<typeof ossbUpdateSchema>
export type OSSBSubmitInput = z.infer<typeof ossbSubmitSchema>
