import { JsonLd } from "../_components/JsonLd";
import { LandingPage } from "../_components/LandingPage";
import { de } from "../messages/de";

export default function Page() {
  return (
    <>
      <JsonLd locale="de" />
      <LandingPage messages={de} locale="de" />
    </>
  );
}
