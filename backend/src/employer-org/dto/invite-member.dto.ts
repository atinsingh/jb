import { IsEmail, IsEnum, IsString } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsEnum(['admin', 'recruiter', 'hiring_manager', 'interviewer'])
  role: string;
}
