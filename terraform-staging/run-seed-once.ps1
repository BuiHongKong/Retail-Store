# Chạy seed một lần (demo@example.com / demo123, admin@example.com / admin123)
# Sau khi chạy xong, xóa file này hoặc không dùng nữa.
Set-Location $PSScriptRoot

$cluster = terraform output -raw ecs_cluster_name 2>$null
if (-not $cluster) { $cluster = "retail-store-staging" }
$region = terraform output -raw aws_region 2>$null
if (-not $region) { $region = "ap-southeast-1" }
$subnetsJson = terraform output -json ecs_subnet_ids 2>$null
$sg = terraform output -raw ecs_security_group_id 2>$null

if (-not $subnetsJson -or -not $sg) {
    Write-Host "Chay terraform apply truoc."
    exit 1
}
$subnets = ($subnetsJson | ConvertFrom-Json) -join ","

Write-Host "Chay seed..."
aws ecs run-task --cluster $cluster --task-definition "$cluster-main" --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[$subnets],securityGroups=[$sg],assignPublicIp=ENABLED}" `
  --overrides '{"containerOverrides":[{"name":"main","command":["npx","prisma","db","seed"]}]}' `
  --region $region
Write-Host "Seed task da khoi chay. Kiem tra ECS Console. Sau do dang nhap demo@example.com / demo123"
