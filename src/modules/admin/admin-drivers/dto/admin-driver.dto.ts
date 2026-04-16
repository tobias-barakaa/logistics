import { IsString, IsNotEmpty, MinLength, IsOptional, IsEnum } from 'class-validator';
import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';

export class RejectDriverDto {
  @IsString()
  @IsNotEmpty({ message: 'A rejection reason is required' })
  @MinLength(10, { message: 'Please provide a meaningful reason (min 10 characters)' })
  reason: string;
}

export class ListDriversQueryDto {
  @IsOptional()
  @IsEnum(DriverApprovalStatus)
  approvalStatus?: DriverApprovalStatus;
}