/**
 * Base formatter utility with common formatting functions
 */
export class BaseFormatter {
    /**
     * Convert Mongoose document to plain object
     */
    static toPlainObject(document: any): any {
        if (!document) return null;
        
        if (document.toObject) {
            return document.toObject({ virtuals: true, getters: true });
        }
        
        // If already a plain object, return as is
        if (typeof document === 'object' && document.constructor === Object) {
            return document;
        }
        
        // Fallback to JSON serialization
        try {
            return JSON.parse(JSON.stringify(document));
        } catch (e) {
            return document;
        }
    }

    /**
     * Convert ObjectId to string, handling various formats
     */
    static objectIdToString(obj: any): string | null {
        if (!obj) return null;
        
        if (typeof obj === 'string') {
            return obj;
        }
        
        if (typeof obj === 'object') {
            // Handle MongoDB ObjectId (has toString method)
            if (obj.toString && typeof obj.toString === 'function') {
                try {
                    return obj.toString();
                } catch (e) {
                    // If toString fails, try to handle buffer-like structure
                    const keys = Object.keys(obj);
                    if (keys.length > 0 && keys.every(key => !isNaN(Number(key)))) {
                        const hexString = Object.values(obj).join('');
                        return /^[0-9a-fA-F]{24}$/.test(hexString) ? hexString : String(obj);
                    }
                    return String(obj);
                }
            }
            
            // Handle ObjectId serialized as object with numeric keys (Buffer-like structure)
            const keys = Object.keys(obj);
            if (keys.length > 0 && keys.every(key => !isNaN(Number(key)))) {
                const hexString = Object.values(obj).join('');
                return /^[0-9a-fA-F]{24}$/.test(hexString) ? hexString : String(obj);
            }
            
            // If it's a populated object with _id
            if (obj._id) {
                return this.objectIdToString(obj._id);
            }
        }
        
        return String(obj);
    }

    /**
     * Convert date to ISO string
     */
    static dateToISO(date: any): string | null {
        if (!date) return null;
        
        try {
            return new Date(date).toISOString();
        } catch (e) {
            return null;
        }
    }

    /**
     * Convert date to formatted string (MM/DD/YYYY)
     */
    static dateToFormatted(date: any): string | null {
        if (!date) return null;
        
        try {
            return new Date(date).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Map _id to id in response object
     */
    static mapId(obj: any, response: any): void {
        if (obj._id) {
            response.id = this.objectIdToString(obj._id);
        }
    }

    /**
     * Map common properties from source to target
     */
    static mapProperties(source: any, target: any, properties: string[]): void {
        properties.forEach(prop => {
            if (source[prop] !== undefined) {
                target[prop] = source[prop];
            }
        });
    }

    /**
     * Convert ObjectId fields to strings
     */
    static convertObjectIds(obj: any, fields: string[]): void {
        fields.forEach(field => {
            if (obj[field] && typeof obj[field] === 'object') {
                obj[field] = this.objectIdToString(obj[field]);
            }
        });
    }

    /**
     * Convert date fields to ISO strings
     */
    static convertDates(obj: any, fields: string[]): void {
        fields.forEach(field => {
            if (obj[field]) {
                obj[field] = this.dateToISO(obj[field]);
            }
        });
    }
}

