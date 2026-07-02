#!/bin/bash
# Setup PostgreSQL replica using pg_basebackup

set -e

PRIMARY_HOST="hostamar-postgres"
PRIMARY_PORT="5432"
REPLICA_USER="replicator"
REPLICA_PASS="replicator_pass"
REPLICA_SLOT="replica_slot_1"
DATA_DIR="/var/lib/postgresql/data"

echo "Starting basebackup from primary..."

# Run pg_basebackup
PGPASSWORD="$REPLICA_PASS" pg_basebackup \
  -h "$PRIMARY_HOST" \
  -p "$PRIMARY_PORT" \
  -U "$REPLICA_USER" \
  -D "$DATA_DIR" \
  -Fp -Xs -P -R \
  --slot="$REPLICA_SLOT" \
  --write-recovery-conf

echo "Basebackup completed. Starting replica..."

# Start postgres with replica config
exec postgres -c wal_level=replica -c max_wal_senders=10 -c max_replication_slots=10 -c hot_standby=on