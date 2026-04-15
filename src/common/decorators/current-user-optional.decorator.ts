import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "src/database/entities/user.entity";

export const CurrentUserOptional = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): User | undefined => {
      const request = ctx.switchToHttp().getRequest<{ user?: User }>();
      return request.user; // Returns undefined if not present, not null
    },
);