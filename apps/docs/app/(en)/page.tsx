import { JsonLd } from "../_components/JsonLd";
import { LandingPage } from "../_components/LandingPage";
import { en } from "../messages/en";

export default function Page() {
  return (
    <>
      <JsonLd locale="en" />
      <LandingPage messages={en} locale="en" />
    </>
  );
}
