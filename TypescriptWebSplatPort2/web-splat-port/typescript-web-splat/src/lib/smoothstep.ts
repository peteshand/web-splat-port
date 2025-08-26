export function smoothstep(x: number): number {
  return x * x * (3.0 - 2.0 * x);
}
