resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}

# Target groups (IP mode for Fargate)
locals {
  backend_services = [
    { name = "main", port = 3000, path = "/api" },
    { name = "cart", port = 3001, path = "/api/cart" },
    { name = "checkout", port = 3002, path = "/api/checkout" },
    { name = "auth", port = 3003, path = "/api/auth" },
    { name = "auth-orders", path = "/api/orders" },
    { name = "admin", port = 3004, path = "/api/admin" },
  ]
}

resource "aws_lb_target_group" "frontend" {
  name        = "${var.project_name}-${var.environment}-fe"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
  tags = {
    Name = "${var.project_name}-${var.environment}-frontend"
  }
}

resource "aws_lb_target_group" "backend" {
  for_each = { for s in local.backend_services : s.name => s if try(s.port, 0) != 0 }
  name     = "${var.project_name}-${var.environment}-${each.value.name}"
  port     = each.value.port
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
  tags = {
    Name = "${var.project_name}-${var.environment}-${each.value.name}"
  }
}

# /api/orders -> auth service (same as auth)
locals {
  tg_auth_id = aws_lb_target_group.backend["auth"].id
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Path-based rules: more specific first
resource "aws_lb_listener_rule" "api_admin" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend["admin"].arn
  }
  condition {
    path_pattern {
      values = ["/api/admin*"]
    }
  }
}

resource "aws_lb_listener_rule" "api_cart" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend["cart"].arn
  }
  condition {
    path_pattern {
      values = ["/api/cart*"]
    }
  }
}

resource "aws_lb_listener_rule" "api_checkout" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend["checkout"].arn
  }
  condition {
    path_pattern {
      values = ["/api/checkout*"]
    }
  }
}

resource "aws_lb_listener_rule" "api_orders" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 40
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend["auth"].arn
  }
  condition {
    path_pattern {
      values = ["/api/orders*"]
    }
  }
}

resource "aws_lb_listener_rule" "api_auth" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 50
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend["auth"].arn
  }
  condition {
    path_pattern {
      values = ["/api/auth*"]
    }
  }
}

resource "aws_lb_listener_rule" "api_main" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 60
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend["main"].arn
  }
  condition {
    path_pattern {
      values = ["/api*", "/uploads*", "/assets*"]
    }
  }
}

# Default / stays on frontend (listener default_action)
