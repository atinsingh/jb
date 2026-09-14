import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export type SelfSelectableRole = 'ROLE_CANDIDATE' | 'ROLE_EMPLOYER';

export class SwitchWorkspaceDto {
  @ApiProperty({ enum: ['ROLE_CANDIDATE', 'ROLE_EMPLOYER'] })
  @IsIn(['ROLE_CANDIDATE', 'ROLE_EMPLOYER'])
  role: SelfSelectableRole;
}
