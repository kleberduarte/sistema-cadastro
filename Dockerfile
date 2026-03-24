# Build backend from monorepo root
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
ENV JAVA_OPTS="-Xmx512m"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
