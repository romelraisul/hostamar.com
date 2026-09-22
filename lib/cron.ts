export const cron = {
  selfHeal: '0 * * * * self-heal-hourly.sh',
  fleetSync: '*/10 * * * * staggered drift-gate HEALTHY|ALERT',
  backup: '0 2 * * * Turso backup TG 1563',
}
