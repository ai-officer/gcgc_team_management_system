import { Prisma, PrismaClient } from '@prisma/client'

type Tx = Prisma.TransactionClient | PrismaClient

export type TaskFieldValueInput = { fieldId: string; value: string | null | undefined }

// Upsert a task's custom field values. An empty/null value clears that field.
export async function setTaskFieldValues(
  tx: Tx,
  taskId: string,
  values: TaskFieldValueInput[] | null | undefined
): Promise<void> {
  if (!values || values.length === 0) return
  for (const v of values) {
    if (!v.fieldId) continue
    const val = v.value
    if (val === '' || val == null) {
      await tx.taskFieldValue.deleteMany({ where: { taskId, fieldId: v.fieldId } })
    } else {
      await tx.taskFieldValue.upsert({
        where: { taskId_fieldId: { taskId, fieldId: v.fieldId } },
        create: { taskId, fieldId: v.fieldId, value: String(val) },
        update: { value: String(val) },
      })
    }
  }
}
