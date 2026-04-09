# TypeScript date formatter helper

Source: https://chatgpt.com/share/example
Exported: Apr 8, 2026

## You

Show me a tiny TypeScript helper that formats a date like 2026-04-08.


## ChatGPT

Here is a small helper.

```ts
export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
```
