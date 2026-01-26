FROM quay.io/keycloak/keycloak:latest AS builder

# Health and metrics support off for now
ENV KC_HEALTH_ENABLED=false
ENV KC_METRICS_ENABLED=false

WORKDIR /opt/keycloak
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:latest
COPY --from=builder /opt/keycloak/ /opt/keycloak/

ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start"]
