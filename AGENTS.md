<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# agents.md

## 🧠 Purpose

This document defines how to recreate the NYA-STORE architecture in a new project called **NYADY**, preserving the same technical decisions, patterns, and flows while adapting naming, branding, and structure cleanly.

The goal is not to improvise. It is to **replicate architecture with intention**, avoiding drift.

---

## 🏗️ Project Identity

- Old name: `nya-store`
- New name: `nyady`

### Required replacements

- Repository name → `nyady`
- Database name → `nyady`
- Environment variables referencing `nya-store` → update to `nyady`
- Assets (icons, branding) → replace cat identity with NYADY brand

Do not leave legacy references. No mixed naming.

---

## ⚙️ Core Stack (must remain identical)

- Next.js 15 (App Router)
- React 18+
- TypeScript
- Prisma ORM
- PostgreSQL
- NextAuth.js (Credentials + JWT)
- Redux Toolkit
- Sass (SCSS)
- Mercado Pago SDK (`@mercadopago/sdk-react`)

No stack changes unless explicitly justified.

---

## 📁 Architecture Rules

### 1. App Router structure

Keep separation:

- `/app/(public)`
- `/app/(auth)`
- `/app/(protected)`
- `/app/api`

Do not collapse routes. Maintain logical grouping.

---

### 2. Server vs Client boundaries

- Server Actions for mutations
- API routes for external integrations (Mercado Pago, webhooks)
- Client components only when necessary (UI state, interactivity)

Avoid leaking business logic into client components.

---

### 3. State Management

Redux Toolkit is only for:

- UI state (filters, search, modals)
- Non-persistent ephemeral state

Do NOT store:

- Auth state
- Cart (persisted in DB)
- Orders

---

## 🗄️ Database Layer (Prisma)

Schema must be **identical in structure**, only adjust naming if needed.

Models:

- User
- Address
- Product
- WishList
- Cart
- Order
- OrderItem

### Rules

- Keep relations exactly the same
- Preserve unique constraints
- Do not denormalize
- Do not introduce premature abstractions

---

## 🔐 Authentication

- NextAuth.js with Credentials provider
- JWT sessions

### Requirements

- Password hashing (bcrypt)
- No OAuth unless explicitly added later
- Session must be stateless (JWT only)

---

## 🛍️ E-commerce Logic

### Cart

- Persistent per user in DB
- Unique constraint `(userId, productId)`
- Quantity controlled server-side

### Wishlist

- Same pattern as cart
- No duplication allowed

### Orders

Flow:

1. Create `Order` with `pending`
2. Create `OrderItem[]`
3. Generate Mercado Pago preference
4. Return `preferenceId`

Never skip order creation before payment.

---

## 💳 Mercado Pago Integration

### Required flow

1. Backend (`/api/orders`)
   - Create order
   - Create MP preference
   - Attach:
     - `back_urls`
     - `notification_url`
     - `external_reference`

2. Frontend
   - Initialize Wallet with `NEXT_PUBLIC_MP_PUBLIC_KEY`
   - Render checkout

3. Webhook (`/api/mp-webhook`)
   - Receive payment update
   - Match using `external_reference`
   - Update `Order.status`

### Rules

- Webhook is source of truth
- Redirects are not trusted for final state
- Always validate payment status

---

## 🌍 Environment Variables

Must exist:
NEXTAUTH_URL=http://localhost:3000

NEXTAUTH_SECRET=yourSecret
DATABASE_URL=postgresql://postgres:password@localhost:5432/nyady
MP_ACCESS_TOKEN=TEST-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-XXXXXXXXXXXXXXXX

### Constraints

- Never hardcode secrets
- Always use TEST credentials in dev
- Production must mirror names exactly

---

## 🎨 UI System

- Keep responsive design
- Maintain design system consistency

NYADY direction:

- More minimal and elegant
- Remove heavy pixel-art if not aligned with brand
- Keep component structure, not visual identity

Do not mix styling paradigms.

---

## 🚀 Setup Flow

1. Clone base structure (or copy project)
2. Rename all identifiers to `nyady`
3. Update `.env`
4. Run:
   npm install
   npx prisma migrate dev --name init
   npx prisma db seed
   npm run dev

---

## ⚠️ Non-Negotiables

- No business logic duplication
- No client-side trust for payments
- No schema breaking changes without migration strategy
- No inconsistent naming (`nya` must not remain anywhere)

---

## 🧩 Extension Points

Allowed improvements:

- Admin panel
- Product variants (sizes, colors)
- Inventory tracking improvements
- Better analytics

Not allowed:

- Rewriting core architecture
- Replacing Prisma or NextAuth without strong reason

---

## 🧠 Final Principle

This is not a redesign exercise.  
It is a **controlled replication with branding changes**.

If something changes, it must be intentional and justified, not accidental.

## 🔍 Legacy Exploration - Inspecting `nya-store`

To properly replicate the architecture, you must **actively explore the original `nya-store` codebase**, not guess how it works.

This section defines how to treat the old project as a **reference system**.

---

## 📂 Access Strategy

Work with the original project locally:
git clone https://github.com/nady4/nya-store.git
cd nya-store
code .

Do not browse it passively. You are expected to **trace flows end-to-end**.

---

## 🧭 What to Explore (in order)

### 1. `/app` (Core architecture)

Focus on:

- Route groups `(public)`, `(auth)`, `(protected)`
- Layout hierarchy
- Page structure

Goal:

- Understand navigation boundaries
- Identify where auth gates are enforced

---

### 2. `/app/api`

Critical for backend logic:

- `/api/orders`
- `/api/mp-webhook`
- Auth-related routes

Goal:

- Understand how server logic is separated
- Trace request → DB → response

---

### 3. `/lib` or `/services` (if present)

Look for:

- Prisma client setup
- Mercado Pago integration helpers
- Auth utilities

Goal:

- Identify reusable logic
- Avoid duplicating patterns incorrectly

---

### 4. `/prisma/schema.prisma`

This is the **source of truth**.

You must:

- Read all models
- Understand relations deeply
- Map how queries will behave

Do not modify blindly later.

---

### 5. `/store` (Redux)

Check:

- Slices
- What state is stored
- What is intentionally NOT stored

Goal:

- Avoid misusing Redux in NYADY

---

### 6. Components (`/components`)

Focus on:

- Separation of concerns
- Server vs Client components
- Reusability patterns

Ignore styling at first. Focus on structure.

---

## 🔄 Flow Tracing חובה

You must manually trace these flows:

### 🛒 Add to cart

UI → action → DB write → UI update

---

### 💳 Checkout

Cart → `/api/orders` → MP preference → frontend wallet

---

### 🔔 Webhook

MP → `/api/mp-webhook` → DB update → order status

---

### 🔐 Auth

Login → NextAuth → JWT → protected routes

---

## ⚠️ Common Mistakes (avoid these)

- Copying files without understanding flow
- Rewriting logic because it "looks messy"
- Mixing client/server responsibilities
- Breaking Prisma relations accidentally

---

## 🧠 Recommended Approach

For each feature:

1. Locate entry point (UI)
2. Trace to backend
3. Identify DB interaction
4. Re-implement in NYADY cleanly

If you can't explain the flow, you don't understand it yet.

---

## 🧩 Optional Tooling

Use tools to speed up exploration:

- Global search (`Ctrl + Shift + F`)
- TypeScript references ("Go to definition")
- Prisma Studio:

---

## 🧠 Final Rule

You are not copying a project.

You are **reverse-engineering a system and rebuilding it with control**.

---

## Cotización de Envíos

Esta es la documentación de Zipnova, la API de cotización de envíos a implementar en este proyecto.
En las Product Pages debe poderse cotizar el envío hacia la Address proporcionada por el usuario, de no estar cargada poner un botón CTA para cargarla para cotizar envíos.
En la Cart Page debe poder verse y editar la Address para poder cotizar el envío, y sumarlo al total.
Para poder Generar link de pago el usuario debe estar logeado, poner un botón CTA en Cart Page si no lo está que reemplace el de cargar Adsress.

# Cotizar Envíos

{% hint style="warning" %}
Los endpoints de cotización utilizan **rate limiting** :orange_circle:<mark style="color:orange;">**Medio**</mark>\
[Ver más sobre límites de requests](/envios/principios/limites-de-requests.md)
{% endhint %}

La cotización es el proceso mediante el cual se obtienen opciones para hacer un envío.

En Zipnova existen múltiples maneras de hacer un envío, combinando diferentes **formas de despacho** (`logistic_type`) y **formas de entrega** (`service_type`).

En los resultados de cotización verás todas las opciones disponibles en tu cuenta para hacer el envío, con los distintos transportes disponibles.

{% hint style="info" %}
Recomendamos completar el atributo `source` con algo que identifique a tu integración, para que luego los clientes puedan definir reglas personalizadas de cotización utilizando el [Motor de Reglas](https://ayuda.zippin.app/automatizaciones), utilizando el atributo source como criterio de filtrado.
{% endhint %}

## Cotizar envío

> Obtiene las opciones de envío disponibles con sus costos y tiempos estimados.\
> \
> \*\*items vs packages — debes usar uno u otro, nunca ambos:\*\*\
> \
> \- \*\*\`items\` (recomendado):\*\* Lista de unidades individuales de productos. El sistema las empaqueta automáticamente según el modo \`type_packaging\`. Cada item puede referenciar un SKU de la cuenta (con \`sku\`) o bien declarar explícitamente sus dimensiones y peso.\
> \- \*\*\`packages\`:\*\* Lista de bultos ya definidos con dimensiones explícitas. Útil cuando el empaquetado ya está resuelto del lado del integrador. Cada paquete puede referenciar un SKU (\`sku\` / \`sku_id\`) para obtener sus dimensiones, o declararlas manualmente. Opcionalmente puede incluir \`items\` internos si se especifica un \`container_id\`.

```json
{
  "openapi": "3.0.0",
  "info": { "title": "Zipnova Shipping API V2", "version": "2.0.0" },
  "tags": [{ "name": "Envíos", "description": "Gestión de envíos y tracking" }],
  "servers": [
    {
      "url": "https://api.zipnova.com.ar/v2",
      "description": "v2 API - Argentina (AR)"
    },
    {
      "url": "https://api.zipnova.cl/v2",
      "description": "v2 API - Chile (CL)"
    },
    {
      "url": "https://api.zipnova.com.mx/v2",
      "description": "v2 API - México (MX)"
    }
  ],
  "security": [{ "basicAuth": [] }, { "bearerAuth": [] }],
  "components": {
    "securitySchemes": {
      "basicAuth": {
        "type": "http",
        "description": "Autenticación básica HTTP utilizando token como nombre de usuario y secret como contraseña",
        "scheme": "basic"
      },
      "bearerAuth": {
        "type": "http",
        "description": "Token de autenticación Bearer OAuth para API V2",
        "bearerFormat": "OAuth",
        "scheme": "bearer"
      }
    }
  },
  "paths": {
    "/shipments/quote": {
      "post": {
        "tags": ["Envíos"],
        "summary": "Cotizar envío",
        "description": "Obtiene las opciones de envío disponibles con sus costos y tiempos estimados.\n\n**items vs packages — debes usar uno u otro, nunca ambos:**\n\n- **`items` (recomendado):** Lista de unidades individuales de productos. El sistema las empaqueta automáticamente según el modo `type_packaging`. Cada item puede referenciar un SKU de la cuenta (con `sku`) o bien declarar explícitamente sus dimensiones y peso.\n- **`packages`:** Lista de bultos ya definidos con dimensiones explícitas. Útil cuando el empaquetado ya está resuelto del lado del integrador. Cada paquete puede referenciar un SKU (`sku` / `sku_id`) para obtener sus dimensiones, o declararlas manualmente. Opcionalmente puede incluir `items` internos si se especifica un `container_id`.",
        "operationId": "7ee582cc79905860fc252e3e01209b0f",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "required": [
                  "account_id",
                  "source",
                  "declared_value",
                  "destination"
                ],
                "properties": {
                  "account_id": {
                    "description": "ID de la cuenta",
                    "type": "integer"
                  },
                  "origin_id": {
                    "description": "ID del address book de origen. Si se omite, se usa el origen por defecto de la cuenta.",
                    "type": "integer"
                  },
                  "source": {
                    "description": "Identificador de la fuente que genera la cotización (ej. nombre de la integración). Máximo 150 caracteres.",
                    "type": "string"
                  },
                  "destination": {
                    "description": "Destino del envío. Identificar por `id` (ciudad) o por `city` + `state`. El `zipcode` puede ser requerido según el país.",
                    "properties": {
                      "city": {
                        "description": "Nombre de la ciudad. Requerido si no se usa `id`.",
                        "type": "string"
                      },
                      "state": {
                        "description": "Nombre de la provincia/estado. Requerido junto con `city`.",
                        "type": "string"
                      },
                      "zipcode": {
                        "description": "Código postal. Requerido en países donde aplica.",
                        "type": "string"
                      },
                      "street": {
                        "description": "Calle del destinatario (opcional).",
                        "type": "string"
                      },
                      "street_number": {
                        "description": "Número de calle del destinatario (opcional).",
                        "type": "string"
                      },
                      "id": {
                        "description": "ID de ciudad (opcional, si se conoce). Alternativa a city+state.",
                        "type": "integer"
                      }
                    },
                    "type": "object"
                  },
                  "declared_value": {
                    "description": "Valor declarado del envío (numérico, mínimo 0). Si se indica en cero, el envío no contará con cobertura del seguro.",
                    "type": "number"
                  },
                  "items": {
                    "description": "Array de unidades de productos a enviar. **Usar `items` O `packages`, nunca ambos.** El sistema empaqueta automáticamente los ítems según `type_packaging`. Máximo 1000 ítems.",
                    "type": "array",
                    "items": {
                      "properties": {
                        "sku": {
                          "description": "Código SKU del producto registrado en la cuenta. Si se provee y es válido, se obtienen dimensiones, peso y clasificación del producto o SKU que coincida. Si no se provee o no se encuentra, se deben declarar `weight`, `height`, `width` y `length`.",
                          "type": "string"
                        },
                        "weight": {
                          "description": "Peso en gramos. Requerido si no se provee `sku` válido. Entero entre 10 y 10.000.000.",
                          "type": "integer"
                        },
                        "height": {
                          "description": "Alto en cm. Requerido si no se provee `sku` válido. Entero entre 1 y 5000.",
                          "type": "integer"
                        },
                        "width": {
                          "description": "Ancho en cm. Requerido si no se provee `sku` válido. Entero entre 1 y 5000.",
                          "type": "integer"
                        },
                        "length": {
                          "description": "Largo en cm. Requerido si no se provee `sku` válido. Entero entre 1 y 5000.",
                          "type": "integer"
                        },
                        "classification_id": {
                          "description": "ID de clasificación de mercadería. Si no se provee, se infiere de la descripción o se usa el valor por defecto (general).",
                          "type": "string"
                        },
                        "description": {
                          "description": "Descripción del ítem. Si se omite, se usa el nombre del SKU o un valor genérico.",
                          "type": "string"
                        },
                        "must_keep_vertical": {
                          "description": "Indica si el ítem debe mantenerse en posición vertical durante el transporte.",
                          "type": "boolean"
                        }
                      },
                      "type": "object"
                    }
                  },
                  "packages": {
                    "description": "Array de bultos con dimensiones ya definidas. **Usar `packages` O `items`, nunca ambos.** Cada bulto puede referenciar un SKU para obtener sus dimensiones, o declararlas manualmente.",
                    "type": "array",
                    "items": {
                      "properties": {
                        "sku": {
                          "description": "Código SKU del producto. Si se provee y es válido, sus dimensiones y clasificación se obtienen automáticamente. Incompatible con `items` internos.",
                          "type": "string"
                        },
                        "sku_id": {
                          "description": "ID numérico del SKU. Alternativa a `sku`. Incompatible con `items` internos.",
                          "type": "integer"
                        },
                        "weight": {
                          "description": "Peso del bulto en gramos. Requerido si no se provee `sku`, `sku_id` ni `container_id`. Entero entre 10 y 10.000.000.",
                          "type": "integer"
                        },
                        "height": {
                          "description": "Alto del bulto en cm. Requerido si no se provee `sku`, `sku_id` ni `container_id`. Entero entre 1 y 5000.",
                          "type": "integer"
                        },
                        "width": {
                          "description": "Ancho del bulto en cm. Requerido si no se provee `sku`, `sku_id` ni `container_id`. Entero entre 1 y 5000.",
                          "type": "integer"
                        },
                        "length": {
                          "description": "Largo del bulto en cm. Requerido si no se provee `sku`, `sku_id` ni `container_id`. Entero entre 1 y 5000.",
                          "type": "integer"
                        },
                        "classification_id": {
                          "description": "Clasificación de la mercadería. Puede ser el ID numérico (ej. `1`) o el código de clasificación (ej. `\"default\"`). Requerido si no se provee `sku`, `sku_id` ni `container_id`.",
                          "type": "string"
                        },
                        "description_1": {
                          "description": "Descripción del bulto (línea 1). Máximo 60 caracteres.",
                          "type": "string"
                        },
                        "description_2": {
                          "description": "Descripción opcional del bulto (línea 2). Máximo 60 caracteres.",
                          "type": "string"
                        },
                        "description_3": {
                          "description": "Descripción opcional  del bulto (línea 3). Máximo 60 caracteres.",
                          "type": "string"
                        },
                        "container_id": {
                          "description": "ID de un contenedor predefinido habilitado en la cuenta. Si se provee, se requiere el array `items` con los productos que van dentro.",
                          "type": "integer"
                        },
                        "items": {
                          "description": "Ítems dentro del bulto. Requerido si se usa `container_id`. El sistema calcula las dimensiones finales del bulto a partir del contenedor y los ítems.",
                          "type": "array",
                          "items": {
                            "properties": {
                              "sku": {
                                "description": "Código SKU del ítem. Si se provee y es válido, se obtienen dimensiones y peso del SKU.",
                                "type": "string"
                              },
                              "weight": {
                                "description": "Peso en gramos. Requerido si no se provee `sku` válido. Entero entre 10 y 10.000.000.",
                                "type": "integer"
                              },
                              "height": {
                                "description": "Alto en cm. Requerido si no se provee `sku` válido. Entero entre 1 y 5000.",
                                "type": "integer"
                              },
                              "width": {
                                "description": "Ancho en cm. Requerido si no se provee `sku` válido. Entero entre 1 y 5000.",
                                "type": "integer"
                              },
                              "length": {
                                "description": "Largo en cm. Requerido si no se provee `sku` válido. Entero entre 1 y 5000.",
                                "type": "integer"
                              },
                              "classification_id": {
                                "description": "ID de clasificación de mercadería.",
                                "type": "string"
                              },
                              "description": {
                                "description": "Descripción del ítem.",
                                "type": "string"
                              },
                              "must_keep_vertical": {
                                "description": "Indica si el ítem debe mantenerse vertical.",
                                "type": "boolean"
                              }
                            },
                            "type": "object"
                          }
                        }
                      },
                      "type": "object"
                    }
                  },
                  "type_packaging": {
                    "description": "Modo de empaquetado, aplicable solo cuando se usa `items`. `dynamic`: el sistema elige los mejores contenedores disponibles. `boxes`: usa los contenedores configurados en la cuenta. `none`: cada ítem es un bulto individual.",
                    "type": "string",
                    "enum": ["dynamic", "boxes", "none"]
                  },
                  "logistic_type": {
                    "description": "Filtra los resultados por tipo logístico (ej. `carrier_pickup`, `carrier_dropoff`).",
                    "type": "string"
                  },
                  "service_type": {
                    "description": "Filtra los resultados por código de tipo de servicio.",
                    "type": "string"
                  },
                  "sort_by": {
                    "description": "Criterio de ordenamiento de los resultados.",
                    "type": "string",
                    "enum": ["price", "rating", "time"]
                  },
                  "avoid_rules": {
                    "description": "Si es `true`, omite la aplicación de reglas de negocio de la cuenta.",
                    "type": "boolean"
                  },
                  "include_dropoff_points": {
                    "description": "Si es `1`, incluye puntos de dropoff cercanos al origen en cada resultado que aplique.",
                    "type": "integer",
                    "enum": [0, 1]
                  }
                },
                "type": "object"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Lista de opciones de envío disponibles con precios y tiempos"
          },
          "400": { "description": "Datos inválidos o cuenta inactiva" },
          "403": { "description": "Sin permiso para cotizar en esta cuenta" },
          "422": { "description": "Error de validación" }
        }
      }
    }
  }
}
```

### Respuesta de cotización

La respuesta de la cotización incluirá los siguientes elementos:

<details>

<summary>destination</summary>

Describe la localidad/comuna/ciudad de destino que fue identificada según los datos suministrados en el request.

</details>

<details>

<summary>packages</summary>

Sirve como referencia para entender cómo se construyeron los paquetes que conforman el envío.&#x20;

Si al cotizar indicaste paquetes, reflejará la misma información del request.&#x20;

En cambio, si indicaste items, aquí te mostrará cómo han sido agrupados esos items en paquetes.

</details>

<details>

<summary>results/all_results</summary>

Aquí estarán las distintas opciones para poder realizar un envío.&#x20;

En el objeto `results` tendrás un solo resultado ganador por cada `service_type` (forma de entrega).

En el objeto `all_results` tendrás todos los resultados disponibles.

</details>

#### Atributos de un result

<table><thead><tr><th width="164">Atributo</th><th>Descripción</th></tr></thead><tbody><tr><td>service_type</td><td>Tipo de servicio: la forma de entrega del envío.<br>El atributo <code>code</code> deberá ser usado al crear el envío (ej. standard_delivery)</td></tr><tr><td>logistic_type</td><td>Modo de despacho: cómo se va a despachar el envío</td></tr><tr><td>carrier</td><td>El transporte que hace la entrega. El atributo <code>id</code> deberá ser usado para crear el envío.</td></tr><tr><td>delivery_time</td><td>Indica el tiempo de entrega.<br><code>estimated_delivery</code> indica la fecha máxima de entrega<br><code>estimation_expires_at</code> indica cuando vence la estimación<br>times: indica distintos tiempos del proceso de entrega, en formato ISO8601 de duración.</td></tr><tr><td>amounts</td><td><p>Indica aspectos del precio del envío.<br><code>price</code> es el precio sin IVA que debe pagar el comprador<br><code>price_incl_tax</code> es el precio con IVA que debe pagar el comprador<br><code>seller_price</code> es el precio sin IVA que paga el vendedor<br><code>seller_price_incl_tax</code> es el precio con IVA que paga el vendedor<br><code>price_shipment</code> refleja la porción del precio del envío que es pura del envío<br><code>price_insurance</code> refleja la porción del precio del envío que corresponde al seguro y depende del valor declarado.<br></p><p><code>price</code> y <code>seller_price</code> por lo general son lo mismo, salvo en algunos casos:</p><ul><li>Cuando el resultado es de Flota Propia o Contrato Propio, el <code>price</code> refleja el precio de la tarifa y <code>seller_price</code> lo que cobra Zippin.</li><li>Cuando haya una regla que modifiquen el precio del envio, esa modificación se ve reflejada en <code>price</code>, mientras que <code>seller_price</code> mantiene el valor original.</li></ul></td></tr><tr><td>pickup_points</td><td>Es un array con puntos habilitados para la entrega del envío, cuando el tipo de servicio es <code>pickup_point</code>.<br>De cada punto es importante obtener el <code>point_id</code>, que deberá ser enviado al crear el envío para indicar la sucursal de entrega.</td></tr><tr><td></td><td></td></tr></tbody></table>

---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://docs.zipnova.com/envios/recursos-api/envios/cotizar-envios.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
