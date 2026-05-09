import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import InfoPage from "@/components/InfoPage";
import styles from "@/styles/Nady4.module.scss";

export const metadata: Metadata = {
  title: "nady4 - NYADY",
  description:
    "Soy una desarrolladora web autodidacta buscando hacer algo real y artesanal en tiempos de IA."
};

export default function Nady4Page() {
  return (
    <InfoPage title="Nadya Jerochim" description="Full Stack Developer">
      <div className={`${styles.intro} ${styles.highlight}`}>
        <p>
          Soy una desarrolladora web autodidacta buscando hacer algo real y artesanal en tiempos de IA.
        </p>
        <p>
          Me propuse diseñar y vibecodear este e-commerce con Next.js,
          PostgreSQL y Prisma, para que los
          calzados artesanales que fabrico con mi familia se vendan online.
        </p>
        <p>
          Integré la API de Mercado Pago para procesar todos los medios de pago
          de forma segura y Zipnova para automatizar cotizaciones y seguimiento
          de envíos en tiempo real.
        </p>
        <p>Espero que encuentres algo que te guste.</p>

        <p>
          Si tenés alguna duda, me podés <a href="/info/contacto">contactar</a>{" "}
          o consultar las{" "}
          <a href="/info/preguntas-frecuentes">preguntas frecuentes</a>.
        </p>
        <div className={styles.socials}>
          <Link href="https://github.com/nady4" target="_blank">
            <Image
              src="/assets/icons/github.svg"
              alt="Github"
              width={24}
              height={24}
            />
            <span>Github</span>
          </Link>
          <Link href="https://www.linkedin.com/in/nady4" target="_blank">
            <Image
              src="/assets/icons/linkedin.svg"
              alt="LinkedIn"
              width={24}
              height={24}
            />
            <span>LinkedIn</span>
          </Link>
          <Link href="https://nady4.com" target="_blank">
            <Image
              src="/assets/icons/portfolio.svg"
              alt="Portfolio"
              width={24}
              height={24}
            />
            <span>Portfolio</span>
          </Link>
<Link href="mailto:dev@nady4.com" target="_blank">
              <Image
                src="/assets/icons/mail.svg"
                alt="Email"
                width={24}
                height={24}
              />
              <span>dev@nady4.com</span>
            </Link>
        </div>
      </div>

      <section className={styles.section}>
        <h2>Otros Proyectos</h2>
        <div className={styles.project}>
          <h3>💸 Calendar Money</h3>
          <p>
            Aplicación web full-stack de gestión de flujo de caja construida con
            TypeScript, Vite, Node.js, Express y MongoDB. Maneja autorización y
            autenticación vía JWT y provee análisis financiero detallado con
            gráficos.
          </p>
          <div className={styles.links}>
            <Link href="https://calendar-money.vercel.app" target="_blank">
              Demo
            </Link>
            <Link
              href="https://github.com/nady4/calendar-money"
              target="_blank"
            >
              Repo Front
            </Link>
            <Link
              href="https://github.com/nady4/calendar-money-api"
              target="_blank"
            >
              Repo Back
            </Link>
          </div>
        </div>

        <div className={styles.project}>
          <h3>👁️ DNS Monitor</h3>
          <p>
            Sistema serverless de monitoreo DNS usando Cloudflare Workers que
            verifica registros DNS internos y estado de nameservers cada 10
            minutos, enviando alertas por email cuando hay cambios. También usa
            KV Storage para mantener snapshots históricos.
          </p>
          <div className={styles.links}>
            <Link href="https://github.com/nady4/dns-monitor" target="_blank">
              Repo
            </Link>
          </div>
        </div>

        <div className={styles.project}>
          <h3>🔗 DS Invite</h3>
          <p>
            Proyecto de Cloudflare Workers manejando OAuth de Discord,
            creación/validación de cookies de sesión y flujos de solicitud de
            roles/invitaciones. Sirve un frontend liviano y provee endpoints de
            API protegidos con controladores modulares.
          </p>
          <div className={styles.links}>
            <Link href="https://ds-invite.pages.dev" target="_blank">
              Demo
            </Link>
            <Link href="https://github.com/nady4/ds-invite" target="_blank">
              Repo
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Experiencia</h2>

        <div className={styles.job}>
          <div className={styles.jobHeader}>
            <h3>Desarrolladora Full Stack</h3>
            <span className={styles.company}>Transistemas</span>
            <span className={styles.period}>(Dic 2024 - Actual)</span>
          </div>
          <ul>
            <li>
              Diseño y desarrollo de proyectos escalables para clientes y ONGs,
              implementando REST APIs, esquemas de base de datos e interfaces
              frontend responsivas.
            </li>
            <li>
              Diseño e implementación de la aplicación full-stack de gestión de
              cursos y estudiantes de la organización.
            </li>
            <li>
              Mantenimiento e implementación de nuevos requisitos para el sitio
              web institucional.
            </li>
            <li>
              Migración de bundler a Vite, hosting a Vercel y proveedor DNS a
              Cloudflare.
            </li>
            <li>
              Desarrollo de Cloudflare Workers para monitorear configuraciones
              DNS y nameservers.
            </li>
            <li>
              Implementación de enrutamiento de emails personalizado usando SMTP
              y POP3.
            </li>
            <li>
              Automatización de deployments, configuración de firewall y
              observabilidad.
            </li>
            <li>
              Documentación de proyectos incluyendo arquitectura interna,
              configuraciones DNS, deployments y políticas de seguridad.
            </li>
          </ul>
        </div>

        <div className={styles.job}>
          <div className={styles.jobHeader}>
            <h3>Coordinadora de Desarrollo</h3>
            <span className={styles.company}>Transistemas</span>
            <span className={styles.period}>(Jul 2025 - Actual)</span>
          </div>
          <ul>
            <li>
              Gestión de proyectos y coordinación de equipos, implementando
              marcos ágiles y seguimiento de tareas a través de GitHub y Notion.
            </li>
            <li>
              Adquisición de clientes y alianzas con ONGs para proyectos de
              desarrollo que incluyen Generación de leads, negociación, análisis
              funcional, capacitación de stakeholders y soporte a largo plazo.
            </li>
            <li>
              Adquisición de talento para el equipo de desarrollo, incluyendo
              entrevistas técnicas, selección de candidatos y onboarding
              estructurado.
            </li>
            <li>
              Coordinación entre equipos de Desarrollo, Diseño, Educación y
              Comunicaciones para evaluar necesidades organizacionales y
              proponer soluciones de software.
            </li>
            <li>
              Liderazgo de iniciativas de ciberseguridad y modernización de la
              infraestructura digital de la organización.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Educación</h2>

        <div className={styles.education}>
          <h3>Licenciatura en Sistemas</h3>
          <span className={styles.company}>Universidad Nacional de Lanús</span>
          <span className={styles.period}> (2019 - 2025)</span>
        </div>

        <div className={styles.education}>
          <h3>Bachiller en Economía y Administración</h3>
          <span className={styles.company}>Colegio Jesús María</span>
          <span className={styles.period}> (2011 - 2017)</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Habilidades</h2>

        <div className={styles.skillGroup}>
          <h3>Idiomas</h3>
          <div className={styles.tags}>
            <span>Inglés (C2)</span>
            <span>Español (Nativo)</span>
          </div>
          <h3>Lenguajes</h3>
          <div className={styles.tags}>
            <span>TypeScript</span>
            <span>JavaScript</span>
            <span>Python</span>
            <span>Java</span>
            <span>SQL</span>
            <span>HTML5</span>
            <span>CSS3</span>
            <span>SASS/SCSS</span>
          </div>
        </div>

        <div className={styles.skillGroup}>
          <h3>Frontend</h3>
          <div className={styles.tags}>
            <span>React</span>
            <span>Next.js</span>
            <span>Astro</span>
            <span>Vite</span>
            <span>Redux Toolkit</span>
            <span>Tanstack Query</span>
            <span>Zustand</span>
            <span>Tailwind CSS</span>
          </div>
        </div>

        <div className={styles.skillGroup}>
          <h3>Backend</h3>
          <div className={styles.tags}>
            <span>Node.js</span>
            <span>Express</span>
            <span>REST API Design</span>
            <span>Prisma ORM</span>
            <span>Cloudflare Workers</span>
            <span>Serverless</span>
            <span>JWT Auth</span>
            <span>OAuth2</span>
          </div>
        </div>

        <div className={styles.skillGroup}>
          <h3>Bases de Datos</h3>
          <div className={styles.tags}>
            <span>PostgreSQL</span>
            <span>MySQL</span>
            <span>MongoDB</span>
            <span>Redis</span>
            <span>Supabase</span>
            <span>NoSQL</span>
          </div>
        </div>

        <div className={styles.skillGroup}>
          <h3>DevOps & Cloud</h3>
          <div className={styles.tags}>
            <span>Docker</span>
            <span>GitHub Actions</span>
            <span>CI/CD</span>
            <span>Cloudflare</span>
            <span>Firewall</span>
            <span>DNS</span>
            <span>Email Routing</span>
          </div>
        </div>

        <div className={styles.skillGroup}>
          <h3>Testing</h3>
          <div className={styles.tags}>
            <span>Jest</span>
            <span>Cypress</span>
            <span>Vitest</span>
            <span>Playwright</span>
          </div>
        </div>

        <div className={styles.skillGroup}>
          <h3>Herramientas</h3>
          <div className={styles.tags}>
            <span>Git</span>
            <span>Figma</span>
            <span>Notion</span>
            <span>Scrum</span>
            <span>Agile</span>
            <span>AI</span>
            <span>LLM API Integration</span>
            <span>AI Agents</span>
            <span>MCP Servers</span>
            <span>RAG</span>
            <span>n8n</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Certificaciones</h2>

        <div className={styles.certs}>
          <span>
            <span className={styles.certsName}>Full Stack Developer</span>
            <span className={styles.certsOrg}>ZTM Academy</span>
          </span>
          <span>
            <span className={styles.certsName}>Testing QA</span>
            <span className={styles.certsOrg}>Instituto Web</span>
          </span>
          <span>
            <span className={styles.certsName}>UX Design</span>
            <span className={styles.certsOrg}>Platzi</span>
          </span>
          <span>
            <span className={styles.certsName}>
              Scrum Foundation Professional
            </span>
            <span className={styles.certsOrg}>Certiprof</span>
          </span>
          <span>
            <span className={styles.certsName}>Inglés C2 Proficiency</span>
            <span className={styles.certsOrg}>EF Education First</span>
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Contacto</h2>

        <div className={styles.location}>
          <span>Nadya Jerochim</span>
          <span>Buenos Aires, Argentina</span>
        </div>

        <div className={styles.socials}>
          <Link href="https://github.com/nady4" target="_blank">
            <Image
              src="/assets/icons/github.svg"
              alt="Github"
              width={24}
              height={24}
            />
            <span>Github</span>
          </Link>
          <Link href="https://www.linkedin.com/in/nady4" target="_blank">
            <Image
              src="/assets/icons/linkedin.svg"
              alt="LinkedIn"
              width={24}
              height={24}
            />
            <span>LinkedIn</span>
          </Link>
          <Link href="https://nady4.com" target="_blank">
            <Image
              src="/assets/icons/portfolio.svg"
              alt="Portfolio"
              width={24}
              height={24}
            />
            <span>Portfolio</span>
          </Link>
<Link href="mailto:dev@nady4.com" target="_blank">
              <Image
                src="/assets/icons/mail.svg"
                alt="Email"
                width={24}
                height={24}
              />
              <span>dev@nady4.com</span>
            </Link>
        </div>
      </section>
    </InfoPage>
  );
}
