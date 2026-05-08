import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import InfoPage from "@/components/InfoPage";
import styles from "@/styles/Nady4.module.scss";

export const metadata: Metadata = {
  title: "Nady4 - NYADY",
  description: "Portfolio de Nadya Jerochim - Full Stack Developer",
};

export default function Nady4Page() {
  return (
    <InfoPage
      title="Nadya Jerochim"
      description="Full Stack Developer"
    >
      <div className={styles.intro}>
        <p>
          Experienced in building web apps and serverless services with React, Node.js, TypeScript and Next.js, working across SQL and NoSQL databases, clean architecture, documentation and agile collaboration.
        </p>
      </div>

      <section className={styles.section}>
        <h2>Experience</h2>
        
        <div className={styles.job}>
          <div className={styles.jobHeader}>
            <h3>Developer</h3>
            <span className={styles.company}>Transistemas</span>
            <span className={styles.period}>Dec 2024 - Present</span>
          </div>
          <ul>
            <li>Design and development of scalable projects for clients and NGO partners, implementing REST APIs, database schemas, and responsive frontend interfaces.</li>
            <li>Design and implementation of the organization's full-stack course and student management app.</li>
            <li>Maintenance and implementation of new requirements for the institutional website.</li>
            <li>Migration from bundler to Vite, hosting to Vercel, and DNS provider to Cloudflare.</li>
            <li>Development of Cloudflare Workers for monitoring DNS and nameserver configurations.</li>
            <li>Implementation of custom email routing using SMTP and POP3.</li>
            <li>Deployment automation, firewall configuration, and observability.</li>
            <li>Project documentation covering internal architecture, DNS configurations, deployments, and security policies.</li>
          </ul>
        </div>

        <div className={styles.job}>
          <div className={styles.jobHeader}>
            <h3>Development Team Coordinator</h3>
            <span className={styles.company}>Transistemas</span>
            <span className={styles.period}>July 2025 - Present</span>
          </div>
          <ul>
            <li>Project management and team coordination, implementing Agile frameworks and task tracking through GitHub and Notion.</li>
            <li>Client Acquisition and NGO Partnerships for development projects involving lead generation, deal negotiation, functional analysis, stakeholders training and long-term support.</li>
            <li>Talent Acquisition for the Development Team, including technical interviewing, candidate selection, and structured onboarding.</li>
            <li>Cross-team coordination between Development, Design, Education, and Communications to assess organizational needs and propose potential software solutions.</li>
            <li>Leadership of cybersecurity initiatives and modernization of the organization's digital infrastructure.</li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Education</h2>
        
        <div className={styles.education}>
          <h3>Software Engineering</h3>
          <span className={styles.company}>Universidad Nacional de Lanús</span>
          <span className={styles.period}>2019 - 2025</span>
        </div>

        <div className={styles.education}>
          <h3>H.S. Diploma, Economics & Administration</h3>
          <span className={styles.company}>Colegio Jesús María</span>
          <span className={styles.period}>2011 - 2017</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Projects</h2>
        
        <div className={styles.project}>
          <h3>🐱 Nya Store</h3>
          <p>Full Stack e-commerce platform using Next.js 15 (App Router), TypeScript, Prisma ORM, PostgreSQL, Redux Toolkit, and a complete Mercado Pago payment integration (checkout + redirect flows + webhooks). It handles authentication with NextAuth.js + JWT sessions.</p>
          <div className={styles.links}>
            <Link href="https://nya-store.vercel.app" target="_blank">Demo</Link>
            <Link href="https://github.com/nady4/nya-store" target="_blank">Repo</Link>
          </div>
        </div>

        <div className={styles.project}>
          <h3>💸 Calendar Money</h3>
          <p>Full-stack cash-flow management web application built using TypeScript, Vite, Node.js, Express and MongoDB. Handles authorization and authentication via JWT and provides detailed financial analytics with charts.</p>
          <div className={styles.links}>
            <Link href="https://calendar-money.vercel.app" target="_blank">Demo</Link>
            <Link href="https://github.com/nady4/calendar-money" target="_blank">Repo Front</Link>
            <Link href="https://github.com/nady4/calendar-money-api" target="_blank">Repo Back</Link>
          </div>
        </div>

        <div className={styles.project}>
          <h3>👁️ DNS Monitor</h3>
          <p>Serverless DNS-monitoring system using Cloudflare Workers that checks internal DNS records and nameserver status every 10 minutes, sending email alerts when changes occur. It also uses KV Storage to keep historical snapshots for accurate diff tracking.</p>
          <div className={styles.links}>
            <Link href="https://github.com/nady4/dns-monitor" target="_blank">Repo</Link>
          </div>
        </div>

        <div className={styles.project}>
          <h3>🔗 DS Invite</h3>
          <p>Cloudflare Workers project handling Discord OAuth login, session cookie creation/validation, and role/invite request flows. Serves a lightweight frontend and provides protected API endpoints with modular controllers and utilities for encryption and cookie handling.</p>
          <div className={styles.links}>
            <Link href="https://ds-invite.pages.dev" target="_blank">Demo</Link>
            <Link href="https://github.com/nady4/ds-invite" target="_blank">Repo</Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Skills</h2>
        
        <div className={styles.skillGroup}>
          <h3>Languages</h3>
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
          <h3>Databases</h3>
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
          <h3>Tools</h3>
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

        <div className={styles.skillGroup}>
          <h3>Spoken Languages</h3>
          <div className={styles.tags}>
            <span>English (C2)</span>
            <span>Spanish (Native)</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Certifications</h2>
        
        <div className={styles.certs}>
          <span>Full Stack Developer - ZTM Academy</span>
          <span>Testing QA - Instituto Web</span>
          <span>UX Design - Platzi</span>
          <span>Scrum Foundation Professional - Certiprof</span>
          <span>English C2 Proficiency - EF Education First</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Contact</h2>
        
        <p>
          Send me an email at <a href="mailto:dev@nady4.com">dev@nady4.com</a>
        </p>

        <div className={styles.location}>
          <span>Nadya Jerochim</span>
          <span>Buenos Aires, Argentina</span>
        </div>

        <div className={styles.socials}>
          <Link href="https://github.com/nady4" target="_blank">
            <Image src="/assets/icons/github.svg" alt="Github" width={24} height={24} />
            <span>Github</span>
          </Link>
          <Link href="https://www.linkedin.com/in/nady4" target="_blank">
            <Image src="/assets/icons/linkedin.svg" alt="LinkedIn" width={24} height={24} />
            <span>LinkedIn</span>
          </Link>
          <Link href="https://x.com/_nady4" target="_blank">
            <Image src="/assets/D952lAsz-x.svg" alt="X" width={24} height={24} />
            <span>X</span>
          </Link>
          <Link href="https://www.instagram.com/nady4_dev" target="_blank">
            <Image src="/assets/icons/instagram.svg" alt="Instagram" width={24} height={24} />
            <span>Instagram</span>
          </Link>
        </div>
      </section>
    </InfoPage>
  );
}