export default function badDefault() {
  return 'oops'
}

export function unsafeAny(x: any): void {
  try {
    console.log(x)
  } catch (e) {
  }
}
