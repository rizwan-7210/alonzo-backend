import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to handle both JSON and form data (application/x-www-form-urlencoded)
 * This ensures form data is properly parsed and available to the DTO
 */
export const FormBody = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.body;
    },
);

