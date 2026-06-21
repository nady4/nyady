import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Contacto - NYADY",
  description: "Contactá a NYADY. Estamos para ayudarte."
};

export default function ContactoPage() {
  return (
    <InfoPage
      title="Contacto"
      description="¿Tenés alguna pregunta? ¡Estamos para ayudarte!"
    >
      <h2>Canales de Contacto</h2>

      <h3>Email</h3>
      <p>contacto@nyady.com</p>

      <h3>Redes Sociales</h3>
      <ul>
        <li>Instagram: @nyady</li>
        <li>Facebook: NYADY</li>
      </ul>

      <h2>Respondemos Rápido</h2>
      <p>
        Nos caracteriza nuestra velocidad de respuesta. En horario laboral,
        respondemos en menos de 24 horas.
      </p>

      <div className="highlight">
        <p>
          <strong>Antes de escribirnos:</strong> quizás tu duda ya esté
          resuelta en las{" "}
          <a href="/info/preguntas-frecuentes">preguntas frecuentes</a>. Si
          querés conocer quién está detrás de NYADY, visitá la página de{" "}
          <a href="/info/nady4">nady4</a>.
        </p>
      </div>
    </InfoPage>
  );
}
