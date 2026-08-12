import { IsIn } from 'class-validator';

export class DecideProposedActionDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';
}
