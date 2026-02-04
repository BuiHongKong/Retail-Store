#!/bin/bash
# Chạy seed một lần (demo@example.com / demo123, admin@example.com / admin123)
# Chạy trong Git Bash: bash run-seed-once.sh
set -e
cd "$(dirname "$0")"

CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "retail-store-staging")
REGION=$(terraform output -raw aws_region 2>/dev/null || echo "ap-southeast-1")
SUBNETS=$(terraform output -json ecs_subnet_ids 2>/dev/null | jq -r 'join(",")')
SG=$(terraform output -raw ecs_security_group_id 2>/dev/null)

if [ -z "$SUBNETS" ] || [ -z "$SG" ]; then
  echo "Chạy terraform apply trước."
  exit 1
fi

echo "Chạy seed..."
aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "${CLUSTER}-main" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"main","command":["npx","prisma","db","seed"]}]}' \
  --region "$REGION"

echo "Seed task đã khởi chạy. Kiểm tra ECS Console. Đăng nhập: demo@example.com / demo123"
