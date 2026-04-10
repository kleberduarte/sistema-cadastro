# Build backend (contexto = pasta sistema-cadastro, raiz do repositório Git)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY sistema-cadastro-backend/pom.xml ./pom.xml
COPY sistema-cadastro-backend/src ./src
RUN mvn -B -DskipTests package

# Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Sem isto, o Spring usa só application.properties (Flyway sem baseline) e falha em DB já existente.
ENV SPRING_PROFILES_ACTIVE=prod
# Free tier ~512MB RAM: reserva espaço p/ metaspace/native (OOM na subida = porta nunca abre no Render).
# Metaspace limitado evita estourar RAM do plano free (~512MB) durante validate Hibernate + subida.
ENV JAVA_OPTS="-Xms96m -Xmx352m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-8080} -Dserver.address=0.0.0.0 -jar /app/app.jar"]
