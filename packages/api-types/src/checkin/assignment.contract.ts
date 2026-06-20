import { z } from 'zod';

export const StaffAssignmentSchema = z
  .object({
    assignmentId: z.string().uuid(),
    concertId: z.string().uuid(),
    concertTitle: z.string().min(1),
    gate: z.string().trim().min(1).optional(),
    startsAt: z.string().datetime({ offset: true }).optional(),
    status: z.literal('ACTIVE'),
  })
  .strict();
export type StaffAssignment = z.infer<typeof StaffAssignmentSchema>;

export const StaffAssignmentsResponseSchema = z.array(StaffAssignmentSchema);
export type StaffAssignmentsResponse = z.infer<typeof StaffAssignmentsResponseSchema>;
