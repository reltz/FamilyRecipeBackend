import { ENABLE_LOGS } from "./consts";

// Function to encode lastEvaluatedKey into a base64 string
export function encodeCursor(lastEvaluatedKey: Record<string, any>): string {
    return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
}


export function decodeCursor(cursor: string): Record<string, any> | null {
    if (!cursor) return null;
    try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch (e) {
        console.error("Error decoding cursor:", e);
        return null;
    }
}


export function Log(message: string, level?: 'log' | 'info' | 'error'): void {
    const logLevet = level ?? "log";
    if(ENABLE_LOGS) {
        switch(logLevet){
            case 'log':
                console.log(message);
            case 'info': 
                console.info(message);
            case 'error': 
                console.error(message);
        }
    }
}