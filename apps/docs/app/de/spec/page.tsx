import { permanentRedirect } from "next/navigation";

// The EuConform Evidence Format specification is English-only; anyone landing
// on /de/spec is redirected to the canonical /spec URL.
export default function Page(): never {
  permanentRedirect("/spec");
}
