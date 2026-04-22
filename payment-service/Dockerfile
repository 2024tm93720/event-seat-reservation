FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=builder /build/target/payment-service-1.0.0.jar app.jar
EXPOSE 9865
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s \
  CMD wget -qO- http://localhost:9865/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
