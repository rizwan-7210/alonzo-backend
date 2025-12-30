import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ObjectIdUtils } from '../utils/object-id.utils';

export interface Response<T> {
    success: boolean;
    message: string | null;
    data: T;
    timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        const now = new Date();

        return next.handle().pipe(
            map(data => {
                // Convert ObjectIds to strings in the response data
                const processedData = ObjectIdUtils.convertObjectIdsToStrings(data);

                // Handle null/undefined responses
                if (processedData === null || processedData === undefined) {
                    return {
                        success: true,
                        message: null,
                        data: null,
                        timestamp: now.toISOString(),
                    };
                }

                // Check if the response has a nested structure with message and data
                // This is the standard pattern: { message: "...", data: {...} }
                if (typeof processedData === 'object' && 'message' in processedData && 'data' in processedData) {
                    return {
                        success: true,
                        message: processedData.message || null,
                        data: processedData.data,
                        timestamp: now.toISOString(),
                    };
                }

                // If response has message but no data key, extract message and set data to null
                // When message is present, data should be null (unless there's an explicit data key)
                if (typeof processedData === 'object' && 'message' in processedData) {
                    const { message, ...rest } = processedData as any;
                    // If there are other properties besides message, check if they should be in data
                    // For now, if message exists, data is null (as per user requirement)
                    return {
                        success: true,
                        message: message || null,
                        data: null,
                        timestamp: now.toISOString(),
                    };
                }

                // Default behavior: use the entire response as data, message is null
                return {
                    success: true,
                    message: null,
                    data: processedData,
                    timestamp: now.toISOString(),
                };
            }),
        );
    }
}