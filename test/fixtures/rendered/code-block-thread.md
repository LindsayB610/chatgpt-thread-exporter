# TypeScript date formatter helper

Source: https://chatgpt.com/share/example
Exported: 2026-04-08T12:00:00.000Z

## User

Show me a tiny TypeScript helper that formats a date like 2026-04-08.


## Assistant

Here is a small helper.

```ts
export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
```
