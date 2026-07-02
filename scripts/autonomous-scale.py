#!/usr/bin/env python3
"""
Autonomous Scaling Script for Hostamar
======================================
Monitors Prometheus metrics and scales worker infrastructure automatically.

Thresholds:
- CPU > 80% for 5 minutes → scale up workers
- Memory > 85% for 5 minutes → scale up workers  
- Requests > 1000/min → scale up workers
- CPU < 30% AND Memory < 50% for 10 minutes → scale down workers

Usage:
  python autonomous-scale.py --once          # Run single check
  python autonomous-scale.py --daemon        # Run continuously (60s interval)
  python autonomous-scale.py --status        # Show current metrics & tier
"""

import os
import sys
import time
import json
import argparse
import subprocess
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# Configuration
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
DOCKER_NETWORK = os.getenv("DOCKER_NETWORK", "hostamar-network")
WORKER_IMAGE = os.getenv("WORKER_IMAGE", "hostamar-build-worker:latest")
MIN_WORKERS = int(os.getenv("MIN_WORKERS", "1"))
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "10"))
SCALE_UP_COOLDOWN = int(os.getenv("SCALE_UP_COOLDOWN", "300"))  # 5 min
SCALE_DOWN_COOLDOWN = int(os.getenv("SCALE_DOWN_COOLDOWN", "600"))  # 10 min
CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL", "60"))  # seconds

# Thresholds
CPU_SCALE_UP_THRESHOLD = float(os.getenv("CPU_SCALE_UP_THRESHOLD", "80.0"))
MEMORY_SCALE_UP_THRESHOLD = float(os.getenv("MEMORY_SCALE_UP_THRESHOLD", "85.0"))
REQUESTS_SCALE_UP_THRESHOLD = float(os.getenv("REQUESTS_SCALE_UP_THRESHOLD", "1000"))
CPU_SCALE_DOWN_THRESHOLD = float(os.getenv("CPU_SCALE_DOWN_THRESHOLD", "30.0"))
MEMORY_SCALE_DOWN_THRESHOLD = float(os.getenv("MEMORY_SCALE_DOWN_THRESHOLD", "50.0"))

STATE_FILE = "/home/romel/hostamar-build/.autoscale-state.json"


class PrometheusClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def query(self, query: str) -> Optional[Dict]:
        """Execute PromQL query and return parsed result."""
        try:
            resp = requests.get(
                f"{self.base_url}/api/v1/query",
                params={"query": query},
                timeout=10
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"[ERROR] Prometheus query failed: {e}")
            return None

    def query_range(self, query: str, start: float, end: float, step: str = "60s") -> Optional[Dict]:
        try:
            resp = requests.get(
                f"{self.base_url}/api/v1/query_range",
                params={"query": query, "start": start, "end": end, "step": step},
                timeout=10
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"[ERROR] Prometheus range query failed: {e}")
            return None

    def get_container_cpu_percent(self, container_name: str) -> Optional[float]:
        """Get CPU usage % for a container over last 5 minutes."""
        query = f'rate(container_cpu_usage_seconds_total{{name=~"{container_name}"}}[5m]) * 100'
        result = self.query(query)
        if result and result.get("status") == "success" and result["data"]["result"]:
            return float(result["data"]["result"][0]["value"][1])
        return None

    def get_container_memory_percent(self, container_name: str) -> Optional[float]:
        """Get memory usage % for a container."""
        # Memory usage / memory limit * 100
        query = f'(container_memory_usage_bytes{{name=~"{container_name}"}} / container_spec_memory_limit_bytes{{name=~"{container_name}"}}) * 100'
        result = self.query(query)
        if result and result.get("status") == "success" and result["data"]["result"]:
            return float(result["data"]["result"][0]["value"][1])
        return None

    def get_request_rate(self, job: str = "app") -> Optional[float]:
        """Get HTTP requests per minute for a job."""
        query = f'sum(rate(http_requests_total{{job="{job}"}}[1m])) * 60'
        result = self.query(query)
        if result and result.get("status") == "success" and result["data"]["result"]:
            return float(result["data"]["result"][0]["value"][1])
        return None

    def get_worker_queue_depth(self) -> Optional[int]:
        """Get BullMQ queue depth from Redis."""
        query = 'bullmq_waiting_total'
        result = self.query(query)
        if result and result.get("status") == "success" and result["data"]["result"]:
            return int(float(result["data"]["result"][0]["value"][1]))
        return None


class DockerManager:
    def __init__(self, network: str, image: str):
        self.network = network
        self.image = image

    def get_worker_containers(self) -> List[Dict]:
        """Get list of running worker containers."""
        try:
            result = subprocess.run(
                ["docker", "ps", "--format", "{{.Names}} {{.Status}}", "--filter", f"ancestor={self.image}"],
                capture_output=True, text=True, timeout=10
            )
            workers = []
            for line in result.stdout.strip().split("\n"):
                if line and "hostamar-worker" in line:
                    parts = line.split(" ", 1)
                    workers.append({"name": parts[0], "status": parts[1] if len(parts) > 1 else "unknown"})
            return workers
        except Exception as e:
            print(f"[ERROR] Failed to list workers: {e}")
            return []

    def get_worker_count(self) -> int:
        return len(self.get_worker_containers())

    def scale_up(self, target_count: int) -> bool:
        """Scale up workers to target count."""
        current = self.get_worker_count()
        if current >= target_count:
            print(f"[INFO] Already at {current} workers, target {target_count}")
            return True

        print(f"[SCALE UP] Scaling from {current} to {target_count} workers...")
        for i in range(current + 1, target_count + 1):
            name = f"hostamar-worker-{i}"
            try:
                subprocess.run([
                    "docker", "run", "-d",
                    "--name", name,
                    "--network", self.network,
                    "--restart", "unless-stopped",
                    "-e", "DATABASE_URL",
                    "-e", "REDIS_URL",
                    "-e", "R2_ENDPOINT",
                    "-e", "R2_ACCESS_KEY",
                    "-e", "R2_SECRET_KEY",
                    "-e", "R2_BUCKET",
                    "-e", "R2_PUBLIC_URL",
                    "-e", "NEXTAUTH_SECRET",
                    "-e", "NEXTAUTH_URL",
                    "-e", "OPENAI_API_KEY",
                    "-e", "OLLAMA_HOST",
                    "-e", "OLLAMA_MODEL",
                    "-e", "NODE_ENV=production",
                    self.image,
                    "node", "dist/workers/video-generation.js"
                ], check=True, timeout=30)
                print(f"  ✓ Started {name}")
            except subprocess.CalledProcessError as e:
                print(f"  ✗ Failed to start {name}: {e}")
                return False
        return True

    def scale_down(self, target_count: int) -> bool:
        """Scale down workers to target count (removes highest-numbered workers first)."""
        current = self.get_worker_count()
        if current <= target_count:
            print(f"[INFO] Already at {current} workers, target {target_count}")
            return True

        workers = sorted(self.get_worker_containers(), key=lambda w: w["name"])
        to_remove = workers[target_count:]
        
        print(f"[SCALE DOWN] Scaling from {current} to {target_count} workers...")
        for w in to_remove:
            try:
                subprocess.run(["docker", "stop", w["name"]], check=True, timeout=30)
                subprocess.run(["docker", "rm", w["name"]], check=True, timeout=10)
                print(f"  ✓ Removed {w['name']}")
            except subprocess.CalledProcessError as e:
                print(f"  ✗ Failed to remove {w['name']}: {e}")
                return False
        return True


class AutoScaler:
    def __init__(self):
        self.prom = PrometheusClient(PROMETHEUS_URL)
        self.docker = DockerManager(DOCKER_NETWORK, WORKER_IMAGE)
        self.state = self.load_state()

    def load_state(self) -> Dict:
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "last_scale_up": 0,
            "last_scale_down": 0,
            "current_workers": MIN_WORKERS,
            "scale_up_count": 0,
            "scale_down_count": 0,
        }

    def save_state(self):
        with open(STATE_FILE, "w") as f:
            json.dump(self.state, f, indent=2)

    def check_metrics(self) -> Dict:
        """Collect current metrics from Prometheus."""
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": None,
            "memory_percent": None,
            "requests_per_min": None,
            "queue_depth": None,
            "worker_count": self.docker.get_worker_count(),
        }

        # Get aggregated metrics across all worker containers
        workers = self.docker.get_worker_containers()
        if workers:
            cpu_vals = []
            mem_vals = []
            for w in workers:
                cpu = self.prom.get_container_cpu_percent(w["name"])
                mem = self.prom.get_container_memory_percent(w["name"])
                if cpu is not None:
                    cpu_vals.append(cpu)
                if mem is not None:
                    mem_vals.append(mem)
            
            if cpu_vals:
                metrics["cpu_percent"] = sum(cpu_vals) / len(cpu_vals)
            if mem_vals:
                metrics["memory_percent"] = sum(mem_vals) / len(mem_vals)

        metrics["requests_per_min"] = self.prom.get_request_rate("app")
        metrics["queue_depth"] = self.prom.get_worker_queue_depth()

        return metrics

    def should_scale_up(self, metrics: Dict) -> Tuple[bool, str]:
        """Check if scale-up conditions are met."""
        reasons = []
        
        if metrics["cpu_percent"] is not None and metrics["cpu_percent"] > CPU_SCALE_UP_THRESHOLD:
            reasons.append(f"CPU {metrics['cpu_percent']:.1f}% > {CPU_SCALE_UP_THRESHOLD}%")
        
        if metrics["memory_percent"] is not None and metrics["memory_percent"] > MEMORY_SCALE_UP_THRESHOLD:
            reasons.append(f"Memory {metrics['memory_percent']:.1f}% > {MEMORY_SCALE_UP_THRESHOLD}%")
        
        if metrics["requests_per_min"] is not None and metrics["requests_per_min"] > REQUESTS_SCALE_UP_THRESHOLD:
            reasons.append(f"Requests {metrics['requests_per_min']:.0f}/min > {REQUESTS_SCALE_UP_THRESHOLD}")
        
        if metrics["queue_depth"] is not None and metrics["queue_depth"] > 10:
            reasons.append(f"Queue depth {metrics['queue_depth']} > 10")

        # Check cooldown
        now = time.time()
        if now - self.state["last_scale_up"] < SCALE_UP_COOLDOWN:
            remaining = SCALE_UP_COOLDOWN - (now - self.state["last_scale_up"])
            reasons.append(f"Scale-up cooldown active ({remaining:.0f}s remaining)")
            return False, "; ".join(reasons)

        return len(reasons) > 0, "; ".join(reasons)

    def should_scale_down(self, metrics: Dict) -> Tuple[bool, str]:
        """Check if scale-down conditions are met."""
        reasons = []

        if metrics["cpu_percent"] is None or metrics["memory_percent"] is None:
            return False, "Insufficient metrics"

        if metrics["cpu_percent"] < CPU_SCALE_DOWN_THRESHOLD:
            reasons.append(f"CPU {metrics['cpu_percent']:.1f}% < {CPU_SCALE_DOWN_THRESHOLD}%")
        
        if metrics["memory_percent"] < MEMORY_SCALE_DOWN_THRESHOLD:
            reasons.append(f"Memory {metrics['memory_percent']:.1f}% < {MEMORY_SCALE_DOWN_THRESHOLD}%")
        
        if metrics["requests_per_min"] is not None and metrics["requests_per_min"] < 100:
            reasons.append(f"Requests {metrics['requests_per_min']:.0f}/min < 100")
        
        if metrics["queue_depth"] is not None and metrics["queue_depth"] == 0:
            reasons.append("Queue empty")

        # Need BOTH CPU and memory low for scale down
        cpu_low = metrics["cpu_percent"] < CPU_SCALE_DOWN_THRESHOLD
        mem_low = metrics["memory_percent"] < MEMORY_SCALE_DOWN_THRESHOLD
        if not (cpu_low and mem_low):
            return False, "CPU and memory not both below thresholds"

        # Check cooldown
        now = time.time()
        if now - self.state["last_scale_down"] < SCALE_DOWN_COOLDOWN:
            remaining = SCALE_DOWN_COOLDOWN - (now - self.state["last_scale_down"])
            reasons.append(f"Scale-down cooldown active ({remaining:.0f}s remaining)")
            return False, "; ".join(reasons)

        return len(reasons) > 0, "; ".join(reasons)

    def run_check(self, simulate: bool = False) -> Dict:
        """Run a single scaling check."""
        print(f"\n{'='*60}")
        print(f"🔍 AUTONOMOUS SCALER CHECK — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")

        metrics = self.check_metrics()
        print(f"📊 Current Metrics:")
        print(f"   Workers:       {metrics['worker_count']} (min={MIN_WORKERS}, max={MAX_WORKERS})")
        print(f"   CPU:           {metrics['cpu_percent']:.1f}%" if metrics['cpu_percent'] else "   CPU:           N/A")
        print(f"   Memory:        {metrics['memory_percent']:.1f}%" if metrics['memory_percent'] else "   Memory:        N/A")
        print(f"   Req/min:       {metrics['requests_per_min']:.0f}" if metrics['requests_per_min'] else "   Req/min:       N/A")
        print(f"   Queue depth:   {metrics['queue_depth']}" if metrics['queue_depth'] is not None else "   Queue depth:   N/A")

        # Check scale up
        scale_up, up_reason = self.should_scale_up(metrics)
        print(f"\n📈 Scale UP:  {'YES' if scale_up else 'NO'} — {up_reason}")

        # Check scale down
        scale_down, down_reason = self.should_scale_down(metrics)
        print(f"📉 Scale DOWN: {'YES' if scale_down else 'NO'} — {down_reason}")

        action_taken = None
        new_worker_count = metrics["worker_count"]

        if scale_up and not scale_down:
            target = min(metrics["worker_count"] + 1, MAX_WORKERS)
            if target > metrics["worker_count"]:
                print(f"\n🚀 Scaling UP to {target} workers...")
                if not simulate:
                    if self.docker.scale_up(target):
                        self.state["last_scale_up"] = time.time()
                        self.state["scale_up_count"] += 1
                        new_worker_count = target
                        action_taken = f"scale_up_to_{target}"
                    else:
                        action_taken = "scale_up_failed"
                else:
                    print("   [SIMULATE] Would scale up")
                    action_taken = "simulate_scale_up"
                    new_worker_count = target

        elif scale_down and not scale_up:
            target = max(metrics["worker_count"] - 1, MIN_WORKERS)
            if target < metrics["worker_count"]:
                print(f"\n📉 Scaling DOWN to {target} workers...")
                if not simulate:
                    if self.docker.scale_down(target):
                        self.state["last_scale_down"] = time.time()
                        self.state["scale_down_count"] += 1
                        new_worker_count = target
                        action_taken = f"scale_down_to_{target}"
                    else:
                        action_taken = "scale_down_failed"
                else:
                    print("   [SIMULATE] Would scale down")
                    action_taken = "simulate_scale_down"
                    new_worker_count = target

        else:
            print("\n➡️  No scaling action needed")
            action_taken = "none"

        self.state["current_workers"] = new_worker_count
        self.save_state()

        result = {
            "timestamp": metrics["timestamp"],
            "metrics": metrics,
            "scale_up_triggered": scale_up,
            "scale_down_triggered": scale_down,
            "action": action_taken,
            "worker_count": new_worker_count,
        }
        return result

    def run_daemon(self):
        """Run continuous scaling daemon."""
        print(f"🤖 Starting Autonomous Scaler Daemon (interval: {CHECK_INTERVAL}s)")
        print(f"   Prometheus: {PROMETHEUS_URL}")
        print(f"   Network:    {DOCKER_NETWORK}")
        print(f"   Worker img: {WORKER_IMAGE}")
        print(f"   Min/Max:    {MIN_WORKERS}/{MAX_WORKERS}")
        print(f"   Thresholds: CPU↑{CPU_SCALE_UP_THRESHOLD}% ↓{CPU_SCALE_DOWN_THRESHOLD}% | Mem↑{MEMORY_SCALE_UP_THRESHOLD}% ↓{MEMORY_SCALE_DOWN_THRESHOLD}% | Req↑{REQUESTS_SCALE_UP_THRESHOLD}/min")
        print("   Press Ctrl+C to stop\n")

        try:
            while True:
                self.run_check(simulate=False)
                print(f"\n⏳ Sleeping {CHECK_INTERVAL}s...")
                time.sleep(CHECK_INTERVAL)
        except KeyboardInterrupt:
            print("\n👋 Autonomous scaler stopped")
            sys.exit(0)

    def show_status(self):
        """Display current status."""
        metrics = self.check_metrics()
        state = self.state

        print(f"\n{'='*60}")
        print(f"📊 AUTONOMOUS SCALER STATUS — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        print(f"Current Workers: {metrics['worker_count']} (min={MIN_WORKERS}, max={MAX_WORKERS})")
        print(f"CPU:             {metrics['cpu_percent']:.1f}%" if metrics['cpu_percent'] else "CPU:             N/A")
        print(f"Memory:          {metrics['memory_percent']:.1f}%" if metrics['memory_percent'] else "Memory:          N/A")
        print(f"Requests/min:    {metrics['requests_per_min']:.0f}" if metrics['requests_per_min'] else "Requests/min:    N/A")
        print(f"Queue depth:     {metrics['queue_depth']}" if metrics['queue_depth'] is not None else "Queue depth:     N/A")
        print(f"\nScale History:")
        print(f"  Scale-ups:   {state['scale_up_count']} (last: {datetime.fromtimestamp(state['last_scale_up']).strftime('%H:%M:%S') if state['last_scale_up'] else 'never'})")
        print(f"  Scale-downs: {state['scale_down_count']} (last: {datetime.fromtimestamp(state['last_scale_down']).strftime('%H:%M:%S') if state['last_scale_down'] else 'never'})")
        
        scale_up, up_reason = self.should_scale_up(metrics)
        scale_down, down_reason = self.should_scale_down(metrics)
        print(f"\nNext check would:")
        print(f"  Scale UP:   {'YES' if scale_up else 'NO'} — {up_reason}")
        print(f"  Scale DOWN: {'YES' if scale_down else 'NO'} — {down_reason}")


def main():
    parser = argparse.ArgumentParser(description="Autonomous Infrastructure Scaler for Hostamar")
    parser.add_argument("--once", action="store_true", help="Run single check and exit")
    parser.add_argument("--daemon", action="store_true", help="Run as continuous daemon")
    parser.add_argument("--status", action="store_true", help="Show current status and exit")
    parser.add_argument("--simulate", action="store_true", help="Simulate actions (no real scaling)")
    args = parser.parse_args()

    scaler = AutoScaler()

    if args.status:
        scaler.show_status()
    elif args.daemon:
        scaler.run_daemon()
    else:
        # Default: run once
        scaler.run_check(simulate=args.simulate)


if __name__ == "__main__":
    main()