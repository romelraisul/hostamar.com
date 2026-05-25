"""
GCP Mumbai VM Deployment - AI Agent Automation Script
আপনি Python ব্যবহার করলে এই script run করতে পারবেন
"""

import subprocess
import sys
import os
from pathlib import Path

# Configuration
VM_CONFIG = {
    "name": "mumbai-instance-1",
    "zone": "asia-south1-a",
    "project": "YOUR_PROJECT_ID",  # Change this
    "user": "romelraisul",
    "remote_dir": "/home/romelraisul/hostamar-platform"
}

PROJECT_ROOT = Path(__file__).parent.parent
EXCLUDE_PATTERNS = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '*.log',
    '.env.local',
    'deploy/__pycache__',
    '*.pyc'
]

class Colors:
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color

def run_command(cmd, shell=True, check=True):
    """Run shell command and return output"""
    try:
        result = subprocess.run(
            cmd,
            shell=shell,
            check=check,
            text=True,
            capture_output=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"{Colors.RED}Error: {e.stderr}{Colors.NC}")
        return None

def step_print(step_num, message):
    """Print colored step message"""
    print(f"\n{Colors.YELLOW}Step {step_num}: {message}...{Colors.NC}")

def success_print(message):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.NC}")

def error_exit(message):
    """Print error and exit"""
    print(f"{Colors.RED}Error: {message}{Colors.NC}")
    sys.exit(1)

def check_gcloud_auth():
    """Verify gcloud authentication"""
    step_print(1, "GCP Authentication যাচাই")
    
    active_account = run_command("gcloud auth list --filter=status:ACTIVE --format='value(account)'")
    if not active_account:
        error_exit("আপনি gcloud-এ login করেননি। Run: gcloud auth login")
    
    project = run_command("gcloud config get-value project")
    if not project:
        error_exit("কোনো project set করা নেই। Run: gcloud config set project YOUR_PROJECT_ID")
    
    VM_CONFIG['project'] = project
    success_print(f"Authenticated with project: {project}")
    return project

def configure_ssh():
    """Configure SSH using gcloud"""
    step_print(2, "SSH configuration")
    
    cmd = f"gcloud compute config-ssh --project={VM_CONFIG['project']}"
    output = run_command(cmd)
    
    host_alias = f"{VM_CONFIG['name']}.{VM_CONFIG['zone']}.{VM_CONFIG['project']}"
    success_print(f"SSH configured. Host alias: {host_alias}")
    return host_alias

def test_ssh_connection(host_alias):
    """Test SSH connection to VM"""
    step_print(3, "SSH connection test")
    
    cmd = f"ssh -o ConnectTimeout=10 {host_alias} 'echo Connection successful'"
    result = run_command(cmd, check=False)
    
    if result:
        success_print("SSH connection successful")
        return True
    else:
        error_exit("VM-এ connect করতে পারছি না। Check: 1) VM চালু আছে কিনা, 2) Firewall rules")

def create_remote_directory(host_alias):
    """Create project directory on remote VM"""
    step_print(4, "Remote directory তৈরি")
    
    cmd = f"ssh {host_alias} 'mkdir -p {VM_CONFIG['remote_dir']}'"
    run_command(cmd)
    success_print(f"Directory created: {VM_CONFIG['remote_dir']}")

def upload_code(host_alias):
    """Upload code to VM using rsync"""
    step_print(5, "Code আপলোড (rsync)")
    print("এটি কিছু সময় নিতে পারে...")
    
    # Build exclude arguments
    exclude_args = ' '.join([f"--exclude '{pattern}'" for pattern in EXCLUDE_PATTERNS])
    
    # Change to project root
    os.chdir(PROJECT_ROOT)
    
    cmd = f"""rsync -avzP {exclude_args} \
        ./ {host_alias}:{VM_CONFIG['remote_dir']}/"""
    
    run_command(cmd)
    success_print("Code upload সম্পূর্ণ")

def setup_remote_environment(host_alias):
    """Setup Node.js, npm, and build the app on VM"""
    step_print(6, "VM-এ environment setup")
    
    remote_commands = f"""
    set -e
    cd {VM_CONFIG['remote_dir']}
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"
    
    # Install dependencies
    echo "Running npm install..."
    npm install --production
    
    # Create .env if not exists
    if [ ! -f .env ]; then
        cat > .env <<'EOF'
DATABASE_URL="file:./prod.db"
NEXTAUTH_URL="https://hostamar.com"
NEXTAUTH_SECRET="zZ8M+Tn+IYqxpY0sN8wybLeVQHPcsYlIEY/0TlSYoL0="
NODE_ENV="production"
PORT=3000
EOF
        echo ".env file created"
    fi
    
    # Prisma setup
    echo "Running Prisma migrations..."
    npx prisma generate
    npx prisma db push --skip-generate
    
    # Build production
    echo "Building production..."
    npm run build
    
    echo "Environment setup complete"
    """
    
    cmd = f"ssh {host_alias} 'bash -s' <<'REMOTE_COMMANDS'\n{remote_commands}\nREMOTE_COMMANDS"
    run_command(cmd)
    success_print("VM setup সম্পূর্ণ")

def setup_pm2(host_alias):
    """Install and configure PM2"""
    step_print(7, "PM2 process manager setup")
    
    # Check if PM2 installed
    check_pm2 = f"ssh {host_alias} 'command -v pm2'"
    if not run_command(check_pm2, check=False):
        print("Installing PM2...")
        run_command(f"ssh {host_alias} 'sudo npm install -g pm2'")
    
    version = run_command(f"ssh {host_alias} 'pm2 --version'")
    success_print(f"PM2 installed (v{version})")

def start_application(host_alias):
    """Start application with PM2"""
    step_print(8, "Application start")
    
    start_commands = f"""
    cd {VM_CONFIG['remote_dir']}
    
    # Stop existing if running
    pm2 delete hostamar 2>/dev/null || true
    
    # Start with PM2
    pm2 start npm --name "hostamar" -- start
    
    # Save configuration
    pm2 save
    
    # Setup startup script
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u {VM_CONFIG['user']} --hp /home/{VM_CONFIG['user']}
    
    # Show status
    pm2 list
    """
    
    run_command(f"ssh {host_alias} 'bash -s' <<'EOF'\n{start_commands}\nEOF")
    success_print("Application started with PM2")

def get_external_ip():
    """Get VM external IP"""
    step_print(9, "VM External IP খুঁজছি")
    
    cmd = f"""gcloud compute instances describe {VM_CONFIG['name']} \
        --zone={VM_CONFIG['zone']} \
        --project={VM_CONFIG['project']} \
        --format='get(networkInterfaces[0].accessConfigs[0].natIP)'"""
    
    ip = run_command(cmd)
    success_print(f"External IP: {ip}")
    return ip

def print_summary(host_alias, external_ip):
    """Print deployment summary"""
    print(f"\n{Colors.GREEN}========================================")
    print("   Deployment সফলভাবে সম্পূর্ণ হয়েছে!")
    print(f"========================================{Colors.NC}\n")
    
    print(f"🌐 Application URL: http://{external_ip}:3000")
    print(f"📦 PM2 Status: ssh {host_alias} 'pm2 list'")
    print(f"📋 Logs: ssh {host_alias} 'pm2 logs hostamar'")
    print(f"\n{Colors.YELLOW}পরবর্তী ধাপ:{Colors.NC}")
    print("1. Nginx reverse proxy setup")
    print("2. SSL certificate (Let's Encrypt)")
    print(f"3. Cloudflare DNS: A record → {external_ip}")
    print(f"\n{Colors.GREEN}রিমোট SSH:{Colors.NC} ssh {host_alias}")
    print(f"{Colors.GREEN}VS Code Remote:{Colors.NC} Remote-SSH: Connect to Host → {host_alias}")

def main():
    """Main deployment workflow"""
    print(f"{Colors.GREEN}=== Hostamar Platform Deployment শুরু ==={Colors.NC}")
    
    try:
        # Run deployment steps
        check_gcloud_auth()
        host_alias = configure_ssh()
        test_ssh_connection(host_alias)
        create_remote_directory(host_alias)
        upload_code(host_alias)
        setup_remote_environment(host_alias)
        setup_pm2(host_alias)
        start_application(host_alias)
        external_ip = get_external_ip()
        
        # Print summary
        print_summary(host_alias, external_ip)
        
    except Exception as e:
        error_exit(f"Deployment failed: {str(e)}")

if __name__ == "__main__":
    # Check if configuration is updated
    if VM_CONFIG['project'] == "YOUR_PROJECT_ID":
        print(f"{Colors.YELLOW}⚠️  Please update VM_CONFIG in this script first!{Colors.NC}")
        print("Set your actual GCP project ID")
        sys.exit(1)
    
    main()
