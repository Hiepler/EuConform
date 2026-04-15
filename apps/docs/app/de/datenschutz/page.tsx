import type { Metadata } from "next";
import { LegalPage, LegalSection } from "../../_components/LegalPage";
import { siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzerklärung für euconform.eu und die EuConform-Informationsseite.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      locale="de"
      title="Datenschutzerklärung"
      intro="Die folgenden Hinweise geben Ihnen einen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen, und welche Rechte Ihnen zustehen."
      type="privacy"
    >
      <LegalSection title="1. Datenschutz auf einen Blick">
        <h3 className="font-semibold text-slate-900">Allgemeine Hinweise</h3>
        <p>
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
          personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten
          sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche
          Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten
          Datenschutzerklärung.
        </p>
        <h3 className="font-semibold text-slate-900">Datenerfassung auf dieser Website</h3>
        <p>
          <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong>
          <br />
          Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen
          Kontaktdaten können Sie dem Abschnitt &bdquo;Hinweis zur Verantwortlichen Stelle&ldquo; in
          dieser Datenschutzerklärung entnehmen.
        </p>
        <p>
          <strong>Wie erfassen wir Ihre Daten?</strong>
          <br />
          Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es
          sich z.&nbsp;B. um Daten handeln, die Sie in ein Kontaktformular eingeben.
        </p>
        <p>
          Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch
          unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z.&nbsp;B.
          Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser
          Daten erfolgt automatisch, sobald Sie diese Website betreten.
        </p>
        <p>
          <strong>Wofür nutzen wir Ihre Daten?</strong>
          <br />
          Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu
          gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.
          Sofern über die Website Verträge geschlossen oder angebahnt werden können, werden die
          übermittelten Daten auch für Vertragsangebote, Bestellungen oder sonstige Auftragsanfragen
          verarbeitet.
        </p>
        <p>
          <strong>Welche Rechte haben Sie bezüglich Ihrer Daten?</strong>
          <br />
          Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck
          Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die
          Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur
          Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit für die Zukunft
          widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die Einschränkung der
          Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein
          Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
        </p>
        <p>
          Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit an uns
          wenden.
        </p>
      </LegalSection>

      <LegalSection title="2. Hosting">
        <p>Wir hosten die Inhalte unserer Website bei folgendem Anbieter:</p>
        <h3 className="font-semibold text-slate-900">Hetzner</h3>
        <p>
          Anbieter ist die {siteConfig.legal.hostingProvider}, Industriestr. 25, 91710 Gunzenhausen
          (nachfolgend Hetzner).
        </p>
        <p>
          Details entnehmen Sie der Datenschutzerklärung von Hetzner:{" "}
          <a
            href="https://www.hetzner.com/de/legal/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            https://www.hetzner.com/de/legal/privacy-policy/
          </a>
          .
        </p>
        <p>
          Die Verwendung von Hetzner erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben
          ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung unserer Website.
          Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die Verarbeitung
          ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG, soweit
          die Einwilligung die Speicherung von Cookies oder den Zugriff auf Informationen im
          Endgerät des Nutzers (z.&nbsp;B. Device-Fingerprinting) im Sinne des TDDDG umfasst. Die
          Einwilligung ist jederzeit widerrufbar.
        </p>
      </LegalSection>

      <LegalSection title="3. Allgemeine Hinweise und Pflichtinformationen">
        <h3 className="font-semibold text-slate-900">Datenschutz</h3>
        <p>
          Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir
          behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen
          Datenschutzvorschriften sowie dieser Datenschutzerklärung.
        </p>
        <p>
          Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben.
          Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können.
          Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir sie
          nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.
        </p>
        <p>
          Wir weisen darauf hin, dass die Datenübertragung im Internet (z.&nbsp;B. bei der
          Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der
          Daten vor dem Zugriff durch Dritte ist nicht möglich.
        </p>

        <h3 className="font-semibold text-slate-900">Hinweis zur verantwortlichen Stelle</h3>
        <p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
        <p>
          {siteConfig.legal.controllerName}
          <br />
          {siteConfig.legal.street}
          <br />
          {siteConfig.legal.city}
        </p>
        <p>E-Mail: {siteConfig.legal.email}</p>
        <p>
          Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder
          gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen
          Daten (z.&nbsp;B. Namen, E-Mail-Adressen o.&nbsp;Ä.) entscheidet.
        </p>

        <h3 className="font-semibold text-slate-900">Speicherdauer</h3>
        <p>
          Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt
          wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die
          Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder
          eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir
          keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer personenbezogenen
          Daten haben (z.&nbsp;B. steuer- oder handelsrechtliche Aufbewahrungsfristen); im
          letztgenannten Fall erfolgt die Löschung nach Fortfall dieser Gründe.
        </p>

        <h3 className="font-semibold text-slate-900">
          Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung auf dieser Website
        </h3>
        <p>
          Sofern Sie in die Datenverarbeitung eingewilligt haben, verarbeiten wir Ihre
          personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9 Abs. 2
          lit. a DSGVO, sofern besondere Datenkategorien nach Art. 9 Abs. 1 DSGVO verarbeitet
          werden. Im Falle einer ausdrücklichen Einwilligung in die Übertragung personenbezogener
          Daten in Drittstaaten erfolgt die Datenverarbeitung außerdem auf Grundlage von Art. 49
          Abs. 1 lit. a DSGVO. Sofern Sie in die Speicherung von Cookies oder in den Zugriff auf
          Informationen in Ihr Endgerät (z.&nbsp;B. via Device-Fingerprinting) eingewilligt haben,
          erfolgt die Datenverarbeitung zusätzlich auf Grundlage von § 25 Abs. 1 TDDDG. Die
          Einwilligung ist jederzeit widerrufbar. Sind Ihre Daten zur Vertragserfüllung oder zur
          Durchführung vorvertraglicher Maßnahmen erforderlich, verarbeiten wir Ihre Daten auf
          Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Des Weiteren verarbeiten wir Ihre Daten, sofern
          diese zur Erfüllung einer rechtlichen Verpflichtung erforderlich sind auf Grundlage von
          Art. 6 Abs. 1 lit. c DSGVO. Die Datenverarbeitung kann ferner auf Grundlage unseres
          berechtigten Interesses nach Art. 6 Abs. 1 lit. f DSGVO erfolgen. Über die jeweils im
          Einzelfall einschlägigen Rechtsgrundlagen wird in den folgenden Absätzen dieser
          Datenschutzerklärung informiert.
        </p>

        <h3 className="font-semibold text-slate-900">Empfänger von personenbezogenen Daten</h3>
        <p>
          Im Rahmen unserer Geschäftstätigkeit arbeiten wir mit verschiedenen externen Stellen
          zusammen. Dabei ist teilweise auch eine Übermittlung von personenbezogenen Daten an diese
          externen Stellen erforderlich. Wir geben personenbezogene Daten nur dann an externe
          Stellen weiter, wenn dies im Rahmen einer Vertragserfüllung erforderlich ist, wenn wir
          gesetzlich hierzu verpflichtet sind (z.&nbsp;B. Weitergabe von Daten an Steuerbehörden),
          wenn wir ein berechtigtes Interesse nach Art. 6 Abs. 1 lit. f DSGVO an der Weitergabe
          haben oder wenn eine sonstige Rechtsgrundlage die Datenweitergabe erlaubt. Beim Einsatz
          von Auftragsverarbeitern geben wir personenbezogene Daten unserer Kunden nur auf Grundlage
          eines gültigen Vertrags über Auftragsverarbeitung weiter. Im Falle einer gemeinsamen
          Verarbeitung wird ein Vertrag über gemeinsame Verarbeitung geschlossen.
        </p>

        <h3 className="font-semibold text-slate-900">
          Widerruf Ihrer Einwilligung zur Datenverarbeitung
        </h3>
        <p>
          Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich.
          Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der
          bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
        </p>

        <h3 className="font-semibold text-slate-900">
          Widerspruchsrecht gegen die Datenerhebung in besonderen Fällen sowie gegen Direktwerbung
          (Art. 21 DSGVO)
        </h3>
        <p>
          WENN DIE DATENVERARBEITUNG AUF GRUNDLAGE VON ART. 6 ABS. 1 LIT. E ODER F DSGVO ERFOLGT,
          HABEN SIE JEDERZEIT DAS RECHT, AUS GRÜNDEN, DIE SICH AUS IHRER BESONDEREN SITUATION
          ERGEBEN, GEGEN DIE VERARBEITUNG IHRER PERSONENBEZOGENEN DATEN WIDERSPRUCH EINZULEGEN; DIES
          GILT AUCH FÜR EIN AUF DIESE BESTIMMUNGEN GESTÜTZTES PROFILING. DIE JEWEILIGE
          RECHTSGRUNDLAGE, AUF DENEN EINE VERARBEITUNG BERUHT, ENTNEHMEN SIE DIESER
          DATENSCHUTZERKLÄRUNG. WENN SIE WIDERSPRUCH EINLEGEN, WERDEN WIR IHRE BETROFFENEN
          PERSONENBEZOGENEN DATEN NICHT MEHR VERARBEITEN, ES SEI DENN, WIR KÖNNEN ZWINGENDE
          SCHUTZWÜRDIGE GRÜNDE FÜR DIE VERARBEITUNG NACHWEISEN, DIE IHRE INTERESSEN, RECHTE UND
          FREIHEITEN ÜBERWIEGEN ODER DIE VERARBEITUNG DIENT DER GELTENDMACHUNG, AUSÜBUNG ODER
          VERTEIDIGUNG VON RECHTSANSPRÜCHEN (WIDERSPRUCH NACH ART. 21 ABS. 1 DSGVO).
        </p>
        <p>
          WERDEN IHRE PERSONENBEZOGENEN DATEN VERARBEITET, UM DIREKTWERBUNG ZU BETREIBEN, SO HABEN
          SIE DAS RECHT, JEDERZEIT WIDERSPRUCH GEGEN DIE VERARBEITUNG SIE BETREFFENDER
          PERSONENBEZOGENER DATEN ZUM ZWECKE DERARTIGER WERBUNG EINZULEGEN; DIES GILT AUCH FÜR DAS
          PROFILING, SOWEIT ES MIT SOLCHER DIREKTWERBUNG IN VERBINDUNG STEHT. WENN SIE
          WIDERSPRECHEN, WERDEN IHRE PERSONENBEZOGENEN DATEN ANSCHLIESSEND NICHT MEHR ZUM ZWECKE DER
          DIREKTWERBUNG VERWENDET (WIDERSPRUCH NACH ART. 21 ABS. 2 DSGVO).
        </p>

        <h3 className="font-semibold text-slate-900">
          Beschwerderecht bei der zuständigen Aufsichtsbehörde
        </h3>
        <p>
          Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer
          Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres
          Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu. Das Beschwerderecht besteht
          unbeschadet anderweitiger verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.
        </p>

        <h3 className="font-semibold text-slate-900">Recht auf Datenübertragbarkeit</h3>
        <p>
          Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in Erfüllung
          eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in einem gängigen,
          maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die direkte Übertragung der
          Daten an einen anderen Verantwortlichen verlangen, erfolgt dies nur, soweit es technisch
          machbar ist.
        </p>

        <h3 className="font-semibold text-slate-900">Auskunft, Berichtigung und Löschung</h3>
        <p>
          Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf
          unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft
          und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder
          Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten
          können Sie sich jederzeit an uns wenden.
        </p>

        <h3 className="font-semibold text-slate-900">Recht auf Einschränkung der Verarbeitung</h3>
        <p>
          Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
          verlangen. Hierzu können Sie sich jederzeit an uns wenden. Das Recht auf Einschränkung der
          Verarbeitung besteht in folgenden Fällen:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Wenn Sie die Richtigkeit Ihrer bei uns gespeicherten personenbezogenen Daten bestreiten,
            benötigen wir in der Regel Zeit, um dies zu überprüfen. Für die Dauer der Prüfung haben
            Sie das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
            verlangen.
          </li>
          <li>
            Wenn die Verarbeitung Ihrer personenbezogenen Daten unrechtmäßig geschah/geschieht,
            können Sie statt der Löschung die Einschränkung der Datenverarbeitung verlangen.
          </li>
          <li>
            Wenn wir Ihre personenbezogenen Daten nicht mehr benötigen, Sie sie jedoch zur Ausübung,
            Verteidigung oder Geltendmachung von Rechtsansprüchen benötigen, haben Sie das Recht,
            statt der Löschung die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
            verlangen.
          </li>
          <li>
            Wenn Sie einen Widerspruch nach Art. 21 Abs. 1 DSGVO eingelegt haben, muss eine Abwägung
            zwischen Ihren und unseren Interessen vorgenommen werden. Solange noch nicht feststeht,
            wessen Interessen überwiegen, haben Sie das Recht, die Einschränkung der Verarbeitung
            Ihrer personenbezogenen Daten zu verlangen.
          </li>
        </ul>
        <p>
          Wenn Sie die Verarbeitung Ihrer personenbezogenen Daten eingeschränkt haben, dürfen diese
          Daten – von ihrer Speicherung abgesehen – nur mit Ihrer Einwilligung oder zur
          Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen oder zum Schutz der Rechte
          einer anderen natürlichen oder juristischen Person oder aus Gründen eines wichtigen
          öffentlichen Interesses der Europäischen Union oder eines Mitgliedstaats verarbeitet
          werden.
        </p>

        <h3 className="font-semibold text-slate-900">SSL- bzw. TLS-Verschlüsselung</h3>
        <p>
          Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher
          Inhalte, wie zum Beispiel Bestellungen oder Anfragen, die Sie an uns als Seitenbetreiber
          senden, eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie
          daran, dass die Adresszeile des Browsers von &bdquo;http://&ldquo; auf
          &bdquo;https://&ldquo; wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
        </p>
        <p>
          Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie an uns
          übermitteln, nicht von Dritten mitgelesen werden.
        </p>
      </LegalSection>

      <LegalSection title="4. Datenerfassung auf dieser Website">
        <h3 className="font-semibold text-slate-900">Anfrage per E-Mail, Telefon oder Telefax</h3>
        <p>
          Wenn Sie uns per E-Mail, Telefon oder Telefax kontaktieren, wird Ihre Anfrage inklusive
          aller daraus hervorgehenden personenbezogenen Daten (Name, Anfrage) zum Zwecke der
          Bearbeitung Ihres Anliegens bei uns gespeichert und verarbeitet. Diese Daten geben wir
          nicht ohne Ihre Einwilligung weiter.
        </p>
        <p>
          Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern
          Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung
          vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen Fällen beruht die
          Verarbeitung auf unserem berechtigten Interesse an der effektiven Bearbeitung der an uns
          gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO) oder auf Ihrer Einwilligung (Art. 6 Abs.
          1 lit. a DSGVO) sofern diese abgefragt wurde; die Einwilligung ist jederzeit widerrufbar.
        </p>
        <p>
          Die von Ihnen an uns per Kontaktanfragen übersandten Daten verbleiben bei uns, bis Sie uns
          zur Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für
          die Datenspeicherung entfällt (z.&nbsp;B. nach abgeschlossener Bearbeitung Ihres
          Anliegens). Zwingende gesetzliche Bestimmungen – insbesondere gesetzliche
          Aufbewahrungsfristen – bleiben unberührt.
        </p>
      </LegalSection>

      <LegalSection title="5. Ergänzende Hinweise zum Betrieb dieser Website">
        <h3 className="font-semibold text-slate-900">
          Keine Cookies, kein Analytics, kein Tracking
        </h3>
        <p>
          Diese Website setzt nach aktuellem Stand keine Marketing- oder Analyse-Cookies. Es werden
          keine Tracking-Skripte, keine Analytics-Dienste und keine externen Werbe- oder
          Profiling-Tools eingebunden.
        </p>
        <p>
          Ebenfalls werden nach aktuellem Stand keine clientseitigen Mechanismen wie localStorage,
          sessionStorage oder ähnliche Browser-Speicher für Marketing- oder Komfortzwecke
          eingesetzt.
        </p>

        <h3 className="font-semibold text-slate-900">Server-Logfiles</h3>
        <p>
          Beim Aufruf dieser Website verarbeitet der Hosting-Anbieter in der Regel technische
          Zugriffsdaten, etwa IP-Adresse, Datum und Uhrzeit der Anfrage, angefragte Ressource,
          User-Agent und Referrer.
        </p>
        <p>
          Die Verarbeitung erfolgt zur sicheren Bereitstellung der Website, zur Fehleranalyse und
          zur Abwehr von Missbrauch. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
        </p>

        <h3 className="font-semibold text-slate-900">Externe Links</h3>
        <p>
          Diese Website verlinkt unter anderem auf GitHub. Wenn Sie einem solchen Link folgen,
          verlassen Sie diese Website. Für die Verarbeitung personenbezogener Daten auf den
          verlinkten Seiten sind die jeweiligen Betreiber verantwortlich.
        </p>

        <h3 className="font-semibold text-slate-900">Schriftarten und technische Assets</h3>
        <p>
          Die auf dieser Seite verwendeten Schriftarten werden lokal ausgeliefert. Nach aktuellem
          Stand werden keine Schriftarten dynamisch von Google Fonts oder vergleichbaren externen
          CDN-Diensten nachgeladen.
        </p>
      </LegalSection>

      <p>
        Quelle:{" "}
        <a
          href="https://www.e-recht24.de"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          https://www.e-recht24.de
        </a>
      </p>
    </LegalPage>
  );
}
