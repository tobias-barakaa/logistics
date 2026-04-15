import { DriverApprovalStatus } from "src/common/enums/driver-approval.enum";
import { DriverStatus } from "src/database/entities/driver.entity";
import { User } from "src/database/entities/user.entity";
import { Vehicle } from "src/database/entities/vehicle.entity";


export class DriverResponseDto {
  id: string;
  user: User;
  licenseNumber: string;
  vehicle?: Vehicle;
  status: DriverStatus;
  approvalStatus: DriverApprovalStatus;
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}