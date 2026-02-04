terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Backend: bỏ comment và điền bucket khi dùng S3 (key khác staging để tách state)
  # backend "s3" {
  #   bucket         = "retail-store-tfstate"
  #   key            = "prod/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   dynamodb_table = "retail-store-tflock"
  # }
}

provider "aws" {
  region = var.aws_region
}
