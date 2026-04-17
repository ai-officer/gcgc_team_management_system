'use client'

import React, { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
  Upload,
  Trash2,
  Plus,
  CalendarIcon
} from 'lucide-react'
import { ossbRequestSchema, type OSSBRequestInput } from '@/lib/validations/ossb'
import { useToast } from '@/hooks/use-toast'

interface OSSBWizardFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const WIZARD_STEPS = [
  { number: 1, title: 'Header Information', icon: FileText },
  { number: 2, title: 'Project Information', icon: FileText },
  { number: 3, title: 'Success Measures', icon: FileText },
  { number: 4, title: 'Program Steps', icon: FileText },
  { number: 5, title: 'Signatories', icon: FileText },
  { number: 6, title: 'Attachments', icon: FileText },
  { number: 7, title: 'CC / Remarks', icon: FileText }
]

export default function OSSBWizardForm({ isOpen, onClose, onSuccess }: OSSBWizardFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const { toast } = useToast()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<OSSBRequestInput>({
    resolver: zodResolver(ossbRequestSchema),
    mode: 'onChange', // Validate on change to show errors immediately
    defaultValues: {
      partOfAnnualPlan: false,
      status: 'DRAFT',
      successMeasures: [''],
      programSteps: [
        {
          stepNumber: 1,
          description: '',
          responsiblePerson: '',
          deadline: new Date(),
          budget: 0
        }
      ],
      totalBudget: 0, // Initialize totalBudget
      hasGuidelines: false,
      hasComputationValue: false
    }
  })

  const { fields: successMeasureFields, append: appendSuccessMeasure, remove: removeSuccessMeasure } = useFieldArray({
    control,
    name: 'successMeasures'
  })

  const { fields: programStepFields, append: appendProgramStep, remove: removeProgramStep } = useFieldArray({
    control,
    name: 'programSteps'
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ossb/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadedFiles([...uploadedFiles, data.file])

      toast({
        title: 'Success',
        description: 'File uploaded successfully'
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive'
      })
    }
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(newFiles)
  }

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: OSSBRequestInput) => {
    try {
      console.log('✅ Form validation passed!')
      console.log('🚀 Submitting OSSB request:', data)

      toast({
        title: 'Creating OSSB Request...',
        description: 'Please wait while we create your request.'
      })

      setIsSubmitting(true)

      const response = await fetch('/api/ossb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Server validation failed:', result.details)
        const errorMessage = result.details
          ? `Validation failed: ${JSON.stringify(result.details, null, 2)}`
          : result.error || 'Failed to create OSSB request'
        throw new Error(errorMessage)
      }

      // Upload attachments if any
      if (uploadedFiles.length > 0 && result.ossbRequest?.id) {
        for (const file of uploadedFiles) {
          await fetch('/api/ossb/upload', {
            method: 'POST',
            body: JSON.stringify({
              ...file,
              ossbRequestId: result.ossbRequest.id
            })
          })
        }
      }

      // Show success message with sync status
      const syncResults = result.syncResults
      let description = 'OSSB request created successfully'

      if (syncResults) {
        description += ` (${syncResults.tmsEventsCreated} events created in TMS)`

        if (syncResults.googleSyncAttempted) {
          if (syncResults.googleSyncSucceeded > 0) {
            description += `. ${syncResults.googleSyncSucceeded} events synced to Google Calendar`
          }
          if (syncResults.googleSyncFailed > 0) {
            description += `. ⚠️ ${syncResults.googleSyncFailed} events failed to sync - try manual sync`
          }
        } else {
          description += '. Google Calendar sync is disabled'
        }
      }

      toast({
        title: 'Success',
        description,
        variant: syncResults?.googleSyncFailed > 0 ? 'default' : 'default'
      })

      onSuccess?.()
      onClose()
      router.refresh()
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create OSSB request',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Section1HeaderInfo register={register} errors={errors} watch={watch} setValue={setValue} />
      case 2:
        return <Section2ProjectInfo register={register} errors={errors} watch={watch} setValue={setValue} />
      case 3:
        return <Section3SuccessMeasures fields={successMeasureFields} register={register} errors={errors} append={appendSuccessMeasure} remove={removeSuccessMeasure} />
      case 4:
        return <Section4ProgramSteps fields={programStepFields} register={register} errors={errors} watch={watch} setValue={setValue} append={appendProgramStep} remove={removeProgramStep} />
      case 5:
        return <Section5Signatories register={register} errors={errors} watch={watch} setValue={setValue} />
      case 6:
        return <Section6Attachments register={register} errors={errors} watch={watch} setValue={setValue} uploadedFiles={uploadedFiles} onFileUpload={handleFileUpload} onRemoveFile={handleRemoveFile} />
      case 7:
        return <Section7CCRemarks register={register} errors={errors} />
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <FileText className="h-5 w-5 text-blue-600" />
            Create OSSB Request
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Objective / Specific Steps Budget Request Form
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-1 py-2">
          <div className="flex items-center">
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      currentStep === step.number
                        ? 'bg-blue-600 text-white'
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`text-xs hidden sm:block whitespace-nowrap ${
                      currentStep === step.number
                        ? 'text-blue-600 font-medium'
                        : currentStep > step.number
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title.split(' ')[0]}
                  </span>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-colors ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Validation Status Bar */}
        <div className="flex items-center justify-between px-1 pb-1">
          <Badge
            className={`text-xs border-0 ${
              isValid
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isValid ? 'Form is ready to submit' : 'Form has validation errors'}
          </Badge>
          <span className="text-xs text-gray-500">
            Step {currentStep} of {WIZARD_STEPS.length} &mdash; {WIZARD_STEPS[currentStep - 1].title}
          </span>
        </div>

        {/* Validation Errors Display */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mx-1">
            <h4 className="text-sm font-semibold text-red-700 mb-1">
              {Object.keys(errors).length} error(s) found — please fix before submitting
            </h4>
            <ul className="list-disc list-inside space-y-0.5 text-xs text-red-600">
              {Object.entries(errors).map(([key, error]: [string, any]) => {
                const message = error?.message || error?.root?.message || 'Invalid value'
                return (
                  <li key={key}>
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>: {message}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mx-1 mb-2">
              {renderStep()}
            </div>
          </ScrollArea>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 mt-2 border-t border-gray-100 px-1">
            <Button
              type="button"
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 1}
              className="border-gray-200"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-200"
              >
                Cancel
              </Button>

              {currentStep < WIZARD_STEPS.length ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    console.log('🖱️ Submit button clicked')
                    console.log('Form is valid:', isValid)
                    console.log('Current form errors:', errors)
                    console.log('Current form values:', watch())

                    if (Object.keys(errors).length > 0) {
                      toast({
                        title: 'Validation Error',
                        description: `Please fix ${Object.keys(errors).length} error(s) before submitting.`,
                        variant: 'destructive'
                      })
                    }
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create OSSB Request'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Section Components
function Section1HeaderInfo({ register, errors, watch, setValue }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Header Information</h3>
        <p className="text-sm text-gray-600">Basic information about your OSSB request</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="branchOrDepartment" className="text-sm font-medium text-gray-700">
            Branch or Department <span className="text-red-500">*</span>
          </Label>
          <Input
            id="branchOrDepartment"
            {...register('branchOrDepartment')}
            placeholder="Enter branch or department name"
            className="mt-1.5 border-gray-200"
          />
          {errors.branchOrDepartment && (
            <p className="text-xs text-red-500 mt-1">{errors.branchOrDepartment.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="objectiveTitle" className="text-sm font-medium text-gray-700">
            Objective / Specific Steps Budget Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="objectiveTitle"
            {...register('objectiveTitle')}
            placeholder="Enter budget title"
            className="mt-1.5 border-gray-200"
          />
          {errors.objectiveTitle && (
            <p className="text-xs text-red-500 mt-1">{errors.objectiveTitle.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="versionNo" className="text-sm font-medium text-gray-700">Version No.</Label>
          <Input
            id="versionNo"
            {...register('versionNo')}
            placeholder="e.g., ver211001"
            className="mt-1.5 border-gray-200"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="partOfAnnualPlan"
            checked={watch('partOfAnnualPlan')}
            onCheckedChange={(checked) => setValue('partOfAnnualPlan', checked)}
          />
          <Label htmlFor="partOfAnnualPlan" className="text-sm font-medium text-gray-700 cursor-pointer">
            Part of Annual Plan
          </Label>
        </div>
      </div>
    </div>
  )
}

function Section2ProjectInfo({ register, errors, watch, setValue }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Project Information</h3>
        <p className="text-sm text-gray-600">Detailed project classification and timeline</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="mipClassification" className="text-sm font-medium text-gray-700">
            M/I/P Classification <span className="text-red-500">*</span>
          </Label>
          <select
            id="mipClassification"
            {...register('mipClassification')}
            className="w-full px-3 py-2 border border-gray-200 rounded-md mt-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select classification</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="IMPROVEMENT">Improvement</option>
            <option value="PROJECT">Project</option>
          </select>
          {errors.mipClassification && (
            <p className="text-xs text-red-500 mt-1">{errors.mipClassification.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="kraOrCpaNumber" className="text-sm font-medium text-gray-700">KRA/CPA #</Label>
            <Input
              id="kraOrCpaNumber"
              type="number"
              {...register('kraOrCpaNumber', { valueAsNumber: true })}
              placeholder="Enter number"
              className="mt-1.5 border-gray-200"
            />
          </div>
          <div>
            <Label htmlFor="projectNumber" className="text-sm font-medium text-gray-700">Project #</Label>
            <Input
              id="projectNumber"
              type="number"
              {...register('projectNumber', { valueAsNumber: true })}
              placeholder="Enter number"
              className="mt-1.5 border-gray-200"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="kraOrCpaName" className="text-sm font-medium text-gray-700">KRA/CPA Name</Label>
          <Input
            id="kraOrCpaName"
            {...register('kraOrCpaName')}
            placeholder="e.g., Marketing"
            className="mt-1.5 border-gray-200"
          />
        </div>

        <div>
          <Label htmlFor="titleObjective" className="text-sm font-medium text-gray-700">
            Title / Objective Statement <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="titleObjective"
            {...register('titleObjective')}
            placeholder="What is this that you want to improve?"
            rows={3}
            className="mt-1.5 border-gray-200"
          />
          {errors.titleObjective && (
            <p className="text-xs text-red-500 mt-1">{errors.titleObjective.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              Start Date <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              date={watch('startDate')}
              onSelect={(date) => setValue('startDate', date)}
              placeholder="Select start date"
            />
            {errors.startDate && (
              <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              End Date <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              date={watch('endDate')}
              onSelect={(date) => setValue('endDate', date)}
              placeholder="Select end date"
              disabled={(date) => {
                const startDate = watch('startDate')
                return startDate ? date < startDate : false
              }}
            />
            {errors.endDate && (
              <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {watch('startDate') && watch('endDate') && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              Number of Days: {Math.ceil((new Date(watch('endDate')).getTime() - new Date(watch('startDate')).getTime()) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Section3SuccessMeasures({ fields, register, errors, append, remove }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Specific Standards / Success Measures</h3>
        <p className="text-sm text-gray-600">Define success criteria (maximum 10 measures)</p>
      </div>

      <div className="space-y-3">
        {fields.map((field: any, index: number) => (
          <div key={field.id} className="border border-gray-100 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-700">
                Success Measure {index + 1}
              </Label>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div>
              <Textarea
                id={`successMeasures.${index}`}
                {...register(`successMeasures.${index}`)}
                placeholder="Describe the success criteria or measurable outcome"
                rows={2}
                className="border-gray-200 text-sm"
              />
              {errors.successMeasures?.[index] && (
                <p className="text-xs text-red-500 mt-1">{errors.successMeasures[index].message}</p>
              )}
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => append('')}
          className="w-full border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
          disabled={fields.length >= 10}
        >
          <Plus className="h-4 w-4 mr-2" />
          {fields.length >= 10
            ? 'Maximum 10 Success Measures Reached'
            : `Add Success Measure (${fields.length}/10)`}
        </Button>
      </div>
    </div>
  )
}

function Section4ProgramSteps({ fields, register, errors, watch, setValue, append, remove }: any) {
  const totalBudget = fields.reduce((sum: number, _: any, index: number) => {
    return sum + (parseFloat(watch(`programSteps.${index}.budget`)) || 0)
  }, 0)

  // Automatically update the totalBudget field in the form
  React.useEffect(() => {
    setValue('totalBudget', totalBudget)
  }, [totalBudget, setValue])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Program Steps</h3>
        <p className="text-sm text-gray-600">Define the steps and budget breakdown (maximum 10 steps)</p>
      </div>

      <div className="space-y-3">
        {fields.map((field: any, index: number) => (
          <div key={field.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-700">Step {index + 1}</h4>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">
                Program Step Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                {...register(`programSteps.${index}.description`)}
                placeholder="Describe the activity"
                rows={2}
                className="mt-1.5 border-gray-200 text-sm"
              />
              {errors.programSteps?.[index]?.description && (
                <p className="text-xs text-red-500 mt-1">{errors.programSteps[index].description.message}</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">
                Responsible Person / Unit <span className="text-red-500">*</span>
              </Label>
              <Input
                {...register(`programSteps.${index}.responsiblePerson`)}
                placeholder="Who will do it"
                className="mt-1.5 border-gray-200"
              />
              {errors.programSteps?.[index]?.responsiblePerson && (
                <p className="text-xs text-red-500 mt-1">{errors.programSteps[index].responsiblePerson.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Deadline <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  date={watch(`programSteps.${index}.deadline`)}
                  onSelect={(date) => setValue(`programSteps.${index}.deadline`, date)}
                  placeholder="Select deadline"
                />
                {errors.programSteps?.[index]?.deadline && (
                  <p className="text-xs text-red-500 mt-1">{errors.programSteps[index].deadline.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Budget (PHP) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register(`programSteps.${index}.budget`, { valueAsNumber: true })}
                  placeholder="0.00"
                  className="border-gray-200"
                />
                {errors.programSteps?.[index]?.budget && (
                  <p className="text-xs text-red-500 mt-1">{errors.programSteps[index].budget.message}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => append({
            stepNumber: fields.length + 1,
            description: '',
            responsiblePerson: '',
            deadline: new Date(),
            budget: 0
          })}
          className="w-full border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
          disabled={fields.length >= 10}
        >
          <Plus className="h-4 w-4 mr-2" />
          {fields.length >= 10
            ? 'Maximum 10 Program Steps Reached'
            : `Add Program Step (${fields.length}/10)`}
        </Button>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center">
          <span className="text-sm font-semibold text-blue-900">Total Budget</span>
          <span className="text-lg font-bold text-blue-900">
            &#8369;{totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  )
}

function Section5Signatories({ register, errors, watch, setValue }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Signatories</h3>
        <p className="text-sm text-gray-600">Approval chain and signatory information</p>
      </div>

      <div className="space-y-5">
        {/* Prepared By */}
        <div className="space-y-3 pb-4 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700">Prepared By</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600">Name</Label>
              <Input {...register('preparedBy')} placeholder="Name" className="mt-1 border-gray-200 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Position</Label>
              <Input {...register('preparedByPosition')} placeholder="Position" className="mt-1 border-gray-200 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
              <CalendarIcon className="h-3 w-3" />
              Date Prepared
            </Label>
            <DatePicker
              date={watch('datePrepared')}
              onSelect={(date) => setValue('datePrepared', date)}
              placeholder="Select date"
            />
          </div>
        </div>

        {/* Endorsed By */}
        <div className="space-y-3 pb-4 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700">Endorsed By</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600">Name</Label>
              <Input {...register('endorsedBy')} placeholder="Name" className="mt-1 border-gray-200 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Position</Label>
              <Input {...register('endorsedByPosition')} placeholder="Position" className="mt-1 border-gray-200 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
              <CalendarIcon className="h-3 w-3" />
              Date Endorsed
            </Label>
            <DatePicker
              date={watch('dateEndorsed')}
              onSelect={(date) => setValue('dateEndorsed', date)}
              placeholder="Select date"
            />
          </div>
        </div>

        {/* Recommended By */}
        <div className="space-y-3 pb-4 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700">Recommended By</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600">Name</Label>
              <Input {...register('recommendedBy')} placeholder="Name" className="mt-1 border-gray-200 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Position</Label>
              <Input {...register('recommendedByPosition')} placeholder="Position" className="mt-1 border-gray-200 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
              <CalendarIcon className="h-3 w-3" />
              Date Recommended
            </Label>
            <DatePicker
              date={watch('dateRecommended')}
              onSelect={(date) => setValue('dateRecommended', date)}
              placeholder="Select date"
            />
          </div>
        </div>

        {/* Approved By */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Approved By</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600">Name</Label>
              <Input {...register('approvedBy')} placeholder="Name" className="mt-1 border-gray-200 text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Position</Label>
              <Input {...register('approvedByPosition')} placeholder="Position" className="mt-1 border-gray-200 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
              <CalendarIcon className="h-3 w-3" />
              Date Approved
            </Label>
            <DatePicker
              date={watch('dateApproved')}
              onSelect={(date) => setValue('dateApproved', date)}
              placeholder="Select date"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Section6Attachments({ register, errors, watch, setValue, uploadedFiles, onFileUpload, onRemoveFile }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Attachments / Supporting Documents</h3>
        <p className="text-sm text-gray-600">Upload supporting files and documentation</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasGuidelines"
              checked={watch('hasGuidelines')}
              onCheckedChange={(checked) => setValue('hasGuidelines', checked)}
            />
            <Label htmlFor="hasGuidelines" className="text-sm text-gray-700 cursor-pointer">
              Guidelines, Systems, and Procedures
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasComputationValue"
              checked={watch('hasComputationValue')}
              onCheckedChange={(checked) => setValue('hasComputationValue', checked)}
            />
            <Label htmlFor="hasComputationValue" className="text-sm text-gray-700 cursor-pointer">
              Computation of Value (Revenue minus cost)
            </Label>
          </div>
        </div>

        <div>
          <Label htmlFor="otherAttachments" className="text-sm font-medium text-gray-700">Others (Please specify)</Label>
          <Input
            id="otherAttachments"
            {...register('otherAttachments')}
            placeholder="Specify other attachments"
            className="mt-1.5 border-gray-200"
          />
        </div>

        <Separator className="bg-gray-100" />

        {/* File Upload Area */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Upload Files (Optional)</Label>
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">Click to upload a file</p>
            <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF (Max 10MB)</p>
            <Input
              id="file-upload"
              type="file"
              onChange={onFileUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              className="hidden"
            />
          </label>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Uploaded Files</Label>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-900">{file.fileName}</span>
                    <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">
                      {(file.fileSize / 1024).toFixed(2)} KB
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFile(index)}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section7CCRemarks({ register, errors }: any) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">CC / Remarks</h3>
        <p className="text-sm text-gray-600">Additional recipients and notes</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="ccRecipients" className="text-sm font-medium text-gray-700">CC / Recipients</Label>
          <Textarea
            id="ccRecipients"
            {...register('ccRecipients')}
            placeholder="Additional recipients or departments"
            rows={2}
            className="mt-1.5 border-gray-200 text-sm"
          />
        </div>

        <div>
          <Label htmlFor="remarks" className="text-sm font-medium text-gray-700">Remarks / Notes</Label>
          <Textarea
            id="remarks"
            {...register('remarks')}
            placeholder="Optional comments"
            rows={3}
            className="mt-1.5 border-gray-200 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
