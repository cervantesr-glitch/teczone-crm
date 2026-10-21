# Despliegue en Hostinger (cervantesa.com)

El CRM corre como **una sola app web Node.js** del plan Business, conectada al repositorio de GitHub, con la base MySQL de Hostinger. Cada push a `main` vuelve a publicar solo.

Al arrancar, `server.js`:

1. Aplica las migraciones pendientes de la base.
2. Crea el usuario administrador si todavía no existe (con `SEED_ADMIN_*`).
3. Levanta la API en `127.0.0.1:4000`, que solo es accesible dentro del servidor.
4. Sirve la web en el puerto 3000. La web reenvía `/api/*` a la API, así que el navegador solo ve `cervantesa.com`.

## 1. Crear la base de datos

En hPanel, ve a **Bases de datos → Bases de datos MySQL** y crea:

- Una base, por ejemplo `u123456789_crm`.
- Un usuario con contraseña segura y todos los permisos sobre esa base.

Anota el host (por lo general `localhost`), la base, el usuario y la contraseña. La cadena de conexión queda así:

```
mysql://USUARIO:CONTRASEÑA@localhost:3306/BASE
```

Si la contraseña tiene caracteres como `@`, `#`, `/` o `:`, escríbelos codificados (`@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`).

## 2. Crear la app Node.js

1. En hPanel, abre **Sitios web → Agregar sitio web → App web Node.js**.
2. Elige **Importar desde GitHub**, autoriza la app de Hostinger y selecciona `cervantesr-glitch/teczone-crm`, rama `main`.
3. Llena la configuración de build:

| Campo | Valor |
| --- | --- |
| Framework | Other |
| Rama | `main` |
| Node.js | 22 |
| Directorio raíz | `./` (la raíz del repositorio) |
| Gestor de paquetes | pnpm |
| Comando de build | `build` (el que Hostinger pone por omisión) |
| Archivo de entrada | `server.js` |

## 3. Variables de entorno

Agrégalas en la sección **Variables de entorno** de la app. Puedes importarlas de un archivo `.env`.

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | La cadena del paso 1 |
| `JWT_ACCESS_SECRET` | Texto aleatorio de 48 caracteres o más |
| `JWT_REFRESH_SECRET` | Otro texto aleatorio distinto |
| `JWT_ACCESS_TTL` | `15m` |
| `JWT_REFRESH_TTL_DAYS` | `7` |
| `COOKIE_SECURE` | `true` |
| `LOGIN_RATE_LIMIT` | `10` |
| `SEED_ADMIN_EMAIL` | Correo del primer administrador |
| `SEED_ADMIN_PASSWORD` | Contraseña inicial; cámbiala al entrar |
| `SEED_ADMIN_NAME` | Nombre del administrador |

Para generar los secretos puedes usar cualquier generador de contraseñas con 48 caracteres o más. Ten en cuenta que si cambias los secretos, se cierran todas las sesiones abiertas.

No hacen falta `API_URL`, `API_PORT` ni `TEST_DATABASE_URL` en producción.

## 4. Dominio y HTTPS

1. Asigna `cervantesa.com` a la app. Si el dominio está en Hostinger, se conecta solo; si no, apunta sus DNS a Hostinger como indica hPanel.
2. Activa el **SSL** gratuito. Las cookies de sesión son `Secure`, así que el CRM solo funciona por `https://`.

## 5. Primer deploy y verificación

1. Lanza el deploy y revisa los **registros de build**. Al final debe aparecer `Estáticos copiados al servidor autónomo`.
2. En los **registros de ejecución** deben aparecer `No pending migrations to apply` (o la lista de migraciones aplicadas), `API escuchando` y `Ready`.
3. Abre `https://cervantesa.com/api/health`; debe responder `{"status":"ok"}`.
4. Entra a `https://cervantesa.com` con el administrador, cambia su contraseña y da de alta a los usuarios en **Usuarios**.
5. En **Catálogo**, captura los datos de la empresa para el PDF y revisa los parámetros de cotización.

## Problemas frecuentes

- **Falla el build al instalar:** confirma que el gestor sea pnpm y Node 22. El repositorio fija `pnpm@10` en `package.json`.
- **"This project is configured to use … of pnpm":** viene de un build anterior a este PR. El build actual (`scripts/build-prod.js`) ya no llama a pnpm.
- **`Falló: migraciones` en los registros:** `DATABASE_URL` está mal escrita o el usuario no tiene permisos sobre la base.
- **Entras y te regresa al login:** el sitio no está abriendo por `https://` o falta el SSL.
- **Cambios que no aparecen:** verifica que el push fue a `main` y que el último deploy terminó bien.
