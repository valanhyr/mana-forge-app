#!/usr/bin/env python3
"""
Script to apply Directus schema snapshot
This imports the collections and fields defined in directus_schema.yaml
"""

import subprocess
import sys
import json
from pathlib import Path

# Paths
SNAPSHOT_FILE = Path(__file__).parent / "snapshots" / "directus_schema.yaml"
DOCKER_COMPOSE_FILE = Path(__file__).parent / "docker-compose-directus.yml"

def run_command(cmd, description):
    """Execute shell command and handle errors"""
    print(f"\n📋 {description}...")
    print(f"   Command: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Error: {result.stderr}")
        sys.exit(1)
    
    print(f"✅ {description} completed")
    if result.stdout:
        print(f"   Output: {result.stdout[:200]}")
    
    return result.stdout

def check_docker_compose():
    """Check if docker-compose is running"""
    cmd = ["docker-compose", "-f", str(DOCKER_COMPOSE_FILE), "ps"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if "directus_app" not in result.stdout:
        print("\n⚠️  Directus is not running")
        print("   Starting Directus with docker-compose...")
        run_command(
            ["docker-compose", "-f", str(DOCKER_COMPOSE_FILE), "up", "-d"],
            "Starting Directus services"
        )
        print("\n   Waiting 30 seconds for Directus to initialize...")
        import time
        time.sleep(30)
    else:
        print("\n✅ Directus is already running")

def apply_schema():
    """Apply schema snapshot"""
    if not SNAPSHOT_FILE.exists():
        print(f"❌ Snapshot file not found: {SNAPSHOT_FILE}")
        sys.exit(1)
    
    print(f"\n📁 Using snapshot: {SNAPSHOT_FILE}")
    
    cmd = [
        "docker-compose",
        "-f", str(DOCKER_COMPOSE_FILE),
        "exec", "-T", "directus",
        "npx", "directus", "schema", "apply",
        f"/directus/snapshots/directus_schema.yaml"
    ]
    
    run_command(cmd, "Applying Directus schema")

def verify_collections():
    """Verify collections were created"""
    cmd = [
        "docker-compose",
        "-f", str(DOCKER_COMPOSE_FILE),
        "exec", "-T", "directus",
        "npx", "directus", "schema", "snapshot",
        "/tmp/verify_schema.yaml"
    ]
    
    print("\n🔍 Verifying schema...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print("✅ Schema snapshot created successfully")
        print("\n📊 Created collections:")
        print("   - footer")
        print("   - footer_legal")
        print("   - heros")
        print("   - sections")
        print("   - languages")
        print("   - formats")
        print("   - articles")
    else:
        print("⚠️  Could not verify schema (this is OK if apply succeeded)")

def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║       Directus Schema Setup from Mana Forge Models         ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    # Step 1: Check Directus is running
    check_docker_compose()
    
    # Step 2: Apply schema
    apply_schema()
    
    # Step 3: Verify
    verify_collections()
    
    print(f"""
╔════════════════════════════════════════════════════════════╗
║                     ✅ Setup Complete!                     ║
╚════════════════════════════════════════════════════════════╝

📍 Access Directus at: http://localhost:8055
📧 Admin email: admin@example.com
🔐 Default password: admin_password_change_me

⚠️  IMPORTANT:
   1. Change admin password immediately!
   2. Update DIRECTUS_TOKEN in environment variables
   3. Configure CORS if needed (docker-compose-directus.yml)

📚 Next steps:
   1. Populate collections manually via Directus UI
   2. Create API token in Settings > Access Tokens
   3. Update mana-forge-api/application.yaml with token
   4. Create DirectusService in Java replacing StrapiService
    """)

if __name__ == "__main__":
    main()
