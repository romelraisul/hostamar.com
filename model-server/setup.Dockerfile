# Containerized setup runner for testing
# Usage: docker run --rm -v $(pwd):/scripts -v /var/run/docker.sock:/var/run/docker.sock hostamar-setup

FROM alpine:latest

RUN apk add --no-cache docker-cli curl bash

COPY setup-home-server.sh /scripts/setup-home-server.sh
RUN chmod +x /scripts/setup-home-server.sh

# For testing in WSL (no GPU, no systemd)
RUN sed -i 's|systemctl|true|g; s|apt-get|apk add --no-cache docker docker-cli 2>/dev/null || true|g' /scripts/setup-home-server.sh

ENTRYPOINT ["/scripts/setup-home-server.sh"]