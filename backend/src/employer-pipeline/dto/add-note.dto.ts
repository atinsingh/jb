import { IsString } from 'class-validator';

export class AddNoteDto {
  @IsString()
  text: string;
}
