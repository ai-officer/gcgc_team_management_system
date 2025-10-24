import { z } from 'zod'

// Section 1: Header Information Schema
export const ossbHeaderSchema = z.object({
  branchOrDepartment: z.string().min(1, 'Branch/Department is required'),
  objectiveTitle: z.string().min(1, 'Objective title is required'),
  versionNo: z.string().optional(),
  partOfAnnualPlan: z.boolean().default(false)
})

// Section 2: Project Information Schema
export const ossbProjectInfoSchema = z.object({
  mipClassification: z.enum(['MAINTENANCE', 'IMPROVEMENT', 'PROJECT'], {
    required_error: 'M/I/P classification is required'
  }),
  kraOrCpaNumber: z.number().optional(),
  projectNumber: z.number().optional(),
  kraOrCpaName: z.string().optional(),
  titleObjective: z.string().min(1, 'Title/Objective statement is required'),
  startDate: z.date({
    required_error: 'Start date is required'
  }),
  endDate: z.date({
    required_error: 'End date is required'
  })
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate']
  }
)

// Section 3: Specific Standards / Success Measures Schema
export const ossbSuccessMeasuresSchema = z.object({
  successMeasures: z.array(z.string().min(1, 'Success measure cannot be empty'))
    .min(1, 'At least one success measure is required')
    .max(4, 'Maximum 4 success measures allowed')
})

// Section 4: Program Steps Schema
export const ossbProgramStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  description: z.string().min(1, 'Step description is required'),
  responsiblePerson: z.string().min(1, 'Responsible person is required'),
  deadline: z.date({
    required_error: 'Deadline is required'
  }),
  budget: z.number().nonnegative('Budget must be non-negative').default(0)
})

export const ossbProgramStepsSchema = z.object({
  programSteps: z.array(ossbProgramStepSchema)
    .min(1, 'At least one program step is required'),
  totalBudget: z.number().nonnegative().default(0)
})

// Section 5: Signatories Schema
export const ossbSignatoriesSchema = z.object({
  preparedBy: z.string().optional(),
  preparedByPosition: z.string().optional(),
  datePrepared: z.date().optional(),
  endorsedBy: z.string().optional(),
  endorsedByPosition: z.string().optional(),
  dateEndorsed: z.date().optional(),
  recommendedBy: z.string().optional(),
  recommendedByPosition: z.string().optional(),
  dateRecommended: z.date().optional(),
  approvedBy: z.string().optional(),
  approvedByPosition: z.string().optional(),
  dateApproved: z.date().optional()
})

// Section 6: Attachments / Supporting Documents Schema
export const ossbAttachmentsSchema = z.object({
  hasGuidelines: z.boolean().default(false),
  hasComputationValue: z.boolean().default(false),
  otherAttachments: z.string().optional()
})

// Section 7: CC / Remarks Schema
export const ossbCCRemarksSchema = z.object({
  ccRecipients: z.string().optional(),
  remarks: z.string().optional()
})

// Complete OSSB Request Schema (all sections combined)
export const ossbRequestSchema = z.object({
  // Section 1
  ...ossbHeaderSchema.shape,

  // Section 2
  ...ossbProjectInfoSchema.shape,

  // Section 3
  ...ossbSuccessMeasuresSchema.shape,

  // Section 4
  ...ossbProgramStepsSchema.shape,

  // Section 5
  ...ossbSignatoriesSchema.shape,

  // Section 6
  ...ossbAttachmentsSchema.shape,

  // Section 7
  ...ossbCCRemarksSchema.shape,

  // Meta fields
  status: z.enum(['DRAFT', 'SUBMITTED', 'ENDORSED', 'RECOMMENDED', 'APPROVED', 'REJECTED'])
    .default('DRAFT')
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
