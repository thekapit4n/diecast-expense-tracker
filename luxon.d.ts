// Type declarations for luxon
// Luxon v3.7.2 doesn't include TypeScript definitions in the package
// This declaration file allows TypeScript to recognize the luxon module during Vercel builds
declare module 'luxon' {
  export interface DateTimeOptions {
    zone?: string
  }
  
  export interface ToRelativeOptions {
    base?: DateTime
  }
  
  export class DateTime {
    static now(): DateTime
    static fromJSDate(date: Date, options?: DateTimeOptions): DateTime
    static fromISO(iso: string, options?: DateTimeOptions): DateTime
    setZone(zone: string): DateTime
    startOf(unit: string): DateTime
    toFormat(format: string): string
    toRelative(options?: ToRelativeOptions): string | null
    hasSame(other: DateTime, unit: string): boolean
    toJSDate(): Date
  }
  
  export const Settings: any
  export const Info: any
}
