// src/modules/admin/dto/update-tutorial.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateTutorialDto } from './create-tutorial.dto';

export class UpdateTutorialDto extends PartialType(CreateTutorialDto) { }