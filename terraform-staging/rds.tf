resource "aws_db_subnet_group" "main" {
  count       = var.create_rds ? 1 : 0
  name        = "${var.project_name}-${var.environment}"
  subnet_ids  = aws_subnet.private[*].id
  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet"
  }
}

resource "aws_db_instance" "main" {
  count                  = var.create_rds && var.db_password != "" ? 1 : 0
  identifier             = "${var.project_name}-${var.environment}"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  db_name                = "retail_store"
  username               = "postgres"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  skip_final_snapshot    = true
  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
}

locals {
  database_url = var.database_url != "" ? var.database_url : (var.create_rds && length(aws_db_instance.main) > 0 ? "postgresql://postgres:${var.db_password}@${aws_db_instance.main[0].address}:5432/retail_store" : "")
}
