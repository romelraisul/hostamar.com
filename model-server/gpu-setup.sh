#!/bin/bash
# GPU setup for NVIDIA on Ubuntu
# Run as root or with sudo

set -euo pipefail

echo "Installing NVIDIA Docker runtime..."

# Install NVIDIA drivers (if not already installed)
# Follow vendor instructions for your specific GPU

# Install nvidia-docker
distribution=$(. /etc/os-release; echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-docker2

sudo systemctl restart docker

echo "Verifying GPU access..."
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi

echo "Done! You can now use --gpus all in docker run or deploy.resources in docker-compose"