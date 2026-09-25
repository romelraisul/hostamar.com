#!/usr/bin/env bash
# Wazuh agent enrollment for hostamar nodes — reference snippet (not auto-run).
# Applies the same single-node Wazuh Docker pattern as the compose scaffold.
#
# 1) WSL app server (Ubuntu, the hostamar.com Next.js node):
#    WAZUH_MANAGER="127.0.0.1" WAZUH_AGENT_NAME="hostamar-wsl-app" \
#      apt install wazuh-agent && \
#    sed -i 's#<server><address>.*</address>#<server><address>127.0.0.1</address></server>#' /var/ossec/etc/ossec.conf
#    systemctl enable --now wazuh-agent
#
# 2) Windows desktop (DESKTOP-9KA03CQ):
#    msiexec.exe /i wazuh-agent-4.9.2-1.msi /q WAZUH_MANAGER="127.0.0.1" WAZUH_AGENT_NAME="hostamar-win-desktop"
#    NET START WazuhSvc
#
# 3) Verify enrollment on the manager:
#    docker exec -it <wazuh-manager> /var/ossec/bin/agent_control -l
#
# Manager API creds: set WAZUH_API_PASSWORD / INDEXER_PASSWORD in .env next to
# docker-compose.yml before first bring-up (defaults are placeholder-only).
echo "Reference only — edit then run the commands above manually."
