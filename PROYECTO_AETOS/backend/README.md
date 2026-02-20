# Aetos Backend

Spring Boot 3 backend for AETOS.

Run locally with a PostgreSQL database (see `application.properties`).

Build:

mvn clean package

Run:

java -jar target/aetos-backend-0.0.1-SNAPSHOT.jar

Notes:
- Configure `jwt.secret` in `application.properties` for production.
- Endpoints: `/api/auth/register`, `/api/auth/login`, `/api/leader/meetings`, `/api/attend`
