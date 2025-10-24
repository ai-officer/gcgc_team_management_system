'use client'

import { useState } from 'react'
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
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
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
    formState: { errors }
  } = useForm<OSSBRequestInput>({
    resolver: zodResolver(ossbRequestSchema),
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
        throw new Error(result.error || 'Failed to create OSSB request')
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

      toast({
        title: 'Success',
        description: 'OSSB request created successfully'
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
        return <Section3SuccessMeasures fields={successMeasureFields} register={register} errors={errors} watch={watch} setValue={setValue} append={appendSuccessMeasure} remove={removeSuccessMeasure} />
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

  const progress = (currentStep / WIZARD_STEPS.length) * 100

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create OSSB Request
          </DialogTitle>
          <DialogDescription>
            Objective / Specific Steps Budget Request Form
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Step {currentStep} of {WIZARD_STEPS.length}</span>
            <span className="font-medium">{WIZARD_STEPS[currentStep - 1].title}</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between">
          {WIZARD_STEPS.map((step) => (
            <div
              key={step.number}
              className={`flex flex-col items-center gap-1 ${
                currentStep === step.number
                  ? 'text-primary'
                  : currentStep > step.number
                  ? 'text-green-600'
                  : 'text-muted-foreground'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  currentStep === step.number
                    ? 'bg-primary text-primary-foreground'
                    : currentStep > step.number
                    ? 'bg-green-600 text-white'
                    : 'bg-muted'
                }`}
              >
                {currentStep > step.number ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              <span className="text-xs hidden sm:block">{step.title.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden">
          <ScrollArea className="h-[400px] pr-4">
            {renderStep()}
          </ScrollArea>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 mt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>

              {currentStep < WIZARD_STEPS.length ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
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
    <div className="space-y-6 px-1">
      <div>
        <h3 className="text-lg font-semibold mb-1">Section 1: Header Information</h3>
        <p className="text-sm text-muted-foreground">Basic information about your OSSB request</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="branchOrDepartment">Branch or Department *</Label>
          <Input
            id="branchOrDepartment"
            {...register('branchOrDepartment')}
            placeholder="Enter branch or department name"
            className="mt-1.5"
          />
          {errors.branchOrDepartment && (
            <p className="text-sm text-red-500 mt-1">{errors.branchOrDepartment.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="objectiveTitle">Objective / Specific Steps Budget Title *</Label>
          <Input
            id="objectiveTitle"
            {...register('objectiveTitle')}
            placeholder="Enter budget title"
            className="mt-1.5"
          />
          {errors.objectiveTitle && (
            <p className="text-sm text-red-500 mt-1">{errors.objectiveTitle.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="versionNo">Version No.</Label>
          <Input
            id="versionNo"
            {...register('versionNo')}
            placeholder="e.g., ver211001"
            className="mt-1.5"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="partOfAnnualPlan"
            checked={watch('partOfAnnualPlan')}
            onCheckedChange={(checked) => setValue('partOfAnnualPlan', checked)}
          />
          <Label htmlFor="partOfAnnualPlan" className="cursor-pointer">
            Part of Annual Plan
          </Label>
        </div>
      </div>
    </div>
  )
}

function Section2ProjectInfo({ register, errors, watch, setValue }: any) {
  return (
    <div className="space-y-6 px-1">
      <div>
        <h3 className="text-lg font-semibold mb-1">Section 2: Project Information</h3>
        <p className="text-sm text-muted-foreground">Detailed project classification and timeline</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="mipClassification">M/I/P Classification *</Label>
          <select
            id="mipClassification"
            {...register('mipClassification')}
            className="w-full px-3 py-2 border rounded-md mt-1.5"
          >
            <option value="">Select classification</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="IMPROVEMENT">Improvement</option>
            <option value="PROJECT">Project</option>
          </select>
          {errors.mipClassification && (
            <p className="text-sm text-red-500 mt-1">{errors.mipClassification.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="kraOrCpaNumber">KRA/CPA #</Label>
            <Input
              id="kraOrCpaNumber"
              type="number"
              {...register('kraOrCpaNumber', { valueAsNumber: true })}
              placeholder="Enter number"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="projectNumber">Project #</Label>
            <Input
              id="projectNumber"
              type="number"
              {...register('projectNumber', { valueAsNumber: true })}
              placeholder="Enter number"
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="kraOrCpaName">KRA/CPA Name</Label>
          <Input
            id="kraOrCpaName"
            {...register('kraOrCpaName')}
            placeholder="e.g., Marketing"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="titleObjective">Title / Objective Statement *</Label>
          <Textarea
            id="titleObjective"
            {...register('titleObjective')}
            placeholder="What is this that you want to improve?"
            rows={3}
            className="mt-1.5"
          />
          {errors.titleObjective && (
            <p className="text-sm text-red-500 mt-1">{errors.titleObjective.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label htmlFor="startDate" className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              Start Date
              <span className="text-xs text-orange-600 font-semibold">
                *Required
              </span>
            </Label>
            <DatePicker
              date={watch('startDate')}
              onSelect={(date) => setValue('startDate', date)}
              placeholder="Select start date"
            />
            {errors.startDate && (
              <p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>
            )}
          </div>
          <div className="space-y-3">
            <Label htmlFor="endDate" className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5 text-orange-600" />
              End Date
              <span className="text-xs text-orange-600 font-semibold">
                *Required
              </span>
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
              <p className="text-sm text-red-500 mt-1">{errors.endDate.message}</p>
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

function Section3SuccessMeasures({ fields, register, errors, watch, setValue, append, remove }: any) {
  return (
    <div className="space-y-6 px-1">
      <div>
        <h3 className="text-lg font-semibold mb-1">Section 3: Specific Standards / Success Measures</h3>
        <p className="text-sm text-muted-foreground">Define success criteria (up to 4 measures)</p>
      </div>

      <div className="space-y-4">
        {fields.map((field: any, index: number) => (
          <div key={field.id} className="space-y-3 pb-4 border-b last:border-b-0">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {index === 0 ? 'a' : index === 1 ? 'b' : index === 2 ? 'c' : 'd'}. Success Measure {index + 1}
              </Label>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5" />
                When: *
              </Label>
              <DatePicker
                date={watch(`successMeasures.${index}.when`)}
                onSelect={(date) => setValue(`successMeasures.${index}.when`, date)}
                placeholder="Select date"
              />
            </div>

            <div>
              <Label htmlFor={`successMeasures.${index}.description`} className="text-sm">
                Description * (in present tense)
              </Label>
              <Textarea
                id={`successMeasures.${index}.description`}
                {...register(`successMeasures.${index}`)}
                placeholder="Describe when the success measure is achieved"
                rows={3}
                className="mt-1.5"
              />
              {errors.successMeasures?.[index] && (
                <p className="text-sm text-red-500 mt-1">{errors.successMeasures[index].message}</p>
              )}
            </div>
          </div>
        ))}

        {fields.length < 4 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => append('')}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Success Measure ({fields.length}/4)
          </Button>
        )}
      </div>
    </div>
  )
}

function Section4ProgramSteps({ fields, register, errors, watch, setValue, append, remove }: any) {
  const totalBudget = fields.reduce((sum: number, _: any, index: number) => {
    return sum + (parseFloat(watch(`programSteps.${index}.budget`)) || 0)
  }, 0)

  return (
    <div className="space-y-6 px-1">
      <div>
        <h3 className="text-lg font-semibold mb-1">Section 4: Program Steps</h3>
        <p className="text-sm text-muted-foreground">Define the steps and budget breakdown</p>
      </div>

      <div className="space-y-4">
        {fields.map((field: any, index: number) => (
          <div key={field.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Step {index + 1}</h4>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div>
              <Label>Program Step Description *</Label>
              <Textarea
                {...register(`programSteps.${index}.description`)}
                placeholder="Describe the activity"
                rows={2}
                className="mt-1.5"
              />
              {errors.programSteps?.[index]?.description && (
                <p className="text-sm text-red-500 mt-1">{errors.programSteps[index].description.message}</p>
              )}
            </div>

            <div>
              <Label>Responsible Person / Unit *</Label>
              <Input
                {...register(`programSteps.${index}.responsiblePerson`)}
                placeholder="Who will do it"
                className="mt-1.5"
              />
              {errors.programSteps?.[index]?.responsiblePerson && (
                <p className="text-sm text-red-500 mt-1">{errors.programSteps[index].responsiblePerson.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Deadline *
                </Label>
                <DatePicker
                  date={watch(`programSteps.${index}.deadline`)}
                  onSelect={(date) => setValue(`programSteps.${index}.deadline`, date)}
                  placeholder="Select deadline"
                />
                {errors.programSteps?.[index]?.deadline && (
                  <p className="text-sm text-red-500 mt-1">{errors.programSteps[index].deadline.message}</p>
                )}
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Budget (₱) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register(`programSteps.${index}.budget`, { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.programSteps?.[index]?.budget && (
                  <p className="text-sm text-red-500 mt-1">{errors.programSteps[index].budget.message}</p>
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
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Program Step
        </Button>

        <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary/20">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-lg">Total Budget:</span>
            <span className="text-2xl font-bold">₱{totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section5Signatories({ register, errors, watch, setValue }: any) {
  return (
    <div className="space-y-6 px-1">
      <div>
        <h3 className="text-lg font-semibold mb-1">Section 5: Signatories</h3>
        <p className="text-sm text-muted-foreground">Approval chain and signatory information</p>
      </div>

      <div className="space-y-6">
        {/* Prepared By */}
        <div className="space-y-3 pb-4 border-b">
          <h4 className="font-medium">Prepared By</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Name</Label>
              <Input {...register('preparedBy')} placeholder="Name" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position</Label>
              <Input {...register('preparedByPosition')} placeholder="Position" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
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
        <div className="space-y-3 pb-4 border-b">
          <h4 className="font-medium">Endorsed By</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Name</Label>
              <Input {...register('endorsedBy')} placeholder="Name" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position</Label>
              <Input {...register('endorsedByPosition')} placeholder="Position" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
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
        <div className="space-y-3 pb-4 border-b">
          <h4 className="font-medium">Recommended By</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Name</Label>
              <Input {...register('recommendedBy')} placeholder="Name" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position</Label>
              <Input {...register('recommendedByPosition')} placeholder="Position" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
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
          <h4 className="font-medium">Approved By</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Name</Label>
              <Input {...register('approvedBy')} placeholder="Name" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position</Label>
              <Input {...register('approvedByPosition')} placeholder="Position" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
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
    <div className="space-y-6 px-1">
      <div>
        <h3 className="text-lg font-semibold mb-1">Section 6: Attachments / Supporting Documents</h3>
        <p className="text-sm text-muted-foreground">Upload supporting files and documentation</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasGuidelines"
              checked={watch('hasGuidelines')}
              onCheckedChange={(checked) => setValue('hasGuidelines', checked)}
            />
            <Label htmlFor="hasGuidelines" className="cursor-pointer">
              Guidelines, Systems, and Procedures
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasComputationValue"
              checked={watch('hasComputationValue')}
              onCheckedChange={(checked) => setValue('hasComputationValue', checked)}
            />
            <Label htmlFor="hasComputationValue" className="cursor-pointer">
              Computation of Value (Revenue minus cost)
            </Label>
          </div>
        </div>

        <div>
          <Label htmlFor="otherAttachments">Others (Please specify)</Label>
          <Input
            id="otherAttachments"
            {...register('otherAttachments')}
            placeholder="Specify other attachments"
            className="mt-1.5"
          />
        </div>

        <Separator />

        <div>
          <Label>Upload Files (Optional)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF (Max 10MB)
          </p>
          <Input
            type="file"
            onChange={onFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            className="cursor-pointer mt-1.5"
          />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Files</Label>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file.fileName}</span>
                    <Badge variant="secondary">{(file.fileSize / 1024).toFixed(2)} KB</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFile(index)}
                  >
                    <Trash2 className="h-4 w-4" />
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
    <div className="space-y-6 px-1">
      <div>
        <h3 className="text-lg font-semibold mb-1">Section 7: CC / Remarks</h3>
        <p className="text-sm text-muted-foreground">Additional recipients and notes</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="ccRecipients">CC / Recipients</Label>
          <Textarea
            id="ccRecipients"
            {...register('ccRecipients')}
            placeholder="Additional recipients or departments"
            rows={2}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="remarks">Remarks / Notes</Label>
          <Textarea
            id="remarks"
            {...register('remarks')}
            placeholder="Optional comments"
            rows={3}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  )
}
