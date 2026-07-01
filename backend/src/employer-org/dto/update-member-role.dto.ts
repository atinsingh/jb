import { IsEnum, IsString } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsString()
  @IsEnum(['admin', 'recruiter', 'hiring_manager', 'interviewer'])
  role: string;
}
