# S3 bucket for product image uploads (admin). Public read so image URLs work in browser.
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project_name}-${var.environment}-uploads-${data.aws_caller_identity.current.account_id}"
  tags = {
    Name = "${var.project_name}-${var.environment}-uploads"
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  depends_on = [aws_s3_bucket_public_access_block.uploads]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.uploads.arn}/*"
      }
    ]
  })
}

# ECS task role: allow backend (admin) to PutObject and GetObject
data "aws_iam_policy_document" "ecs_task_s3" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject"
    ]
    resources = ["${aws_s3_bucket.uploads.arn}/*"]
  }
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name   = "${var.project_name}-${var.environment}-ecs-task-s3"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_s3.json
}
