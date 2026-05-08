import { Metadata } from "next";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Contacto - NYADY",
  description: "Contacta con NYADY.Estamos aquí para ayudarte.",
};

export default function ContactoPage() {
  return (
    <InfoPage
      title="Contacto"
      description="¿Tenés alguna pregunta? ¡Estamos aquí para ayudarte!"
    >
      <h2>Canales de Contacto</h2>
      
      <h3>Email</h3>
      <p>contacto@nyady.com</p>

      <h3>WhatsApp</h3>
      <p>+54 9 11 XXXX-XXXX</p>

      <h3>Redes Sociales</h3>
      <ul>
        <li>Instagram: @nyady</li>
        <li>Facebook: NYADY</li>
      </ul>

      <h2>Horarios de Atención</h2>
      <ul>
        <li>Lunes a Viernes: 9:00 - 18:00</li>
        <li>Sábados: 10:00 - 14:00</li>
        <li>Domingos: Cerrado</li>
      </ul>

      <h2>Respondemos Rápido</h2>
      <p>Nos caracterizan nuestra velocidad de respuesta. En horas laborales, respondemos en menos de 24 horas.</p>

      <div className="highlight">
        <p><strong>¿Preferís que te llamemos?</strong> Dejanos tu número y te contactamos.</p>
      </div>
    </InfoPage>
  );
}